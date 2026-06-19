# PROGRESS — DIGITALL Webshop KPI Explorer

Authoritative spec: `GOAL.md`. This file tracks phase status. Commit at the end of each phase.

## Phase status

- [x] **Phase 0 — Plan**: Confirm tooling/auth, write phase plan. _(gh ✓, Node v22 ✓, npm ✓, Playwright MCP ✓, Context7 MCP ✓, WebSearch ✓)_
- [x] **Phase 1 — KPI research & taxonomy**: Researched e-commerce KPIs (revenue + margin branches) with cited sources. **Reworked after Checkpoint A round 1** per Chris: all KPIs now concretely measurable, deeper & more granular, refined sections. Result: **87-node, 11-level DAG across 9 sections**, 5 relationship types, 23 cross-branch links. Documented in `docs/TAXONOMY.md`.
- [x] **Phase 2 — Data model & "database"**: `data/kpis.json` + `data/sections.json` source of truth; Zod schema (`scripts/lib/schema.ts`) with a measurable-unit allow-list and derived JSON Schema; `scripts/build-data.ts` validates, checks cycles, assigns levels, enforces 8-15 depth, emits typed module (`src/generated/kpi-data.ts`); CI workflow (`.github/workflows/deploy.yml`). `npm run build:data` and `tsc --noEmit` pass.
- [ ] **⛔ Checkpoint A (HARD STOP — round 2, AWAITING REVIEW)**: Round 1 returned "rework taxonomy" (deeper, all-measurable, refined sections, keep single apex) — done. Re-presenting taxonomy + schema + sample. **Waiting for Chris's confirmation before any UI work.** _Note: commits are local; the push to `main` (which triggers CI/Pages) is intentionally held until the app exists (Phase 4) and Pages is enabled (Phase 6), so the first CI run is green._
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
