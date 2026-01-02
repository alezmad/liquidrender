# Wave 1: Foundation [PARALLEL]

**Duration:** 2 days
**LOC:** ~550
**Files:** 8
**Mode:** PARALLEL (3 groups can execute simultaneously)

---

## Entry Criteria

- ✅ Wave 0 complete (types defined)
- ✅ `packages/liquid-connect/src/business-types/types.ts` exists
- ✅ TypeScript compiles with no errors

---

## Overview

Wave 1 implements business type detection and templates. This is the foundation for intelligent dashboard generation.

**Why Parallel:** Three independent groups with no file conflicts:
- Group A: Detection logic (detector.ts, signatures.ts)
- Group B: Template system (templates/)
- Group C: Template mapper (mapper.ts)

---

## Parallel Execution Groups

### Group A: Business Type Detection

**Agent Assignment:** Agent-A
**Files:** 2
**LOC:** ~250
**Dependencies:** Wave 0 types only

#### Task A1: Detection Signatures

**File:** `packages/liquid-connect/src/business-types/signatures.ts`

**Purpose:** Define patterns for each business type.

**Implementation:**
```typescript
import type { BusinessType, BusinessTypeSignal } from './types';

/**
 * Detection signatures for business types.
 *
 * Each business type has:
 * - Table patterns (higher weight)
 * - Column patterns (lower weight)
 * - Relationship patterns (moderate weight)
 */

interface SignatureDefinition {
  tables: { pattern: RegExp; weight: number }[];
  columns: { pattern: RegExp; weight: number }[];
  relationships?: { pattern: string; weight: number }[];
}

export const BUSINESS_TYPE_SIGNATURES: Record<BusinessType, SignatureDefinition> = {
  saas: {
    tables: [
      { pattern: /^subscriptions?$/i, weight: 30 },
      { pattern: /^plans?$/i, weight: 25 },
      { pattern: /^licenses?$/i, weight: 20 },
      { pattern: /^tenants?$/i, weight: 20 },
      { pattern: /^workspaces?$/i, weight: 15 },
      { pattern: /^billing$/i, weight: 15 },
    ],
    columns: [
      { pattern: /\bmrr\b/i, weight: 15 },
      { pattern: /\barr\b/i, weight: 15 },
      { pattern: /\bchurn/i, weight: 12 },
      { pattern: /\btrial/i, weight: 10 },
      { pattern: /\bplan_id/i, weight: 8 },
      { pattern: /\bseats?\b/i, weight: 8 },
      { pattern: /\bsubscription_id/i, weight: 8 },
    ],
  },
  ecommerce: {
    tables: [
      { pattern: /^orders?$/i, weight: 30 },
      { pattern: /^products?$/i, weight: 25 },
      { pattern: /^carts?$/i, weight: 20 },
      { pattern: /^inventory$/i, weight: 20 },
      { pattern: /^shipping$/i, weight: 15 },
      { pattern: /^fulfillment$/i, weight: 15 },
    ],
    columns: [
      { pattern: /\bsku\b/i, weight: 15 },
      { pattern: /\bquantity/i, weight: 12 },
      { pattern: /\bcart_id/i, weight: 10 },
      { pattern: /\bshipping/i, weight: 10 },
      { pattern: /\bfulfillment/i, weight: 10 },
      { pattern: /\border_id/i, weight: 8 },
    ],
  },
  marketplace: {
    tables: [
      { pattern: /^buyers?$/i, weight: 25 },
      { pattern: /^sellers?$/i, weight: 25 },
      { pattern: /^vendors?$/i, weight: 25 },
      { pattern: /^listings?$/i, weight: 20 },
      { pattern: /^commissions?$/i, weight: 20 },
    ],
    columns: [
      { pattern: /\bseller_id/i, weight: 15 },
      { pattern: /\bbuyer_id/i, weight: 15 },
      { pattern: /\bcommission/i, weight: 12 },
      { pattern: /\btake_rate/i, weight: 12 },
      { pattern: /\bvendor_id/i, weight: 10 },
    ],
  },
  // V2+ types (not implemented in V1)
  fintech: { tables: [], columns: [] },
  healthcare: { tables: [], columns: [] },
  edtech: { tables: [], columns: [] },
  media: { tables: [], columns: [] },
  logistics: { tables: [], columns: [] },
  custom: { tables: [], columns: [] },
};

// Confidence thresholds
export const CONFIDENCE_THRESHOLD = 60;  // Minimum for primary match
export const AMBIGUITY_THRESHOLD = 15;   // Max delta between top 2
```

**LOC:** ~100
**Issues:** BIZ-002

#### Task A2: Business Type Detector

**File:** `packages/liquid-connect/src/business-types/detector.ts`

**Purpose:** Analyze schema and detect business type.

