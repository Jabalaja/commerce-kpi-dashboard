import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { KpiDataset } from '../kpi-types';

const elk = new ELK();

/** Fixed node box, shared with the custom node component and ELK. */
export const NODE_W = 220;
export const NODE_H = 72;

export interface XY {
  x: number;
  y: number;
}

/**
 * Lays the KPI DAG out top-down with ELK's layered algorithm.
 * Edges are fed parent -> child so roots (Net Profit) sit in the top layer and
 * leaf levers at the bottom. Children are ordered by (level, section, name) and
 * `considerModelOrder` biases same-section nodes to sit together, so each
 * section reads as a contiguous band.
 */
export async function computeLayout(dataset: KpiDataset): Promise<Map<string, XY>> {
  const sectionOrder = new Map(dataset.sections.map((s) => [s.id, s.order]));

  const ordered = dataset.nodes.slice().sort(
    (a, b) =>
      a.level - b.level ||
      (sectionOrder.get(a.section)! - sectionOrder.get(b.section)!) ||
      a.name.localeCompare(b.name),
  );

  const children = ordered.map((n) => ({ id: n.id, width: NODE_W, height: NODE_H }));

  const edges = dataset.nodes.flatMap((n) =>
    n.parents.map((p) => ({
      id: `${n.id}->${p.id}`,
      sources: [p.id], // parent first => parent placed above
      targets: [n.id],
    })),
  );

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.spacing.nodeNodeBetweenLayers': '95',
      'elk.spacing.nodeNode': '26',
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
