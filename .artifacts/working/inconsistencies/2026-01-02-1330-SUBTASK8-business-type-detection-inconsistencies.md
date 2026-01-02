# Business Type Detection Inconsistencies Analysis

**Date:** 2026-01-02
**Task:** SUBTASK8 - Analyze business type detection inconsistencies across 5 architecture documents
**Status:** Analysis Complete

---

## Summary

Analysis of business type detection reveals **moderate inconsistencies** across the 5 documents, particularly in:
1. Business type enumerations (varying lists)
2. Template file formats (.yaml vs .ts)
3. Detection algorithm detail levels
4. Template structure definitions

---

## Inconsistency Catalog

```yaml
---
document_set:
  - .artifacts/2026-01-02-1500-knosia-platform-architecture.md
  - .artifacts/2026-01-02-1535-knosia-ux-journeys.md
  - .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md
  - .artifacts/2026-01-02-1700-knosia-project-structure.md
  - .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md

inconsistencies:
  - category: Business Type Enumeration
    severity: MEDIUM
    impact: Code generation ambiguity

    instances:
      - document: knosia-platform-architecture.md
        location: "Line 617"
        content: |
          type BusinessType = "saas" | "ecommerce" | "marketplace" | "fintech" | "custom";
        notes: "5 types defined"

      - document: knosia-glue-implementation-blueprint.md
        location: "Lines 417-425"
        content: |
          type BusinessType =
            | "saas"
            | "ecommerce"
            | "marketplace"
            | "fintech"
            | "healthcare"
            | "edtech"
            | "media"
            | "logistics"
            | "custom";
        notes: "9 types defined - adds healthcare, edtech, media, logistics"

      - document: knosia-project-structure.md
        location: "Lines 425-426"
        content: |
          ├── saas.yaml                  🆕 SaaS KPI template
          ├── ecommerce.yaml             🆕 E-commerce KPI template
          ├── marketplace.yaml           🆕 Marketplace KPI template
          └── generic.yaml               🆕 Fallback template
        notes: "Only 3 specific + 1 generic template mentioned"

    recommendation: |
      Choose canonical list. Recommend EXTENDED (9 types) as it provides better
      coverage, but document others as "V2 roadmap" if not implementing initially.

  - category: Template File Format
    severity: HIGH
    impact: File type mismatch blocks implementation

    instances:
      - document: knosia-platform-architecture.md
        location: "Lines 508-509"
        content: |
          | **SaaS Template** | KPI definitions for SaaS | `packages/liquid-connect/src/business-types/catalog/saas.yaml` |
        notes: "YAML format specified"

      - document: knosia-project-structure.md
        location: "Lines 425-427"
        content: |
          ├── saas.yaml                  🆕 SaaS KPI template
          ├── ecommerce.yaml             🆕 E-commerce KPI template
          ├── marketplace.yaml           🆕 Marketplace KPI template
        notes: "YAML format specified"

      - document: knosia-glue-implementation-blueprint.md
        location: "Lines 483-542"
        content: |
          **Create:** `packages/liquid-connect/src/business-types/templates/saas.ts`

          interface BusinessTypeTemplate {
            id: BusinessType;
            name: string;
            ...
          }
        notes: "TypeScript interface + .ts file format specified"

    recommendation: |
      CRITICAL: Must choose one format.

      YAML Pros:
      - Human-readable
      - Easy to edit without code changes
      - Follows common config pattern

      TypeScript Pros:
      - Type-safe
      - Can include complex logic
      - Easier to test

      RECOMMEND: TypeScript (.ts) with Zod schemas for runtime validation.
      YAML can be added later as import format.

  - category: Detection Algorithm Detail
    severity: LOW
    impact: Implementation guidance varies

    instances:
      - document: knosia-platform-architecture.md
        location: "Lines 625-650"
        content: |
          function detectBusinessType(schema: ExtractedSchema): BusinessTypeMatch {
            const signals: { type: BusinessType; signal: string; weight: number }[] = [];

            // Check table patterns
            for (const table of schema.tables) {
              if (/subscription/i.test(table.name)) {
                signals.push({ type: 'saas', signal: `Table: ${table.name}`, weight: 30 });
              }
              ...
            }
          }
        notes: "Pseudocode with basic pattern matching"

      - document: knosia-glue-implementation-blueprint.md
        location: "Lines 450-477"
        content: |
          Requirements:
          1. Accept ExtractedSchema
          2. Check table names against business type patterns:
             - SaaS: subscriptions, plans, licenses, tenants, workspaces
             - E-commerce: orders, products, carts, inventory, shipping
             - Marketplace: buyers, sellers, vendors, merchants, listings
             - FinTech: accounts, transactions, transfers, payments, ledger
          3. Check column names for signals:
             - SaaS: mrr, arr, churn, trial, subscription, plan_id, seats
             - E-commerce: sku, quantity, cart, shipping, fulfillment
             - Marketplace: commission, take_rate, seller_id, buyer_id
             - FinTech: balance, amount, credit, debit, interest, fee
          4. Weight table matches higher than column matches
          5. Aggregate signals into confidence scores per business type
          6. Return sorted matches with primary selection if confidence > 60
          7. Flag as ambiguous if top 2 are within 15 points
        notes: "Detailed requirements with specific patterns per type"

    recommendation: |
      Use GLUE BLUEPRINT version (detailed requirements) as source of truth.
      Extract patterns into separate signatures.ts module as specified.

  - category: Template Structure
    severity: MEDIUM
    impact: Data structure ambiguity

    instances:
      - document: knosia-platform-architecture.md
        location: "N/A"
        content: "No template structure defined"
        notes: "Only mentions templates exist, no schema"

      - document: knosia-glue-implementation-blueprint.md
        location: "Lines 486-530"
        content: |
          interface BusinessTypeTemplate {
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

            questions: string[];
          }
        notes: "Complete interface with nested structures"

      - document: knosia-consolidated-implementation.md
        location: "Lines 579-612"
        content: |
          export interface DashboardSpec {
            businessType: string;
            title: string;
            sections: DashboardSection[];
            suggestedQuestions: string[];
          }

          export interface DashboardSection {
            name: string;
            kpis: DashboardKPI[];
            chart?: DashboardChart;
          }
        notes: "DashboardSpec (output) not BusinessTypeTemplate (input)"

    recommendation: |
      Use GLUE BLUEPRINT BusinessTypeTemplate as canonical.
      Ensure clear distinction between:
      - BusinessTypeTemplate (input/catalog)
      - DashboardSpec (output/generated)

  - category: Detection Signatures Location
    severity: LOW
    impact: File organization clarity

    instances:
      - document: knosia-project-structure.md
        location: "Lines 48-50"
        content: |
          ├── detector.ts                    🆕 detectBusinessType(schema)
          ├── signatures.ts                  🆕 Detection patterns
          ├── mapper.ts                      🆕 mapToTemplate(detected, template)
        notes: "signatures.ts as separate module"

      - document: knosia-glue-implementation-blueprint.md
        location: "Lines 450-477"
        content: |
          Requirements:
          2. Check table names against business type patterns:
             - SaaS: subscriptions, plans, licenses, tenants, workspaces
             - E-commerce: orders, products, carts, inventory, shipping
             ...
          3. Check column names for signals:
             - SaaS: mrr, arr, churn, trial, subscription, plan_id, seats
             ...
        notes: "Patterns embedded in requirements, not in separate file spec"

    recommendation: |
      Create signatures.ts with structure:

      export const businessTypeSignatures: Record<BusinessType, {
        tablePatterns: RegExp[];
        columnPatterns: RegExp[];
        weights: { table: number; column: number };
      }> = { ... }

---

## Canonical Reference Guide

### 1. Business Types (CANONICAL)

```typescript
// Source: knosia-glue-implementation-blueprint.md (lines 417-425)
// Status: EXTENDED SET (use this)

