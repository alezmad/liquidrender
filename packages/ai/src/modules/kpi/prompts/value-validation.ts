/**
 * KPI Value Validation Prompt
 *
 * Used to validate if computed KPI values from real data make business sense.
 * The LLM acts as a sanity checker for unrealistic or suspicious values.
 */

export const VALUE_VALIDATION_PROMPT = {
  name: "kpi-value-validation",
  version: "1.4.0",

  /**
   * Template for validating KPI values against business expectations.
   */
  template: `You are a senior data analyst reviewing KPI values computed from real business data.

## Business Context
{businessType} business

## KPIs to Validate
{kpiResults}

## Your Task
For each KPI, determine if the value makes business sense:

1. **VALID** - Value is realistic for this metric type AND business context
2. **SUSPICIOUS** - Value seems off but might be explainable given context (e.g., B2B vs B2C model unclear)
3. **INVALID** - Value is clearly wrong (calculation error, data issue)

**IMPORTANT**: Don't flag values as SUSPICIOUS just because they're high/low if the business model could explain it.
- High AOV ($500+) → Could be B2B/Wholesale, mark VALID if plausible
- Low repeat rate → Could be high-ticket items, mark VALID if plausible

## Business Type Mapping (affects what's "normal")

| Business Type | Model | AOV Range | Items/Order | Typical Patterns |
|---------------|-------|-----------|-------------|------------------|
| ecommerce, retail | B2C default | $50-200 | 1-5 | Consumer purchases |
| wholesale, distribution, trading | B2B | $500-5000 | 10-100 | Bulk orders to retailers |
| manufacturing, industrial | B2B | $1000-50000 | 20-200 | Large equipment, materials |
| saas, subscription | Recurring | N/A | N/A | Monthly/Annual billing |
| media, music, streaming, digital goods | Digital/Micro | $0.99-$20 | 1-10 | Low-price digital content |

**B2B / Wholesale / Trading / Distribution:**
- Average Order Value: $500-10000 is NORMAL (large bulk orders)
- Items per order: 10-100 is NORMAL (restocking inventory, multiple SKUs per shipment)
- **20-50 items per order is VERY COMMON for wholesale distributors**
- Discount rates: 5-30% is typical (volume discounts)
- High repeat customer rates (70-95%) are NORMAL (regular restocking)
- On-time delivery 95-100% is achievable for established B2B relationships
- If business type mentions "trading", "wholesale", "distribution" → treat as B2B

**B2C / Retail / Consumer Ecommerce:**
- Average Order Value: $50-200 is NORMAL
- Items per order: 1-5 is NORMAL
- Discount rates: 0-30% is typical (sales, promotions)
- Repeat customer rates 20-40% typical

**SaaS:**
- MRR/ARR metrics dominate
- Churn rate: 2-8% monthly is typical

**Media / Music / Streaming / Digital Goods:**
- Average Order Value: $0.99-$20 is NORMAL (songs, tracks, movies, ebooks)
- Unit Price: $0.99-$9.99 is NORMAL for individual digital items
- Items per order: 1-10 is NORMAL (albums, track bundles)
- **$1-$5 unit prices are VERY COMMON for music tracks, ebooks, apps**
- Repeat customer rates 30-60% typical (subscription models higher)
- If business type mentions "music", "media", "streaming", "digital" → treat as Digital Goods

## Sanity Bounds (context-aware)

### B2C / Retail Bounds
| KPI Type | Normal Range | Flag as SUSPICIOUS If |
|----------|--------------|----------------------|
| Items per order | 1-10 | > 20 |
| Repeat purchase rate | 10-60% | > 80% |
| On-time delivery | 85-98% | > 99.5% (too perfect) |

### B2B / Wholesale / Trading Bounds
| KPI Type | Normal Range | Flag as SUSPICIOUS If |
|----------|--------------|----------------------|
| Items per order | 10-100 | > 200 (check if SUM(qty) vs COUNT confusion) |
| Repeat purchase rate | 70-95% | < 50% (B2B should have regular customers) |
| On-time delivery | 95-100% | Never flag (achievable in B2B) |

### Media / Digital Goods / Streaming Bounds
| KPI Type | Normal Range | Flag as SUSPICIOUS If |
|----------|--------------|----------------------|
| Unit price | $0.99-$9.99 | > $100 (digital content is low-price) |
| Invoice value | $1-$50 | > $200 (few items per transaction) |
| Items per order | 1-10 | > 50 (not bulk purchases) |
| Revenue per customer | $10-$200 | Never flag low values (micro-transactions valid) |

### Universal Bounds (applies to all business types)
| KPI Type | Always INVALID If |
|----------|-------------------|
| Discount rate | > 100% or < 0% |
| Conversion rate | > 100% or < 0% |
| Percentages | > 100% or < 0% (unless explicitly a ratio > 1) |
| Monetary totals | Negative (unless loss/refund metric) |
| Counts | Negative |

## Common Calculation Errors to Detect
- **Off-by-100x**: Forgot to multiply by 100 for percentages
- **Items vs Quantity confusion**: Using SUM(quantity) instead of COUNT(*) for "items per order"
- **Percentage columns misread**: Discount stored as 0.05 treated as $0.05 instead of 5%
- **Division issues**: Dividing by zero or wrong denominator
- **NULL contamination**: Aggregations affected by NULL values
- **Time-series aggregation missing**: KPIs with "Monthly", "Daily", "Weekly" in name should vary over time
  - If "Monthly Revenue Trend" equals "Total Revenue", missing GROUP BY time period (mark SUSPICIOUS)
  - If "Daily Active Users" is same as "Total Users", likely missing date filter (mark SUSPICIOUS)

## Output Format
Return a JSON array:
[
  {
    "kpiName": "name",
    "value": <computed_value>,
    "status": "VALID" | "SUSPICIOUS" | "INVALID",
    "reasoning": "brief explanation",
    "suggestedFix": "if invalid, what might be wrong"
  }
]

Return ONLY valid JSON, no markdown.`,

  /**
   * Render the prompt with actual values
   */
  render(vars: {
    businessType: string;
    kpiResults: Array<{
      name: string;
      description: string;
      value: number | string | null;
      sql?: string;
    }>;
  }): string {
    const kpiResultsFormatted = vars.kpiResults
      .map((kpi, i) => `${i + 1}. **${kpi.name}**
   Description: ${kpi.description}
   Computed Value: ${kpi.value === null ? "NULL" : kpi.value}
   ${kpi.sql ? `SQL: ${kpi.sql.substring(0, 100)}...` : ""}`)
      .join("\n\n");

    return this.template
      .replace("{businessType}", vars.businessType)
      .replace("{kpiResults}", kpiResultsFormatted);
  },

  /**
   * Changelog for tracking prompt evolution
   */
  changelog: [
    {
      version: "1.4.0",
      date: "2026-01-18",
      changes: "Added Digital Goods / Media / Streaming business type with $0.99-$20 price ranges. Prevents false positives on music stores, ebooks, apps with $1-5 unit prices. Added specific bounds for digital content micro-transactions.",
    },
    {
      version: "1.3.0",
      date: "2026-01-17",
      changes: "Context-aware sanity bounds for B2B vs B2C. Wholesale/trading patterns (10-100 items/order, 70-95% repeat rate, 95-100% on-time delivery are NORMAL). Time-series KPI detection (flag if Monthly/Daily metrics don't vary). Universal bounds for invalid values.",
    },
    {
      version: "1.2.0",
      date: "2026-01-16",
      changes: "Improved B2B/B2C ambiguity handling - added business type mapping table, instruction to mark high AOV as VALID if B2B plausible",
    },
    {
      version: "1.1.0",
      date: "2026-01-14",
      changes: "Added business type context (B2B vs B2C ranges), sanity bounds table, common calculation errors detection",
    },
    {
      version: "1.0.0",
      date: "2026-01-14",
      changes: "Initial version for KPI value sanity checking",
    },
  ],
};

/**
 * Schema for validation result
 */
export interface KPIValueValidation {
  kpiName: string;
  value: number | string | null;
  status: "VALID" | "SUSPICIOUS" | "INVALID";
  reasoning: string;
  suggestedFix?: string;
}
