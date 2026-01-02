# Glue Functions Inconsistencies Analysis

**Date:** 2026-01-02
**Task:** SUBTASK5 - Analyze glue function inconsistencies across 5 key documents
**Status:** Analysis Complete

---

## Executive Summary

**Critical Finding:** The documents show **major inconsistencies** in:
- LOC estimates (700 → 950 → 1,250 → 2,650)
- Function count (4 → 5 → 7 glue functions)
- Function signatures and interfaces
- Implementation locations

**Recommendation:** Use **2026-01-02-1800-knosia-glue-implementation-blueprint.md** as source of truth (most detailed).

---

## 1. Function Count Discrepancy

### Document Analysis

| Document | Function Count | Functions Listed |
|----------|---------------|------------------|
| **1500-platform-architecture** | **4 glue functions** | saveDetectedVocabulary, generateSemanticLayerForUser, detectBusinessType + generateDashboardSpec (combined), dashboardSpecToLiquidSchema |
| **1535-ux-journeys** | **0** (UX-only doc) | N/A - no technical specs |
| **1600-consolidated-implementation** | **5 functions** | saveDetectedVocabulary, generateSemanticLayer, detectBusinessType, generateDashboardSpec, dashboardSpecToLiquidSchema |
| **1700-project-structure** | **4 core glue** | Same as 1500, but implies more via "glue modules" |
| **1800-glue-implementation-blueprint** | **7 functions** | saveDetectedVocabulary, generateSemanticLayer, detectBusinessType, mapToTemplate (new!), generateDashboardSpec, dashboardSpecToLiquidSchema, runKnosiaPipeline (new!) |

### Inconsistency

```yaml
issue: function_count_mismatch
severity: CRITICAL
evidence:
  - doc_1500: "4 glue functions"
  - doc_1600: "5 functions"
  - doc_1800: "7 functions (includes 2 new: mapToTemplate, runKnosiaPipeline)"
resolution:
  recommended: Use 1800 breakdown (7 functions)
  reason: "Most granular, separates concerns properly (mapToTemplate is distinct from generateDashboardSpec)"
```

---

## 2. LOC Estimates Inconsistency

### Table Comparison

| Document | Total LOC | Breakdown | Notes |
|----------|-----------|-----------|-------|
| **1500** | **~700** | saveDetected(100) + generateSemantic(150) + detectBusiness(200) + generateDash(150) + dashToSchema(100) | "Total new code: ~700 LOC" |
| **1600** | **~700** | Identical to 1500 | Copy-paste from 1500 |
| **1700** | **~2,650** | business-types(400) + semantic(150) + dashboard(300+200) + api(400) + web/home(600) + onboarding(400) + routes(200) | **Includes UI components not in glue!** |
| **1800** | **~950 glue + ~300 templates = ~1,250 total** | saveDetected(100) + generateSemantic(150) + detectBusiness(200) + mapToTemplate(150) + generateDash(100) + dashToSchema(100) + runPipeline(150) | Most realistic, separates glue from UI |

### Inconsistency

```yaml
issue: loc_estimates_wildly_different
severity: HIGH
evidence:
  - doc_1500: "~700 LOC"
  - doc_1600: "~700 LOC (same as 1500)"
  - doc_1700: "~2,650 LOC" (but includes UI components, not just glue)
  - doc_1800: "~950 LOC glue + ~300 templates = ~1,250 total"
resolution:
  recommended: Use 1800 estimate (~1,250 LOC)
  reason: |
    - 1500/1600 underestimate (missing mapToTemplate, runPipeline, templates)
    - 1700 overestimates (incorrectly includes web UI as "glue")
    - 1800 correctly separates:
      * Core glue: ~950 LOC
      * Templates: ~300 LOC
      * Total glue layer: ~1,250 LOC
```

---

## 3. Function Signature Inconsistencies

### 3.1 saveDetectedVocabulary()

#### Signature Comparison

| Document | Signature | Parameters | Return Type |
|----------|-----------|------------|-------------|
| **1500** | `async function saveDetectedVocabulary(detected, orgId, workspaceId, options?)` | options: `{ promoteToOrg?: string[] }` | `Promise<void>` |
| **1600** | Same as 1500 | Same | `Promise<void>` |
| **1800** | `async function saveDetectedVocabulary(detected, orgId, workspaceId, options?)` | options: `{ promoteHighCertaintyToOrg?: boolean, certaintyThreshold?: number, skipExisting?: boolean }` | `Promise<SaveDetectedVocabularyResult>` |

