# Dashboard Architecture Inconsistencies

**Date:** 2026-01-02
**Analysis:** Canvas Implementation vs Architecture Documentation
**Status:** Complete

---

## Scope

Analyzed 5 architecture documents against actual canvas implementation:
- `.artifacts/2026-01-02-1500-knosia-platform-architecture.md`
- `.artifacts/2026-01-02-1535-knosia-ux-journeys.md`
- `.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md`
- `.artifacts/2026-01-02-1700-knosia-project-structure.md`
- `.artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md`

Compared against: `apps/web/src/modules/knosia/canvas/`

---

## Summary

**Total Inconsistencies Found:** 11
**Critical:** 3
**Major:** 5
**Minor:** 3

---

## Inconsistencies

```yaml
inconsistencies:
  - id: DASH-001
    severity: critical
    category: missing_implementation
    title: "DashboardSpec to LiquidSchema transformer not implemented"
    description: |
      Architecture docs specify a key transformation function
      `dashboardSpecToLiquidSchema()` that converts DashboardSpec
      (business-level KPIs) to LiquidSchema (UI rendering layer).
      This function is completely missing from implementation.
    documented_location: |
      - 2026-01-02-1800-knosia-glue-implementation-blueprint.md (GLUE 4)
      - 2026-01-02-1600-knosia-consolidated-implementation.md (Section 7.3)
    actual_location: "Not found in packages/liquid-render/src/dashboard/"
    expected_signature: |
      function dashboardSpecToLiquidSchema(
        spec: DashboardSpec,
        options?: SchemaGeneratorOptions
      ): LiquidSchema
    impact: |
      Cannot generate dashboards from detected business types.
      Breaks the complete pipeline: Schema → Vocabulary → DashboardSpec → LiquidSchema → UI
    recommendation: |
      Implement in packages/liquid-render/src/dashboard/schema-generator.ts
      using the createMinimalSchema pattern from liquid-render-block.tsx

  - id: DASH-002
    severity: critical
    category: type_mismatch
    title: "BlockType enum doesn't match architecture spec"
    description: |
      Canvas types.ts defines BlockType with values like "kpi", "hero_metric",
      "watch_list", "comparison", "insight" - but architecture docs reference
      different types and don't document the native block types.
    documented_types:
      source: 2026-01-02-1600-knosia-consolidated-implementation.md
      types:
        - "Charts delegated to LiquidRender (line, bar, area, pie, etc.)"
        - "KPI cards"
        - "No mention of hero_metric, watch_list, comparison, insight"
    actual_types:
      location: apps/web/src/modules/knosia/canvas/types.ts
      types:
        - kpi
        - line_chart
        - bar_chart
        - area_chart
        - pie_chart
        - table
        - hero_metric  # NOT in docs
        - watch_list   # NOT in docs
        - comparison   # NOT in docs
        - insight      # NOT in docs
        - text
    impact: |
      Documentation doesn't reflect the dual-track block system:
      - Native blocks (hero_metric, watch_list, etc.) with custom renderers
      - LiquidRender blocks (charts, tables) delegated to LiquidRender
      This is actually a GOOD architecture but undocumented.
    recommendation: |
      Update architecture docs to document native block types and
      the delegation pattern to LiquidRender.

  - id: DASH-003
    severity: major
    category: missing_interface
    title: "DashboardSpec interface not defined in implementation"
    description: |
      Architecture defines DashboardSpec interface extensively, but it
      doesn't exist anywhere in the codebase.
    documented_location: |
      - 2026-01-02-1600-knosia-consolidated-implementation.md (Section 7.2)
      - 2026-01-02-1800-knosia-glue-implementation-blueprint.md
    documented_interface: |
      interface DashboardSpec {
        businessType: string;
        title: string;
        sections: DashboardSection[];
        suggestedQuestions: string[];
      }

      interface DashboardSection {
        name: string;
        kpis: DashboardKPI[];
        chart?: DashboardChart;
      }
    actual_location: "Not found in packages/liquid-connect/src/dashboard/"
    workaround: |
      Current implementation skips DashboardSpec entirely and goes
      directly from CanvasBlock to LiquidSchema via createMinimalSchema()
    impact: |
      Can't generate dashboards from business type templates.
      No structured intermediate representation between business logic
      and UI rendering.
    recommendation: |
      Create packages/liquid-connect/src/dashboard/types.ts with
      DashboardSpec and related interfaces.

  - id: DASH-004
    severity: major
    category: architecture_deviation
    title: "Canvas implementation uses minimal schemas, not full pipeline"
    description: |
      Architecture docs describe a 7-step pipeline from Query to UI,
      but actual implementation uses a simplified createMinimalSchema()
      approach that bypasses most steps.
    documented_pipeline:
      source: 2026-01-02-1600-knosia-consolidated-implementation.md
      steps:
        - "1. NL Query Engine"
        - "2. Compiler (parseToAST)"
        - "3. Resolver (AST → LiquidFlow)"
        - "4. SQL Emitter"
        - "5. Executor"
        - "6. Schema Generation (NEW GLUE)"
        - "7. LiquidUI rendering"
    actual_implementation:
      location: apps/web/src/modules/knosia/canvas/components/blocks/liquid-render-block.tsx
      approach: |
        function createMinimalSchema(type, config, label): LiquidSchema {
          return {
            version: "1.0",
            signals: [],
            layers: [{
              id: 0,
              visible: true,
              root: {
                uid: "root",
                type,
                label,
                binding: { kind: "field", value: "rows" },
                children: [],
              }
            }]
          }
        }
    impact: |
      - Bypasses semantic layer
      - No query compilation
      - No vocabulary resolution
      - Limited to simple field bindings
      This works for basic charts but limits advanced features.
    recommendation: |
      This is actually pragmatic for MVP. Document as "Phase 1: Direct Binding"
      vs "Phase 2: Full Pipeline" and keep both approaches.

  - id: DASH-005
    severity: major
    category: missing_module
    title: "Home/Briefing page module not implemented"
    description: |
      Architecture extensively documents a Home/Briefing page with
      KPI cards and dashboard, but the module doesn't exist.
    documented_location: |
      - 2026-01-02-1600-knosia-consolidated-implementation.md (Section 5.2)
      - 2026-01-02-1700-knosia-project-structure.md (home module)
    expected_files:
      - apps/web/src/app/[locale]/dashboard/[org]/home/page.tsx
      - apps/web/src/modules/knosia/home/components/kpi-grid.tsx
      - apps/web/src/modules/knosia/home/components/insights-panel.tsx
    actual_status: "Directory does not exist"
    impact: |
      No dashboard landing page after onboarding.
      Users can't see their personalized briefing.
    recommendation: |
      Priority P0. Create home module with KPI grid using existing
      canvas blocks (hero-metric, etc.).

  - id: DASH-006
    severity: major
    category: missing_component
    title: "BlockRenderer doesn't exist as documented"
    description: |
      Project structure doc references a block-renderer.tsx in the
      blocks/ subdirectory, but implementation has it in components/blocks/.
      More importantly, the documented interface doesn't match.
    documented_location: |
      2026-01-02-1700-knosia-project-structure.md
      Expected: canvas/blocks/block-renderer.tsx
    actual_location: |
      apps/web/src/modules/knosia/canvas/components/blocks/block-renderer.tsx
    documented_interface: "Not specified in detail"
    actual_interface: |
      export interface BlockRendererProps {
        block: CanvasBlock;
        data?: unknown;
        isLoading?: boolean;
        error?: string | null;
      }
    impact: |
      Minor path inconsistency. Actual implementation is sound with
      proper delegation to LiquidRender vs native blocks.
    recommendation: |
      Update project structure doc to reflect actual paths.

  - id: DASH-007
    severity: major
    category: incomplete_feature
    title: "AI Canvas Edit (prompt bar) has no instruction interpretation"
    description: |
      Canvas has a prompt bar UI but no backend interpretation of
      natural language instructions to modify blocks.
    documented_feature: |
      2026-01-02-1535-knosia-ux-journeys.md describes:
      "Ask a question → Canvas updates with new blocks"
    actual_implementation:
      frontend: apps/web/src/modules/knosia/canvas/components/canvas-prompt-bar.tsx
      api_endpoint: api.knosia.canvas[":id"].edit.$post
      backend_logic: "Unknown - not analyzed"
    gap: |
      Prompt bar submits to API but unclear if backend actually:
      - Parses natural language instructions
      - Determines block changes (add/remove/modify)
      - Applies changes to canvas
    recommendation: |
      Investigate packages/api/src/modules/knosia/canvas/mutations.ts
      Implement NL instruction parser if missing.

  - id: DASH-008
    severity: minor
    category: binding_limitation
    title: "Only field bindings supported, not computed/indexed/iterator"
    description: |
      LiquidRender supports 5 binding kinds, but canvas implementation
      only uses field bindings.
    documented_bindings:
      source: 2026-01-02-1500-knosia-platform-architecture.md
      kinds:
        - indexed: "Access array by index"
        - field: "Access object property"
        - computed: "Apply function"
        - literal: "Static value"
        - iterator: "Loop through array"
        - indexRef: "Reference by ID"
    actual_usage:
      location: liquid-render-block.tsx:180
      code: "binding: { kind: 'field', value: 'rows' }"
    impact: |
      Limits data transformations:
      - Can't compute derived metrics in UI layer
      - Can't handle nested data structures
      - Can't implement master-detail patterns
    recommendation: |
      This is fine for MVP. Add computed/indexed bindings when
      implementing advanced dashboards.

  - id: DASH-009
    severity: minor
    category: type_safety
    title: "BlockDataSource uses string literals instead of enum"
    description: |
      BlockDataSource.type is typed as string literal union but
      not extracted to a reusable enum.
    actual_definition:
      location: apps/web/src/modules/knosia/canvas/types.ts:70-75
      code: |
        export interface BlockDataSource {
          type: "vocabulary" | "query" | "static";
          vocabularyId?: string;
          sql?: string;
          staticData?: unknown;
        }
    better_approach: |
      export type BlockDataSourceType = "vocabulary" | "query" | "static";
      export interface BlockDataSource {
        type: BlockDataSourceType;
        ...
      }
    impact: |
      Minor - makes it harder to reference data source types
      programmatically without importing the interface.
    recommendation: |
      Extract to enum/type alias for reusability.

  - id: DASH-010
    severity: minor
    category: documentation_gap
    title: "BLOCK_TYPE_TO_LIQUID_TYPE mapping undocumented"
    description: |
      Implementation has a comprehensive 120-line mapping from block
      types to LiquidRender component types, but this isn't documented
      in architecture.
    actual_implementation:
      location: liquid-render-block.tsx:26-120
      entries: 77 mappings
      examples:
        - "line_chart → line"
        - "bar_chart → bar"
        - "kpi → kpi"
        - "table → table"
    documentation_status: |
      No architecture doc explains:
      - Why mapping is needed
      - How to extend it
      - Which block types delegate vs render natively
    impact: |
      Developers won't know:
      - When to add native blocks vs use LiquidRender
      - How to add new chart types
    recommendation: |
      Add section to project structure doc explaining delegation pattern.

  - id: DASH-011
    severity: critical
    category: missing_implementation
    title: "Business type detection and templates not implemented"
    description: |
      Architecture extensively documents business type detection system
      with templates, but none of it exists in codebase.
    documented_components:
      source: Multiple architecture docs
      files:
        - packages/liquid-connect/src/business-types/detector.ts
        - packages/liquid-connect/src/business-types/signatures.ts
        - packages/liquid-connect/src/business-types/catalog/saas.yaml
        - packages/liquid-connect/src/business-types/catalog/loader.ts
        - packages/liquid-connect/src/business-types/mapper.ts
    actual_status: "business-types/ directory does not exist"
    documented_types:
      - saas
      - ecommerce
      - marketplace
      - fintech
      - healthcare
      - custom
    impact: |
      Cannot auto-detect business type from schema.
      Cannot auto-generate role-specific dashboards.
      Breaks the "60-second onboarding" value proposition.
    recommendation: |
      Priority P0. Implement business-types module as documented
      in glue implementation blueprint.
```

