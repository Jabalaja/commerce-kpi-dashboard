import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ancestorsToExpand,
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
import { computeLayout, type XY } from './lib/layout';
import { brand } from './theme/brand';

const nodeTypes = { kpi: KpiNodeView };
const MAX_HOPS = 4;
const EDGE_DIM = '#d9dee5';
const EDGE_REST = '#c4ccd6';

interface PendingFit {
  ids: string[];
  padding: number;
}

export function Explorer() {
  const rf = useReactFlow();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([rootId]));
  const [positions, setPositions] = useState<Map<string, XY> | null>(null);
  const [mode, setMode] = useState<Mode>('overview');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hops, setHops] = useState(1);

  const layoutSeq = useRef(0);
  const pendingFit = useRef<PendingFit | null>(null);

  const prefersReduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const fitDuration = prefersReduced ? 0 : 520;

  const visibleIds = useMemo(() => computeVisible(expanded), [expanded]);
  const visibleRef = useRef(visibleIds);
  visibleRef.current = visibleIds;

  // (Re)lay out the visible subset whenever it changes. Only the latest run wins.
  useEffect(() => {
    const seq = ++layoutSeq.current;
    computeLayout(dataset, visibleIds).then((pos) => {
      if (seq === layoutSeq.current) setPositions(pos);
    });
  }, [visibleIds]);

  // After a relayout renders, apply the pending camera move (or fit to all visible).
  useEffect(() => {
    if (!positions) return;
    const pf = pendingFit.current;
    pendingFit.current = null;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const ids = pf ? pf.ids : [...visibleRef.current];
        rf.fitView({
          nodes: ids.map((id) => ({ id })),
          padding: pf?.padding ?? 0.18,
          duration: fitDuration,
        });
      }),
    );
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions]);

  const focusKpi = focusId ? nodeById.get(focusId) ?? null : null;
  const fullyExpanded = visibleIds.size === kpiNodes.length;
  const collapsedToTop = expanded.size === 1 && expanded.has(rootId);

  // ── camera helpers ──────────────────────────────────────────────
  const fitNeighborhood = useCallback(
    (id: string, h: number) => {
      const ids = [...neighborhood(id, h).nodes].filter((x) => visibleRef.current.has(x));
      rf.fitView({ nodes: ids.map((i) => ({ id: i })), padding: 0.28, duration: fitDuration });
    },
    [rf, fitDuration],
  );
  const fitVisible = useCallback(() => {
    rf.fitView({
      nodes: [...visibleRef.current].map((id) => ({ id })),
      padding: 0.18,
      duration: fitDuration,
    });
  }, [rf, fitDuration]);

  // ── expand / collapse ───────────────────────────────────────────
  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      pendingFit.current = { ids: [...computeVisible(next)], padding: 0.18 };
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const next = new Set(allExpandableIds);
    pendingFit.current = { ids: [...computeVisible(next)], padding: 0.1 };
    setExpanded(next);
  }, []);

  const collapseToTop = useCallback(() => {
    const next = new Set([rootId]);
    pendingFit.current = { ids: [...computeVisible(next)], padding: 0.22 };
    setMode('overview');
    setOpen(false);
    setExpanded(next);
  }, []);

  // ── focus / path ────────────────────────────────────────────────
  const reset = useCallback(() => {
    setMode('overview');
    setOpen(false);
    fitVisible();
  }, [fitVisible]);

  const focusOn = useCallback(
    (id: string) => {
      setMode('focus');
      setFocusId(id);
      setHops(1);
      setOpen(true);
      if (visibleRef.current.has(id)) {
        fitNeighborhood(id, 1);
      } else {
        // Reveal the target by expanding all of its ancestors, then frame the chain.
        pendingFit.current = { ids: [...pathToTop(id).nodes], padding: 0.26 };
        setExpanded((prev) => new Set([...prev, ...ancestorsToExpand(id)]));
      }
    },
    [fitNeighborhood],
  );

  const changeHops = useCallback(
    (next: number) => {
      const h = Math.max(1, Math.min(MAX_HOPS, next));
      setHops(h);
      if (focusId) fitNeighborhood(focusId, h);
    },
    [focusId, fitNeighborhood],
  );

  const togglePath = useCallback(() => {
    if (!focusId) return;
    if (mode === 'path') {
      setMode('focus');
      fitNeighborhood(focusId, hops);
      return;
    }
    const path = pathToTop(focusId);
    setMode('path');
    const allVisible = [...path.nodes].every((n) => visibleRef.current.has(n));
    if (allVisible) {
      rf.fitView({
        nodes: [...path.nodes].map((id) => ({ id })),
        padding: 0.26,
        duration: fitDuration,
      });
    } else {
      pendingFit.current = { ids: [...path.nodes], padding: 0.26 };
      setExpanded((prev) => new Set([...prev, ...ancestorsToExpand(focusId)]));
    }
  }, [focusId, mode, hops, rf, fitDuration, fitNeighborhood]);

  // Escape returns to the map.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reset]);

  // ── highlight (focus/path dimming) ──────────────────────────────
  const highlight = useMemo(() => {
    if (mode === 'overview' || !focusId) return null;
    return mode === 'path' ? pathToTop(focusId) : neighborhood(focusId, hops);
  }, [mode, focusId, hops]);

  // ── display nodes / edges (only the visible subset) ─────────────
  const displayNodes = useMemo<Node[]>(() => {
    if (!positions) return [];
    return kpiNodes
      .filter((kpi) => visibleIds.has(kpi.id))
      .map((kpi) => {
        let state: NodeState = 'normal';
        if (highlight) {
          if (kpi.id === focusId) state = 'focused';
          else if (highlight.nodes.has(kpi.id)) state = 'active';
          else state = 'dim';
        }
        const data: KpiNodeData = {
          kpi,
          color: sectionColor(kpi.section),
          state,
          expandable: kpi.childrenIds.length > 0,
          isExpanded: expanded.has(kpi.id),
          childCount: kpi.childrenIds.length,
          onToggleExpand: toggleExpand,
        };
        return {
          id: kpi.id,
          type: 'kpi',
          position: positions.get(kpi.id) ?? { x: 0, y: 0 },
          draggable: false,
          data,
          zIndex: state === 'focused' ? 20 : state === 'active' ? 10 : 1,
        };
      });
  }, [positions, visibleIds, highlight, focusId, expanded, toggleExpand]);

  const displayEdges = useMemo<Edge[]>(() => {
    return kpiEdges
      .filter((e) => visibleIds.has(e.childId) && visibleIds.has(e.parentId))
      .map((e) => {
        const relColor = brand.relationship[e.relationship];
        const base: Edge = {
          id: e.id,
          source: e.childId,
          target: e.parentId,
          data: { relationship: e.relationship },
        };
        if (!highlight) {
          return {
            ...base,
            style: { stroke: EDGE_REST, strokeWidth: 1.4, opacity: 0.7 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 13, height: 13, color: EDGE_REST },
          };
        }
        if (highlight.edges.has(e.id)) {
          return {
            ...base,
            animated: mode === 'path',
            style: { stroke: relColor, strokeWidth: 2.6, opacity: 1 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: relColor },
            zIndex: 5,
          };
        }
        return {
          ...base,
          style: { stroke: EDGE_DIM, strokeWidth: 1, opacity: 0.12 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: EDGE_DIM },
        };
      });
  }, [visibleIds, highlight, mode]);

  // Render the canvas only once the first ELK layout is ready.
  if (!positions) {
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
        fitViewOptions={{ padding: 0.18 }}
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
        visibleCount={visibleIds.size}
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
