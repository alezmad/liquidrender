# KPI Coverage Analysis - Pipeline Test Results

Generated: 2026-01-14

## Executive Summary

The KPI generation pipeline achieves **100% technical success** across all test databases, but there are significant **business coverage gaps** that should be addressed for comprehensive situational awareness.

---

## Generated KPIs by Database

### Northwind (B2B Trading - 14 tables)

| # | KPI | Category | Business Value |
|---|-----|----------|----------------|
| 1 | Gross Merchandise Value (GMV) | revenue | ✅ Core - total sales |
| 2 | Average Order Value (AOV) | revenue | ✅ Core - order health |
| 3 | Repeat Purchase Rate | retention | ✅ Core - customer loyalty |
| 4 | Conversion Rate | efficiency | ⚠️ Needs funnel data |
| 5 | Discount Rate | efficiency | ✅ Margin indicator |
| 6 | Average Items per Order | efficiency | ✅ Basket analysis |
| 7 | On-Time Delivery Rate | efficiency | ✅ Operations health |
| 8 | Average Shipping Days | efficiency | ✅ Fulfillment speed |
| 9 | Revenue per Category | revenue | ✅ Product mix |
| 10 | Customer Acquisition Cost (CAC) | efficiency | ⚠️ Needs marketing data |

### Pagila (DVD Rental - 22 tables)

Subscription/rental business with payments, rentals, inventory.

### Chinook (Music Store - 11 tables)

Digital music sales with tracks, albums, invoices.

---

## Gap Analysis: Missing High-Value KPIs

### 🔴 Critical Gaps (Would be asked in first exec meeting)

| Missing KPI | Why It Matters | Available Data? |
|-------------|----------------|-----------------|
| **Revenue Growth Rate** | Trend direction | ✅ Has order_date |
| **Customer Lifetime Value (CLV)** | Customer worth | ✅ Has customer + orders |
| **Churn Rate** | Customer loss | ⚠️ Needs last_order logic |
| **Inventory Turnover** | Stock efficiency | ✅ Has products + orders |
| **Gross Margin** | Profitability | ⚠️ Needs cost data (missing) |

### 🟡 Important Gaps (Week 1 questions)

| Missing KPI | Why It Matters | Available Data? |
|-------------|----------------|-----------------|
| **Orders per Customer** | Engagement depth | ✅ Calculable |
| **Top Products by Revenue** | Product winners | ✅ Calculable |
| **Geographic Revenue** | Market distribution | ✅ Has country/region |
| **Supplier Performance** | Vendor health | ✅ Has suppliers table |
| **Employee Sales** | Team performance | ✅ Has employees table |

### 🟢 Nice-to-Have Gaps

| Missing KPI | Why It Matters |
|-------------|----------------|
| Seasonal Trends | Planning |
| Customer Cohort Analysis | Retention patterns |
| Product Affinity | Cross-sell opportunities |

---

## Root Cause Analysis

### Why These KPIs Weren't Generated

1. **Time-series KPIs (Growth, MoM)**: The prompt prioritizes simpler types. Window functions are complex and often fail compilation.

2. **Cross-entity KPIs (CLV, Cohort)**: Require multi-table joins. The `composite` type exists but is deprioritized ("Choose simplest type").

3. **Derived KPIs (Margin, Turnover)**: Need multiple base metrics combined. Not explicitly in priority lists.

4. **Filtered aggregations (Top N)**: Would need LIMIT/ranking which isn't in the DSL.

### Prompt Bias

The generation prompt says:
> "Choose simplest type - Prefer in this order: simple > ratio > filtered > window > case > composite"

This causes the LLM to avoid the complex types that would produce more sophisticated KPIs.

---

## Recommendations

### Short-term: Improve Priority KPI Lists

Add these to the `PRIORITY_KPIS` in `recipe-generator.ts`:

```typescript
const ECOMMERCE_PRIORITY_KPIS = [
  // Existing...
  "Revenue Growth Rate (MoM)",     // Time-series
  "Customer Lifetime Value",        // Cross-entity
  "Orders per Customer",            // Ratio
  "Inventory Turnover",             // Cross-entity
  "Top 10 Products by Revenue",     // Filtered
  "Revenue by Geography",           // Grouped
];
```

### Medium-term: Add KPI Templates

Pre-define DSL definitions for complex KPIs that the LLM struggles with:

```typescript
const KPI_TEMPLATES = {
  "revenue_growth_mom": {
    type: "window",
    aggregation: "SUM",
    expression: "revenue",
    window: { lag: { offset: 1 } },
    outputExpression: "(current - lag) / NULLIF(lag, 0) * 100"
  }
};
```

### Long-term: Second-pass Generation

1. First pass: Generate basic KPIs (current approach)
2. Second pass: Review gaps and generate advanced KPIs using `composite` and `window` types

---

## Test Commands Reference

```bash
# Prerequisites
cd ~/Desktop/liquidgym/infra
docker compose --profile loader up -d

# Run tests
pnpm with-env pnpm tsx packages/api/scripts/test-full-onboarding-pipeline.ts  # Northwind
pnpm with-env pnpm tsx packages/api/scripts/test-pipeline-pagila.ts           # Pagila
pnpm with-env pnpm tsx packages/api/scripts/test-pipeline-chinook.ts          # Chinook
```

---

## Conclusion

The pipeline is **technically excellent** (100% success rate) but **business coverage is ~60%** of what an analyst would want. The main gap is advanced KPIs requiring:

- Time-series analysis (growth, trends)
- Multi-entity relationships (CLV, cohorts)
- Ranking/filtering (Top N)

These gaps are addressable through prompt engineering and template-based generation without architectural changes.
