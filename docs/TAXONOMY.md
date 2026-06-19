# KPI Taxonomy — DIGITALL Webshop KPI Explorer

This is the foundation of the tool: a directed acyclic graph (DAG) of e-commerce
KPIs that connects concrete, **measurable** operational levers at the bottom up to
the two business outcomes a CFO cares about at the top: **money earned** (Revenue)
and **money saved** (Gross Margin), both rolling into **Net Profit**.

- **87 KPIs** across **9 sections**
- **11 levels** deep (spec requires 8 to 15)
- **1 root** (`net-profit`), single connected graph, **0 cycles** (machine-verified)
- **23 multi-parent / cross-branch** nodes, so impact can flow up more than one path
- **31 sourced benchmarks** (every benchmark carries a citable URL)
- **Every KPI is concretely measurable**: a real formula and a numeric unit. The
  build rejects any non-measurable unit (no "score" / "qualitative" nodes).

The source of truth is [`data/kpis.json`](../data/kpis.json). The build step
([`scripts/build-data.ts`](../scripts/build-data.ts)) validates it against the
Zod schema, checks for cycles, assigns each KPI its level, resolves children, and
emits the typed module the app reads. **No KPI content is hard-coded in the app.**

## Design principles (from Checkpoint A review)

1. **Single apex `Net Profit`** (= Revenue − Total Cost). One top; Revenue
   (earned) and Gross Margin (saved) are the two pillars beneath it.
2. **Every KPI is unambiguously measurable.** Each node has a quantifiable formula
   and a numeric unit from a fixed allow-list. Qualitative items (trust signals,
   "price clarity", UX quality) live in the `levers` array, not as KPI nodes.
3. **Depth and granularity.** The tree reaches concrete, engineer-actionable leaf
   metrics, including a measurable site-performance tail (LCP → TTFB → backend →
   database query → slow-query rate).

## Relationship types

How a child KPI influences its parent. Drives edge styling and the impact story.

| Type | Meaning | Example |
| --- | --- | --- |
| `multiplicative` | Child is a multiplicative factor of the parent | Conversion funnel stages; `AOV = Items per Order x Average Item Price` |
| `additive` | Child sums into the parent | Traffic channels into Sessions |
| `inverse` | Increasing the child decreases the parent | Abandonment reduces Completion; Returns reduce net Revenue |
| `cost` | Child is a cost line that reduces profit / margin (money out) | COGS, Shipping, Payment Fees into Total Cost |
| `driver` | Empirical influence with no closed-form formula; direction in the note | Page speed drives Add-to-Cart; ROAS lowers CAC |

> **Schema note.** The starter schema in `GOAL.md` lists four relationship types.
> We added a fifth, `driver`, for real, defensible influences with no closed-form
> equation. Each `driver` edge carries a `note` stating direction.

## Measurable units (enforced)

`unit` is restricted by the schema to: `%`, `currency`, `count`, `ratio`,
`seconds`, `ms`, `days`, `months`, `KB`, `rating`, `nps`. Any other unit fails the
build. This is how "every KPI must be measurable" is enforced mechanically.

## Sections

| Section | What it covers |
| --- | --- |
| **Business & Unit Economics** | Net Profit, Revenue, Gross Margin, Contribution Margin, CLV |
| **Acquisition & Traffic** | Sessions by channel, Conversion Rate, Bounce, CAC, ROAS |
| **Product & Browsing** | Product-view & add-to-cart rates, search, ratings, reviews, imagery, stock |
| **Cart & Basket Value** | AOV and its drivers: items, price, cross-sell, bundling, upsell, discount |
| **Conversion & Checkout** | Completion, measurable abandonment reasons, and the checkout op metrics behind them |
| **Site Performance** | Core Web Vitals, TTFB, payloads, caching, uptime: the engineer-actionable bottom |
| **Fulfillment & Returns** | Shipping & fulfillment cost, delivery time, on-time rate, returns |
| **Retention & Loyalty** | Repeat rate, frequency, lifespan, churn, loyalty, email, NPS |
| **Cost & Margin** | COGS, inventory carrying, payment fees, chargebacks, cost to serve |

## The decomposition tree (by level)

Level = longest path from the root. A node can sit below several parents; its level
is the deepest such path. Counts: L1:1, L2:5, L3:12, L4:15, L5:19, L6:14, L7:7,
L8:9, L9:3, L10:1, L11:1.

```
L1  Net Profit                                  = Revenue − Total Cost
L2  Revenue · Gross Margin · Contribution Margin/Order · CLV · Total Cost
L3  Orders · AOV · CAC · Purchase Frequency · Customer Lifespan
      COGS · Shipping · Fulfillment · Returns · Payment Fees · Inventory Carrying · Cost to Serve
L4  Sessions · Conversion Rate · ROAS · Items per Order · Average Item Price
      Return Rate* · Repeat Purchase Rate* · Churn · Subscription Rate
      Landed Unit Cost · Chargeback Rate · Contact Rate · Carrier Cost · Orders/Labor Hour
L5  Organic/Paid/Email/Social Sessions
      Product-View Rate · Add-to-Cart Rate · Internal-Search Conversion
      Cart-to-Checkout · Checkout Completion · Cross-Sell · Bundle · Upsell · Free-Ship Eligibility* · Discount*
      On-Time Delivery* · Pick Accuracy* · Loyalty Enrollment · NPS · Self-Service Resolution
L6  Bounce · Cart Abandonment · Recommendation CTR* · Checkout Abandonment · Mobile Checkout
      Avg Product Rating* · Images/Product* · Review Coverage · Out-of-Stock · PDP Bounce · Search Zero-Result
      CLS · Uptime · Email CTR*
L7  Checkout reasons: Extra-Cost · Forced-Account · Security · Slow-Delivery · Complexity
      Page Load Time (LCP)* (4 parents) · Interaction to Next Paint (INP)*
L8  Checkout op metrics: Form Fields · Steps Duration · Payment Methods · Guest Usage · Shipping Fee
      Avg Delivery Time* · Server Response Time (TTFB) · JS Bundle Size · Image Weight
L9  Backend Processing Time · CDN Cache Hit Rate · Next-Gen Image Adoption
L10 Database Query Time
L11 Slow Query Rate                              ← engineer-actionable leaf
```
`*` = cross-branch node (links money-earned and money-saved, or links sections).

