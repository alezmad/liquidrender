# Knosia Project Structure

**Date:** 2026-01-02
**Status:** Target Architecture (Post-Glue Implementation)
**Legend:** `✅` Exists | `🆕` New | `📝` Modify
**Reference:** See [2026-01-02-1600-knosia-consolidated-implementation.md](.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md) for implementation phases and timeline

---

## Package Overview

```
packages/
├── liquid-connect/          # Data layer: Schema → Query → SQL (~1,250 LOC glue)
├── liquid-render/           # UI layer: DSL → Schema → React
├── liquid-code/             # DSL compilers (Survey, UI)
├── api/                     # Hono API routes
├── db/                      # Drizzle schema & migrations
└── ...                      # Other TurboStarter packages

apps/
└── web/                     # Next.js application
    └── src/modules/
        ├── knosia/          # Knosia feature module
        └── onboarding/      # Onboarding flow
```

---

## packages/liquid-connect/src/

```
liquid-connect/src/
├── index.ts                           ✅ Main exports
├── types.ts                           ✅ Core types
│
├── uvb/                               ✅ Universal Vocabulary Builder
│   ├── index.ts                       ✅ UVB exports
│   ├── models.ts                      ✅ DetectedVocabulary, etc.
│   ├── extractor.ts                   ✅ Schema extraction
│   ├── rules.ts                       ✅ Hard rules engine
│   └── adapters/
│       ├── index.ts                   ✅ Adapter exports
│       ├── postgres.ts                ✅ PostgreSQL adapter
│       └── duckdb.ts                  ✅ DuckDB adapter
│
├── business-types/                    🆕 NEW MODULE (~500 LOC)
│   ├── index.ts                       🆕 Module exports
│   ├── types.ts                       🆕 BusinessType, BusinessTypeMatch
│   ├── detector.ts                    🆕 detectBusinessType(schema)
│   ├── signatures.ts                  🆕 Detection patterns (see note below)
│   ├── mapper.ts                      🆕 mapToTemplate(detected, template)
│   └── catalog/
│       ├── index.ts                   🆕 Template loader
│       ├── types.ts                   🆕 BusinessTypeTemplate
│       ├── saas.ts                    🆕 SaaS KPI template (TypeScript + Zod)
│       ├── ecommerce.ts               🆕 E-commerce KPI template
│       ├── marketplace.ts             🆕 Marketplace KPI template
│       └── generic.ts                 🆕 Fallback template
│
├── semantic/                          ✅ Semantic Layer
│   ├── index.ts                       ✅ Semantic exports
│   ├── types.ts                       ✅ SemanticLayer types
│   ├── registry.ts                    ✅ SemanticRegistry
│   └── loader.ts                      ✅ YAML loader
│
├── compiler/                          ✅ LC DSL Compiler
│   ├── index.ts                       ✅ Compiler exports
│   ├── scanner.ts                     ✅ Tokenizer
│   ├── parser.ts                      ✅ Parser
│   ├── ast.ts                         ✅ AST types
│   ├── tokens.ts                      ✅ Token types
│   └── diagnostics.ts                 ✅ Error handling
│
├── resolver/                          ✅ AST → LiquidFlow
│   ├── index.ts                       ✅ Resolver exports
│   ├── resolver.ts                    ✅ Main resolver
│   ├── filter.ts                      ✅ Filter resolution
│   ├── time.ts                        ✅ Time resolution
│   └── types.ts                       ✅ Resolver types
│
├── liquidflow/                        ✅ Intermediate Representation
│   ├── index.ts                       ✅ LiquidFlow exports
│   ├── types.ts                       ✅ LiquidFlow types
│   ├── builder.ts                     ✅ Fluent builder
│   └── validator.ts                   ✅ Flow validation
│
├── emitters/                          ✅ SQL Generation
│   ├── index.ts                       ✅ Emitter exports
│   ├── base.ts                        ✅ Base emitter
│   ├── postgres/index.ts              ✅ PostgreSQL emitter
│   ├── duckdb/index.ts                ✅ DuckDB emitter
│   └── trino/index.ts                 ✅ Trino emitter
│
├── executor/                          ✅ Query Execution
│   ├── index.ts                       ✅ Executor exports
│   ├── provenance.ts                  ✅ Confidence tracking
│   └── timeout.ts                     ✅ Timeout handling
│
├── query/                             ✅ NL Query Engine
│   ├── index.ts                       ✅ Query engine exports
│   ├── engine.ts                      ✅ Main query engine
│   ├── normalizer.ts                  ✅ NL preprocessing
│   ├── matcher.ts                     ✅ Pattern matching
│   └── types.ts                       ✅ Query types
│
└── vocabulary/                        ✅ Vocabulary Compilation
    ├── index.ts                       ✅ Vocabulary exports
    ├── compiler.ts                    ✅ compileVocabulary()
    ├── synonyms.ts                    ✅ Synonym registry
    ├── patterns.ts                    ✅ Pattern definitions
    └── types.ts                       ✅ Vocabulary types
```