```yaml
issue: signature_mismatch_saveDetectedVocabulary
severity: MEDIUM
evidence:
  1500_options: "{ promoteToOrg?: string[] }"
  1800_options: "{ promoteHighCertaintyToOrg?: boolean, certaintyThreshold?: number, skipExisting?: boolean }"
  1500_return: "Promise<void>"
  1800_return: "Promise<SaveDetectedVocabularyResult> (with created/skipped counts + errors)"
resolution:
  recommended: Use 1800 signature
  reason: |
    - More granular control (threshold vs. array)
    - Returns structured result with stats
    - Better for error handling and UI feedback
```

---

### 3.2 generateSemanticLayer()

#### Signature Comparison

| Document | Function Name | Parameters | Return Type |
|----------|--------------|------------|-------------|
| **1500** | `generateSemanticLayerForUser` | `userId, workspaceId, schema` | `Promise<SemanticLayer>` |
| **1600** | `generateSemanticLayerForUser` | Same | `Promise<SemanticLayer>` |
| **1800** | `generateSemanticLayer` | `resolved, schema, options?` | `SemanticLayer` (sync!) |

```yaml
issue: function_name_and_signature_mismatch
severity: HIGH
evidence:
  1500_name: "generateSemanticLayerForUser"
  1800_name: "generateSemanticLayer"
  1500_params: "userId, workspaceId, schema (fetches resolved internally)"
  1800_params: "resolved, schema, options (expects resolved as input)"
  1500_async: true
  1800_async: false
resolution:
  recommended: Use 1800 signature
  reason: |
    - Separation of concerns: resolution happens elsewhere
    - Sync makes it composable in pipelines
    - Name is more generic (not user-specific)
  note: 1500 approach does resolution internally (calls resolveVocabulary), 1800 expects it pre-resolved
```

---

### 3.3 detectBusinessType() + generateDashboardSpec()

#### Document 1500/1600 Approach

**GLUE 3 combines detection + mapping + spec generation**

```typescript
// 1500: Single conceptual "GLUE 3"
detectBusinessType(schema) → BusinessTypeMatch
generateDashboardSpec(mapping, template, resolved, userRole?) → DashboardSpec
```

#### Document 1800 Approach

**GLUE 3 broken into 3 separate functions:**

```typescript
// 1800: Separate concerns
detectBusinessType(schema) → DetectionResult
mapToTemplate(detected, template) → MappingResult
generateDashboardSpec(mapping, options?) → DashboardSpec
```

```yaml
issue: glue3_granularity_mismatch
severity: CRITICAL
evidence:
  1500_approach: "detectBusinessType + generateDashboardSpec (2 functions, mapping implicit)"
  1800_approach: "detectBusinessType + mapToTemplate + generateDashboardSpec (3 functions)"
resolution:
  recommended: Use 1800 breakdown
  reason: |
    - mapToTemplate is a distinct concern (pattern matching schema → template slots)
    - Separation allows reuse (e.g., manual template selection)
    - generateDashboardSpec becomes simpler (just processes MappingResult)
  impact: Function count increases from 4 to 5
```

---

### 3.4 dashboardSpecToLiquidSchema()

#### Signature Comparison

| Document | Parameters | Return Type | Options |
|----------|-----------|-------------|---------|
| **1500** | `spec` | `LiquidSchema` | None |
| **1600** | `spec` | `LiquidSchema` | None |
| **1800** | `spec, options?` | `LiquidSchema` | `{ maxKPIsPerRow?, includeSectionHeaders?, gap? }` |

```yaml
issue: missing_options_parameter
severity: LOW
evidence:
  1500_1600: "function dashboardSpecToLiquidSchema(spec)"
  1800: "function dashboardSpecToLiquidSchema(spec, options?)"
resolution:
  recommended: Use 1800 signature
  reason: Options provide UI customization without changing core logic
```

---

## 4. Implementation Location Inconsistencies

### File Path Comparison

