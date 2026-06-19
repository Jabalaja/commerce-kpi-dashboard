# KPI Taxonomy — DIGITALL Webshop KPI Explorer

This is the foundation of the tool: a directed acyclic graph (DAG) of e-commerce
KPIs that connects concrete operational levers at the bottom up to the two
business outcomes a CFO cares about at the top: **money earned** (Revenue) and
**money saved** (Gross Margin), both rolling into **Net Profit**.

- **64 KPIs** across **8 sections**
- **8 levels** deep (spec requires 8 to 15)
- **1 root** (`net-profit`), single connected graph, **0 cycles** (machine-verified)
- **21 multi-parent / cross-branch** nodes, so impact can flow up more than one path
- **30 sourced benchmarks** (every benchmark carries a citable URL)

The source of truth is [`data/kpis.json`](../data/kpis.json). The build step
([`scripts/build-data.ts`](../scripts/build-data.ts)) validates it against the
Zod schema, checks for cycles, assigns each KPI its level, resolves children, and
emits the typed module the app reads. **No KPI content is hard-coded in the app.**

## Relationship types

How a child KPI influences its parent. This drives edge styling and the
"how impact flows up" story.

| Type | Meaning | Example |
| --- | --- | --- |
| `multiplicative` | Child is a multiplicative factor of the parent | Conversion funnel stages; `AOV = Items per Order x Average Item Price` |
| `additive` | Child sums into the parent | Traffic channels into Sessions; cost lines into Total Cost |
| `inverse` | Increasing the child decreases the parent | Checkout Abandonment reduces Completion; Returns reduce net Revenue |
| `cost` | Child is a cost line that reduces profit / margin (money out) | COGS, Shipping, Payment Fees into Total Cost |
| `driver` | Qualitative / empirical influence, no closed-form formula; direction is in the note | Page speed drives Add-to-Cart; Trust signals drive Completion |

> **Note on the schema.** The starter schema in `GOAL.md` lists four relationship
> types. We added a fifth, `driver`, for the many real, defensible influences that
> have no closed-form equation (e.g. "faster pages lift add-to-cart"). Each
> `driver` edge carries a `note` stating the direction, so the math stays honest.

## Sections

| Section | What it covers |
| --- | --- |
| **Business Outcomes** | Net Profit, Revenue, Gross Margin, Customer Lifetime Value |
| **Traffic & Acquisition** | Sessions by channel, Conversion Rate, Bounce, CAC |
| **Product & Browsing** | Product views, Add-to-Cart, page speed, imagery, reviews, search |
| **Cart & Basket Value** | AOV and its drivers: items per order, item price, cross-sell, bundling, discounting |
| **Checkout** | Completion, abandonment, and the friction points behind it |
| **Fulfillment & Returns** | Shipping cost, fulfillment cost, delivery speed, returns |
| **Retention & Loyalty** | Repeat purchase, frequency, lifespan, email, loyalty |
| **Cost & Margin** | COGS, payment fees, cost to serve. Lowering these is money saved |

## The decomposition tree (by level)

Level = longest path from the root. A node can sit below several parents; its level
is the deepest such path. (Section in brackets.)