**Note on signatures.ts structure:**
Detection patterns are organized by business type (SaaS, E-commerce, Marketplace, Generic). Each type defines:
- Required table patterns (e.g., "subscriptions", "orders")
- KPI signatures (field patterns, aggregations)
- Confidence scoring rules

See [BIZ-005] for full structure specification.

**Note on business types:**
- **V1 (4 types):** SaaS, E-commerce, Marketplace, Generic
- **V2 (5 additional):** FinTech, Healthcare, SaaS+Usage, Media, Agency/Services

---

## packages/liquid-render/src/

```
liquid-render/src/
├── index.ts                           ✅ Main exports
├── types.ts                           ✅ Core types
│
├── compiler/                          ✅ DSL Compilers
│   ├── index.ts                       ✅ Compiler exports
│   ├── ui-compiler.ts                 ✅ parseUI(), compileUI()
│   ├── ui-scanner.ts                  ✅ UI tokenizer
│   ├── ui-parser.ts                   ✅ UI parser
│   ├── ui-emitter.ts                  ✅ LiquidSchema emitter
│   ├── constants.ts                   ✅ Type codes
│   ├── compiler.ts                    ✅ Survey compiler
│   ├── scanner.ts                     ✅ Survey tokenizer
│   ├── parser.ts                      ✅ Survey parser
│   ├── emitter.ts                     ✅ Survey emitter
│   └── streaming-parser.ts            ✅ Streaming support
│
├── renderer/                          ✅ React Rendering
│   ├── index.ts                       ✅ Renderer exports
│   ├── LiquidUI.tsx                   ✅ Main render component
│   ├── data-context.ts                ✅ Data binding resolution
│   ├── component-registry.ts          ✅ Component lookup
│   └── components/
│       ├── index.ts                   ✅ Component exports (77 components)
│       ├── utils.ts                   ✅ Design tokens, helpers
│       ├── kpi-card.tsx               ✅ KPI component
│       ├── line-chart.tsx             ✅ Line chart
│       ├── bar-chart.tsx              ✅ Bar chart
│       ├── data-table.tsx             ✅ Data table
│       ├── form.tsx                   ✅ Form component
│       └── ...                        ✅ 70+ more components
│
├── manifest/                          ✅ Component Intelligence
│   ├── index.ts                       ✅ Manifest exports
│   ├── builder.ts                     ✅ Manifest builder
│   ├── query.ts                       ✅ Component queries
│   └── llm-context.ts                 ✅ LLM context generation
│
├── platform/                          ✅ Platform Integration
│   ├── index.ts                       ✅ Platform exports
│   ├── connector.ts                   ✅ Data connectors
│   ├── resolver.ts                    ✅ Platform resolver
│   └── ai-pipeline.ts                 ✅ AI integration
│
├── themes/                            ✅ Theme System
│   ├── default/index.ts               ✅ Default theme
│   └── turbostarter/index.ts          ✅ TurboStarter theme
│
└── context/                           ✅ React Context
    └── theme-context.tsx              ✅ LiquidProvider
```

**Note on dashboard module:**
Dashboard spec → LiquidSchema generation is part of the glue layer (~150 LOC) documented in liquid-connect's dashboard/ module. LiquidRender's role is rendering the generated schema.

---

## packages/api/src/modules/knosia/

