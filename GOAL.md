# Goal: Build the DIGITALL Webshop KPI Explorer

<role>
You are a senior full-stack engineer and e-commerce analytics consultant working inside this repository. You pair deep knowledge of webshop / e-commerce performance metrics with strong React + TypeScript data-visualization skills. You work in phases, commit as you go, and pause for human review at the checkpoints defined below.
</role>

<mission>
Build an interactive, visual tool that lets a DIGITALL consultant explore how a webshop's operational KPIs ladder up into a client's top-level business KPIs (money earned and money saved), and drill back down again. The tool must support two directions of exploration: top-to-bottom (start at Revenue, decompose into its drivers) and bottom-to-top (start at a small operational lever and trace its path up to Revenue or Margin).
</mission>

<why_this_matters>
This tool is used live, in front of prospects and clients, during consulting engagements. Its job is to make an argument visible: that small operational improvements (a lower cart-abandonment rate, a faster product page, a better cross-sell attach rate) compound into meaningful money earned or saved. Two things therefore matter above all:

1. Visual clarity. The cause-and-effect chain must be obvious at a glance, and the focus interaction must let a consultant tell a clean story without clutter.
2. Credible, defensible numbers. A consultant must be able to stand behind every relationship and benchmark in front of a CFO. Capture the math of how KPIs relate, and cite sources for benchmarks.

It must also look unmistakably like it came from DIGITALL, and it must be easy to extend as we learn more, without a developer in the loop each time.
</why_this_matters>

<prerequisites>
Confirm these are available before starting; if any is missing, stop and report it.
- This repository is checked out and you are working inside it. It is fresh and empty, so scaffold from scratch; there is nothing existing to preserve.
- `gh` (GitHub CLI) is installed and authenticated, and the remote repo exists.
- Playwright MCP is connected (used for brand extraction and for verifying the built app).
- Context7 MCP is connected. Use it to pull current documentation for any library you adopt, rather than relying on training knowledge.
- Node.js (LTS) and a package manager are available.
- Web search is available (used in the research phase).
Run this on a high-capability model with extended thinking enabled; the research and data-model phases benefit from it.
</prerequisites>

<workflow>
Work through these phases in order. Maintain a `PROGRESS.md` at the repo root with a checklist of phases and their status, and commit at the end of each phase with a clear message.

## Phase 0 — Plan

1. The repo is fresh and empty, so there is nothing to investigate. Confirm tooling and auth (`gh`, Node, Playwright MCP, Context7 MCP), then write your phase plan into `PROGRESS.md` and proceed.

## Phase 1 — KPI research and taxonomy (do this thoroughly before writing any app code)

This is the foundation. Quality here determines the value of the whole tool.

1. Research the full landscape of webshop / e-commerce KPIs using web search. Cover both branches:
   - Money earned: Revenue and its drivers (traffic, conversion funnel, average order value, repeat purchase, etc.).
   - Money saved / margin: Gross Margin and its drivers (COGS, fulfillment cost per order, return rate, payment fees, discount depth, customer acquisition cost, cost to serve, etc.).
2. Build a decomposition tree that is at least 8 and at most 15 levels deep. Level 1 holds the top business KPIs; each level below decomposes the level above into the things that drive it. Example shape (illustrative, not exhaustive):
   - L1 Revenue = Orders x Average Order Value
   - L2 Orders = Sessions x Conversion Rate
   - L2 Average Order Value = Items per Order x Average Item Price
   - L3 Conversion Rate = Product-View Rate x Add-to-Cart Rate x Cart-to-Checkout Rate x Checkout-Completion Rate
   - L4 Checkout-Completion Rate = 1 - Checkout Abandonment Rate
   - L5 Checkout Abandonment driven by: number of form fields, guest-checkout availability, payment-method coverage, shipping-cost transparency, page load time, trust signals
   - ...and continue down to concrete, actionable leaf-level levers.
3. Organize KPIs into sections (for example: Traffic / Acquisition, Product, Cart, Checkout, Fulfillment, Retention, Cost / Margin). Every KPI belongs to a section.
4. Capture relationships explicitly, including the relationship type, because the tool will use this to show how impact flows upward:
   - `multiplicative` (funnel stages multiply), `additive` (channels sum), `inverse` (abandonment reduces completion), `cost` (increases reduce margin).
   - Allow a KPI to have more than one parent and to link across branches. For example, Return Rate reduces net Revenue and increases Cost, so it connects into both trees.
5. For every KPI, gather: a plain-language definition, how it is measured (formula and unit), the levers/actions that improve it (with rough impact and effort), and a benchmark with a cited source where a reliable one exists.
6. Detect and prevent cycles; the graph must be a DAG so levels can be assigned deterministically.

## Phase 2 — Data model and the "database"

GitHub Pages serves static files only, so the "database" is a structured, version-controlled source of truth that the build compiles into the app, not a running database server. Design it so that extending the data and pushing to `main` automatically rebuilds and redeploys the tool.

1. Define the source of truth as JSON (or YAML if you judge it more editable) under a `data/` directory, with one canonical schema. Use this schema as the starting point (adjust if your research demands it, and document any change):

```json
{
  "id": "checkout-completion-rate",
  "name": "Checkout Completion Rate",
  "section": "checkout",
  "definition": "Share of started checkouts that result in a completed order.",
  "formula": "Completed Checkouts / Started Checkouts x 100",
  "unit": "%",
  "parents": [
    {
      "id": "conversion-rate",
      "relationship": "multiplicative",
      "note": "One factor of the conversion funnel."
    }
  ],
  "levers": [
    {
      "action": "Offer guest checkout",
      "impact": "high",
      "effort": "low",
      "description": "Remove forced account creation."
    },
    {
      "action": "Expand payment methods",
      "impact": "medium",
      "effort": "medium",
      "description": "Add locally preferred options."
    }
  ],
  "benchmarks": [
    {
      "label": "E-commerce average",
      "value": "45-55%",
      "source": "https://..."
    }
  ]
}
```

