import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { KpiNodeView, type KpiNodeData, type NodeState } from './components/KpiNodeView';
import { Toolbar, type Mode } from './components/Toolbar';
import { Legend } from './components/Legend';
import { DetailPanel } from './components/DetailPanel';
import {
  allExpandableIds,
  computeVisible,
  dataset,
  edges as kpiEdges,
  neighborhood,
  nodeById,
  nodes as kpiNodes,
  pathToTop,
  rootId,
  sectionColor,
  sections,
} from './lib/graph';
import { boundsOf, computeLayout, nodeSize, type XY } from './lib/layout';
import type { KpiNode } from './kpi-types';
import { brand } from './theme/brand';

const nodeTypes = { kpi: KpiNodeView };
const MAX_HOPS = 4;
const EDGE_REST = '#c4ccd6';

/**
 * Motion timings for the "unfold" feel. `duration` drives the node-position tween
 * and the camera (fitBounds) together so the canvas moves as one piece; `exit` is
 * the fade/scale-out before a departing node unmounts. Raise `duration` to make
 * the whole gesture more deliberate.
 */
const MOTION = { duration: 600, exit: 240 };

/**
 * Above this many laid-out nodes the per-frame position tween (a setNodes for
 * every node, every frame) gets heavy enough to drop frames — e.g. "Expand all"
 * (→87). For those we snap the layout and let the camera + per-node fade carry
 * the motion instead. Small, common transitions stay fully glided.
 */
const TWEEN_MAX_NODES = 40;

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Where a freshly-revealed node should start its tween: at a parent (preferred)
 * or any already-visible child, so a driver grows out of the KPI it belongs to
 * instead of popping in at its destination.
 */
function spawnOrigin(id: string, prev: Map<string, XY>): XY | null {
  const node = nodeById.get(id);
  if (!node) return null;
  for (const p of node.parents) {
    const pos = prev.get(p.id);
    if (pos) return pos;
  }
  for (const childId of node.childrenIds) {
    const pos = prev.get(childId);
    if (pos) return pos;
  }
  return null;
}

const sizeOfId = (id: string): { width: number; height: number } => {
  const node = nodeById.get(id);
  return node ? nodeSize(node) : { width: 234, height: 84 };
};