```
api/src/modules/knosia/
├── router.ts                          ✅ Main Knosia router
├── shared-schemas.ts                  ✅ Shared Zod schemas
│
├── connections/                       ✅ Connection Management
│   ├── index.ts                       ✅ Module exports
│   ├── router.ts                      ✅ Connection routes
│   ├── schemas.ts                     ✅ Zod schemas
│   ├── queries.ts                     ✅ Read operations
│   └── mutations.ts                   ✅ Write operations
│
├── analysis/                          ✅ Schema Analysis
│   ├── index.ts                       ✅ Module exports
│   ├── router.ts                      📝 Add business type detection
│   ├── schemas.ts                     ✅ Zod schemas
│   ├── queries.ts                     ✅ Read operations
│   └── mutations.ts                   📝 Add template mapping
│
├── vocabulary/                        ✅ Vocabulary Management
│   ├── index.ts                       ✅ Module exports
│   ├── router.ts                      ✅ Vocabulary routes
│   ├── schemas.ts                     ✅ Zod schemas
│   ├── queries.ts                     ✅ Read operations
│   ├── mutations.ts                   📝 Add saveDetectedVocabulary()
│   ├── resolution.ts                  ✅ resolveVocabulary()
│   └── from-detected.ts               🆕 DetectedVocabulary → DB transform
│
├── activity/                          ✅ Activity Tracking
│   ├── index.ts                       ✅ Module exports
│   ├── router.ts                      ✅ Activity routes
│   ├── schemas.ts                     ✅ Zod schemas
│   └── queries.ts                     ✅ Activity queries
│
├── canvas/                            ✅ Canvas (Dashboard) Management
│   ├── index.ts                       ✅ Module exports
│   ├── router.ts                      ✅ Canvas CRUD routes
│   ├── schemas.ts                     ✅ Canvas schemas
│   ├── queries.ts                     ✅ Canvas queries
│   └── mutations.ts                   ✅ Canvas mutations
│
├── comment/                           ✅ Comment System
│   ├── index.ts                       ✅ Module exports
│   ├── router.ts                      ✅ Comment routes
│   ├── schemas.ts                     ✅ Comment schemas
│   ├── queries.ts                     ✅ Comment queries
│   └── mutations.ts                   ✅ Comment mutations
│
├── insight/                           ✅ AI Insights
│   ├── index.ts                       ✅ Module exports
│   ├── router.ts                      ✅ Insight routes
│   ├── schemas.ts                     ✅ Insight schemas
│   └── queries.ts                     ✅ Insight queries
│
├── notification/                      ✅ Notification System
│   ├── index.ts                       ✅ Module exports
│   ├── router.ts                      ✅ Notification routes
│   ├── schemas.ts                     ✅ Notification schemas
│   └── queries.ts                     ✅ Notification queries
│
├── search/                            ✅ Search Functionality
│   ├── index.ts                       ✅ Module exports
│   ├── router.ts                      ✅ Search routes
│   └── queries.ts                     ✅ Search queries
│
├── thread/                            ✅ Thread (Conversation) Management
│   ├── index.ts                       ✅ Module exports
│   ├── router.ts                      📝 Integrate with semantic layer
│   ├── schemas.ts                     ✅ Zod schemas
│   ├── queries.ts                     ✅ Read operations
│   └── mutations.ts                   📝 Add query execution
│
├── briefing/                          ✅ Briefing Generation
│   ├── index.ts                       ✅ Module exports
│   ├── router.ts                      ✅ Briefing routes
│   └── ...                            ✅ Existing files
│
├── organization/                      ✅ Org Management
│   └── ...                            ✅ Existing files
│
├── preferences/                       ✅ User Preferences
│   └── ...                            ✅ Existing files
│
└── shared/                            ✅ Shared Utilities
    ├── semantic.ts                    ✅ Semantic layer transforms
    ├── transforms.ts                  ✅ Data transformations
    └── ...                            ✅ Other shared utilities
```

**Note on semantic/ and dashboard/ modules:**
These are part of liquid-connect package (data layer), not API modules. API consumes them via glue functions.

---

## apps/web/src/modules/knosia/

