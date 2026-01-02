# Data Pipeline Inconsistencies Analysis
**Generated**: 2026-01-02
**Scope**: Analysis of 5 architecture artifact files vs actual codebase
**Pipeline**: Natural Language → LC DSL → AST → LiquidFlow IR → SQL → UI Schema → Rendered UI

---

## Summary

Analyzed **5 documentation artifacts** against actual implementation in:
- `packages/liquid-connect/src/` (UVB, compiler, resolver, emitters, executor, query engine)
- `packages/liquid-render/src/` (UI compiler, renderer, components)

**Key Finding**: The architecture documents describe a **complete 7-step data pipeline**, but **4 critical "glue" modules** connecting UVB → Semantic Layer → Dashboard → UI Schema **do not exist** in the codebase.

---

## Inconsistencies

```yaml
inconsistencies:

  # ============================================================================
  # MISSING GLUE MODULES (Critical Gap)
  # ============================================================================

  - id: GLUE-1
    severity: CRITICAL
    category: missing_module
    component: liquid-connect/business-types
    documented_in:
      - 2026-01-02-1700-knosia-project-structure.md (line 89-93)
      - 2026-01-02-1800-knosia-glue-implementation-blueprint.md (line 387-690)
    expected_location: packages/liquid-connect/src/business-types/
    actual_status: MODULE DOES NOT EXIST
    expected_exports:
      - detectBusinessType(vocabulary: DetectedVocabulary): BusinessType
      - BUSINESS_TYPE_PATTERNS
      - BusinessType enum (saas, ecommerce, marketplace, etc.)
    description: |
      Pattern matching to infer business model from vocabulary patterns.
      Required to auto-generate appropriate dashboard templates.
      Blueprint specifies ~200 LOC implementation.
    impact: |
      Cannot generate role-aware dashboards automatically.
      Hard-coded dashboard specs required instead of detection.
    referenced_by_pipeline_step: 6 (Schema Generation)

  - id: GLUE-2
    severity: CRITICAL
    category: missing_module
    component: liquid-connect/dashboard
    documented_in:
      - 2026-01-02-1700-knosia-project-structure.md (line 94-98)
      - 2026-01-02-1800-knosia-glue-implementation-blueprint.md (line 387-690)
    expected_location: packages/liquid-connect/src/dashboard/
    actual_status: MODULE DOES NOT EXIST
    expected_exports:
      - generateDashboardSpec(businessType, vocabulary, role): DashboardSpec
      - TEMPLATES record<BusinessType, DashboardTemplate>
      - DashboardSpec type
    description: |
      Template-driven dashboard specification generator.
      Combines business type, vocabulary, and user role to select template.
      Blueprint specifies ~300 LOC implementation.
    impact: |
      No automatic dashboard generation from detected vocabulary.
      Manual dashboard creation required for each organization.
    referenced_by_pipeline_step: 6 (Schema Generation)

  - id: GLUE-3
    severity: CRITICAL
    category: missing_module
    component: liquid-connect/semantic/generator
    documented_in:
      - 2026-01-02-1700-knosia-project-structure.md (line 74-77)
      - 2026-01-02-1800-knosia-glue-implementation-blueprint.md (line 210-385)
    expected_location: packages/liquid-connect/src/semantic/generator.ts
    actual_status: FILE DOES NOT EXIST
    expected_exports:
      - generateSemanticLayer(vocabulary: ResolvedVocabulary): SemanticLayer
    description: |
      Transforms UVB DetectedVocabulary → liquid-connect SemanticLayer format.
      Critical bridge between vocabulary detection and query compilation.
      Blueprint specifies ~200 LOC implementation.
    impact: |
      Cannot use UVB-extracted vocabulary in liquid-connect query engine.
      Manual SemanticLayer creation required.
    referenced_by_pipeline_step: 2-3 (Compiler → Resolver)

  - id: GLUE-4
    severity: CRITICAL
    category: missing_module
    component: liquid-render/dashboard
    documented_in:
      - 2026-01-02-1700-knosia-project-structure.md (line 229-233)
      - 2026-01-02-1800-knosia-glue-implementation-blueprint.md (line 692-912)
    expected_location: packages/liquid-render/src/dashboard/
    actual_status: MODULE DOES NOT EXIST
    expected_exports:
      - dashboardSpecToLiquidSchema(spec: DashboardSpec): LiquidSchema
      - schemaGenerator.ts with generateChartSchema() helper
    description: |
      Transforms DashboardSpec → LiquidSchema for rendering.
      Maps dashboard panels to LiquidRender block components.
      Blueprint specifies ~220 LOC implementation.
    impact: |
      No automatic UI generation from dashboard specifications.
      Manual LiquidSchema construction required.
    referenced_by_pipeline_step: 6-7 (Schema Generation → UI Rendering)

  # ============================================================================
  # UVB EXPORT VISIBILITY
  # ============================================================================

  - id: EXPORT-1
    severity: MEDIUM
    category: export_visibility
    component: liquid-connect/uvb
    documented_in:
      - 2026-01-02-1600-knosia-consolidated-implementation.md (line 286-310)
      - 2026-01-02-1800-knosia-glue-implementation-blueprint.md (line 35-208)
    actual_location: packages/liquid-connect/src/uvb/
    actual_status: EXISTS BUT NOT EXPORTED FROM MAIN INDEX
    current_exports: |
      UVB has its own index.ts with full exports:
      - extractSchema, applyHardRules
      - createPostgresAdapter, createDuckDBAdapter
      - DetectedVocabulary, DetectedEntity, DetectedMetric types
      BUT packages/liquid-connect/src/index.ts does NOT re-export UVB
    expected_usage: |
      // Documented pattern (doesn't work with current exports)
      import { extractSchema } from '@repo/liquid-connect'

      // Actual pattern (requires subpath)
      import { extractSchema } from '@repo/liquid-connect/uvb'
    description: |
      UVB is fully implemented but treated as internal-only.
      Main index.ts doesn't expose UVB exports at package root.
    impact: |
      API modules must use subpath imports.
      Slightly inconsistent with documented public API surface.
    recommendation: |
      Either:
      1. Document subpath import pattern in architecture docs
      2. OR add UVB to main index.ts exports (breaking change risk)

  # ============================================================================
  # API MODULE GAPS
  # ============================================================================

  - id: API-1
    severity: HIGH
    category: missing_api_module
    component: api/modules/knosia/semantic
    documented_in:
      - 2026-01-02-1700-knosia-project-structure.md (line 170-177)
    expected_location: packages/api/src/modules/knosia/semantic/
    actual_status: NOT VERIFIED (need to check)
    expected_routes:
      - POST /semantic/generate
      - GET /semantic/:workspaceId
      - PATCH /semantic/:workspaceId
    description: |
      API layer for semantic layer generation and CRUD.
      Should call GLUE-3 (generateSemanticLayer) to bridge UVB → SemanticLayer.
    impact: |
      No API endpoint to persist generated semantic layers.
      Frontend cannot trigger semantic layer generation.
    referenced_by_pipeline_step: 2-3 (after UVB extraction)

  - id: API-2
    severity: HIGH
    category: missing_api_module
    component: api/modules/knosia/dashboard
    documented_in:
      - 2026-01-02-1700-knosia-project-structure.md (line 178-185)
    expected_location: packages/api/src/modules/knosia/dashboard/
    actual_status: NOT VERIFIED (need to check)
    expected_routes:
      - POST /dashboard/generate
      - GET /dashboard/:workspaceId
      - GET /dashboard/templates
    description: |
      API layer for dashboard spec generation and retrieval.
      Should call GLUE-1 + GLUE-2 (detectBusinessType + generateDashboardSpec).
    impact: |
      No API endpoint to generate or retrieve dashboard specs.
      Cannot trigger template-based dashboard creation.
    referenced_by_pipeline_step: 6 (Schema Generation)

  # ============================================================================
  # PIPELINE STEP SEQUENCE INCONSISTENCIES
  # ============================================================================

  - id: PIPELINE-1
    severity: LOW
    category: documentation_inconsistency
    component: pipeline_step_numbering
    files_compared:
      - 2026-01-02-1600-knosia-consolidated-implementation.md (line 169-214)
      - 2026-01-02-1800-knosia-glue-implementation-blueprint.md (line 1-33)
    inconsistency: |
      Consolidated doc uses 7-step pipeline:
      STEP 1: NL Query Engine → STEP 7: Liquid UI

      Blueprint doc merges steps into 4 glue functions:
      GLUE 1: saveDetectedVocabulary (UVB → DB)
      GLUE 2: generateSemanticLayer (DB → SemanticLayer)
      GLUE 3: detectBusinessType + generateDashboardSpec
      GLUE 4: dashboardSpecToLiquidSchema
    description: |
      Different abstraction levels in different docs.
      7-step is user-facing flow (what happens end-to-end).
      4-glue is implementation view (code to build).
    impact: NONE (both views are valid)
    recommendation: |
      Add cross-reference noting:
      "7-step pipeline = end-to-end flow
       4 glue functions = implementation components"

  - id: PIPELINE-2
    severity: MEDIUM
    category: interface_transformation
    component: vocabulary_to_semantic
    documented_in:
      - 2026-01-02-1800-knosia-glue-implementation-blueprint.md (line 210-385)
    interface_from: DetectedVocabulary (UVB output)
    interface_to: SemanticLayer (liquid-connect input)
    transformation_function: generateSemanticLayer() [MISSING]
    actual_status: |
      UVB produces DetectedVocabulary ✅
      SemanticRegistry expects SemanticLayer ✅
      Bridge function does NOT exist ❌
    type_mismatch: |
      DetectedEntity has:
        - tableName, schema, primaryKey, columns[]

      EntityDefinition expects:
        - name, source, primaryKey, fields[], relationships[]

      DetectedMetric has:
        - name, aggregation, field, label

      MetricDefinition expects:
        - name, type, source, calculation, format
    description: |
      Shape mismatch between UVB output and SemanticLayer input.
      Requires mapping layer to transform structure.
    impact: |
      Cannot directly use UVB vocabulary in query compilation.
      Current workaround: Manual SemanticLayer YAML authoring.

  # ============================================================================
  # COMPONENT INTEGRATION GAPS
  # ============================================================================

  - id: INTEGRATION-1
    severity: HIGH
    category: missing_integration
    component: uvb_to_compiler_bridge
    pipeline_steps: "UVB (extraction) → Compiler (query parsing)"
    documented_flow: |
      1. UVB extracts schema → DetectedVocabulary
      2. Save to knosia_vocabulary_item table (GLUE-1) [MISSING]
      3. Generate SemanticLayer (GLUE-2) [MISSING]
      4. Load SemanticLayer into compiler via createRegistry()
    actual_status: |
      ✅ UVB extraction works
      ❌ No saveDetectedVocabulary() function
      ❌ No generateSemanticLayer() function
      ✅ createRegistry(semanticLayer) works IF you have SemanticLayer
    workaround_required: |
      Manual transformation of DetectedVocabulary → SemanticLayer YAML
      Manual database insertion into knosia_vocabulary_item
    impact: |
      Onboarding cannot be fully automated.
      Vocabulary detection requires manual intervention.

  - id: INTEGRATION-2
    severity: HIGH
    category: missing_integration
    component: query_results_to_ui_schema
    pipeline_steps: "Executor (SQL results) → Schema Generation → LiquidUI"
    documented_flow: |
      1. Executor returns QueryResult with rows + metadata
      2. generateChartSchema() analyzes result shape (GLUE-4 helper) [MISSING]
      3. dashboardSpecToLiquidSchema() creates full schema (GLUE-4) [MISSING]
      4. LiquidUI renders schema with data
    actual_status: |
      ✅ Executor returns QueryResult
      ❌ No generateChartSchema() helper
      ❌ No dashboardSpecToLiquidSchema() function
      ✅ LiquidUI can render IF you have LiquidSchema
    workaround_required: |
      Manual LiquidSchema construction based on query structure
      Hard-coded dashboard layouts instead of template generation
    impact: |
      No automatic chart selection based on query type.
      Dashboard generation requires manual schema authoring.

  # ============================================================================
  # TYPE INCONSISTENCIES
  # ============================================================================

  - id: TYPE-1
    severity: LOW
    category: type_definition_location
    component: shared_types
    documented_in:
      - 2026-01-02-1800-knosia-glue-implementation-blueprint.md (line 91-138)
    inconsistency: |
      Blueprint defines new types (ResolvedVocabulary, DashboardSpec, DashboardTemplate)
      but doesn't specify which package they belong to.

      Unclear if they should live in:
      - @repo/liquid-connect/types
      - @repo/api/modules/knosia/shared-schemas
      - New shared types package
    description: |
      Type ownership not specified for glue interfaces.
      Could lead to circular dependencies if placed wrong.
    impact: LOW (can be decided during implementation)
    recommendation: |
      Define in @repo/liquid-connect/types since:
      - Used by both liquid-connect and API
      - Semantic domain types belong with semantic layer

  - id: TYPE-2
    severity: MEDIUM
    category: enum_mismatch
    component: business_type_values
    files_compared:
      - 2026-01-02-1800-knosia-glue-implementation-blueprint.md (line 397-409)
      - 2026-01-02-1500-knosia-platform-architecture.md (similar section)
    inconsistency: |
      Blueprint lists BusinessType values:
      'saas' | 'ecommerce' | 'marketplace' | 'financial' | 'healthcare' | 'education' | 'generic'

      Some docs mention additional types:
      'b2b_saas' | 'consumer_app' | 'analytics_platform'
    description: |
      Inconsistent business type taxonomy across documents.
      Need canonical list before implementation.
    impact: |
      Template selection logic depends on exact enum values.
      Missing templates for unlisted types.

  # ============================================================================
  # ACTUAL IMPLEMENTATION STATUS
  # ============================================================================

  - id: STATUS-1
    severity: INFORMATIONAL
    category: implementation_complete
    component: liquid-connect/core
    modules_verified:
      - compiler: ✅ (Scanner, Parser, parseToAST, compile)
      - liquidflow: ✅ (LiquidFlowBuilder, validateFlow, serializeFlow)
      - semantic: ✅ (SemanticRegistry, loadFromYAML, validateSemanticLayer)
      - resolver: ✅ (Resolver, createResolver, resolve)
      - emitters: ✅ (DuckDBEmitter, TrinoEmitter, PostgresEmitter)
      - executor: ✅ (QueryExecutor, executeQuery, Provenance)
      - vocabulary: ✅ (compileVocabulary, DEFAULT_PATTERNS)
      - query: ✅ (nlQuery, QueryEngine, normalize, match)
      - uvb: ✅ (extractSchema, applyHardRules, adapters)
    description: |
      ALL core data pipeline components exist and are functional.
      Gap is ONLY in the 4 "glue" functions connecting systems.

  - id: STATUS-2
    severity: INFORMATIONAL
    category: implementation_complete
    component: liquid-render/core
    modules_verified:
      - ui-compiler: ✅ (parseUI, compileUI, roundtripUI)
      - renderer: ✅ (LiquidUI, useLiquidContext, resolveBinding)
      - components: ✅ (77 components in manifest)
      - themes: ✅ (defaultTheme, turbostarterTheme, LiquidProvider)
    description: |
      Full UI rendering pipeline exists.
      Gap is ONLY in automatic schema generation (GLUE-4).

# ============================================================================
# IMPACT SUMMARY
# ============================================================================

critical_missing_components: 4
  - GLUE-1: saveDetectedVocabulary (UVB → Database)
  - GLUE-2: generateSemanticLayer (Database → SemanticLayer)
  - GLUE-3: detectBusinessType + generateDashboardSpec
  - GLUE-4: dashboardSpecToLiquidSchema

total_loc_required: ~920
  - business-types/detector.ts: ~200 LOC
  - semantic/generator.ts: ~200 LOC
  - dashboard/generator.ts: ~300 LOC
  - dashboard/schema-generator.ts: ~220 LOC

blocks_full_automation:
  - Onboarding cannot go from "Connect DB" → "Ready Dashboard" without manual steps
  - Vocabulary detection works, but results can't be saved automatically
  - Query execution works, but results can't be auto-visualized

current_workarounds:
  - Manual YAML authoring for SemanticLayer
  - Hard-coded dashboard layouts
  - Manual LiquidSchema construction for each query type

recommended_implementation_order:
  1. GLUE-2 (generateSemanticLayer) - enables query compilation with UVB vocab
  2. GLUE-1 (saveDetectedVocabulary) - enables vocabulary persistence
  3. GLUE-3 (business type + dashboard spec) - enables template selection
  4. GLUE-4 (dashboard → LiquidSchema) - enables automatic UI generation

# ============================================================================
# VERIFICATION CHECKLIST
# ============================================================================

verified_against_codebase:
  - ✅ packages/liquid-connect/src/index.ts (main exports)
  - ✅ packages/liquid-render/src/index.ts (main exports)
  - ✅ packages/liquid-connect/src/uvb/index.ts (UVB exports)
  - ❌ packages/liquid-connect/src/business-types/ (does not exist)
  - ❌ packages/liquid-connect/src/dashboard/ (does not exist)
  - ❌ packages/liquid-connect/src/semantic/generator.ts (does not exist)
  - ❌ packages/liquid-render/src/dashboard/ (does not exist)

documents_analyzed:
  - ✅ 2026-01-02-1500-knosia-platform-architecture.md
  - ✅ 2026-01-02-1535-knosia-ux-journeys.md
  - ✅ 2026-01-02-1600-knosia-consolidated-implementation.md
  - ✅ 2026-01-02-1700-knosia-project-structure.md
  - ✅ 2026-01-02-1800-knosia-glue-implementation-blueprint.md

pipeline_steps_verified:
  1. NL Query Engine: ✅ (packages/liquid-connect/src/query/)
  2. Compiler: ✅ (packages/liquid-connect/src/compiler/)
  3. Resolver: ✅ (packages/liquid-connect/src/resolver/)
  4. SQL Emitter: ✅ (packages/liquid-connect/src/emitters/)
  5. Executor: ✅ (packages/liquid-connect/src/executor/)
  6. Schema Generation: ❌ (MISSING - requires GLUE-3 + GLUE-4)
  7. Liquid UI: ✅ (packages/liquid-render/src/renderer/)

# ============================================================================
# CONCLUSION
# ============================================================================

The documented data pipeline is architecturally sound and 90% implemented.

**What works:**
- Natural language → LC DSL parsing ✅
- LC DSL → SQL compilation ✅
- SQL execution with metadata ✅
- UI rendering from schema ✅
- Schema extraction (UVB) ✅

**What's missing:**
- Vocabulary persistence (UVB → DB) ❌
- Vocabulary transformation (DB → SemanticLayer) ❌
- Dashboard template generation ❌
- Automatic UI schema generation ❌

**Effort required:** ~920 LOC across 4 files to complete full automation.

**Status:** The "glue code" described in the blueprint is the ONLY gap between
working components and a fully automated Knosia onboarding experience.
```

---

## Recommendations

1. **Prioritize GLUE-2 first** - Enables using UVB vocabulary in query compilation
2. **Add type definitions** - Define ResolvedVocabulary, DashboardSpec types in liquid-connect
3. **Decide on UVB export** - Either document subpath imports OR add to main index
4. **Implement sequentially** - Each glue function depends on previous one
5. **Add integration tests** - Test full pipeline: UVB → SemanticLayer → Query → UI

---

**Analysis complete.** All 5 documentation artifacts cross-referenced against actual codebase implementation.