**Reference:**
- Input: `packages/liquid-connect/src/uvb/models.ts` (ExtractedSchema)
- Patterns: `./signatures.ts` (just created)
- Similar logic: `packages/liquid-connect/src/uvb/rules.ts` (pattern matching examples)

**Requirements:**
1. Check table names against signatures
2. Check column names in all tables
3. Aggregate signals by business type
4. Calculate confidence scores
5. Return sorted matches
6. Flag ambiguous if top 2 are close

**Prompt:**
```
Create detectBusinessType() function:

1. Accept ExtractedSchema
2. For each business type in BUSINESS_TYPE_SIGNATURES:
   - Scan schema.tables for table name matches
   - Scan all columns for column name matches
   - Create BusinessTypeSignal for each match
   - Aggregate weights into confidence score
3. Sort matches by confidence descending
4. Select primary if confidence > CONFIDENCE_THRESHOLD (60)
5. Set ambiguous=true if top 2 within AMBIGUITY_THRESHOLD (15)
6. Return DetectionResult

Reference:
- Input: ExtractedSchema from liquid-connect/uvb/models.ts
- Patterns: BUSINESS_TYPE_SIGNATURES from ./signatures.ts
- Output: DetectionResult from ./types.ts
```

**LOC:** ~150
**Issues:** BIZ-003, GLUE-001

---

### Group B: Template System

**Agent Assignment:** Agent-B
**Files:** 4
**LOC:** ~200
**Dependencies:** Wave 0 types only

#### Task B1: SaaS Template

**File:** `packages/liquid-connect/src/business-types/templates/saas.ts`

**Purpose:** Define SaaS KPIs and dashboard layout.

**Requirements:**
```
Define saasTemplate: BusinessTypeTemplate with:

Primary KPIs:
- MRR: SUM({amount_column}) WHERE status = 'active'
- Churn Rate: {churned_customers} / {total_customers} * 100
- Customer Count: COUNT(DISTINCT {customer_id_column})
- ARPU: {mrr} / {customer_count}

Secondary KPIs:
- ARR: {mrr} * 12
- Trial Conversion Rate: {conversions} / {trials} * 100
- NRR: (start + expansion - contraction - churn) / start * 100

Dashboard sections:
1. Revenue: [MRR, ARR] + MRR trend line chart
2. Customers: [Customer Count, Churn Rate] + Cohort area chart
3. Efficiency: [ARPU, NRR]

Common questions:
- "What's our MRR?"
- "How is churn trending?"
- "Show me expansion revenue"
```

**LOC:** ~80
**Issues:** BIZ-004, TEMPLATE-001

#### Task B2: E-commerce Template

**File:** `packages/liquid-connect/src/business-types/templates/ecommerce.ts`

**Purpose:** Define E-commerce KPIs and dashboard layout.

**Requirements:**
```
Define ecommerceTemplate: BusinessTypeTemplate with:

Primary KPIs:
- GMV: SUM({order_total_column})
- Order Count: COUNT(DISTINCT {order_id_column})
- AOV: {gmv} / {order_count}
- Conversion Rate: {orders} / {sessions} * 100

Secondary KPIs:
- Cart Abandonment: (carts - orders) / carts * 100
- Customer LTV: {total_revenue} / {customers}
- Items Per Order: SUM({quantity_column}) / {order_count}

Dashboard sections:
1. Revenue: [GMV, AOV] + GMV trend line chart
2. Orders: [Order Count, Conversion Rate] + Orders bar chart
3. Products: [Items Per Order, Top Products table]
```

**LOC:** ~80
**Issues:** BIZ-005, TEMPLATE-002

#### Task B3: Generic/Custom Template

**File:** `packages/liquid-connect/src/business-types/templates/generic.ts`

**Purpose:** Fallback template for unrecognized schemas.

**Requirements:**
```
Define genericTemplate: BusinessTypeTemplate with:

Primary KPIs:
- Record Count: COUNT(*) from largest table
- Growth Rate: (current - previous) / previous * 100

Minimal dashboard:
- 1 section with detected metrics
- 1 time-series chart if time field detected

Use this when:
- No business type confidence > 60
- User selects "Custom" manually
```

**LOC:** ~40
**Issues:** TEMPLATE-003

---

### Group C: Template Mapper

**Agent Assignment:** Agent-C
**Files:** 2
**LOC:** ~100
**Dependencies:** Wave 0 types only

#### Task C1: Template Mapper

**File:** `packages/liquid-connect/src/business-types/mapper.ts`

**Purpose:** Map template slots to actual schema columns.

**Reference:**
- Input: DetectedVocabulary from `liquid-connect/uvb/models.ts`
- Template: BusinessTypeTemplate from `./types.ts`
- Output: MappingResult from `./types.ts`