2. Provide a machine-validated schema (JSON Schema or a Zod schema) so that any future edit to the data is validated, not silently broken.
3. Write a generation/validation step (for example `npm run build:data`, also run as part of `npm run build`) that: validates the source against the schema, checks for cycles, resolves parent/child links, assigns each KPI a level, and emits a typed data module the React app imports. The app must read only from this generated artifact, never hard-code KPI content.
4. Add a GitHub Actions workflow that runs validation + build + deploy on every push to `main`. This is what makes "extend the database -> tool updates automatically" true on a static host.

### Checkpoint A (stop and request review)

Before building the app, present: the KPI taxonomy (tree with levels and sections), the data schema, and a sample of populated entries. Wait for confirmation or correction before continuing. Do not start the UI until this is approved.

## Phase 3 — Brand extraction

1. Use Playwright MCP to load https://digitall.com/ and inspect computed styles. Extract the color palette (primary, secondary, accents, surfaces, text), typography (font families, weights, type scale), spacing rhythm, button and link styling, and the logo/wordmark.
2. Produce a design-tokens file (for example `src/theme/brand.ts`) capturing these as variables, and confirm the URL really is the DIGITALL site you intend before relying on it. The finished tool must read as a DIGITALL product, not a generic template.

## Phase 4 — Build the app (React + TypeScript)

1. Scaffold with Vite + React + TypeScript (strict mode). Set the Vite `base` to the repository name (project Pages serve from `/<repo>/`); this is the most common GitHub Pages mistake, so get it right early.
2. Render the KPIs as an interactive node graph. Recommended stack: React Flow (`@xyflow/react`) for nodes/edges with built-in zoom, pan, and fit-view, paired with a layered auto-layout (ELK via `elkjs`, or Dagre). If graph density makes React Flow awkward, Cytoscape.js is an acceptable alternative; document the choice. Pull the current React Flow and layout-engine APIs via Context7 before wiring them up.
3. Group nodes visually by section using the brand palette, so the diagram reads as distinct areas (Cart, Product, Checkout, and so on) that connect to one another.
4. Implement the core interactions:
   - Full-map overview by default, showing the connected KPI tree across sections.
   - Click a KPI to enter focus mode: zoom to that node, show only the nodes directly connected to it (its parents and children; default one hop, with an affordance to expand further), and dim or hide the rest. Provide a clear way back to the full map.
   - In focus mode, open a detail panel showing the KPI's definition, how it is measured (formula and unit), the levers to improve it, and benchmarks with sources. All of this comes from the generated data, not hard-coded.
   - Support bottom-to-top storytelling: from any node, offer a "path to the top" view that highlights the chain from that lever up to Revenue / Margin, so a consultant can show how one small lever connects all the way up.
5. Make it presentation-friendly: legible at a distance, clean, responsive, and pleasant to use live. A full-screen / presenter affordance is welcome.

## Phase 5 — Verify with Playwright MCP

1. Build the app and serve it locally.
2. Use Playwright MCP to verify, and iterate until all pass: the overview renders; clicking a node enters focus mode and correctly shows only connected nodes; the detail panel shows the right content for the clicked KPI; the "path to the top" highlight works; there are no console errors; the layout holds at a smaller viewport.
3. Report what you tested and the results.

## Phase 6 — Deploy to GitHub Pages

1. Ensure the Actions workflow builds and deploys the site, with Pages source set to GitHub Actions (enable via `gh` if needed). Enabling Pages is within scope and authorized; do not change other repository settings without asking.
2. Push, let the workflow run, and confirm the deployment succeeds.
3. Verify the live URL loads and the core interactions work on the deployed site (a quick Playwright pass against the live URL is ideal). Report the final URL.
   </workflow>

<approval_gates>

- Checkpoint A (after Phase 2) is a hard stop: present the taxonomy, schema, and sample data, and wait for confirmation before building the UI.
- Before any destructive or irreversible git action (force-push, history rewrite, branch deletion), stop and ask. Normal commits and pushes to a feature branch or `main` are fine.
  </approval_gates>

<quality_bar>

- TypeScript strict; the build and the data validation both pass in CI.
- The app reads all KPI content from the generated data artifact; no KPI text is hard-coded in components.
- No console errors in the verification pass.
- Benchmarks carry sources so a consultant can defend them.
- Document key decisions (data model, visualization library, layout engine) briefly in the README.
  </quality_bar>

<constraints>
- Static-first and reversible. Prefer a bundled data source over a hosted backend; this matches GitHub Pages and avoids lock-in. If you believe a hosted CMS or database genuinely adds value, propose it at Checkpoint A rather than introducing it unilaterally.
- Keep dependencies lean and justified.
- Do not over-engineer. Build what the mission needs, cleanly, and stop.
</constraints>

<deliverables>
1. A populated, schema-validated KPI data source (the "database") covering both the revenue and margin branches, 8 to 15 levels deep.
2. A working React + TypeScript app implementing the overview, focus/drill, detail panels, and path-to-top, styled in DIGITALL branding.
3. A GitHub Actions workflow that validates, builds, and deploys on push to `main`.
4. A live GitHub Pages URL, verified with Playwright.
5. A short README covering how to extend the data and the key architecture decisions.
</deliverables>
