import { useCallback, useEffect, useMemo, useState } from 'react';
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
  dataset,
  edges as kpiEdges,
  neighborhood,
  nodeById,
  nodes as kpiNodes,
  pathToTop,
  sectionColor,
  sections,
} from './lib/graph';
import { computeLayout, type XY } from './lib/layout';
import { brand } from './theme/brand';

const nodeTypes = { kpi: KpiNodeView };
const MAX_HOPS = 4;
const EDGE_DIM = '#d9dee5';
const EDGE_OVERVIEW = '#cdd5de';

export function Explorer() {
  const rf = useReactFlow();
  const [positions, setPositions] = useState<Map<string, XY> | null>(null);
  const [mode, setMode] = useState<Mode>('overview');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hops, setHops] = useState(1);

  // Lay the graph out once with ELK.
  useEffect(() => {
    let alive = true;
    computeLayout(dataset).then((pos) => {
      if (alive) setPositions(pos);
    });
    return () => {
      alive = false;
    };
  }, []);

  const focusKpi = focusId ? nodeById.get(focusId) ?? null : null;

  // ── camera helpers ──────────────────────────────────────────────
  const fitToNodes = useCallback(
    (ids: Iterable<string>) => {
      rf.fitView({ nodes: [...ids].map((id) => ({ id })), padding: 0.28, duration: 600 });
    },
    [rf],
  );
  const fitAll = useCallback(() => rf.fitView({ padding: 0.12, duration: 600 }), [rf]);

  // ── actions ─────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setMode('overview');
    setOpen(false);
    fitAll();
  }, [fitAll]);

  const focusOn = useCallback(
    (id: string) => {
      setMode('focus');
      setFocusId(id);
      setHops(1);
      setOpen(true);
      fitToNodes(neighborhood(id, 1).nodes);
    },
    [fitToNodes],
  );

  const changeHops = useCallback(
    (next: number) => {
      const h = Math.max(1, Math.min(MAX_HOPS, next));
      setHops(h);
      if (focusId) fitToNodes(neighborhood(focusId, h).nodes);
    },
    [focusId, fitToNodes],
  );

  const togglePath = useCallback(() => {
    if (!focusId) return;
    if (mode === 'path') {
      setMode('focus');
      fitToNodes(neighborhood(focusId, hops).nodes);
    } else {
      setMode('path');
      fitToNodes(pathToTop(focusId).nodes);
    }
  }, [focusId, mode, hops, fitToNodes]);

  // Escape returns to the full map.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reset]);

  // ── base elements ───────────────────────────────────────────────
  const baseNodes = useMemo<Node[]>(() => {
    if (!positions) return [];
    return kpiNodes.map((kpi) => ({
      id: kpi.id,
      type: 'kpi',
      position: positions.get(kpi.id) ?? { x: 0, y: 0 },
      draggable: false,
      data: { kpi, color: sectionColor(kpi.section), state: 'normal' } as KpiNodeData,
    }));
  }, [positions]);

  const baseEdges = useMemo<Edge[]>(
    () =>
      kpiEdges.map((e) => ({
        id: e.id,
        source: e.childId,
        target: e.parentId,
        data: { relationship: e.relationship },
        markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
      })),
    [],
  );

  // ── highlight + styled display elements ─────────────────────────
  const highlight = useMemo(() => {
    if (mode === 'overview' || !focusId) return null;
    return mode === 'path' ? pathToTop(focusId) : neighborhood(focusId, hops);
  }, [mode, focusId, hops]);

  const displayNodes = useMemo<Node[]>(
    () =>
      baseNodes.map((n) => {
        let state: NodeState = 'normal';
        if (highlight) {
          if (n.id === focusId) state = 'focused';
          else if (highlight.nodes.has(n.id)) state = 'active';
          else state = 'dim';
        }
        return {
          ...n,
          data: { ...(n.data as KpiNodeData), state },
          zIndex: state === 'focused' ? 20 : state === 'active' ? 10 : 0,
        };
      }),
    [baseNodes, highlight, focusId],
  );

  const displayEdges = useMemo<Edge[]>(
    () =>
      baseEdges.map((e) => {
        const rel = (e.data as { relationship: string }).relationship;
        const relColor = brand.relationship[rel];
        if (!highlight) {
          return {
            ...e,
            style: { stroke: EDGE_OVERVIEW, strokeWidth: 1.2, opacity: 0.85 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: EDGE_OVERVIEW },
          };
        }
        if (highlight.edges.has(e.id)) {
          return {
            ...e,
            animated: mode === 'path',
            style: { stroke: relColor, strokeWidth: 2.4, opacity: 1 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: relColor },
            zIndex: 5,
          };
        }
        return {
          ...e,
          style: { stroke: EDGE_DIM, strokeWidth: 1, opacity: 0.1 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: EDGE_DIM },
        };
      }),
    [baseEdges, highlight, mode],
  );

  // Render the canvas only once ELK positions are ready, so React Flow's
  // `fitView` fits the real, measured nodes on mount (centered, correctly scaled).
  if (!positions) {
    return <div className="loading">Laying out {kpiNodes.length} KPIs…</div>;
  }

  return (
    <>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => focusOn(node.id)}
        onPaneClick={reset}
        minZoom={0.1}
        maxZoom={2.2}
        proOptions={{ hideAttribution: false }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.14 }}
      >
        <Background gap={28} color="#e3e8ee" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => sectionColor((n.data as KpiNodeData).kpi.section)}
          nodeStrokeWidth={2}
          maskColor="rgba(11,20,55,0.06)"
        />
      </ReactFlow>

      <Toolbar
        mode={mode}
        focusKpi={focusKpi}
        hops={hops}
        maxHops={MAX_HOPS}
        sections={sections}
        allNodes={kpiNodes}
        onReset={reset}
        onHopsChange={changeHops}
        onTogglePath={togglePath}
        onSelectKpi={focusOn}
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