```
web/src/modules/knosia/
├── index.ts                           ✅ Module exports
├── types.ts                           📝 Add dashboard types
│
├── canvas/                            ✅ Canvas (Dashboard) Module
│   ├── index.ts                       ✅ Canvas exports
│   ├── types.ts                       ✅ Canvas types
│   └── components/
│       ├── canvas-view.tsx            ✅ Main canvas view
│       ├── canvas-toolbar.tsx         ✅ Toolbar
│       └── blocks/
│           ├── block-renderer.tsx     ✅ LiquidUI integration
│           ├── kpi-block.tsx          ✅ KPI block
│           └── chart-block.tsx        ✅ Chart block
│
├── home/                              🆕 NEW MODULE
│   ├── index.ts                       🆕 Module exports
│   ├── components/
│   │   ├── home-view.tsx              🆕 Main home/briefing view
│   │   ├── kpi-grid.tsx               🆕 KPI cards grid
│   │   ├── insights-panel.tsx         🆕 AI insights
│   │   ├── quick-actions.tsx          🆕 Quick action buttons
│   │   └── recent-queries.tsx         🆕 Recent query history
│   └── hooks/
│       └── use-dashboard.ts           🆕 Dashboard data hook
│
├── vocabulary/                        ✅ Vocabulary Browser
│   ├── index.ts                       ✅ Module exports
│   ├── types.ts                       ✅ Vocabulary types
│   ├── components/
│   │   ├── vocabulary-browser.tsx     ✅ Main browser
│   │   ├── vocabulary-list.tsx        ✅ Item list
│   │   └── vocabulary-card.tsx        ✅ Item card
│   └── hooks/
│       ├── use-vocabulary.ts          ✅ Vocabulary query hook
│       └── use-vocabulary-prefs.ts    ✅ User prefs hook
│
├── conversation/                      🆕 NEW MODULE
│   ├── index.ts                       🆕 Module exports
│   ├── components/
│   │   ├── conversation-view.tsx      🆕 Chat interface
│   │   ├── message-list.tsx           🆕 Message display
│   │   ├── query-input.tsx            🆕 NL query input
│   │   └── result-display.tsx         🆕 Query result renderer
│   └── hooks/
│       └── use-conversation.ts        🆕 Conversation state
│
└── shared/                            ✅ Shared Components
    └── components/
        └── ...                        ✅ Existing shared components
```

**Note on block-renderer path:**
The correct path is `canvas/components/blocks/block-renderer.tsx`, not `dashboard/components/BlockRenderer.tsx`. Canvas is the primary dashboard interface.

**Note on scope badge design:**
VocabularyCard's scope badge design (org/workspace/private indicators) is intentional UX. See vocabulary browser implementation for details.

---

## apps/web/src/modules/onboarding/

```
web/src/modules/onboarding/
├── index.ts                           ✅ Module exports
├── types.ts                           📝 Add multi-connection support
│
├── hooks/
│   └── use-onboarding-state.ts        📝 Add business type state
│
├── components/
│   ├── connect/                       ✅ Connection Step
│   │   ├── connect-step.tsx           ✅ Main step
│   │   └── ...                        ✅ Existing components
│   │
│   ├── analysis/                      ✅ Analysis Step
│   │   ├── analysis-step.tsx          📝 Add business type display
│   │   └── ...                        ✅ Existing components
│   │
│   └── review/                        ✅ Review Step
│       ├── review-step.tsx            📝 Add KPI confirmation
│       └── ...                        ✅ Existing components
│
└── constants.ts                       ✅ Step definitions
```

**Note on onboarding flow:**
Standardized flow is: Connect → Analysis → Review → Dashboard
- Analysis step shows business type detection progress
- Review step displays detected business type and KPI mappings
- No separate "summary" or "ready" steps (consolidated into review)

**Note on multi-connection:**
Multi-connection support (`connectionIds[]`) is V2 roadmap. V1 uses single `connectionId`.

---

## apps/web/src/app/[locale]/dashboard/

```
app/[locale]/dashboard/
├── layout.tsx                         ✅ Dashboard layout
│
├── [organization]/
│   ├── layout.tsx                     ✅ Org layout
│   │
│   └── knosia/                        🆕 KNOSIA ROUTES
│       ├── layout.tsx                 🆕 Knosia layout with sidebar
│       ├── page.tsx                   🆕 → Home/Briefing page
│       │
│       ├── canvas/
│       │   └── page.tsx               🆕 → Canvas/Dashboard page
│       │
│       ├── vocabulary/
│       │   └── page.tsx               🆕 → Vocabulary browser page
│       │
│       ├── conversation/
│       │   └── page.tsx               🆕 → Conversation/Chat page
│       │
│       └── settings/
│           ├── page.tsx               🆕 → Knosia settings
│           └── connections/
│               └── page.tsx           🆕 → Connection management
│
└── ...                                ✅ Other dashboard routes
```