| Function | Doc 1500 | Doc 1600 | Doc 1800 | Match? |
|----------|----------|----------|----------|--------|
| **saveDetectedVocabulary** | `packages/api/.../vocabulary/mutations.ts` (modify) | Same | `packages/api/.../vocabulary/from-detected.ts` (new file) | ❌ |
| **generateSemanticLayer** | `packages/liquid-connect/.../uvb/semantic-generator.ts` | `packages/liquid-connect/.../uvb/semantic-generator.ts` | `packages/liquid-connect/.../semantic/from-vocabulary.ts` | ❌ |
| **detectBusinessType** | Not specified | `packages/liquid-connect/.../business-types/detector.ts` | `packages/liquid-connect/.../business-types/detector.ts` | ✅ |
| **mapToTemplate** | N/A | N/A | `packages/liquid-connect/.../dashboard/mapper.ts` | N/A |
| **generateDashboardSpec** | Not specified | `packages/liquid-connect/.../dashboard/generator.ts` | `packages/liquid-connect/.../dashboard/generator.ts` | ✅ |
| **dashboardSpecToLiquidSchema** | Not specified | `packages/liquid-render/.../dashboard/schema-generator.ts` | `packages/liquid-render/.../dashboard/schema-generator.ts` | ✅ |
| **runKnosiaPipeline** | N/A | N/A | `packages/api/.../pipeline/index.ts` | N/A |

```yaml
issue: file_location_inconsistencies
severity: MEDIUM
evidence:
  saveDetectedVocabulary:
    1500: "Modify existing mutations.ts"
    1800: "Create new from-detected.ts"
  generateSemanticLayer:
    1500: "uvb/semantic-generator.ts"
    1800: "semantic/from-vocabulary.ts"
resolution:
  recommended: Use 1800 paths
  reason: |
    - Better separation (from-detected.ts vs modifying mutations.ts)
    - Clearer naming (from-vocabulary.ts describes transformation)
    - Avoids polluting existing files
```

---

## 5. Interface Inconsistencies

### 5.1 generateSemanticLayer Input

**Document 1500:**
```typescript
// Fetches resolved internally
async function generateSemanticLayerForUser(
  userId: string,
  workspaceId: string,
  schema: ExtractedSchema
): Promise<SemanticLayer>
```

**Document 1800:**
```typescript
// Expects resolved as input
function generateSemanticLayer(
  resolved: ResolvedVocabulary,
  schema: ExtractedSchema,
  options?: GenerateSemanticLayerOptions
): SemanticLayer
```

```yaml
issue: input_interface_mismatch
severity: HIGH
evidence:
  1500_input: "userId + workspaceId (calls resolveVocabulary internally)"
  1800_input: "ResolvedVocabulary (expects pre-resolved)"
resolution:
  recommended: Use 1800 interface
  reason: |
    - Separation of concerns (resolution happens in caller)
    - Easier to test (no DB dependency)
    - More composable in pipelines
  migration: Add resolveVocabulary() call before generateSemanticLayer()
```

---

### 5.2 MappingResult Interface

**Document 1500:** Not defined (implicit in generateDashboardSpec)

**Document 1800:**
```typescript
interface MappingResult {
  businessType: BusinessType;
  template: BusinessTypeTemplate;
  mappedKPIs: MappedKPI[];
  unmappedKPIs: KPIDefinition[];
  coverage: number;
}
```

```yaml
issue: missing_mapping_result_interface
severity: MEDIUM
evidence:
  1500: "No MappingResult interface (mapping done inside generateDashboardSpec)"
  1800: "Explicit MappingResult returned by mapToTemplate()"
resolution:
  recommended: Use 1800 approach
  reason: |
    - Makes mapping result inspectable
    - Allows validation before dashboard generation
    - Supports UI for reviewing/confirming mappings
```

---

## 6. Return Type Inconsistencies

### Summary Table

| Function | Doc 1500 Return | Doc 1800 Return | Changed? |
|----------|----------------|-----------------|----------|
| **saveDetectedVocabulary** | `Promise<void>` | `Promise<SaveDetectedVocabularyResult>` | ✅ YES |
| **generateSemanticLayer** | `Promise<SemanticLayer>` | `SemanticLayer` (sync) | ✅ YES |
| **detectBusinessType** | `BusinessTypeMatch` | `DetectionResult` | ✅ YES |
| **mapToTemplate** | N/A | `MappingResult` | N/A (new) |
| **generateDashboardSpec** | `DashboardSpec` | `DashboardSpec` | ❌ NO |
| **dashboardSpecToLiquidSchema** | `LiquidSchema` | `LiquidSchema` | ❌ NO |
| **runKnosiaPipeline** | N/A | `Promise<PipelineResult>` | N/A (new) |

