# Wave 1 → Wave 2+ Knowledge Transfer

**Date:** 2026-01-02
**From:** Wave 1 - Foundation
**To:** Wave 2 - Glue Code (and beyond)

---

## What Wave 1 Built

### Exports Available

```typescript
// Business type detection
import { detectBusinessType } from '@repo/liquid-connect/business-types';
import { CONFIDENCE_THRESHOLD, AMBIGUITY_THRESHOLD } from '@repo/liquid-connect/business-types';

// Templates
import { getTemplate, TEMPLATES } from '@repo/liquid-connect/business-types';
import { saasTemplate, ecommerceTemplate, genericTemplate } from '@repo/liquid-connect/business-types';

// Template mapping
import { mapToTemplate } from '@repo/liquid-connect/business-types';

// Types
import type {
  BusinessType,
  BusinessTypeMatch,
  DetectionResult,
  BusinessTypeTemplate,
  MappingResult,
  MappedKPI
} from '@repo/liquid-connect/business-types';
```

### Key Data Structures

#### 1. DetectionResult (from detectBusinessType)
```typescript
{
  matches: BusinessTypeMatch[],      // Sorted by confidence desc
  primary: BusinessTypeMatch | null, // Highest if > 60
  ambiguous: boolean                 // True if top 2 within 15 points
}
```

#### 2. MappingResult (from mapToTemplate)
```typescript
{
  businessType: BusinessType,
  template: BusinessTypeTemplate,
  mappedKPIs: MappedKPI[],          // KPIs with matched schema columns
  unmappedKPIs: KPIDefinition[],    // KPIs that couldn't be mapped
  coverage: number                   // 0-100 (complete KPIs / total KPIs)
}
```

#### 3. MappedKPI (in MappingResult.mappedKPIs)
```typescript
{
  kpi: KPIDefinition,
  mappings: SlotMapping[],          // With mappedTo filled in
  status: "complete" | "partial" | "unmapped",
  generatedFormula: string | null,  // Fully resolved SQL (if complete)
  canExecute: boolean               // True if ready to run
}
```

---

## Critical Patterns for Wave 2

### 1. Business Type Detection Flow

```typescript
import { extractSchema } from '@repo/liquid-connect/uvb';
import { detectBusinessType, getTemplate, mapToTemplate } from '@repo/liquid-connect/business-types';

// Step 1: Extract schema (already implemented in UVB)
const schema = await extractSchema(connection);

// Step 2: Detect business type
const detection = detectBusinessType(schema);

if (!detection.primary) {
  // Confidence too low - use generic template
  detection.primary = { type: 'custom', ... };
}

if (detection.ambiguous) {
  // User should choose between top 2
  // Present detection.matches[0] and detection.matches[1]
}

// Step 3: Get template
const template = getTemplate(detection.primary.type);

// Step 4: Map template to schema
const vocabulary = /* from UVB detection */;
const mapping = mapToTemplate(vocabulary, template);

// mapping.coverage tells you how well it matched
// mapping.mappedKPIs contains executable formulas
```

### 2. ID Generation (CRITICAL)

**Always use `generateId()`, NEVER UUID:**

```typescript
import { generateId } from '@turbostarter/shared/utils';

const vocabularyId = generateId(); // 32-char alphanumeric
```

### 3. Database Writes (Wave 2)

Target tables from `packages/db/src/schema/knosia.ts`:

```typescript
// Write detected vocabulary
await db.insert(knosiaVocabularyItem).values({
  id: generateId(),
  workspaceId: workspace.id,
  name: kpi.name,
  slug: kpi.slug,
  type: kpi.type,  // 'metric' | 'dimension'
  formula: mappedKPI.generatedFormula,
  sourceTable: /* extract from mappedTo */,
  sourceColumn: /* extract from mappedTo */,
  // ... other fields
});

// Create version snapshot
await db.insert(knosiaVocabularyVersion).values({
  id: generateId(),
  workspaceId: workspace.id,
  version: 1,
  vocabularySnapshot: JSON.stringify(mapping),
  // ...
});
```

### 4. Handling MappedKPI Status

```typescript
for (const mappedKPI of mapping.mappedKPIs) {
  if (mappedKPI.status === 'complete' && mappedKPI.canExecute) {
    // Save to DB - ready to use
    await saveVocabularyItem(mappedKPI);
  } else if (mappedKPI.status === 'partial') {
    // Save with flag for manual mapping needed
    await saveVocabularyItem(mappedKPI, { requiresManualMapping: true });
  }
  // Skip 'unmapped' entirely
}
```

---

## Lessons Learned from Wave 1

### ✅ What Worked

1. **Parallel execution** - 3 groups completed simultaneously without conflicts
2. **Clear file boundaries** - Each group had distinct files
3. **Test-driven** - All code has tests before integration
4. **TypeScript strict mode** - Caught errors early