**Note on Canvas vs HOME:**
- Canvas (`/canvas/page.tsx`) exists and is functional (interactive dashboard builder)
- HOME (`/page.tsx` in knosia root) needs building (briefing/overview page)

---

## packages/db/src/schema/

```
db/src/schema/
├── index.ts                           📝 Export knosia schema
├── knosia.ts                          📝 26 tables (V1 complete)
│
│   # Existing tables (26 total)
│   ├── knosia_organization            ✅ Org with guest TTL
│   ├── knosia_workspace               ✅ Bounded context
│   ├── knosia_workspace_connection    ✅ Workspace-connection mapping
│   ├── knosia_connection              ✅ Database credentials + businessType JSONB
│   ├── knosia_connection_health       ✅ Connection monitoring
│   ├── knosia_connection_schema       ✅ Cached schema snapshot
│   ├── knosia_vocabulary_item         ✅ 3-level vocabulary
│   ├── knosia_vocabulary_version      ✅ Version history
│   ├── knosia_user_vocabulary_prefs   ✅ User preferences
│   ├── knosia_role_template           ✅ Cognitive profiles
│   ├── knosia_workspace_membership    ✅ User-workspace mapping
│   ├── knosia_user_preference         ✅ User settings
│   ├── knosia_analysis                ✅ Schema analysis runs + businessType
│   ├── knosia_thread                  ✅ Conversation threads
│   ├── knosia_thread_message          ✅ Thread messages
│   ├── knosia_mismatch_report         ✅ User-reported issues
│   ├── knosia_canvas                  ✅ Canvas documents
│   ├── knosia_canvas_block            ✅ Canvas blocks
│   ├── knosia_canvas_thread           ✅ Canvas threads
│   ├── knosia_canvas_collaborator     ✅ Canvas sharing
│   ├── knosia_activity                ✅ Activity log
│   ├── knosia_notification            ✅ User notifications
│   ├── knosia_sharing_link            ✅ Public sharing
│   ├── knosia_comment                 ✅ Comments
│   ├── knosia_insight                 ✅ AI-generated insights
│   └── knosia_demo_hub                ✅ Demo/preview system
│
└── ...                                ✅ Other schema files
```

**Note on removed tables:**
The following tables were proposed but removed (functionality handled by compiledVocabulary + Canvas):
- `knosia_dashboard` (use Canvas instead)
- `knosia_dashboard_kpi` (use Canvas blocks)
- `knosia_semantic_layer` (cached in compiledVocabulary JSONB)

**Note on businessType field:**
Connection.businessType is JSONB (not enum). Stores { type, confidence, detectedAt }. No separate field proposal needed.

---

## Modified Files Summary

The following 13 files require modifications for glue implementation:

1. `packages/api/src/modules/knosia/analysis/router.ts` - Add business type detection endpoint
2. `packages/api/src/modules/knosia/analysis/mutations.ts` - Add template mapping logic
3. `packages/api/src/modules/knosia/vocabulary/mutations.ts` - Add saveDetectedVocabulary() call
4. `packages/db/src/schema/knosia.ts` - Already has businessType field, no changes needed
5. `packages/db/src/schema/index.ts` - Ensure knosia schema exported
6. `apps/web/src/modules/onboarding/types.ts` - Add businessType to OnboardingProgress
7. `apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts` - Add businessType state
8. `apps/web/src/modules/onboarding/components/analysis/analysis-step.tsx` - Show detection progress
9. `apps/web/src/modules/onboarding/components/review/review-step.tsx` - Show KPI mappings
10. `apps/web/src/modules/knosia/types.ts` - Add dashboard types
11. `packages/api/src/modules/knosia/thread/router.ts` - Integrate semantic layer
12. `packages/api/src/modules/knosia/thread/mutations.ts` - Add query execution
13. `packages/api/src/modules/knosia/vocabulary/from-detected.ts` - NEW FILE (transformation logic)

---

## New Files Summary

### packages/liquid-connect/ (🆕 ~15 files, ~500 LOC)

```
business-types/
├── index.ts
├── types.ts
├── detector.ts
├── signatures.ts                    # See note on structure above
├── mapper.ts
└── catalog/
    ├── index.ts
    ├── types.ts
    ├── saas.ts                      # TypeScript + Zod schema
    ├── ecommerce.ts
    ├── marketplace.ts
    └── generic.ts
```