```yaml
issue: return_type_inconsistencies
severity: MEDIUM
evidence:
  saveDetectedVocabulary: "void → structured result"
  generateSemanticLayer: "async → sync"
  detectBusinessType: "single match → array of matches + metadata"
resolution:
  recommended: Use 1800 return types
  reason: All provide richer information for error handling and UI
```

---

## 7. Missing Functions in Earlier Docs

### Functions Not in 1500/1600

```yaml
issue: missing_functions_in_early_docs
severity: CRITICAL
missing_from_1500_1600:
  - name: mapToTemplate
    purpose: "Separate mapping step (schema → template slots)"
    location: "packages/liquid-connect/src/dashboard/mapper.ts"
    loc: ~150
  - name: runKnosiaPipeline
    purpose: "Orchestration function for full pipeline"
    location: "packages/api/src/modules/knosia/pipeline/index.ts"
    loc: ~150
  - name: SaveDetectedVocabularyOptions interface
    purpose: "Options for vocabulary saving"
  - name: GenerateSemanticLayerOptions interface
    purpose: "Options for semantic layer generation"
resolution:
  recommended: Include both functions
  reason: |
    - mapToTemplate is conceptually distinct from generateDashboardSpec
    - runKnosiaPipeline provides end-to-end orchestration
    - Options interfaces enable flexibility
```

---

## 8. LOC Breakdown Comparison

### Document 1500 (Total: ~700)

```yaml
doc: 1500-platform-architecture
total_loc: 700
breakdown:
  saveDetectedVocabulary: 100
  generateSemanticLayerForUser: 150
  detectBusinessType: 200
  generateDashboardSpec: 150
  dashboardSpecToLiquidSchema: 100
missing:
  - mapToTemplate
  - runKnosiaPipeline
  - templates
```

---

### Document 1700 (Total: ~2,650)

```yaml
doc: 1700-project-structure
total_loc: 2650
breakdown:
  business_types_module: 400
  semantic_generator: 150
  dashboard_liquid_connect: 300
  dashboard_liquid_render: 200
  api_semantic_dashboard: 400
  web_home_conversation: 600  # ❌ NOT GLUE (UI components)
  web_onboarding_steps: 400   # ❌ NOT GLUE (UI components)
  web_app_routes: 200         # ❌ NOT GLUE (UI pages)
error: "Conflates glue code with UI components"
```

---

### Document 1800 (Total: ~1,250)

```yaml
doc: 1800-glue-implementation-blueprint
total_loc: 1250
breakdown:
  saveDetectedVocabulary: 100
  generateSemanticLayer: 150
  detectBusinessType: 200
  mapToTemplate: 150          # ✅ NEW
  generateDashboardSpec: 100
  dashboardSpecToLiquidSchema: 100
  runKnosiaPipeline: 150      # ✅ NEW
  templates: 300              # ✅ NEW (business type YAML)
notes: "Most accurate - separates glue from UI"
```

---

## 9. Consolidated Function List (Recommended)

### Source of Truth: Use Document 1800

| # | Function | Location | LOC | Input | Output |
|---|----------|----------|-----|-------|--------|
| **1** | `saveDetectedVocabulary` | `api/.../vocabulary/from-detected.ts` | ~100 | DetectedVocabulary, orgId, workspaceId, options? | Promise\<SaveDetectedVocabularyResult\> |
| **2** | `generateSemanticLayer` | `liquid-connect/.../semantic/from-vocabulary.ts` | ~150 | ResolvedVocabulary, ExtractedSchema, options? | SemanticLayer |
| **3A** | `detectBusinessType` | `liquid-connect/.../business-types/detector.ts` | ~200 | ExtractedSchema | DetectionResult |
| **3B** | `mapToTemplate` | `liquid-connect/.../dashboard/mapper.ts` | ~150 | DetectedVocabulary, BusinessTypeTemplate | MappingResult |
| **3C** | `generateDashboardSpec` | `liquid-connect/.../dashboard/generator.ts` | ~100 | MappingResult, options? | DashboardSpec |
| **4** | `dashboardSpecToLiquidSchema` | `liquid-render/.../dashboard/schema-generator.ts` | ~100 | DashboardSpec, options? | LiquidSchema |
| **5** | `runKnosiaPipeline` | `api/.../pipeline/index.ts` | ~150 | connectionId, userId, workspaceId, options? | Promise\<PipelineResult\> |
| **Templates** | Business type YAML | `liquid-connect/.../business-types/templates/` | ~300 | N/A | N/A |
| **TOTAL** | | | **~1,250** | | |

---

## 10. Critical Decisions Required