type BusinessType =
  | "saas"
  | "ecommerce"
  | "marketplace"
  | "fintech"
  | "healthcare"
  | "edtech"
  | "media"
  | "logistics"
  | "custom";

// V1 Implementation: saas, ecommerce, marketplace, custom
// V2 Roadmap: fintech, healthcare, edtech, media, logistics
```

### 2. Template File Format (CANONICAL)

```typescript
// Source: knosia-glue-implementation-blueprint.md (lines 483-542)
// Decision: TypeScript (.ts) with Zod validation

// File: packages/liquid-connect/src/business-types/templates/saas.ts
import { z } from 'zod';

export const saasTemplate: BusinessTypeTemplate = {
  id: 'saas',
  name: 'SaaS',
  description: 'Software as a Service business model',
  kpis: {
    primary: [ /* ... */ ],
    secondary: [ /* ... */ ]
  },
  entities: [ /* ... */ ],
  dashboard: {
    layout: 'executive',
    sections: [ /* ... */ ]
  },
  questions: [ /* ... */ ]
};

// Zod schema for runtime validation
export const businessTypeTemplateSchema = z.object({
  id: z.enum(["saas", "ecommerce", "marketplace", /* ... */]),
  name: z.string(),
  description: z.string(),
  // ... rest of schema
});
```

### 3. Detection Algorithm (CANONICAL)

```typescript
// Source: knosia-glue-implementation-blueprint.md (lines 450-477)
// Location: packages/liquid-connect/src/business-types/detector.ts

/**
 * Detect business type from database schema patterns.
 *
 * Algorithm:
 * 1. Check table names against patterns (weight: 30 per match)
 * 2. Check column names against patterns (weight: 10 per match)
 * 3. Aggregate signals by business type
 * 4. Calculate confidence: sum(weights) / max_possible_score * 100
 * 5. Select primary if confidence > 60
 * 6. Flag ambiguous if top 2 within 15 points
 */