### packages/api/ (🆕 1 file, ~100 LOC)

```
modules/knosia/vocabulary/
└── from-detected.ts                 # DetectedVocabulary → DB transform
```

### apps/web/ (🆕 ~20 files)

```
modules/knosia/
├── home/
│   ├── index.ts
│   └── components/
│       ├── home-view.tsx
│       ├── kpi-grid.tsx
│       ├── insights-panel.tsx
│       ├── quick-actions.tsx
│       └── recent-queries.tsx
│
└── conversation/
    ├── index.ts
    └── components/
        ├── conversation-view.tsx
        ├── message-list.tsx
        ├── query-input.tsx
        └── result-display.tsx

app/[locale]/dashboard/[organization]/knosia/
├── layout.tsx
├── page.tsx
├── canvas/page.tsx
├── vocabulary/page.tsx
├── conversation/page.tsx
└── settings/
    ├── page.tsx
    └── connections/page.tsx
```

---

## File Count Summary

| Category | Existing | New | Modified | Total |
|----------|----------|-----|----------|-------|
| liquid-connect | ~35 | ~15 | 0 | ~50 |
| liquid-render | ~60 | 0 | 0 | ~60 |
| api/knosia | ~25 | ~1 | ~5 | ~31 |
| web/knosia | ~20 | ~15 | ~3 | ~38 |
| web/onboarding | ~15 | 0 | ~4 | ~19 |
| web/app routes | ~5 | ~8 | 0 | ~13 |
| db/schema | ~3 | 0 | ~1 | ~4 |
| **Total** | **~163** | **~39** | **~13** | **~215** |

---

## Estimated Lines of Code

| Module | New LOC | Notes |
|--------|---------|-------|
| business-types/ | ~400 | Detector + templates (TypeScript) |
| vocabulary/from-detected.ts | ~100 | DetectedVocab → DB transform |
| dashboard spec generator (glue) | ~150 | Template → DashboardSpec |
| dashboard schema generator (glue) | ~100 | DashboardSpec → LiquidSchema |
| semantic layer generator (glue) | ~150 | ResolvedVocab → SemanticLayer |
| api modifications | ~250 | Analysis, thread integration |
| web/home + conversation | ~600 | UI components |
| web/app routes | ~200 | Page files |
| **Total New Code** | **~1,950** | |
| **Glue Layer** | **~750** | Core integration logic |
| **UI Layer** | **~1,200** | Pages and components |

---

## BLOCK_TYPE_TO_LIQUID_TYPE Mapping

Canvas blocks map to LiquidRender component types:

| Canvas Block Type | LiquidRender Type | Component |
|-------------------|-------------------|-----------|
| `kpi` | `kpi-card` | KpiCard.tsx |
| `chart` | `line-chart`, `bar-chart`, `area-chart`, `pie-chart` | Chart components |
| `table` | `data-table` | DataTable.tsx |
| `text` | `text` | Text.tsx |
| `image` | `image` | Image.tsx |
| `custom` | (variable) | Determined by block config |

This mapping is implemented in `canvas/components/blocks/block-renderer.tsx`.

---

## Pipeline Cross-Reference

For the complete data flow from user query to rendered UI, see:
- **Query → UI Pipeline:** Section 4.1 in [1600-consolidated-implementation.md](.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md)
- **Vocabulary Integration:** Section 4.2 in [1600-consolidated-implementation.md](.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md)
- **Implementation Phases:** Section 6 (Phase 0-4) in [1600-consolidated-implementation.md](.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md)

---

## Implementation Timeline Reference

See [1600-consolidated-implementation.md](.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md) Section 6 for:
- **Phase 0:** Foundation (Days 1-2) - Business type detection
- **Phase 1:** Glue Code (Days 3-4) - Integration functions
- **Phase 2:** Onboarding Enhancement (Days 5-6)
- **Phase 3:** Home & Canvas (Days 7-10)
- **Phase 4:** Polish (Days 11-14)

**Total Timeline:** 2 weeks to MVP

---

*This structure maintains the existing architecture while adding focused glue modules (~1,250 LOC) to connect LiquidConnect, Vocabulary, and LiquidRender into the complete Knosia pipeline.*
