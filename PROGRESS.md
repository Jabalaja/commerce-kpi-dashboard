# PROGRESS — DIGITALL Webshop KPI Explorer

Authoritative spec: `GOAL.md`. This file tracks phase status. Commit at the end of each phase.

## Phase status

- [x] **Phase 0 — Plan**: Confirm tooling/auth, write phase plan. _(gh ✓, Node v22 ✓, npm ✓, Playwright MCP ✓, Context7 MCP ✓, WebSearch ✓)_
- [ ] **Phase 1 — KPI research & taxonomy**: Research e-commerce KPIs (revenue + margin branches), build an 8–15 level decomposition DAG, organize into sections, capture relationship types, definitions, formulas, levers, and sourced benchmarks.
- [ ] **Phase 2 — Data model & "database"**: JSON source of truth under `data/`, machine-validated schema (Zod + JSON Schema), build/validation step that checks cycles + assigns levels + emits a typed data module, GitHub Actions workflow (validate + build + deploy on push to `main`).
- [ ] **⛔ Checkpoint A (HARD STOP)**: Present KPI taxonomy (tree with levels + sections), the data schema, and a sample of populated entries. **Wait for Chris's confirmation before any UI work.**
- [ ] **Phase 3 — Brand extraction**: Playwright MCP against https://digitall.com/, extract palette/typography/spacing/buttons/logo into `src/theme/brand.ts`.
- [ ] **Phase 4 — Build app**: Vite + React + TS (strict), `base` = repo name. React Flow + layered auto-layout (ELK/Dagre). Overview, click-to-focus drilldown, detail panel, path-to-top. Section grouping in brand palette. Presenter-friendly.
- [ ] **Phase 5 — Verify with Playwright MCP**: Build + serve locally, verify overview/focus/detail/path-to-top, no console errors, smaller-viewport layout.
- [ ] **Phase 6 — Deploy to GitHub Pages**: Pages source = GitHub Actions, push, confirm workflow + live URL, Playwright pass against live site.

## Key decisions (log as made)

- Source-of-truth format: **JSON** under `data/` (decision in Phase 2).
- Schema: **Zod** as the single source, JSON Schema derived from it (decision in Phase 2).
- Visualization stack: React Flow (`@xyflow/react`) + layered auto-layout — confirm in Phase 4 via Context7.

## Notes

- Repo: `Jabalaja/commerce-kpi-dashboard` (Pages will serve from `/commerce-kpi-dashboard/`).
- Hard rule: app reads KPI content only from the generated data artifact; nothing hard-coded in components.
