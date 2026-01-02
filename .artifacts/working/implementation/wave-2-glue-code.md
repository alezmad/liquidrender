# Wave 2: Glue Code [MIXED]

**Duration:** 3 days
**LOC:** ~700
**Files:** 5
**Mode:** MIXED (sequential phases with some parallel tasks)

---

## Entry Criteria

- ✅ Wave 0 complete (types defined)
- ✅ Wave 1 complete (business type detection + templates working)
- ✅ `detectBusinessType()` function exists
- ✅ `mapToTemplate()` function exists
- ✅ Templates (saas, ecommerce) defined

---

## Overview

Wave 2 implements the 4 core glue functions that connect LiquidConnect, Vocabulary, and LiquidRender.

**Why Mixed:** Some glue functions depend on others, so we sequence them in 3 phases:
- Phase 2.1: Vocabulary glue (PARALLEL - 2 tasks)
- Phase 2.2: Dashboard glue (SEQUENTIAL - depends on Phase 2.1)
- Phase 2.3: Schema generator (SEQUENTIAL - depends on Phase 2.2)

---

## Phase 2.1: Vocabulary Glue [PARALLEL]

**Duration:** 1 day
**Groups:** 2 independent tasks

### Group A: Save Detected Vocabulary

**Agent Assignment:** Agent-A
**File:** `packages/api/src/modules/knosia/vocabulary/from-detected.ts`
**LOC:** ~100
**Dependencies:** Knosia DB schema only

#### Task: saveDetectedVocabulary()

**Purpose:** Transform UVB DetectedVocabulary into knosia_vocabulary_item rows.

**Reference:**
- Input: DetectedVocabulary from `packages/liquid-connect/src/uvb/models.ts`
- Output: knosia_vocabulary_item in `packages/db/src/schema/knosia.ts` (lines 377-470)
- ID generation: `import { generateId } from "@turbostarter/shared/utils"`
- DB: `import { db } from "@turbostarter/db/server"`

**Implementation Guide:**

```typescript
import { generateId } from "@turbostarter/shared/utils";
import { db } from "@turbostarter/db/server";
import { knosiaVocabularyItem } from "@turbostarter/db/schema";
import type { DetectedVocabulary } from "@repo/liquid-connect/uvb";

interface SaveDetectedVocabularyOptions {
  promoteHighCertaintyToOrg?: boolean;  // Default true
  certaintyThreshold?: number;  // Default 0.8
  skipExisting?: boolean;
}

interface SaveDetectedVocabularyResult {
  metrics: { created: number; skipped: number };
  dimensions: { created: number; skipped: number };
  entities: { created: number; skipped: number };
  errors: Array<{ item: string; error: string }>;
}

export async function saveDetectedVocabulary(
  detected: DetectedVocabulary,
  orgId: string,
  workspaceId: string,
  options?: SaveDetectedVocabularyOptions
): Promise<SaveDetectedVocabularyResult> {
  // Implementation:
  // 1. For each detected.metrics:
  //    - Create slug (lowercase, hyphenated)
  //    - Map to knosiaVocabularyItem with type="metric"
  //    - Set status="approved" if certainty >= 0.8, else "draft"
  //    - Store aggregation, sourceTable, sourceColumn
  //    - Generate formulaSql from aggregation + table.column
  // 2. For each detected.dimensions:
  //    - Create slug
  //    - Map to type="dimension"
  //    - Store cardinality
  // 3. For each detected.entities:
  //    - Create slug
  //    - Map to type="entity"
  // 4. Handle slug conflicts (append _2, _3, etc.)
  // 5. Return summary counts
}
```

**LOC:** ~100
**Issues:** GLUE-003, VOC-001, PIPE-001

---

### Group B: Generate Semantic Layer

**Agent Assignment:** Agent-B
**File:** `packages/liquid-connect/src/semantic/from-vocabulary.ts`
**LOC:** ~150
**Dependencies:** LiquidConnect semantic types only

#### Task: generateSemanticLayer()

**Purpose:** Transform ResolvedVocabulary + ExtractedSchema into SemanticLayer for query execution.

**Reference:**
- Input (vocab): ResolvedVocabulary from `packages/api/src/modules/knosia/vocabulary/resolution.ts`
- Input (schema): ExtractedSchema from `packages/liquid-connect/src/uvb/models.ts`
- Output: SemanticLayer from `packages/liquid-connect/src/semantic/types.ts`
- Validation: `import { validateSemanticLayer } from './index'`

**Implementation Guide:**