export function Explorer() {
  const rf = useReactFlow();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([rootId]));
  // ELK target positions for the current active set.
  const [positions, setPositions] = useState<Map<string, XY> | null>(null);
  // What actually renders: positions tweened frame-by-frame so edges follow.
  const [animPositions, setAnimPositions] = useState<Map<string, XY> | null>(null);
  // Departing nodes, held at their last position for a fade-out before unmount.
  const [exiting, setExiting] = useState<Map<string, XY>>(() => new Map());
  const [mode, setMode] = useState<Mode>('overview');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hops, setHops] = useState(1);

  const layoutSeq = useRef(0);
  const tweenRaf = useRef<number | null>(null);
  const animPositionsRef = useRef<Map<string, XY> | null>(null);
  animPositionsRef.current = animPositions;
  const exitingRef = useRef(exiting);
  exitingRef.current = exiting;

  const prefersReduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // The set of nodes that is laid out and rendered, decided by the current mode:
  //   overview → the progressively-built tree
  //   focus    → only the focused node's neighbourhood (everything else hidden)
  //   path     → the focused node's ancestor chain up to Net Profit
  const activeIds = useMemo<Set<string>>(() => {
    if (mode === 'focus' && focusId) return neighborhood(focusId, hops).nodes;
    if (mode === 'path' && focusId) return pathToTop(focusId).nodes;
    return computeVisible(expanded);
  }, [mode, focusId, hops, expanded]);
  const activeKey = useMemo(() => [...activeIds].sort().join('|'), [activeIds]);

  const activeRef = useRef(activeIds);
  activeRef.current = activeIds;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const prevActiveRef = useRef<Set<string>>(activeIds);

  // (Re)lay out the active set whenever it changes. Only the latest run wins.
  useEffect(() => {
    const seq = ++layoutSeq.current;
    computeLayout(dataset, activeRef.current).then((pos) => {
      if (seq === layoutSeq.current) setPositions(pos);
    });
  }, [activeKey]);

  // Mark nodes that just left the active set as "exiting" so they fade out
  // instead of popping. A layout effect so the flag lands before paint — no
  // one-frame disappearance between the state change and the relayout.
  useLayoutEffect(() => {
    const prevActive = prevActiveRef.current;
    prevActiveRef.current = activeIds;
    if (prefersReduced) return;
    const prevPos = animPositionsRef.current;
    if (!prevPos) return;
    const departing = new Map<string, XY>();
    for (const id of prevActive) {
      if (activeIds.has(id)) continue;
      const pos = prevPos.get(id);
      if (pos) departing.set(id, pos);
    }
    if (departing.size === 0) return;
    setExiting((cur) => {
      const next = new Map(cur);
      for (const [id, pos] of departing) next.set(id, pos);
      return next;
    });
    const ids = [...departing.keys()];
    const timer = window.setTimeout(() => {
      setExiting((cur) => {
        const next = new Map(cur);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, MOTION.exit);
    return () => window.clearTimeout(timer);
  }, [activeKey, prefersReduced]);

  // The heart of "glide instead of jump": tween node positions old → ELK target
  // (setNodes per frame, so the SVG edges follow), while the camera breathes into
  // the new frame via fitBounds. Triggered by each fresh ELK layout.
  useEffect(() => {
    if (!positions) return;
    const target = positions;
    const ids = activeRef.current;
    const rect = boundsOf(target, ids, sizeOfId);
    const padding = modeRef.current === 'overview' ? 0.14 : 0.26;

    if (tweenRaf.current != null) cancelAnimationFrame(tweenRaf.current);

    const prev = animPositionsRef.current;

    // First layout (nothing on screen yet): snap. The <ReactFlow fitView> prop
    // frames the initial set.
    if (!prev) {
      setAnimPositions(new Map(target));
      return;
    }

    // Reduced motion: snap to target, cut the camera.
    if (prefersReduced) {
      setAnimPositions(new Map(target));
      if (rect) rf.fitBounds(rect, { padding, duration: 0 });
      return;
    }

    // Large transition: snap the layout (the per-frame tween would jank) but
    // still breathe the camera; new nodes fade/scale in via the kpi-in keyframe.
    if (target.size > TWEEN_MAX_NODES) {
      setAnimPositions(new Map(target));
      if (rect) rf.fitBounds(rect, { padding, duration: MOTION.duration, ease: easeOutCubic });
      return;
    }

    // A node returning from the exiting pool shouldn't render twice.
    if (exitingRef.current.size) {
      let changed = false;
      const next = new Map(exitingRef.current);
      for (const id of target.keys()) {
        if (next.delete(id)) changed = true;
      }
      if (changed) setExiting(next);
    }

    // Per-node start position: keep moving nodes from where they currently are
    // (or where they were fading), grow new nodes out of their parent's old spot.
    const from = new Map<string, XY>();
    for (const id of target.keys()) {
      const current = prev.get(id) ?? exitingRef.current.get(id);
      from.set(id, current ?? spawnOrigin(id, prev) ?? target.get(id)!);
    }

    // Camera: frame the end-state while the nodes glide into it.
    if (rect) {
      rf.fitBounds(rect, { padding, duration: MOTION.duration, ease: easeOutCubic });
    }

    let startTs: number | null = null;
    const tick = (now: number) => {
      if (startTs === null) startTs = now;
      const t = Math.min(1, (now - startTs) / MOTION.duration);
      const e = easeOutCubic(t);
      const next = new Map<string, XY>();
      for (const id of target.keys()) {
        const a = from.get(id)!;
        const b = target.get(id)!;
        next.set(id, { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e });
      }
      setAnimPositions(next);
      if (t < 1) {
        tweenRaf.current = requestAnimationFrame(tick);
      } else {
        tweenRaf.current = null;
        setAnimPositions(new Map(target)); // land exactly on target
      }
    };
    tweenRaf.current = requestAnimationFrame(tick);

    return () => {
      if (tweenRaf.current != null) cancelAnimationFrame(tweenRaf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions]);

  const focusKpi = focusId ? nodeById.get(focusId) ?? null : null;
  const fullyExpanded = mode === 'overview' && activeIds.size === kpiNodes.length;
  const collapsedToTop = expanded.size === 1 && expanded.has(rootId);

  // ── expand / collapse (map mode) ────────────────────────────────
  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setMode('overview');
    setOpen(false);
    setExpanded(new Set(allExpandableIds));
  }, []);

  const collapseToTop = useCallback(() => {
    setMode('overview');
    setOpen(false);
    setExpanded(new Set([rootId]));
  }, []);

  // ── focus / path (isolation) ────────────────────────────────────
  const reset = useCallback(() => {
    setMode('overview');
    setOpen(false);
  }, []);

  const focusOn = useCallback((id: string) => {
    setMode('focus');
    setFocusId(id);
    setHops(1);
    setOpen(true);
  }, []);

  const changeHops = useCallback((next: number) => {
    setHops(Math.max(1, Math.min(MAX_HOPS, next)));
  }, []);

  const togglePath = useCallback(() => {
    if (!focusId) return;
    setMode((m) => (m === 'path' ? 'focus' : 'path'));
  }, [focusId]);

  // Escape returns to the map.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reset]);

  // ── display nodes / edges (active subset + fading exits) ─────────
  const displayNodes = useMemo<Node[]>(() => {
    if (!animPositions) return [];
    const out: Node[] = [];
    const push = (kpi: KpiNode, pos: XY, isExiting: boolean) => {
      let state: NodeState = 'normal';
      if (mode !== 'overview' && kpi.id === focusId) state = 'focused';
      else if (mode === 'path') state = 'active';
      const data: KpiNodeData = {
        kpi,
        color: sectionColor(kpi.section),
        state,
        expandable: kpi.childrenIds.length > 0,
        isExpanded: expanded.has(kpi.id),
        childCount: kpi.childrenIds.length,
        onToggleExpand: toggleExpand,
        chip: mode === 'overview',
        exit: isExiting,
      };
      out.push({
        id: kpi.id,
        type: 'kpi',
        position: pos,
        draggable: false,
        data,
        zIndex: isExiting ? 0 : state === 'focused' ? 20 : state === 'active' ? 10 : 1,
      });
    };
    for (const kpi of kpiNodes) {
      if (activeIds.has(kpi.id)) {
        // Skip until the tween has a position for it — avoids a (0,0) flash for
        // nodes revealed before the next ELK layout resolves.
        const pos = animPositions.get(kpi.id);
        if (pos) push(kpi, pos, false);
      } else {
        // Departing node: keep rendering it (same DOM element, no remount) so the
        // is-exiting CSS fades it out. We catch it in the very same render it
        // leaves the active set — first via its still-present animPosition, then
        // via the frozen `exiting` position once the tween rebuilds animPositions.
        const pos = exiting.get(kpi.id) ?? animPositions.get(kpi.id);
        if (pos) push(kpi, pos, true);
      }
    }
    return out;
  }, [animPositions, exiting, activeIds, focusId, mode, expanded, toggleExpand]);

  const displayEdges = useMemo<Edge[]>(() => {
    return kpiEdges
      .filter((e) => activeIds.has(e.childId) && activeIds.has(e.parentId))
      .map((e) => {
        const relColor = brand.relationship[e.relationship];
        const base: Edge = {
          id: e.id,
          source: e.childId,
          target: e.parentId,
          data: { relationship: e.relationship },
        };
        if (mode === 'overview') {
          return {
            ...base,
            style: { stroke: EDGE_REST, strokeWidth: 1.4, opacity: 0.7 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 13, height: 13, color: EDGE_REST },
          };
        }
        return {
          ...base,
          animated: mode === 'path',
          style: { stroke: relColor, strokeWidth: mode === 'path' ? 2.6 : 2.2, opacity: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: relColor },
        };
      });
  }, [activeIds, mode]);

  // Render the canvas only once the first layout has produced animatable positions.
  if (!animPositions) {
    return <div className="loading">Building the Net Profit tree…</div>;
  }

  return (
    <>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => focusOn(node.id)}
        onPaneClick={reset}
        minZoom={0.08}
        maxZoom={2.4}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.16 }}
      >
        <Background gap={30} color="#e3e8ee" />
        <Controls showInteractive={false} />
        {fullyExpanded && (
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => sectionColor((n.data as KpiNodeData).kpi.section)}
            nodeStrokeWidth={2}
            maskColor="rgba(11,20,55,0.06)"
          />
        )}
      </ReactFlow>

      <Toolbar
        mode={mode}
        focusKpi={focusKpi}
        hops={hops}
        maxHops={MAX_HOPS}
        sections={sections}
        allNodes={kpiNodes}
        visibleCount={activeIds.size}
        totalCount={kpiNodes.length}
        fullyExpanded={fullyExpanded}
        collapsedToTop={collapsedToTop}
        onReset={reset}
        onHopsChange={changeHops}
        onTogglePath={togglePath}
        onSelectKpi={focusOn}
        onExpandAll={expandAll}
        onCollapseToTop={collapseToTop}
      />
      <Legend sections={sections} />
      <DetailPanel
        kpi={focusKpi}
        open={open}
        pathActive={mode === 'path'}
        onClose={reset}
        onPathToTop={togglePath}
        onFocusKpi={focusOn}
      />
    </>
  );
}