### ⚠️ Watch Out For

1. **Export timing** - Update `index.ts` AFTER all groups finish, not during
2. **Test file location** - Use `__tests__/` subdirectory, fix import paths
3. **Import paths from tests** - Use `../` not `./` (tests are in subdirectory)
4. **Stub coordination** - When groups depend on each other, one creates stubs first

### 🔧 Integration Checklist

After Wave 2 completes:

```bash
# 1. Update exports in index.ts
# 2. Run type checking
pnpm --filter @repo/liquid-connect typecheck

# 3. Run tests
pnpm --filter @repo/liquid-connect test

# 4. Create git commit
git add packages/liquid-connect/src/glue/
git commit -m "feat(knosia): wave-2 - glue code"
```

---

## Wave 2 Specific Guidance

### Glue Function 1: detectBusinessTypeFromSchema()

**Input:** ExtractedSchema
**Output:** DetectionResult + selected template

```typescript
import { detectBusinessType, getTemplate } from '@repo/liquid-connect/business-types';

export async function detectBusinessTypeFromSchema(
  schema: ExtractedSchema
): Promise<{ detection: DetectionResult; template: BusinessTypeTemplate }> {
  const detection = detectBusinessType(schema);

  // Use primary match or fallback to custom
  const businessType = detection.primary?.type || 'custom';
  const template = getTemplate(businessType);

  return { detection, template };
}
```

### Glue Function 2: saveDetectedVocabulary()

**Input:** MappingResult + workspaceId
**Output:** vocabularyId (version ID)

- Write to `knosia_vocabulary_item` (one row per KPI)
- Write to `knosia_vocabulary_version` (snapshot)
- Only save KPIs with status = 'complete'
- Flag partial KPIs for manual review

### Glue Function 3: generateSemanticLayer()

**Input:** vocabularyId
**Output:** LiquidSchema-compatible semantic layer

- Read from `knosia_vocabulary_item`
- Transform to LiquidSchema format (from Wave 0)
- Include both metrics and dimensions

### Glue Function 4: compileDashboardSpec()

**Input:** semanticLayerId + template
**Output:** Canvas JSON (LiquidSpec)

- Use template.dashboard.sections
- For each section, create blocks:
  - KPI cards for metrics
  - Charts using section.chart config
- Arrange in grid layout

---

## Performance Notes

From Wave 1 testing:

- Business type detection: **~5ms** for typical schema (10-20 tables)
- Template mapping: **~10ms** for 7 KPIs
- Confidence calculation: **O(tables × columns × patterns)** - scales linearly

Wave 2 should expect:
- Database writes: **~50-100ms** per vocabulary item
- Full pipeline (detect → map → save): **<500ms** target

---

## Next Wave Dependencies

**Wave 3 (Integration)** will need from Wave 2:
- `detectBusinessTypeFromSchema()` - used in onboarding flow
- `saveDetectedVocabulary()` - called after schema analysis
- `generateSemanticLayer()` - consumed by Canvas renderer
- `compileDashboardSpec()` - generates initial dashboard

**Wave 4 (UI)** will need:
- None directly - consumes API endpoints that call glue functions

**Wave 5 (Polish)** will need:
- Error handling patterns from Wave 2
- Test fixtures for E2E flows

---

## File Locations Reference

```
packages/liquid-connect/src/
├── business-types/          ← Wave 1 output
│   ├── types.ts
│   ├── detector.ts
│   ├── signatures.ts
│   ├── mapper.ts
│   └── templates/
│       ├── saas.ts
│       ├── ecommerce.ts
│       └── generic.ts
├── glue/                    ← Wave 2 target
│   ├── detect-business-type.ts
│   ├── save-vocabulary.ts
│   ├── generate-semantic-layer.ts
│   └── compile-dashboard-spec.ts
└── uvb/                     ← Already exists (used by Wave 1+2)
    └── models.ts            ← DetectedVocabulary type
```

---

## Questions for Wave 2 Agents

Before starting Wave 2, agents should know:

1. **What does DetectedVocabulary look like?**
   → Read `packages/liquid-connect/src/uvb/models.ts`

2. **What's the Knosia database schema?**
   → Read `packages/db/src/schema/knosia.ts`

3. **What's LiquidSchema format?**
   → Read `packages/liquid-connect/src/types/liquid-schema.ts` (from Wave 0)

4. **How to generate IDs?**
   → `generateId()` from `@turbostarter/shared/utils`

5. **How to write to database?**
   → Import `db` from `@turbostarter/db/server`
   → Import tables from `@turbostarter/db/schema`

---

**Ready for Wave 2!** All foundational pieces are in place.