```typescript
import type { ExtractedSchema } from '../uvb/models';
import type { ResolvedVocabulary } from '@turbostarter/api/modules/knosia/vocabulary/resolution';
import type { SemanticLayer } from './types';

interface GenerateSemanticLayerOptions {
  includeDeprecated?: boolean;
  includeDrafts?: boolean;
  name?: string;
}

export function generateSemanticLayer(
  resolved: ResolvedVocabulary,
  schema: ExtractedSchema,
  options?: GenerateSemanticLayerOptions
): SemanticLayer {
  // Implementation:
  // 1. Generate sources from schema.tables
  // 2. Generate entities from vocabulary items where type="entity"
  // 3. Generate metrics from vocabulary items where type="metric"
  //    - Use definition.formulaSql as expression
  //    - Map aggregation field to SemanticLayer aggregation
  //    - Set entity from definition.sourceTables[0]
  // 4. Generate dimensions from vocabulary items where type="dimension"
  //    - Use definition.sourceColumn for expression
  //    - Detect isTime from data type patterns
  // 5. Include user's private vocabulary (scope="private") as derived metrics
  // 6. Map user synonyms to metric aliases
  // 7. Generate relationships from schema foreign keys
  // 8. Validate and return
}
```

**LOC:** ~150
**Issues:** GLUE-004, SEM-001, PIPE-002

---

## Phase 2.2: Dashboard Spec Generator [SEQUENTIAL]

**Duration:** 1 day
**Agent Assignment:** Agent-C
**File:** `packages/liquid-connect/src/dashboard/generator.ts`
**LOC:** ~150
**Dependencies:** Phase 2.1 complete (vocabulary glue working)

### Task: generateDashboardSpec()

**Purpose:** Transform MappingResult into DashboardSpec.

**Reference:**
- Input: MappingResult from `packages/liquid-connect/src/business-types/types.ts`
- Output: DashboardSpec from `packages/liquid-connect/src/dashboard/types.ts`

**Implementation Guide:**

```typescript
import type { MappingResult, BusinessTypeTemplate } from '../business-types/types';
import type { DashboardSpec, DashboardSection } from './types';

interface GenerateDashboardSpecOptions {
  includePartialKPIs?: boolean;
  maxKPIsPerSection?: number;
}

export function generateDashboardSpec(
  mapping: MappingResult,
  options?: GenerateDashboardSpecOptions
): DashboardSpec {
  // Implementation:
  // 1. Use template.dashboard.sections as layout guide
  // 2. For each section:
  //    - Include only KPIs where canExecute=true
  //    - Generate LC DSL query (simple: just the slug)
  //    - Generate chart query if section has chart definition
  // 3. Calculate coverage: mapped KPIs / total KPIs * 100
  // 4. Generate warnings for:
  //    - Unmapped primary KPIs
  //    - Low confidence mappings
  //    - Missing time dimension for charts
  // 5. Include suggestedForRoles from KPI definitions
  // 6. Return DashboardSpec
}
```

**LOC:** ~150
**Issues:** GLUE-005, DASH-002, PIPE-003

---

## Phase 2.3: LiquidSchema Generator [SEQUENTIAL]

**Duration:** 1 day
**Agent Assignment:** Agent-D
**File:** `packages/liquid-render/src/dashboard/schema-generator.ts`
**LOC:** ~100
**Dependencies:** Phase 2.2 complete (DashboardSpec generation working)

### Task: dashboardSpecToLiquidSchema()

**Purpose:** Transform DashboardSpec into LiquidSchema for rendering.

**Reference:**
- Input: DashboardSpec from `packages/liquid-connect/src/dashboard/types.ts`
- Output: LiquidSchema from `packages/liquid-render/src/compiler/ui-emitter.ts`
- Example: `apps/web/src/modules/knosia/canvas/components/blocks/liquid-render-block.tsx`

**Implementation Guide:**

```typescript
import type { DashboardSpec } from '@repo/liquid-connect/dashboard';
import type { LiquidSchema, Block, Layer } from '../compiler/ui-emitter';

interface SchemaGeneratorOptions {
  maxKPIsPerRow?: number;  // Default 4
  includeSectionHeaders?: boolean;  // Default true
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';  // Default 'md'
}

export function dashboardSpecToLiquidSchema(
  spec: DashboardSpec,
  options?: SchemaGeneratorOptions
): LiquidSchema {
  // Implementation:
  // 1. Create single layer (id: 0, visible: true)
  // 2. Create root container block
  // 3. For each section in spec.sections:
  //    a. Create heading block (if includeSectionHeaders)
  //    b. Create grid block for KPIs:
  //       - columns = min(kpis.length, maxKPIsPerRow)
  //       - gap = options.gap
  //    c. For each KPI:
  //       - type: "kpi"
  //       - binding: { kind: "field", value: kpi.slug }
  //       - label: kpi.name
  //    d. If section has chart:
  //       - type: chart.type
  //       - binding: { kind: "field", value: chart.binding, x: chart.xAxis, y: chart.yAxis }
  //       - label: chart.title
  // 4. Generate unique uids: `${sectionId}_${blockType}_${index}`
  // 5. Return LiquidSchema
}
```