## Worked example: bottom-to-top story (the demo)

A single, tiny technical lever laddering all the way up to money earned:

```
Slow Query Rate              L11  index the worst offenders
  -> Database Query Time     L10
  -> Backend Processing Time L9
  -> Server Response (TTFB)  L8
  -> Page Load Time (LCP)    L7
       -> Add-to-Cart Rate / Product-View Rate   L5 (inverse: slow pages suppress them)
       -> Checkout Abandonment                   L7 (driver: slow pages raise it)
            -> Conversion Rate                    L4
                 -> Orders                         L3
                      -> Revenue                    L2   ... money earned
                           -> Net Profit             L1
```

Deloitte's "Milliseconds Make Millions" quantifies the top of this chain: a 0.1s
speed improvement lifted retail conversion by ~8% and PDP-to-cart by ~9.1%.

## Cross-branch links (where the trees connect)

These make the "one lever, two outcomes" argument visible:

- **Return Rate** -> reduces **Revenue** (`inverse`) **and** drives **Returns Cost** (`driver`).
- **Conversion Rate** -> factor of **Orders** (`multiplicative`) **and** lowers **CAC** (`inverse`).
- **Discount Rate** -> cuts **Average Item Price** (`inverse`) **and** **Gross Margin** (`inverse`).
- **Free-Shipping Eligibility** -> lifts **Items per Order** (`driver`) **and** adds **Shipping Cost** (`cost`).
- **Page Load Time** -> **Product-View**, **Add-to-Cart**, **Checkout Abandonment**, **Bounce** (4 parents).
- **Avg Product Rating / Images per Product** -> lift **Add-to-Cart** (`driver`) **and** reduce **Return Rate** (`inverse`).
- **On-Time Delivery / Pick Accuracy** -> lift **Repeat Purchase** (`driver`) **and** cut **Support Contacts** (`inverse`).
- **Avg Delivery Time** -> reduces **Slow-Delivery Abandonment** (`driver`) **and** drives **Repeat Purchase** (`driver`).
- **Email CTR** -> drives **Email Sessions** (`driver`) **and** **Repeat Purchase** (`driver`).
- The major cost lines (**COGS, Shipping, Fulfillment, Returns, Payment Fees, Inventory Carrying**) each feed both **Total Cost** (`cost`) and **Gross Margin** (`inverse`).

## Benchmark sources

Every benchmark in the data carries its source URL so a consultant can defend it.
Primary sources used:

- **Cart / checkout abandonment** (~70.2%; reasons: extra costs 48%, account 26%, security ~25%, slow delivery ~23%, complexity ~22%; up to +35% from checkout UX): [Baymard Institute](https://baymard.com/lists/cart-abandonment-rate)
- **Conversion rate & market data** (~1.7-3.0%; bounce ~46.7%): [IRP Commerce](https://www.irpcommerce.com/ecommercemarketdata.aspx)
- **Add-to-cart rate** (median ~4.6%): [Littledata](https://www.littledata.io/average/add-to-cart-rate)
- **Average order value** (~$144, Nov 2024): [Oberlo](https://www.oberlo.com/statistics/average-order-value)
- **Site speed -> revenue** (Deloitte, 0.1s ⇒ +8% retail conversion): [web.dev / Deloitte](https://web.dev/case-studies/milliseconds-make-millions)
- **Return rates** (NRF 2024 ~16.9%; apparel 20-40%): [Richpanel (cites NRF)](https://www.richpanel.com/learn/ecommerce-return-rates)
- **Repeat purchase rate** (~28%): [Opensend](https://www.opensend.com/post/repeat-purchase-rate-ecommerce)
- **Gross margin / COGS** (40-80% / 20-50%): [LedgerGurus](https://ledgergurus.com/good-gross-margin-for-ecommerce/)
- **Shipping & fulfillment cost** (8-12% of revenue; $5-15/order): [Finaloop](https://www.finaloop.com/blog/ecommerce-shipping-cost-accounting-in-2025-complete-guide)
- **Payment processing fees** (~2.4%): [ClearlyPayments](https://www.clearlypayments.com/blog/statistics-on-how-much-merchants-pay-for-payment-processing-in-2024/)
- **Customer acquisition cost** (~$60-90): [MobiLoud](https://www.mobiloud.com/blog/average-customer-acquisition-cost-for-ecommerce) / [Eightx](https://eightx.co/blog/average-cac-ecommerce-vertical)
- **Cross-sell / bundling AOV lift** (10-40%): [WiserReview](https://wiserreview.com/blog/upselling-and-cross-selling-statistics/)
- **Free-shipping threshold AOV lift** (12-24%): [2POINT Agency](https://www.2pointagency.com/glossary/can-free-shipping-thresholds-increase-average-order-value/)
- **CLV / retention economics** (existing customers +67%; CLV:CAC 3:1): [Opensend](https://www.opensend.com/post/customer-retention-rate-ecommerce) / [Retainful](https://www.retainful.com/blog/customer-acquisition-cost-ecommerce)

> Benchmark ranges are reported as the cited publishers state them and are meant
> as defensible starting points, not precise client figures. They should be
> localized per engagement.
