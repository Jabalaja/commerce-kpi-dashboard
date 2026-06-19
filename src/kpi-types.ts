/**
 * Public, hand-written types for the KPI data model.
 *
 * `KpiSource` describes the shape authors edit in `data/kpis.json`.
 * `KpiNode` adds the fields the build step computes (level, children).
 * The React app imports `KpiDataset` from the generated module; it never
 * reads the raw JSON directly and never hard-codes KPI content.
 */

/** How a child KPI influences its parent. Drives edge styling and the impact story. */
export type Relationship =
  /** Child is a multiplicative factor of the parent (e.g. funnel stages, AOV = items x price). */
  | 'multiplicative'
  /** Child sums into the parent (e.g. traffic channels, cost line items). */
  | 'additive'
  /** Increasing the child decreases the parent (e.g. abandonment reduces completion). */
  | 'inverse'
  /** Child is a cost line that reduces profit / margin (money out). */
  | 'cost'
  /** Qualitative or empirical influence with no closed-form formula; direction is in `note`. */
  | 'driver';

/** Rough magnitude scale, used for both lever impact and lever effort. */
export type Magnitude = 'low' | 'medium' | 'high';

/** The visual sections KPIs are grouped into. */
export type SectionId =
  | 'business'
  | 'acquisition'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'fulfillment'
  | 'retention'
  | 'cost';

export interface ParentLink {
  /** id of the parent KPI this node ladders up into. */
  id: string;
  relationship: Relationship;
  /** Short, human-readable explanation of how this child moves the parent. */
  note?: string;
}

export interface Lever {
  action: string;
  impact: Magnitude;
  effort: Magnitude;
  description?: string;
}

export interface Benchmark {
  label: string;
  value: string;
  /** URL of the source so a consultant can defend the number in front of a CFO. */
  source: string;
  note?: string;
}

/** A KPI exactly as authored in `data/kpis.json`. */
export interface KpiSource {
  id: string;
  name: string;
  section: SectionId;
  definition: string;
  formula: string;
  unit: string;
  parents: ParentLink[];
  levers: Lever[];
  benchmarks: Benchmark[];
}

/** A KPI after the build step resolves the graph. */
export interface KpiNode extends KpiSource {
  /** 1 = top business KPI; each level below decomposes the level above. */
  level: number;
  /** ids of KPIs that have this node as a parent (i.e. its drivers). */
  childrenIds: string[];
}

export interface Section {
  id: SectionId;
  label: string;
  description: string;
  order: number;
}

export interface KpiDataset {
  sections: Section[];
  nodes: KpiNode[];
  meta: {
    nodeCount: number;
    maxLevel: number;
    rootIds: string[];
    generatedFrom: string;
  };
}
