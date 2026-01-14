# KPI Validation Root Cause Analysis

Generated: 2026-01-14

## Executive Summary

Testing the KPI generation + validation pipeline against Northwind revealed **3 root causes** of invalid/suspicious KPI values. These findings enable systematic improvements to make KPI generation robust across any database.

---

## Issue 1: Semantic Confusion (INVALID)

**KPI:** Average Items per Order
**Generated Value:** 61.83
**Expected Range:** 2-5

### What Happened
```sql
-- LLM generated:
SELECT SUM(quantity) / COUNT(DISTINCT order_id) FROM order_details
-- Result: 51317 / 830 = 61.83

-- Should have been:
SELECT COUNT(*) / COUNT(DISTINCT order_id) FROM order_details
-- Result: 2155 / 830 = 2.60
```

### Root Cause
The LLM confused:
- **"Items"** = line items (COUNT of rows)
- **"Quantity"** = units sold (SUM of quantity column)

"Average items per order" means "how many different products in each order" (2.6), not "total units purchased per order" (61.8).

### Fix: KPI Glossary in Prompt
Add to generation prompt:
```
## KPI Terminology Glossary
- "Items per order" → COUNT of line items, NOT SUM of quantities
- "Products sold" → COUNT DISTINCT of product_id
- "Units sold" → SUM of quantity
- "Line items" → COUNT of order detail rows
```

---

## Issue 2: Missing Business Context (SUSPICIOUS)

**KPI:** Average Order Value (AOV)
**Generated Value:** $1,631.88
**LLM Assessment:** Suspicious (expected ~$50-200)

### What Happened
The calculation was **correct**, but the validation flagged it as suspicious because:
- LLM assumed B2C e-commerce (typical AOV: $50-200)
- Northwind is B2B wholesale (typical AOV: $500-5000)

### Data Evidence
```
Order Value Distribution:
  <$500:      217 orders (26%)
  $500-1000:  194 orders (23%)
  $1000-2000: 208 orders (25%)
  $2000-5000: 173 orders (21%)
  >$5000:      38 orders (5%)
```

### Fix: Business Type Context in Validation
Update validation prompt:
```
## Business Type Context
- B2B/Wholesale: AOV typically $500-5000, larger order sizes
- B2C/Retail: AOV typically $50-200, smaller orders
- SaaS: MRR/ARR metrics, subscription-based
- Consider the business type when validating ranges
```

---

## Issue 3: Column Semantics Misunderstanding (SUSPICIOUS)

**KPI:** Discount Rate
**Generated Value:** 0.89%
**Expected Range:** 5-20%

### What Happened
```sql
-- LLM generated:
SELECT (SUM(discount) / SUM(unit_price * quantity)) * 100 FROM order_details
-- Result: 121.04 / 1354458.59 * 100 = 0.0089%

-- Should have been (weighted average):
SELECT SUM(discount * unit_price * quantity) / SUM(unit_price * quantity) * 100
-- OR simple average:
SELECT AVG(discount) * 100
```

### Root Cause
The `discount` column stores **percentages as decimals** (0.05 = 5% off), not dollar amounts.
- The LLM treated 0.15 as "$0.15 discount" instead of "15% discount"

### Data Evidence
```
Sample discount values: 0, 0.05, 0.10, 0.15, 0.20
These are percentages (5%, 10%, 15%, 20%), not dollars
```

### Fix: Data Profiling Detection
1. **Detect percentage columns** during profiling:
   - Values between 0 and 1
   - Column name contains: discount, rate, percentage, pct, ratio

2. **Add to prompt context**:
   ```
   ## Column Semantics
   - discount (PERCENTAGE, 0-1 scale): 0.05 means 5%, NOT $0.05
   - Percentage columns detected: discount, tax_rate, margin
   ```

---

## Recommended System Improvements

### 1. Enhanced Generation Prompt (schema-first-generation.ts)

Add KPI glossary section:
```typescript
## KPI Terminology (use precisely)
- "Items per order" → COUNT of line items (rows)
- "Units per order" → SUM of quantity
- "Discount rate" → If column is 0-1, it's already percentage (multiply by 100 for display)
- "Revenue" → SUM of (price * quantity), applying discount if percentage column
```

### 2. Enhanced Validation Prompt (value-validation.ts)

Add business context and sanity bounds:
```typescript
## Business Type Ranges
- B2B/Wholesale: AOV $500-5000, larger orders
- B2C/Retail: AOV $50-200, smaller orders

## Sanity Bounds by KPI Type
- Items per order: 1-20 (flag if >50)
- Discount rate: 0-50% (flag if >100% or <0%)
- AOV: varies by business type (see above)
- Conversion rate: 1-10% (flag if >50%)
```

### 3. Data Profiling Enhancement

Detect column semantics automatically:
```typescript
function detectColumnSemantics(profile: ColumnProfile): string {
  const { columnName, minValue, maxValue, distinctCount } = profile;

  // Percentage detection
  if (minValue >= 0 && maxValue <= 1 &&
      /discount|rate|pct|percentage|ratio/i.test(columnName)) {
    return 'PERCENTAGE_DECIMAL'; // 0.05 = 5%
  }

  // More patterns...
}
```

---

## Implementation Priority

| Fix | Impact | Effort | Priority |
|-----|--------|--------|----------|
| KPI Glossary in prompt | High | Low | P0 |
| Business type in validation | Medium | Low | P1 |
| Column semantics detection | High | Medium | P1 |
| Sanity bounds per KPI type | Medium | Low | P1 |

---

## Verification

After implementing fixes, re-run:
```bash
pnpm with-env pnpm tsx packages/api/scripts/test-pipeline-with-validation.ts
```

Expected improvements:
- Items per Order: Should use COUNT(*) instead of SUM(quantity)
- AOV: Should be marked VALID for B2B context
- Discount Rate: Should correctly interpret percentage column
