import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { KpiDataset, KpiNode } from '../kpi-types';

const elk = new ELK();

export interface XY {
  x: number;
  y: number;
}

/**
 * Per-level node box. The apex (Net Profit) is the hero; L2 pillars are larger
 * than the rest. These MUST match the `.kpi-node` size variants in index.css so
 * edges attach correctly.
 */
export function nodeSize(node: KpiNode): { width: number; height: number } {
  if (node.level === 1) return { width: 300, height: 108 }; // apex hero
  if (node.level === 2) return { width: 256, height: 92 }; // pillars
  return { width: 234, height: 84 }; // everything else
}

/**
 * Lays out the *visible* subset of the KPI DAG top-down with ELK's layered
 * algorithm. Edges are fed parent -> child so the root (Net Profit) sits at the
 * top. With progressive disclosure only a handful of nodes are visible at once,
 * so layouts are small, fast, and airy.
 */
export async function computeLayout(
  dataset: KpiDataset,
  visibleIds?: Set<string>,
): Promise<Map<string, XY>> {
  const sectionOrder = new Map(dataset.sections.map((s) => [s.id, s.order]));
  const visible = visibleIds ?? new Set(dataset.nodes.map((n) => n.id));
  const visibleNodes = dataset.nodes.filter((n) => visible.has(n.id));

  const ordered = visibleNodes.slice().sort(
    (a, b) =>
      a.level - b.level ||
      (sectionOrder.get(a.section)! - sectionOrder.get(b.section)!) ||
      a.name.localeCompare(b.name),
  );

  const children = ordered.map((n) => ({ id: n.id, ...nodeSize(n) }));

  const edges = dataset.nodes.flatMap((n) =>
    n.parents
      .filter((p) => visible.has(n.id) && visible.has(p.id))
      .map((p) => ({ id: `${n.id}->${p.id}`, sources: [p.id], targets: [n.id] })),
  );

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.spacing.nodeNodeBetweenLayers': '92',
      'elk.spacing.nodeNode': '38',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'POLYLINE',
    },
    children,
    edges,
  };

  const result = await elk.layout(graph);
  const positions = new Map<string, XY>();
  for (const child of result.children ?? []) {
    positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }
  return positions;
}