### Decision 1: Function Count

```yaml
decision: how_many_glue_functions
options:
  option_a:
    count: 4
    source: docs 1500, 1600
    pro: "Simpler, fewer files"
    con: "Conflates mapping with dashboard generation"
  option_b:
    count: 7
    source: doc 1800
    pro: "Separation of concerns, reusable"
    con: "More files to maintain"
recommendation: OPTION B (7 functions)
reason: "mapToTemplate and runKnosiaPipeline provide clear value"
```

---

### Decision 2: LOC Estimate

```yaml
decision: total_loc_estimate
options:
  option_a: 700 LOC (docs 1500, 1600)
  option_b: 2650 LOC (doc 1700 - includes UI!)
  option_c: 1250 LOC (doc 1800 - glue + templates)
recommendation: OPTION C (1,250 LOC)
reason: |
  - 700 is too low (missing mapToTemplate, runPipeline, templates)
  - 2650 is too high (incorrectly includes UI components)
  - 1250 accurately scopes glue layer
```

---

### Decision 3: generateSemanticLayer Interface

```yaml
decision: semantic_layer_input_interface
options:
  option_a:
    signature: "generateSemanticLayerForUser(userId, workspaceId, schema)"
    pro: "Convenient, handles resolution internally"
    con: "Couples to DB, harder to test"
  option_b:
    signature: "generateSemanticLayer(resolved, schema, options?)"
    pro: "Separation of concerns, testable, composable"
    con: "Caller must resolve vocabulary first"
recommendation: OPTION B
reason: "Separation of concerns aligns with pipeline design"
```

---

## 11. Implementation Recommendations

### Priority 1: Use Document 1800 as Blueprint

- **Most detailed** function signatures
- **Most realistic** LOC estimates
- **Best separation** of concerns

### Priority 2: Implement mapToTemplate Separately

- Don't conflate with generateDashboardSpec
- Enables manual template selection in UI
- Clearer testing surface

### Priority 3: Implement runKnosiaPipeline as Orchestrator

- Single entry point for full flow
- Handles transaction boundaries
- Provides unified error handling

### Priority 4: Return Structured Results

- Use `SaveDetectedVocabularyResult` (not void)
- Use `DetectionResult` (not single match)
- Enables better UI feedback

---

## 12. Summary of Inconsistencies

| Category | Inconsistency | Impact | Resolution |
|----------|--------------|--------|------------|
| **Function Count** | 4 vs 5 vs 7 | CRITICAL | Use 7 (from doc 1800) |
| **LOC Estimates** | 700 vs 950 vs 1,250 vs 2,650 | HIGH | Use 1,250 (from doc 1800) |
| **Function Names** | generateSemanticLayerForUser vs generateSemanticLayer | MEDIUM | Use shorter name |
| **Signatures** | userId/workspaceId vs resolved input | HIGH | Use resolved (doc 1800) |
| **Return Types** | void vs structured results | MEDIUM | Use structured (doc 1800) |
| **File Locations** | mutations.ts vs from-detected.ts | MEDIUM | Use new files (doc 1800) |
| **Missing Functions** | mapToTemplate, runKnosiaPipeline absent | CRITICAL | Add both (doc 1800) |
| **Interface Definitions** | MappingResult, options interfaces | MEDIUM | Add all (doc 1800) |

---

## 13. Migration Path from Early Docs

If implementing from docs 1500/1600, add:

```yaml
additions_needed:
  functions:
    - name: mapToTemplate
      reason: "Separate mapping concern from dashboard generation"
      loc: ~150
    - name: runKnosiaPipeline
      reason: "Orchestration function for end-to-end flow"
      loc: ~150
  interfaces:
    - SaveDetectedVocabularyOptions
    - SaveDetectedVocabularyResult
    - GenerateSemanticLayerOptions
    - MappingResult
    - DetectionResult
    - PipelineOptions
    - PipelineResult
  templates:
    - saas.ts (~300 LOC)
  total_additional_loc: ~600
```

---

## Final Recommendation

**Use `.artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md` as the authoritative source.**

This document:
- ✅ Most complete function list (7 vs 4/5)
- ✅ Most realistic LOC estimate (1,250 vs 700/2,650)
- ✅ Best separation of concerns (mapToTemplate separate)
- ✅ Includes orchestration (runKnosiaPipeline)
- ✅ Structured return types
- ✅ Detailed implementation prompts

---

*End of Inconsistency Analysis*
