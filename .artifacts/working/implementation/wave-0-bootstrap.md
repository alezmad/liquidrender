# Wave 0: Bootstrap [SEQUENTIAL]

**Duration:** 1 day
**LOC:** ~150
**Files:** 3
**Mode:** SEQUENTIAL (execute tasks one by one)

---

## Entry Criteria

- ✅ Database schema exists (`packages/db/src/schema/knosia.ts`)
- ✅ LiquidConnect package built
- ✅ LiquidRender package built
- ✅ TypeScript compiles with no errors

---

## Overview

Bootstrap creates the foundational type definitions and interfaces that all subsequent waves depend on. This wave has zero dependencies on implementation code - it only defines contracts.

**Why Sequential:** Type definitions must be in a specific order due to TypeScript's import dependencies.

---

## Tasks

### Task 1: Business Type Types

**File:** `packages/liquid-connect/src/business-types/types.ts`

**Create:**
```typescript
/**
 * Business Type System
 *
 * Canonical enum and detection interfaces used across:
 * - Detection (wave-1)
 * - Templates (wave-1)
 * - Dashboard generation (wave-2)
 */

// V1: saas, ecommerce, custom
// V2+: marketplace, fintech, healthcare, edtech, media, logistics
export type BusinessType =
  | "saas"
  | "ecommerce"
  | "marketplace"
  | "fintech"
  | "healthcare"
  | "edtech"
  | "media"
  | "logistics"
  | "custom";

export interface BusinessTypeSignal {
  type: BusinessType;
  signal: string;        // What we found (e.g., "subscriptions table")
  weight: number;        // 0-100
  source: "table" | "column" | "pattern" | "relationship";
}

export interface BusinessTypeMatch {
  type: BusinessType;
  confidence: number;    // 0-100, aggregated from signals
  signals: BusinessTypeSignal[];
  templateId: string;
}

export interface DetectionResult {
  matches: BusinessTypeMatch[];  // Sorted by confidence desc
  primary: BusinessTypeMatch | null;  // Highest if > threshold
  ambiguous: boolean;  // True if top 2 within 15% of each other
}

// Slot mapping for template → schema binding
export interface SlotMapping {
  slot: string;           // e.g., "amount_column"
  hint: string;           // e.g., "subscription amount/price column"
  patterns: RegExp[];     // e.g., [/amount/i, /price/i, /mrr/i]
  mappedTo?: string;      // Actual column found (set by mapper)
  confidence?: number;    // 0-100
}

// Template definition
export interface BusinessTypeTemplate {
  id: BusinessType;
  name: string;
  description: string;
  kpis: {
    primary: KPIDefinition[];
    secondary: KPIDefinition[];
  };
  entities: EntityExpectation[];
  dashboard: {
    layout: "executive" | "operational" | "detailed";
    sections: DashboardSection[];
  };
  questions: string[];  // Common questions for this business type
}

export interface KPIDefinition {
  id: string;
  name: string;
  slug: string;
  type: "metric" | "dimension";
  aggregation?: "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX";
  format: "currency" | "percentage" | "number" | "duration";
  direction: "higher_is_better" | "lower_is_better" | "target_range";
  formula: {
    template: string;  // e.g., "SUM({amount_column}) WHERE status = 'active'"
    requiredMappings: SlotMapping[];
  };
  suggestedForRoles?: string[];
}

export interface EntityExpectation {
  name: string;
  required: boolean;
  patterns: RegExp[];
}

export interface DashboardSection {
  id: string;
  name: string;
  kpis: string[];  // KPI IDs from template
  chart?: {
    type: "line" | "bar" | "area" | "pie";
    metric: string;  // KPI ID
    timeGrain: "day" | "week" | "month" | "quarter" | "year";
    periods: number;
  };
}

// Mapping result (detection → template application)
export interface MappingResult {
  businessType: BusinessType;
  template: BusinessTypeTemplate;
  mappedKPIs: MappedKPI[];
  unmappedKPIs: KPIDefinition[];
  coverage: number;  // 0-100
}

export interface MappedKPI {
  kpi: KPIDefinition;
  mappings: SlotMapping[];  // With mappedTo filled in
  status: "complete" | "partial" | "unmapped";
  generatedFormula: string | null;  // Fully resolved SQL
  canExecute: boolean;
}
```

**LOC:** ~100
**Issues:** TYPE-001, BIZ-001

---

### Task 2: Dashboard Spec Types

**File:** `packages/liquid-connect/src/dashboard/types.ts`

**Create:**
```typescript
/**
 * Dashboard Specification
 *
 * Output of business type mapping, input to LiquidSchema generation.
 */

export interface DashboardSpec {
  businessType: string;
  title: string;
  generatedAt: string;
  sections: DashboardSection[];
  coverage: number;  // % of KPIs successfully mapped
  warnings: string[];
}

export interface DashboardSection {
  id: string;
  name: string;
  kpis: DashboardKPI[];
  chart?: DashboardChart;
}

export interface DashboardKPI {
  id: string;
  name: string;
  slug: string;              // For data binding
  format: string;            // currency, percentage, number
  query: string;             // LC DSL query (usually just the slug for simple metrics)
  suggestedForRoles?: string[];
  isFavorite?: boolean;
}

export interface DashboardChart {
  type: "line" | "bar" | "area" | "pie";
  title: string;
  binding: string;           // Field name for data
  xAxis: string;
  yAxis: string;
  query: string;             // LC DSL query
}
```

**LOC:** ~40
**Issues:** DASH-001

---

### Task 3: Module Index Files

**Files:**
- `packages/liquid-connect/src/business-types/index.ts`
- `packages/liquid-connect/src/dashboard/index.ts`

**Create business-types/index.ts:**
```typescript
/**
 * Business Type Detection System
 *
 * Entry point for business type detection and template management.
 */

export * from './types';

// Wave 1 exports (not yet implemented)
// export * from './detector';
// export * from './signatures';
// export * from './mapper';
// export * from './templates';
```

**Create dashboard/index.ts:**
```typescript
/**
 * Dashboard Generation
 *
 * Transforms business type mappings into dashboard specifications.
 */

export * from './types';

// Wave 2 exports (not yet implemented)
// export * from './generator';
```

**LOC:** ~10 (combined)
**Issues:** TYPE-002

---

## Exit Criteria

- ✅ All 3 files created
- ✅ TypeScript compiles with no errors:
  ```bash
  pnpm --filter @repo/liquid-connect typecheck
  ```
- ✅ Types exported correctly:
  ```bash
  # Verify exports
  node -e "const types = require('./packages/liquid-connect/dist/business-types'); console.log(Object.keys(types));"
  ```
- ✅ No circular dependencies
- ✅ Git commit created:
  ```bash
  git add packages/liquid-connect/src/business-types/
  git add packages/liquid-connect/src/dashboard/
  git commit -m "feat(knosia): wave-0 - bootstrap type definitions

  Wave 0: Bootstrap
  - Business type system types
  - Dashboard spec types
  - Module index files

  Closes: #TYPE-001 #BIZ-001 #DASH-001 #TYPE-002"
  ```

---

## Next Wave

After Wave 0 completes, proceed to **Wave 1: Foundation** which implements:
- Business type detector (uses types from Wave 0)
- Business type templates (uses types from Wave 0)
- Template mapper (uses types from Wave 0)

---

*Wave 0 complete. All foundation types defined.*
