# DIGITALL Webshop KPI Explorer

An interactive, visual tool for consulting engagements that shows how a webshop's
operational KPIs ladder up into a client's top-level business outcomes: **money
earned** (Revenue) and **money saved** (Gross Margin), both rolling into **Net
Profit**. It supports two directions of exploration:

- **Top-to-bottom:** start at Net Profit / Revenue and drill into the drivers.
- **Bottom-to-top:** start at a small operational lever and trace its "path to the
  top" all the way up to Revenue and Margin.

It is built to be used live in front of prospects and CFOs: every relationship is
explicit, every KPI is concretely measurable, and every benchmark carries a
citable source.

**Live:** https://jabalaja.github.io/commerce-kpi-dashboard/

## What's in it

- **87 KPIs**, **11 levels** deep, across **9 sections**, a single connected DAG
  rooted at Net Profit (0 cycles, machine-verified).
- Every KPI has a real formula and a numeric unit (no qualitative "scores").
- **23 cross-branch links** so a single lever (e.g. Return Rate, site speed) can
  be shown laddering up into both money earned and money saved.
- **31 sourced benchmarks** (Baymard, Deloitte, IRP Commerce, NRF, Littledata, etc.).

See [`docs/TAXONOMY.md`](docs/TAXONOMY.md) for the full tree, relationship types,
and sources.

## Quick start

```bash
npm install
npm run dev      # build the data, then start Vite on http://localhost:5173/commerce-kpi-dashboard/
npm run build    # validate data, typecheck, and build the static site into dist/
npm run preview  # serve the production build locally
```

## Extending the "database" (no developer required)

The KPI data is a version-controlled source of truth, not a running database.
**Edit the JSON, push to `main`, and the live tool rebuilds and redeploys itself.**

1. Edit [`data/kpis.json`](data/kpis.json). Each KPI looks like:

   ```jsonc
   {
     "id": "checkout-completion-rate",       // unique, kebab-case
     "name": "Checkout Completion Rate",
     "section": "checkout",                   // must exist in data/sections.json
     "definition": "Share of started checkouts that complete.",
     "formula": "Completed Checkouts / Started Checkouts x 100",
     "unit": "%",                             // must be a measurable unit (see below)
     "parents": [
       { "id": "conversion-rate", "relationship": "multiplicative", "note": "Final funnel stage." }
     ],
     "levers":     [ { "action": "Offer guest checkout", "impact": "high", "effort": "low", "description": "…" } ],
     "benchmarks": [ { "label": "…", "value": "45-55%", "source": "https://…" } ]
   }
   ```

2. Run `npm run build:data` (or just `npm run build`). The build **fails loudly**
   if anything is wrong: schema violations, duplicate ids, unknown parent/section
   references, cycles, a non-measurable unit, or a depth outside 8 to 15 levels.

3. Commit and push to `main`. GitHub Actions revalidates, rebuilds, and redeploys.

### Rules the data must follow

- **Measurable units only.** `unit` must be one of: `%`, `currency`, `count`,
  `ratio`, `seconds`, `ms`, `days`, `months`, `KB`, `rating`, `nps`. Qualitative
  factors (trust signals, UX quality) belong in `levers`, not as a KPI.
- **Relationship types** (how a child influences its parent):
  `multiplicative`, `additive`, `inverse`, `cost`, `driver`. A `driver` edge has
  no closed-form formula, so its `note` states the direction.
- A KPI may have **multiple parents** (cross-branch links are encouraged) but the
  graph must stay a **DAG** (no cycles). Levels are assigned automatically as the
  longest path from the root.
- Add a new section by adding it to [`data/sections.json`](data/sections.json) and
  to `SectionId` in `src/kpi-types.ts` + `SECTION_IDS` in `scripts/lib/schema.ts`,
  plus a color in `src/theme/brand.ts`.

## Architecture decisions

- **Data model: JSON + Zod, compiled into a typed module.**
  `data/kpis.json` is the single source of truth. `scripts/build-data.ts`
  validates it against the Zod schema (`scripts/lib/schema.ts`), checks for cycles,
  assigns each KPI its level (longest path from the root), resolves children, and
  emits `src/generated/kpi-data.ts`. **The app reads only this generated artifact;
  no KPI content is hard-coded in components.** A JSON Schema is also emitted to
  `data/schema/kpi.schema.json` for editor validation. This keeps the tool
  static-host-friendly (no backend) and makes data edits safe and reviewable.

- **Visualization: React Flow (`@xyflow/react`) + ELK layered layout (`elkjs`).**
  React Flow gives built-in zoom/pan/fit-view and custom nodes; ELK's `layered`
  algorithm (direction `DOWN`, parent-above-child) produces a clean top-down
  decomposition tree and assigns layers consistently with our computed levels.
  Layout is computed once on load; focus/path states are then derived as styling
  over the fixed positions.

- **Single apex `Net Profit`.** Revenue (earned) and Gross Margin (saved) are the
  two pillars beneath it, so the "path to the top" always resolves to a defensible
  business outcome.

- **Branding from source.** `src/theme/brand.ts` holds design tokens extracted
  from digitall.com (brand blue `#1818bf` + sky `#64c7f3`, Montserrat, surfaces),
  and `src/theme/digitallLogo.ts` is the real DIGITALL wordmark.

## Using it live (presentation)

- The **overview** shows the whole tree; sections are color-coded (see the legend).
- **Click any node** (or use "Jump to a KPI") to focus it: the view zooms to its
  neighbourhood, dims the rest, and opens a detail panel with the definition,
  formula, levers, and sourced benchmarks. Use the hop stepper to widen the view.
- **"Path to the top"** highlights the full chain from a lever up to Revenue and
  Margin. Click the background or press `Esc` to return to the full map.
- **Presenter mode** (top right) goes full-screen.

## Project structure

```
data/            kpis.json, sections.json (source of truth) + generated JSON Schema
scripts/         build-data.ts (validate + generate) and the Zod schema
src/
  generated/     kpi-data.ts (auto-generated; do not edit)
  theme/         brand.ts (design tokens), digitallLogo.ts (wordmark)
  lib/           graph.ts (adjacency, path-to-top), layout.ts (ELK), format.ts
  components/    KpiNodeView, DetailPanel, Toolbar, Legend, AppHeader
  Explorer.tsx   the graph + overview/focus/path interactions
docs/TAXONOMY.md the full KPI taxonomy and benchmark sources
.github/workflows/deploy.yml   validate -> build -> deploy to GitHub Pages on push to main
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which runs
`npm run validate:data`, `npm run build`, and deploys `dist/` to GitHub Pages.
Pages source must be set to "GitHub Actions" (Settings → Pages). The Vite `base`
is set to `/commerce-kpi-dashboard/` to match the project Pages path.