**Requirements:**
```
Create mapToTemplate() function:

1. Accept DetectedVocabulary and BusinessTypeTemplate
2. For each KPI in template:
   - For each slot in KPI.formula.requiredMappings:
     - Search DetectedVocabulary.metrics for column matching patterns
     - Set mappedTo and confidence
   - If all slots mapped: status = "complete", generate formula
   - If some slots mapped: status = "partial"
   - If no slots mapped: status = "unmapped"
3. Calculate coverage: complete KPIs / total KPIs * 100
4. Return MappingResult

Mapping algorithm:
- Match patterns against metric.name, metric.column
- Higher confidence for exact matches
- Lower confidence for fuzzy matches
- Use metric.aggregation to validate KPI.aggregation compatibility
```

**LOC:** ~100
**Issues:** BIZ-006, GLUE-002, MAPPER-001

#### Task C2: Template Loader/Registry

**File:** `packages/liquid-connect/src/business-types/templates/index.ts`

**Purpose:** Template registry and loader.

**Implementation:**
```typescript
import type { BusinessType, BusinessTypeTemplate } from '../types';
import { saasTemplate } from './saas';
import { ecommerceTemplate } from './ecommerce';
import { genericTemplate } from './generic';

export const TEMPLATES: Record<BusinessType, BusinessTypeTemplate> = {
  saas: saasTemplate,
  ecommerce: ecommerceTemplate,
  generic: genericTemplate,
  // V2+ (not implemented)
  marketplace: genericTemplate,
  fintech: genericTemplate,
  healthcare: genericTemplate,
  edtech: genericTemplate,
  media: genericTemplate,
  logistics: genericTemplate,
  custom: genericTemplate,
};

export function getTemplate(type: BusinessType): BusinessTypeTemplate {
  return TEMPLATES[type] || genericTemplate;
}

export * from './saas';
export * from './ecommerce';
export * from './generic';
```

**LOC:** ~30 (plus exports)
**Issues:** TEMPLATE-004

---

## Module Integration

After all groups complete, update module exports:

**File:** `packages/liquid-connect/src/business-types/index.ts`

```typescript
export * from './types';
export * from './detector';
export * from './signatures';
export * from './mapper';
export * from './templates';
```

---

## Testing

Each group writes unit tests:

### Group A Tests
**File:** `packages/liquid-connect/src/business-types/__tests__/detector.test.ts`

```typescript
describe('detectBusinessType', () => {
  it('detects SaaS from subscriptions table', () => {
    const schema = createMockSchema(['subscriptions', 'plans', 'users']);
    const result = detectBusinessType(schema);
    expect(result.primary?.type).toBe('saas');
    expect(result.primary?.confidence).toBeGreaterThan(60);
  });

  it('detects e-commerce from orders and products', () => {
    const schema = createMockSchema(['orders', 'products', 'customers']);
    const result = detectBusinessType(schema);
    expect(result.primary?.type).toBe('ecommerce');
  });

  it('returns ambiguous when signals mixed', () => {
    const schema = createMockSchema(['subscriptions', 'orders']);
    const result = detectBusinessType(schema);
    expect(result.ambiguous).toBe(true);
  });
});
```

### Group B Tests
Template validation tests (ensure templates are valid BusinessTypeTemplate).

### Group C Tests
Mapping tests with mock DetectedVocabulary.

---

## Exit Criteria

- ✅ All 8 files created
- ✅ All 3 groups complete
- ✅ TypeScript compiles:
  ```bash
  pnpm --filter @repo/liquid-connect typecheck
  ```
- ✅ Unit tests pass:
  ```bash
  pnpm --filter @repo/liquid-connect test business-types
  ```
- ✅ Detector works for SaaS + E-commerce schemas
- ✅ Templates load without errors:
  ```typescript
  import { getTemplate } from '@repo/liquid-connect/business-types';
  const saas = getTemplate('saas');
  console.log(saas.kpis.primary); // Should show MRR, Churn, etc.
  ```
- ✅ Git commit:
  ```bash
  git add packages/liquid-connect/src/business-types/
  git commit -m "feat(knosia): wave-1 - business type foundation

  Wave 1: Foundation (3 parallel groups)
  Group A: Business type detection
  - Detection signatures for SaaS, E-commerce
  - Business type detector

  Group B: Template system
  - SaaS template with KPIs
  - E-commerce template
  - Generic/custom fallback

  Group C: Template mapper
  - Slot mapping algorithm
  - Template registry

  Closes: #BIZ-002 #BIZ-003 #BIZ-004 #BIZ-005 #BIZ-006
  Closes: #GLUE-001 #GLUE-002 #TEMPLATE-001 #TEMPLATE-002
  Closes: #TEMPLATE-003 #TEMPLATE-004 #MAPPER-001"
  ```

---

## Next Wave

After Wave 1 completes, proceed to **Wave 2: Glue Code** which uses:
- Business type detection (from Wave 1)
- Templates (from Wave 1)
- To implement the 4 glue functions

---

*Wave 1 complete. Business type foundation ready.*