---

## Positive Findings

Despite inconsistencies, several aspects are well-implemented:

### ✅ Clean Delegation Pattern
The `BlockRenderer` + `LiquidRenderBlock` delegation pattern is excellent:
- Native blocks (hero-metric, watch-list) for specialized UX
- LiquidRender delegation for standard charts/tables
- Fallback rendering for unknown types

### ✅ Type Safety
Canvas types.ts has comprehensive type definitions:
- All block types defined
- Position/config/data source interfaces
- Props interfaces for all components

### ✅ Pragmatic MVP Approach
`createMinimalSchema()` bypasses complex pipeline but delivers working UI quickly.
This is correct MVP prioritization.

### ✅ Alert System
Canvas alerts implementation is more advanced than documented:
- Full CRUD for alerts
- Multiple channels (in_app, email, slack)
- Alert conditions with operators
- Integration with canvas blocks

---

## Priority Recommendations

### P0 (Blocking MVP)
1. **Implement business type detection** (DASH-011)
   - Creates value prop for auto-dashboard generation

2. **Create DashboardSpec types** (DASH-003)
   - Needed for business type templates

3. **Build Home/Briefing page** (DASH-005)
   - Users need landing page after onboarding

### P1 (Enhance MVP)
4. **Implement dashboardSpecToLiquidSchema()** (DASH-001)
   - Connects business logic to UI

5. **Add NL instruction parser for canvas edit** (DASH-007)
   - Makes prompt bar actually useful

### P2 (Post-MVP)
6. **Document dual-track block system** (DASH-002)
   - Helps future developers understand architecture

7. **Support advanced bindings** (DASH-008)
   - Enables computed metrics, nested data

---

## Conclusion

**Key Finding:** Implementation is ~60% complete for documented architecture.

**Critical Gap:** Business type detection system is completely missing,
which blocks the "60-second personalized briefing" value proposition.

**Positive:** Canvas rendering works well with pragmatic MVP shortcuts
(createMinimalSchema vs full pipeline).

**Recommendation:**
1. Implement business-types module (3-4 days)
2. Create home/briefing page using existing blocks (2 days)
3. Build dashboardSpec transformer (2 days)
4. Update docs to reflect dual-track block architecture (1 day)

This gets to MVP in ~7-8 days of focused work.