```
L1  Net Profit [business]
      = Revenue  -  Total Cost

L2  Revenue [business] ............... money earned (= Orders x AOV)
    Gross Margin [business] .......... money saved
    Customer Lifetime Value [business]
    Total Cost [cost] ................ money out (= sum of all cost lines)

L3  Orders [acquisition] ............. = Sessions x Conversion Rate
    Average Order Value [cart] ....... = Items per Order x Average Item Price
    Customer Acquisition Cost [acquisition]
    Purchase Frequency / Customer Lifespan [retention]
    COGS, Shipping Cost, Fulfillment Cost per Order,
      Returns Cost, Payment Processing Fees, Cost to Serve [cost/fulfillment]

L4  Sessions, Conversion Rate [acquisition]
    Items per Order, Average Item Price [cart]
    Return Rate [fulfillment] ........ cross-branch: reduces Revenue + drives Returns Cost
    Repeat Purchase Rate [retention] . drives Orders + CLV
    Landed Unit Cost, Support Contact Rate [cost]
    Carrier Rate, Packaging Cost, Warehouse Efficiency, Reverse Logistics Cost [fulfillment]

L5  Traffic channels: Organic / Paid / Email / Social Sessions [acquisition]
    Bounce Rate [acquisition]
    Funnel: Product-View Rate, Add-to-Cart Rate [product]
    Cart-to-Checkout Rate, Checkout Completion Rate [cart/checkout]
    AOV drivers: Cross-Sell Attach Rate, Product Bundling, Free-Shipping Threshold,
      Upsell Rate, Discount Depth [cart]
    Self-Service Resolution Rate [cost]
    Loyalty Program, Post-Purchase Experience [retention]

L6  Checkout Abandonment Rate [checkout] (= 1 - Completion)
    Product Detail Page Quality, Price Clarity, Stock Availability,
      On-Site Search Quality [product]
    Cart Transparency, Product Recommendations [cart]
    Email / CRM Engagement [retention]

L7  Checkout friction: Unexpected Extra Costs, Checkout Form Length,
      Payment Method Coverage, Trust & Security Signals,
      Mobile Checkout Optimization [checkout]
    Page Load Time / Site Speed [product] (drives 4 parents)
    Product Imagery, Reviews & Ratings [product] (also reduce Return Rate)
    Delivery Speed [fulfillment] (drives abandonment + repeat purchase)

L8  Server Response Time (TTFB), Image Optimization [product]
      .... the concrete, engineer-actionable leaf levers
```

## Worked example: bottom-to-top story (the demo)

A single operational lever laddering all the way up, e.g. **Server Response Time**:

```
Server Response Time (TTFB)        L8  cut backend latency / add a CDN
  -> Page Load Time / Site Speed   L7  faster pages
       -> Add-to-Cart Rate         L5  (inverse: slow pages suppress it)
       -> Checkout Abandonment     L6  (driver: slow pages raise it)
            -> Checkout Completion  L5  (inverse)
                 -> Conversion Rate L4  (multiplicative funnel)
                      -> Orders     L3
                           -> Revenue        L2   ... money earned
                                -> Net Profit L1
```

Deloitte's "Milliseconds Make Millions" quantifies the top of this chain: a 0.1s
speed improvement lifted retail conversion by ~8% and PDP-to-cart by ~9.1%.

## Cross-branch links (where the two trees connect)

These are the nodes that make the "one lever, two outcomes" argument visible:

- **Return Rate** -> reduces **Revenue** (`inverse`) **and** drives **Returns Cost** (`driver`). Hits both money earned and money saved.
- **Conversion Rate** -> a factor of **Orders** (`multiplicative`) **and** lowers **CAC** (`inverse`). More orders per click is cheaper acquisition.
- **Discount Depth** -> cuts **Average Item Price** (`inverse`) **and** **Gross Margin** (`inverse`).
- **Free-Shipping Threshold** -> lifts **Items per Order** (`driver`) **and** adds **Shipping Cost** (`cost`). The classic margin trade-off.
- **Page Load Time** -> **Product-View Rate**, **Add-to-Cart Rate**, **Checkout Abandonment**, **Bounce** (4 parents).
- **Product Imagery / Reviews** -> lift **PDP Quality** (`driver`) **and** reduce **Return Rate** (`inverse`).
- **Delivery Speed** -> reduces **Checkout Abandonment** (`driver`) **and** drives **Repeat Purchase** (`driver`).
- The major cost lines (**COGS, Shipping, Fulfillment, Returns, Payment Fees**) each feed both **Total Cost** (`cost`) and **Gross Margin** (`inverse`).

## Benchmark sources

Every benchmark in the data carries its source URL so a consultant can defend it.
Primary sources used:

- **Cart / checkout abandonment** (~70.2%; reasons: extra costs 48%, security ~25%, slow delivery ~23%; up to +35% from checkout UX): [Baymard Institute](https://baymard.com/lists/cart-abandonment-rate)
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
> as defensible starting points, not precise client figures. They are
> deliberately given as ranges and should be localized per engagement.