**Example Output:**
```typescript
{
  version: "1.0",
  signals: [],
  layers: [{
    id: 0,
    visible: true,
    root: {
      uid: "root",
      type: "container",
      children: [
        {
          uid: "revenue_heading",
          type: "heading",
          binding: { kind: "literal", value: "Revenue" },
          label: "Revenue"
        },
        {
          uid: "revenue_kpis",
          type: "grid",
          layout: { columns: 2, gap: "md" },
          children: [
            {
              uid: "revenue_kpi_mrr",
              type: "kpi",
              binding: { kind: "field", value: "mrr" },
              label: "MRR"
            },
            {
              uid: "revenue_kpi_arr",
              type: "kpi",
              binding: { kind: "field", value: "arr" },
              label: "ARR"
            }
          ]
        },
        {
          uid: "revenue_chart",
          type: "line",
          binding: { kind: "field", value: "mrr_trend", x: "month", y: "mrr" },
          label: "MRR Trend"
        }
      ]
    }
  }]
}
```

**LOC:** ~100
**Issues:** GLUE-011, DASH-003, UI-001

---

## Module Integration

After all phases complete, update module exports:

**File:** `packages/liquid-connect/src/dashboard/index.ts`
```typescript
export * from './types';
export * from './generator';
```

**File:** `packages/liquid-render/src/dashboard/index.ts`
```typescript
export * from './schema-generator';
```

**File:** `packages/api/src/modules/knosia/vocabulary/index.ts`
```typescript
export * from './from-detected';
// ... existing exports
```

---

## Testing

### Integration Test: Full Glue Chain

**File:** `packages/api/src/modules/knosia/__tests__/glue-integration.test.ts`

```typescript
describe('Glue Integration', () => {
  it('transforms UVB output to rendered dashboard', async () => {
    // 1. Mock DetectedVocabulary (from UVB)
    const detected = createMockDetectedVocabulary();

    // 2. Save to DB
    const saveResult = await saveDetectedVocabulary(
      detected,
      testOrgId,
      testWorkspaceId
    );
    expect(saveResult.metrics.created).toBeGreaterThan(0);

    // 3. Resolve vocabulary
    const resolved = await resolveVocabulary(testUserId, testWorkspaceId);
    expect(resolved.items.length).toBeGreaterThan(0);

    // 4. Generate semantic layer
    const schema = createMockExtractedSchema();
    const semanticLayer = generateSemanticLayer(resolved, schema);
    expect(semanticLayer.metrics).toBeDefined();

    // 5. Detect business type & map template
    const detection = detectBusinessType(schema);
    const template = getTemplate(detection.primary!.type);
    const mapping = mapToTemplate(detected, template);

    // 6. Generate dashboard spec
    const dashboardSpec = generateDashboardSpec(mapping);
    expect(dashboardSpec.sections.length).toBeGreaterThan(0);

    // 7. Generate LiquidSchema
    const liquidSchema = dashboardSpecToLiquidSchema(dashboardSpec);
    expect(liquidSchema.layers[0].root.children).toBeDefined();
  });
});
```

---

## Exit Criteria

- ✅ All 5 files created
- ✅ All 3 phases complete
- ✅ TypeScript compiles:
  ```bash
  pnpm typecheck
  ```
- ✅ Integration test passes:
  ```bash
  pnpm --filter @turbostarter/api test glue-integration
  ```
- ✅ Manual verification:
  ```typescript
  // Can transform DetectedVocabulary → LiquidSchema end-to-end
  import { saveDetectedVocabulary } from '@turbostarter/api/modules/knosia/vocabulary/from-detected';
  import { generateSemanticLayer } from '@repo/liquid-connect/semantic';
  import { generateDashboardSpec, dashboardSpecToLiquidSchema } from '@repo/liquid-connect/dashboard';

  // All functions work together
  ```
- ✅ Git commit:
  ```bash
  git add packages/liquid-connect/src/semantic/from-vocabulary.ts
  git add packages/liquid-connect/src/dashboard/generator.ts
  git add packages/liquid-render/src/dashboard/schema-generator.ts
  git add packages/api/src/modules/knosia/vocabulary/from-detected.ts
  git commit -m "feat(knosia): wave-2 - glue code (4 functions)

  Wave 2: Glue Code (3 sequential phases)
  Phase 2.1: Vocabulary glue (parallel)
  - saveDetectedVocabulary: UVB → DB
  - generateSemanticLayer: Vocab → SemanticLayer

  Phase 2.2: Dashboard spec generator
  - generateDashboardSpec: Template → DashboardSpec

  Phase 2.3: LiquidSchema generator
  - dashboardSpecToLiquidSchema: DashboardSpec → LiquidSchema

  Closes: #GLUE-003 #GLUE-004 #GLUE-005 #GLUE-011
  Closes: #VOC-001 #SEM-001 #DASH-002 #DASH-003
  Closes: #PIPE-001 #PIPE-002 #PIPE-003 #UI-001"
  ```

---

## Next Wave

After Wave 2 completes, proceed to **Wave 3: Integration** which:
- Builds the pipeline orchestrator (runKnosiaPipeline)
- Connects all glue functions end-to-end
- Integrates HOME page with Canvas

---

*Wave 2 complete. All 4 glue functions implemented.*
