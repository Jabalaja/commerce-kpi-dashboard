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
const EDGE_REST = '#c4ccd6';

export function Explorer() {
  const rf = useReactFlow();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([rootId]));
  const [positions, setPositions] = useState<Map<string, XY> | null>(null);
  const [mode, setMode] = useState<Mode>('overview');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hops, setHops] = useState(1);

  const layoutSeq = useRef(0);

  const prefersReduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const fitDuration = prefersReduced ? 0 : 520;

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

  // (Re)lay out the active set whenever it changes. Only the latest run wins.
  useEffect(() => {
    const seq = ++layoutSeq.current;
    computeLayout(dataset, activeRef.current).then((pos) => {
      if (seq === layoutSeq.current) setPositions(pos);
    });
  }, [activeKey]);

  // After a relayout renders, frame the active set.
  useEffect(() => {
    if (!positions) return;
    const ids = [...activeRef.current];
    const padding = modeRef.current === 'overview' ? 0.14 : 0.26;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        rf.fitView({ nodes: ids.map((id) => ({ id })), padding, duration: fitDuration });
      }),
    );
    return () => cancelAnimationFrame(raf);
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

  // ── display nodes / edges (only the active subset) ──────────────
  const displayNodes = useMemo<Node[]>(() => {
    if (!positions) return [];
    return kpiNodes
      .filter((kpi) => activeIds.has(kpi.id))
      .map((kpi) => {
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
  }, [positions, activeIds, focusId, mode, expanded, toggleExpand]);

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
