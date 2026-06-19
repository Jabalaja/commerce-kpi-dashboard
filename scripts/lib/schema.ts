/**
 * Zod schema — the machine-validated contract for the KPI "database".
 * Any edit to data/kpis.json or data/sections.json is checked against this
 * before the app can build, so the data can never silently break.
 */
import { z } from 'zod';

export const RELATIONSHIPS = [
  'multiplicative',
  'additive',
  'inverse',
  'cost',
  'driver',
] as const;

export const MAGNITUDES = ['low', 'medium', 'high'] as const;

/**
 * Allowed units. Deliberately restricted to concrete, measurable units so that
 * every KPI is unambiguously measurable (no "score" / "qualitative" nodes).
 * Qualitative levers belong in the `levers` array, not as a KPI.
 */
export const UNITS = [
  '%',
  'currency',
  'count',
  'ratio',
  'seconds',
  'ms',
  'days',
  'months',
  'KB',
  'rating',
  'nps',
] as const;

export const SECTION_IDS = [
  'business',
  'acquisition',
  'product',
  'basket',
  'checkout',
  'performance',
  'fulfillment',
  'retention',
  'cost',
] as const;

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ParentLinkSchema = z
  .object({
    id: z.string().regex(idPattern, 'parent id must be kebab-case'),
    relationship: z.enum(RELATIONSHIPS),
    note: z.string().min(1).optional(),
  })
  .strict();

export const LeverSchema = z
  .object({
    action: z.string().min(1),
    impact: z.enum(MAGNITUDES),
    effort: z.enum(MAGNITUDES),
    description: z.string().min(1).optional(),
  })
  .strict();

export const BenchmarkSchema = z
  .object({
    label: z.string().min(1),
    value: z.string().min(1),
    source: z.string().url('benchmark source must be a URL so it is defensible'),
    note: z.string().min(1).optional(),
  })
  .strict();

export const KpiSourceSchema = z
  .object({
    id: z.string().regex(idPattern, 'id must be kebab-case'),
    name: z.string().min(1),
    section: z.enum(SECTION_IDS),
    definition: z.string().min(1),
    formula: z.string().min(1),
    unit: z.enum(UNITS),
    parents: z.array(ParentLinkSchema),
    levers: z.array(LeverSchema),
    benchmarks: z.array(BenchmarkSchema),
  })
  .strict();

export const KpisFileSchema = z.array(KpiSourceSchema);

export const SectionSchema = z
  .object({
    id: z.enum(SECTION_IDS),
    label: z.string().min(1),
    description: z.string().min(1),
    order: z.number().int().nonnegative(),
  })
  .strict();

export const SectionsFileSchema = z.array(SectionSchema);

export type KpiSourceInput = z.infer<typeof KpiSourceSchema>;
export type SectionInput = z.infer<typeof SectionSchema>;
