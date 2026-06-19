# PROGRESS — DIGITALL Webshop KPI Explorer

Authoritative spec: `GOAL.md`. This file tracks phase status. Commit at the end of each phase.

## Phase status

- [x] **Phase 0 — Plan**: Confirm tooling/auth, write phase plan. _(gh ✓, Node v22 ✓, npm ✓, Playwright MCP ✓, Context7 MCP ✓, WebSearch ✓)_
- [x] **Phase 1 — KPI research & taxonomy**: Researched e-commerce KPIs (revenue + margin branches) with cited sources. **Reworked after Checkpoint A round 1** per Chris: all KPIs now concretely measurable, deeper & more granular, refined sections. Result: **87-node, 11-level DAG across 9 sections**, 5 relationship types, 23 cross-branch links. Documented in `docs/TAXONOMY.md`.
- [x] **Phase 2 — Data model & "database"**: `data/kpis.json` + `data/sections.json` source of truth; Zod schema (`scripts/lib/schema.ts`) with a measurable-unit allow-list and derived JSON Schema; `scripts/build-data.ts` validates, checks cycles, assigns levels, enforces 8-15 depth, emits typed module (`src/generated/kpi-data.ts`); CI workflow (`.github/workflows/deploy.yml`). `npm run build:data` and `tsc --noEmit` pass.
- [x] **⛔ Checkpoint A — APPROVED (round 2)**: Round 1 → "rework taxonomy" (deeper, all-measurable, refined sections, keep single apex); reworked to 87 nodes / 11 levels / 9 sections. Round 2 → **approved ("Freigeben, weiter zur UI")**. UI work unblocked.
- [x] **Phase 3 — Brand extraction**: Playwright against https://digitall.com/ (confirmed: "DIGITALL – a technology company"). Extracted logo colors (sky `#64c7f3` + deep blue `#1818bf`), ink `#383838`, surface `#edeeef`, Montserrat, rounded sky CTAs. Tokens in `src/theme/brand.ts`; real wordmark SVG in `src/theme/digitallLogo.ts`.
- [x] **Phase 4 — Build app**: Vite + React + TS strict, `base=/commerce-kpi-dashboard/`. React Flow (`@xyflow/react`) + ELK layered auto-layout (consulted via Context7). Overview, click-to-focus drilldown (dim others), detail panel (definition/formula/levers/sourced benchmarks), path-to-top (full upward cone), section color grouping, presenter/full-screen. `npm run build` + `tsc --noEmit` pass.
- [x] **Phase 5 — Verify with Playwright MCP**: Verified locally — overview renders (87 nodes centered), click → focus shows only connected, detail panel correct, path-to-top highlights both branches, **0 console errors** (added inline SVG favicon), layout holds at 768px.
- [x] **Phase 6 — Deploy to GitHub Pages**: Repo made public (Chris approved; Pages needs public on Free plan), Pages source = GitHub Actions, pushed to `main`. Workflow green (validate + build + deploy). **Live + verified with Playwright (87 nodes, focus works, 0 console errors):** https://jabalaja.github.io/commerce-kpi-dashboard/

## ✅ Done

All phases complete. Live URL: **https://jabalaja.github.io/commerce-kpi-dashboard/**
Extend the data via `data/kpis.json` + push to `main` → CI redeploys automatically.

## Key decisions (log as made)

- Source-of-truth format: **JSON** under `data/` (decision in Phase 2).
- Schema: **Zod** as the single source, JSON Schema derived from it (decision in Phase 2).
- Visualization stack: React Flow (`@xyflow/react`) + layered auto-layout — confirm in Phase 4 via Context7.

## Notes

- Repo: `Jabalaja/commerce-kpi-dashboard` (Pages will serve from `/commerce-kpi-dashboard/`).
- Hard rule: app reads KPI content only from the generated data artifact; nothing hard-coded in components.