function detectBusinessType(schema: ExtractedSchema): DetectionResult
```

### 4. Template Structure (CANONICAL)

```typescript
// Source: knosia-glue-implementation-blueprint.md (lines 486-530)

interface BusinessTypeTemplate {
  id: BusinessType;
  name: string;
  description: string;

  // KPIs with formula templates
  kpis: {
    primary: KPIDefinition[];
    secondary: KPIDefinition[];
  };

  // Expected entities
  entities: EntityExpectation[];

  // Dashboard layout
  dashboard: {
    layout: "executive" | "operational" | "detailed";
    sections: DashboardSection[];
  };

  // Common questions for this business type
  questions: string[];
}

interface KPIDefinition {
  id: string;
  name: string;
  slug: string;
  type: "metric" | "dimension";
  aggregation?: string;
  format: "currency" | "percentage" | "number" | "duration";
  direction: "higher_is_better" | "lower_is_better" | "target_range";
  formula: {
    template: string;  // e.g., "SUM({amount_column})"
    requiredMappings: SlotMapping[];
  };
  suggestedForRoles?: string[];
}

interface SlotMapping {
  slot: string;           // e.g., "amount_column"
  hint: string;           // e.g., "subscription amount/price column"
  patterns: RegExp[];     // e.g., [/amount/i, /price/i, /mrr/i]
}
```

---

## Resolution Actions

### Immediate (Block Implementation)

1. **FILE FORMAT DECISION**
   - [ ] Document decision: TypeScript (.ts) templates
   - [ ] Update knosia-platform-architecture.md (line 508)
   - [ ] Update knosia-project-structure.md (lines 425-427)
   - Rationale: Type safety + testability

2. **BUSINESS TYPE ENUMERATION**
   - [ ] Document V1 vs V2 split
   - [ ] V1: saas, ecommerce, marketplace, custom
   - [ ] V2: fintech, healthcare, edtech, media, logistics
   - [ ] Update all docs with V1/V2 notation

### Short-term (Before Implementation)

3. **TEMPLATE EXAMPLES**
   - [ ] Create reference saas.ts template
   - [ ] Validate against BusinessTypeTemplate interface
   - [ ] Add to .artifacts/ as example

4. **DETECTION PATTERNS**
   - [ ] Extract patterns from glue-blueprint to signatures.ts spec
   - [ ] Create table + column pattern catalog
   - [ ] Document weighting algorithm

### Medium-term (Documentation Cleanup)

5. **CROSS-REFERENCE ALIGNMENT**
   - [ ] Update knosia-platform-architecture.md with V1/V2 split
   - [ ] Update knosia-consolidated-implementation.md with file format
   - [ ] Ensure all 5 docs reference same canonical sources

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| TypeScript vs YAML format ambiguity | HIGH | Decision documented above, update all references |
| Business type list expansion unclear | MEDIUM | V1/V2 split clarifies scope |
| Template structure variations | MEDIUM | Canonical interface defined |
| Detection algorithm detail gaps | LOW | Glue blueprint provides complete spec |

---

## Cross-Reference Matrix

| Concept | Platform Arch | UX Journeys | Consolidated | Project Structure | Glue Blueprint | Canonical Source |
|---------|---------------|-------------|--------------|-------------------|----------------|------------------|
| Business Types | 5 types | N/A | N/A | N/A | 9 types | **Glue Blueprint** (9 types, V1/V2 split) |
| Template Format | .yaml | N/A | N/A | .yaml | .ts | **Glue Blueprint** (.ts) |
| Detection Algorithm | Pseudocode | N/A | N/A | N/A | Detailed spec | **Glue Blueprint** |
| Template Structure | Not defined | N/A | DashboardSpec | N/A | Complete interface | **Glue Blueprint** |
| Signatures Module | Not defined | N/A | N/A | Mentioned | Patterns listed | **Glue Blueprint** + Project Structure |

---

## Conclusion

**Overall Consistency:** 6/10

The documents show reasonable alignment on core concepts but have **critical ambiguities** in:
1. File formats (YAML vs TypeScript)
2. Business type enumeration scope

The **Glue Implementation Blueprint** provides the most detailed and complete specifications and should serve as the **primary reference** for implementation.

**Recommended Reading Order for Implementers:**
1. knosia-glue-implementation-blueprint.md (source of truth for glue code)
2. knosia-project-structure.md (file organization)
3. knosia-consolidated-implementation.md (overall context)
4. knosia-platform-architecture.md (high-level vision)
5. knosia-ux-journeys.md (UX context, less technical detail)

---

**Generated:** 2026-01-02
**Analyzer:** Claude Sonnet 4.5
**Confidence:** High (complete file analysis)
