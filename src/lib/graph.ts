import { dataset } from '../generated/kpi-data';
import type { KpiNode, Section, SectionId } from '../kpi-types';
import { brand } from '../theme/brand';

export { dataset };
export const nodes = dataset.nodes;
export const sections = dataset.sections;
export const meta = dataset.meta;

export const nodeById = new Map<string, KpiNode>(nodes.map((n) => [n.id, n]));
export const sectionById = new Map<SectionId, Section>(sections.map((s) => [s.id, s]));

export const sectionColor = (id: SectionId): string => brand.section[id] ?? brand.color.blue;

/** Edge id convention used everywhere: `${childId}->${parentId}`. */
export const edgeId = (childId: string, parentId: string): string => `${childId}->${parentId}`;

export interface KpiEdge {
  id: string;
  childId: string;
  parentId: string;
  relationship: string;
}

/** Every parent link in the graph, as a flat edge list. */
export const edges: KpiEdge[] = nodes.flatMap((n) =>
  n.parents.map((p) => ({
    id: edgeId(n.id, p.id),
    childId: n.id,
    parentId: p.id,
    relationship: p.relationship,
  })),
);

/** Undirected adjacency (parents + children) for neighborhood queries. */
const neighbors = new Map<string, Set<string>>(nodes.map((n) => [n.id, new Set<string>()]));
for (const n of nodes) {
  for (const p of n.parents) {
    neighbors.get(n.id)!.add(p.id);
    neighbors.get(p.id)!.add(n.id);
  }
}

export interface Highlight {
  nodes: Set<string>;
  edges: Set<string>;
}

/** Nodes (and connecting edges) within `hops` of `id`, following parents and children. */
export function neighborhood(id: string, hops: number): Highlight {
  const nodeSet = new Set<string>([id]);
  let frontier = [id];
  for (let h = 0; h < hops; h++) {
    const next: string[] = [];
    for (const cur of frontier) {
      for (const nb of neighbors.get(cur) ?? []) {
        if (!nodeSet.has(nb)) {
          nodeSet.add(nb);
          next.push(nb);
        }
      }
    }
    frontier = next;
  }
  return { nodes: nodeSet, edges: edgesWithin(nodeSet) };
}

/**
 * The full upward cone from `id` to the roots: every ancestor reachable by
 * following parents, plus the edges along the way. This is the "path to the top".
 */
export function pathToTop(id: string): Highlight {
  const nodeSet = new Set<string>([id]);
  const edgeSet = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    const node = nodeById.get(cur);
    if (!node) continue;
    for (const p of node.parents) {
      edgeSet.add(edgeId(cur, p.id));
      if (!nodeSet.has(p.id)) {
        nodeSet.add(p.id);
        stack.push(p.id);
      }
    }
  }
  return { nodes: nodeSet, edges: edgeSet };
}

/** All edges whose both endpoints are inside `nodeSet`. */
function edgesWithin(nodeSet: Set<string>): Set<string> {
  const result = new Set<string>();
  for (const e of edges) {
    if (nodeSet.has(e.childId) && nodeSet.has(e.parentId)) result.add(e.id);
  }
  return result;
}
