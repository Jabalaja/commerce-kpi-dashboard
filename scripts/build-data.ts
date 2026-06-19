/**
 * build-data.ts — compiles the version-controlled KPI "database" into a typed,
 * graph-resolved module the React app imports.
 *
 * Steps:
 *   1. Load data/sections.json and data/kpis.json.
 *   2. Validate both against the Zod schema (scripts/lib/schema.ts).
 *   3. Integrity checks: unique ids, every parent id resolves, every section
 *      exists, no self-references.
 *   4. Detect cycles (the graph must be a DAG).
 *   5. Assign each KPI a level = longest path from a root (a node with no parents).
 *   6. Resolve children (inverse of parent edges).
 *   7. Enforce the 8..15 level-depth requirement from the spec.
 *   8. Emit src/generated/kpi-data.ts (+ .json) and data/schema/kpi.schema.json.
 *
 * Run with `--check` to validate without writing any artifacts (used in CI gates).
 *
 * Usage: tsx scripts/build-data.ts [--check]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  KpisFileSchema,
  SectionsFileSchema,
  KpiSourceSchema,
  type KpiSourceInput,
  type SectionInput,
} from './lib/schema.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const checkOnly = process.argv.includes('--check');

const MIN_DEPTH = 8;
const MAX_DEPTH = 15;

function fail(message: string): never {
  console.error(`\n✖ build:data failed\n  ${message}\n`);
  process.exit(1);
}

function readJson(relPath: string): unknown {
  const abs = resolve(root, relPath);
  try {
    return JSON.parse(readFileSync(abs, 'utf8'));
  } catch (err) {
    return fail(`Could not read/parse ${relPath}: ${(err as Error).message}`);
  }
}

// ── 1. Load ──────────────────────────────────────────────────────────────────
const rawSections = readJson('data/sections.json');
const rawKpis = readJson('data/kpis.json');

// ── 2. Schema validation ─────────────────────────────────────────────────────
const sectionsResult = SectionsFileSchema.safeParse(rawSections);
if (!sectionsResult.success) {
  fail(`data/sections.json invalid:\n${formatZodError(sectionsResult.error.issues)}`);
}
const kpisResult = KpisFileSchema.safeParse(rawKpis);
if (!kpisResult.success) {
  fail(`data/kpis.json invalid:\n${formatZodError(kpisResult.error.issues)}`);
}

const sections: SectionInput[] = sectionsResult.data;
const kpis: KpiSourceInput[] = kpisResult.data;

// ── 3. Integrity checks ──────────────────────────────────────────────────────
const sectionIds = new Set(sections.map((s) => s.id));
const byId = new Map<string, KpiSourceInput>();
for (const kpi of kpis) {
  if (byId.has(kpi.id)) fail(`Duplicate KPI id: "${kpi.id}"`);
  byId.set(kpi.id, kpi);
}

for (const kpi of kpis) {
  if (!sectionIds.has(kpi.section)) {
    fail(`KPI "${kpi.id}" references unknown section "${kpi.section}".`);
  }
  for (const parent of kpi.parents) {
    if (parent.id === kpi.id) fail(`KPI "${kpi.id}" lists itself as a parent.`);
    if (!byId.has(parent.id)) {
      fail(`KPI "${kpi.id}" references unknown parent "${parent.id}".`);
    }
  }
}

const rootIds = kpis.filter((k) => k.parents.length === 0).map((k) => k.id);
if (rootIds.length === 0) {
  fail('No root KPI found (every KPI has a parent — the graph cannot be a tree).');
}

// ── 4. Cycle detection (DFS over parent edges) ───────────────────────────────
const WHITE = 0,
  GRAY = 1,
  BLACK = 2;
const color = new Map<string, number>(kpis.map((k) => [k.id, WHITE]));

function visit(id: string, stack: string[]): void {
  color.set(id, GRAY);
  stack.push(id);
  for (const parent of byId.get(id)!.parents) {
    const c = color.get(parent.id);
    if (c === GRAY) {
      const cycleStart = stack.indexOf(parent.id);
      const cycle = [...stack.slice(cycleStart), parent.id].join(' → ');
      fail(`Cycle detected (graph must be a DAG): ${cycle}`);
    }
    if (c === WHITE) visit(parent.id, stack);
  }
  stack.pop();
  color.set(id, BLACK);
}
for (const kpi of kpis) {
  if (color.get(kpi.id) === WHITE) visit(kpi.id, []);
}

// ── 5. Level assignment (longest path from a root) ───────────────────────────
const levelMemo = new Map<string, number>();
function levelOf(id: string): number {
  const cached = levelMemo.get(id);
  if (cached !== undefined) return cached;
  const node = byId.get(id)!;
  const level =
    node.parents.length === 0
      ? 1
      : 1 + Math.max(...node.parents.map((p) => levelOf(p.id)));
  levelMemo.set(id, level);
  return level;
}

// ── 6. Resolve children ──────────────────────────────────────────────────────
const children = new Map<string, string[]>(kpis.map((k) => [k.id, []]));
for (const kpi of kpis) {
  for (const parent of kpi.parents) {
    children.get(parent.id)!.push(kpi.id);
  }
}

const nodes = kpis
  .map((kpi) => ({
    ...kpi,
    level: levelOf(kpi.id),
    childrenIds: children.get(kpi.id)!,
  }))
  .sort((a, b) => a.level - b.level || a.section.localeCompare(b.section) || a.id.localeCompare(b.id));

const maxLevel = Math.max(...nodes.map((n) => n.level));

// ── 7. Depth requirement ─────────────────────────────────────────────────────
if (maxLevel < MIN_DEPTH) {
  fail(`Decomposition is only ${maxLevel} levels deep; spec requires at least ${MIN_DEPTH}.`);
}
if (maxLevel > MAX_DEPTH) {
  fail(`Decomposition is ${maxLevel} levels deep; spec caps it at ${MAX_DEPTH}.`);
}

// ── Summary ──────────────────────────────────────────────────────────────────
const perSection = sections
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((s) => `    ${s.label.padEnd(24)} ${nodes.filter((n) => n.section === s.id).length}`)
  .join('\n');
const benchmarkCount = nodes.reduce((sum, n) => sum + n.benchmarks.length, 0);

console.log(`\n✓ KPI data validated`);
console.log(`  KPIs:        ${nodes.length}`);
console.log(`  Roots:       ${rootIds.join(', ')}`);
console.log(`  Max depth:   ${maxLevel} levels (required ${MIN_DEPTH}-${MAX_DEPTH})`);
console.log(`  Benchmarks:  ${benchmarkCount} sourced`);
console.log(`  Per section:\n${perSection}`);

if (checkOnly) {
  console.log('\n(--check: no artifacts written)\n');
  process.exit(0);
}

// ── 8. Emit artifacts ────────────────────────────────────────────────────────
const dataset = {
  sections: sections.slice().sort((a, b) => a.order - b.order),
  nodes,
  meta: {
    nodeCount: nodes.length,
    maxLevel,
    rootIds,
    generatedFrom: 'data/kpis.json',
  },
};

mkdirSync(resolve(root, 'src/generated'), { recursive: true });
mkdirSync(resolve(root, 'data/schema'), { recursive: true });

const banner =
  '// AUTO-GENERATED by scripts/build-data.ts — do not edit by hand.\n' +
  '// Edit data/kpis.json and run `npm run build:data`.\n';

writeFileSync(
  resolve(root, 'src/generated/kpi-data.ts'),
  `${banner}import type { KpiDataset } from '../kpi-types';\n\n` +
    `export const dataset: KpiDataset = ${JSON.stringify(dataset, null, 2)} as const;\n\n` +
    `export const nodes = dataset.nodes;\n` +
    `export const sections = dataset.sections;\n`,
);

writeFileSync(
  resolve(root, 'src/generated/kpi-data.json'),
  `${JSON.stringify(dataset, null, 2)}\n`,
);

const jsonSchema = zodToJsonSchema(KpiSourceSchema, 'KpiSource');
writeFileSync(
  resolve(root, 'data/schema/kpi.schema.json'),
  `${JSON.stringify(jsonSchema, null, 2)}\n`,
);

console.log('\n✓ Wrote src/generated/kpi-data.ts, src/generated/kpi-data.json, data/schema/kpi.schema.json\n');

// ── helpers ──────────────────────────────────────────────────────────────────
function formatZodError(issues: { path: (string | number)[]; message: string }[]): string {
  return issues
    .slice(0, 20)
    .map((i) => `    • ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}
