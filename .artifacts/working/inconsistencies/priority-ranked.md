# Priority-Ranked Issues

Issues sorted by severity (critical → low), then by effort (quick wins first).


## CRITICAL Priority

### 1. OB-004 - Analyze vs Analysis naming inconsistency

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Route naming confusion - /onboarding/analyze vs /onboarding/analysis
- **Desired**: If step is added, standardize on one name (suggest: 'analysis')
- **Files**: .artifacts/2026-01-02-1535-knosia-ux-journeys.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 2. BIZ-002 - Template File Format Conflict (YAML vs TypeScript)

- **Domain**: business-type-detection (SUBTASK8)
- **Effort**: 1h
- **Affects**: api, pipeline
- **Blocks**: SUBTASK5, SUBTASK9
- **Current**: Platform architecture line 508: saas.yaml, Project structure lines 425-427: .yaml files, Glue blueprint lines 483-542: saas.ts with BusinessTypeTemplate interface
- **Desired**: TypeScript (.ts) format with Zod schemas for runtime validation. YAML can be added later as import format. File pattern: packages/liquid-connect/src/business-types/templates/{type}.ts
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1700-knosia-project-structure.md, packages/liquid-connect/src/business-types/templates/

### 3. GLUE-001 - Function count mismatch across documents

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 2h
- **Affects**: api, pipeline, vocabulary
- **Blocks**: SUBTASK9
- **Current**: Conflicting function counts: 4 (1500) vs 5 (1600) vs 7 (1800)
- **Desired**: Use 7 functions from doc 1800 with proper separation of concerns (mapToTemplate as distinct from generateDashboardSpec)
- **Files**: packages/liquid-connect/src/dashboard/mapper.ts, packages/api/src/modules/knosia/pipeline/index.ts

### 4. DASH-002 - BlockType enum doesn't match architecture spec

- **Domain**: dashboard-architecture (SUBTASK6)
- **Effort**: 2h
- **Affects**: docs, ui
- **Current**: BlockType includes hero_metric, watch_list, comparison, insight which are not mentioned in architecture docs. Docs only reference LiquidRender types.
- **Desired**: Update architecture docs to document native block types and the delegation pattern to LiquidRender
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1500-knosia-platform-architecture.md

### 5. OB-006 - Analysis route documented but doesn't exist

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 2h
- **Affects**: ui, docs
- **Current**: Documentation references /onboarding/analyze and /onboarding/analysis routes. Implemented routes: /onboarding/connect, /onboarding/review, /onboarding/role, /onboarding/confirm, /onboarding/ready
- **Desired**: Either implement the route or remove from documentation
- **Files**: .artifacts/2026-01-02-1535-knosia-ux-journeys.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts

### 6. GLUE-005 - GLUE 3 granularity mismatch (mapping concern)

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 4h
- **Affects**: pipeline, api
- **Blocks**: SUBTASK9
- **Current**: detectBusinessType → generateDashboardSpec (mapping implicit)
- **Desired**: detectBusinessType → mapToTemplate → generateDashboardSpec (3 separate functions)
- **Files**: packages/liquid-connect/src/dashboard/mapper.ts, packages/liquid-connect/src/dashboard/generator.ts

### 7. GLUE-011 - Missing mapToTemplate function in early docs

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 4h
- **Affects**: pipeline, api
- **Blocks**: SUBTASK9
- **Current**: No mapToTemplate function exists
- **Desired**: Create mapToTemplate(detected, template) → MappingResult (~150 LOC) in packages/liquid-connect/src/dashboard/mapper.ts
- **Files**: packages/liquid-connect/src/dashboard/mapper.ts

### 8. GLUE-012 - Missing runKnosiaPipeline orchestration function

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 4h
- **Affects**: api, pipeline
- **Blocks**: SUBTASK9
- **Current**: No pipeline orchestration function exists
- **Desired**: Create runKnosiaPipeline(connectionId, userId, workspaceId, options?) → Promise<PipelineResult> (~150 LOC) in packages/api/src/modules/knosia/pipeline/index.ts
- **Files**: packages/api/src/modules/knosia/pipeline/index.ts

### 9. OB-001 - Analysis step missing in implementation

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 4h
- **Affects**: ui, docs
- **Blocks**: SUBTASK6
- **Current**: Documentation shows 6-step flow with 'analyze' step, but stepMap only contains: connect, review, role, confirm, ready
- **Desired**: Either add /onboarding/analysis route and implement the step, OR update all documentation to remove 'analyze' step, OR merge 'analyze' functionality into 'review' step
- **Files**: .artifacts/2026-01-02-1535-knosia-ux-journeys.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md (+1 more)

### 10. PIPE-001 - Missing business-types detection module

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 4h
- **Affects**: pipeline, vocabulary
- **Blocks**: SUBTASK6
- **Current**: MODULE DOES NOT EXIST at packages/liquid-connect/src/business-types/
- **Desired**: Implement business-types module with detectBusinessType(vocabulary: DetectedVocabulary): BusinessType, BUSINESS_TYPE_PATTERNS, and BusinessType enum (saas, ecommerce, marketplace, etc.)
- **Files**: packages/liquid-connect/src/business-types/detector.ts, packages/liquid-connect/src/business-types/index.ts, packages/liquid-connect/src/index.ts

### 11. PIPE-003 - Missing semantic layer generator

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 4h
- **Affects**: pipeline, vocabulary
- **Current**: FILE DOES NOT EXIST at packages/liquid-connect/src/semantic/generator.ts
- **Desired**: Implement generator.ts with generateSemanticLayer(vocabulary: ResolvedVocabulary): SemanticLayer function
- **Files**: packages/liquid-connect/src/semantic/generator.ts, packages/liquid-connect/src/semantic/index.ts

### 12. API-001 - Proposed semantic/ module not implemented

- **Domain**: api-structure (SUBTASK2)
- **Effort**: 1d
- **Affects**: api, vocabulary, pipeline
- **Current**: No semantic/ directory in packages/api/src/modules/knosia/. No router mounts or imports.
- **Desired**: Decision needed: Either implement as API module in packages/api/src/modules/knosia/semantic/ OR move to liquid-connect package as data transformation layer
- **Files**: packages/api/src/modules/knosia/semantic/index.ts, packages/api/src/modules/knosia/semantic/router.ts, packages/api/src/modules/knosia/semantic/schemas.ts (+4 more)

### 13. PIPE-002 - Missing dashboard specification generator

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 1d
- **Affects**: pipeline, ui
- **Blocks**: SUBTASK6
- **Current**: MODULE DOES NOT EXIST at packages/liquid-connect/src/dashboard/
- **Desired**: Implement dashboard module with generateDashboardSpec(businessType, vocabulary, role): DashboardSpec, TEMPLATES record<BusinessType, DashboardTemplate>, and DashboardSpec type
- **Files**: packages/liquid-connect/src/dashboard/generator.ts, packages/liquid-connect/src/dashboard/templates.ts, packages/liquid-connect/src/dashboard/index.ts (+1 more)

### 14. PIPE-004 - Missing dashboard-to-UI schema transformer

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 1d
- **Affects**: pipeline, ui
- **Blocks**: SUBTASK6
- **Current**: MODULE DOES NOT EXIST at packages/liquid-render/src/dashboard/
- **Desired**: Implement dashboard module with dashboardSpecToLiquidSchema(spec: DashboardSpec): LiquidSchema and schemaGenerator.ts with generateChartSchema() helper
- **Files**: packages/liquid-render/src/dashboard/index.ts, packages/liquid-render/src/dashboard/schema-generator.ts, packages/liquid-render/src/index.ts

### 15. API-002 - Proposed dashboard/ module not implemented

- **Domain**: api-structure (SUBTASK2)
- **Effort**: 2d
- **Affects**: api, ui, vocabulary
- **Current**: No dashboard/ directory in packages/api/src/modules/knosia/. No router mounts or imports.
- **Desired**: Decision needed: Either implement as API module in packages/api/src/modules/knosia/dashboard/ OR move to liquid-connect package as data transformation layer
- **Files**: packages/api/src/modules/knosia/dashboard/index.ts, packages/api/src/modules/knosia/dashboard/router.ts, packages/api/src/modules/knosia/dashboard/schemas.ts (+4 more)

### 16. DASH-001 - DashboardSpec to LiquidSchema transformer not implemented

- **Domain**: dashboard-architecture (SUBTASK6)
- **Effort**: 2d
- **Affects**: ui, pipeline
- **Blocks**: SUBTASK8
- **Current**: dashboardSpecToLiquidSchema() function not found in packages/liquid-render/src/dashboard/
- **Desired**: Implement in packages/liquid-render/src/dashboard/schema-generator.ts using the createMinimalSchema pattern from liquid-render-block.tsx
- **Files**: packages/liquid-render/src/dashboard/schema-generator.ts

### 17. DASH-011 - Business type detection and templates not implemented

- **Domain**: dashboard-architecture (SUBTASK6)
- **Effort**: 1w
- **Affects**: pipeline, vocabulary
- **Blocks**: SUBTASK7
- **Current**: packages/liquid-connect/src/business-types/ directory and all documented components (detector.ts, signatures.ts, catalog/*.yaml, mapper.ts) do not exist
- **Desired**: Implement business-types module as documented in glue implementation blueprint with detector, signatures, catalog loader, and mapper
- **Files**: packages/liquid-connect/src/business-types/detector.ts, packages/liquid-connect/src/business-types/signatures.ts, packages/liquid-connect/src/business-types/catalog/saas.yaml (+3 more)


## HIGH Priority

### 18. FILE-001 - GLUE 1 location conflict

- **Domain**: file-locations (SUBTASK3)
- **Effort**: 15min
- **Affects**: api, vocabulary
- **Current**: Blueprint specifies packages/api/src/modules/knosia/vocabulary/from-detected.ts but consolidated doc implies integration into vocabulary mutations module without explicit file path
- **Desired**: Use dedicated file packages/api/src/modules/knosia/vocabulary/from-detected.ts for better separation of concerns
- **Files**: packages/api/src/modules/knosia/vocabulary/from-detected.ts

### 19. GLUE-015 - Doc 1700 conflates glue code with UI components in LOC estimate

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Doc 1700 counts UI components as glue functions (total 2,650 LOC)
- **Desired**: Clearly separate glue layer (~1,250 LOC) from UI layer in documentation
- **Files**: .artifacts/2026-01-02-1700-knosia-project-structure.md

### 20. DASH-006 - BlockRenderer location doesn't match project structure doc

- **Domain**: dashboard-architecture (SUBTASK6)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Project structure doc expects canvas/blocks/block-renderer.tsx but actual file is at canvas/components/blocks/block-renderer.tsx
- **Desired**: Update project structure doc to reflect actual path: apps/web/src/modules/knosia/canvas/components/blocks/block-renderer.tsx
- **Files**: .artifacts/2026-01-02-1700-knosia-project-structure.md

### 21. IMPL-001 - LOC estimate mismatch across documents (700 vs 2,650)

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 15min
- **Affects**: docs
- **Current**: 1500 says '~700 LOC total glue code', 1600/1700 say '~2,650 LOC new code', 1800 says '~1,250 LOC glue + templates'
- **Desired**: 1500 clarified to show: Core glue ~700 LOC (5 functions), Full glue layer ~1,250 LOC (glue + templates + pipeline), Complete implementation ~2,650 LOC (includes UI/routes)
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md

### 22. DB-001 - Table count mismatch: docs claim 15 tables, schema has 26

- **Domain**: database-schema (SUBTASK1)
- **Effort**: 30min
- **Affects**: database, docs
- **Current**: Architecture docs say '15 tables in knosia.ts' but actual schema has 26 tables including Canvas, Collaboration, and Notification systems
- **Desired**: All documents updated to reflect '26 tables (V1 complete)' with accurate table listings in architecture diagrams
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 23. DB-003 - knosiaUserVocabularyPrefs table missing from documentation

- **Domain**: database-schema (SUBTASK1)
- **Effort**: 30min
- **Affects**: database, docs, vocabulary
- **Current**: knosiaUserVocabularyPrefs exists in schema (lines 569-610) with favorites, synonyms, recentlyUsed, dismissedSuggestions, privateVocabulary fields, but architecture docs don't list it
- **Desired**: Add knosiaUserVocabularyPrefs to all table listings and architecture diagrams, document as USER-level preference source in vocabulary hierarchy
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 24. DB-006 - Canvas tables missing from architecture docs

- **Domain**: database-schema (SUBTASK1)
- **Effort**: 30min
- **Affects**: database, docs, dashboard
- **Current**: Canvas tables exist in schema (lines 794-903) for dashboard functionality, but architecture docs don't list them in table inventories
- **Desired**: Add Canvas tables to all architecture diagrams and table listings under 'V1 Complete' or 'Dashboard Layer' section
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 25. OB-002 - Progress indicator shows 6 steps, implementation has 5

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 30min
- **Affects**: ui, docs
- **Blocked by**: SUBTASK7
- **Current**: Documentation shows: Connect ──── Analyze ──── Review ──── Role ──── Ready. Implementation only has 5 steps.
- **Desired**: Update progress indicator documentation to show 5 steps matching implementation
- **Files**: .artifacts/2026-01-02-1535-knosia-ux-journeys.md

### 26. FILE-005 - Pipeline module missing from consolidated doc

- **Domain**: file-locations (SUBTASK3)
- **Effort**: 1h
- **Affects**: pipeline, docs
- **Current**: Pipeline module (packages/api/src/modules/knosia/pipeline/index.ts) documented in blueprint but absent from consolidated implementation
- **Desired**: Add pipeline section to consolidated doc covering orchestration, error handling, and transaction boundaries
- **Files**: packages/api/src/modules/knosia/pipeline/index.ts

### 27. API-003 - activity/ module completely undocumented

- **Domain**: api-structure (SUBTASK2)
- **Effort**: 2h
- **Affects**: api, docs
- **Current**: packages/api/src/modules/knosia/activity/ exists and is router-mounted at /activity, but not mentioned in any documentation
- **Desired**: Add activity/ module to project structure documentation with purpose, key endpoints, and integration examples
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 28. API-004 - canvas/ module completely undocumented

- **Domain**: api-structure (SUBTASK2)
- **Effort**: 2h
- **Affects**: api, docs, ui
- **Current**: packages/api/src/modules/knosia/canvas/ exists and is router-mounted at /canvas, but not mentioned in any documentation
- **Desired**: Add canvas/ module to project structure documentation with purpose, key endpoints, and integration examples
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 29. API-005 - comment/ module completely undocumented

- **Domain**: api-structure (SUBTASK2)
- **Effort**: 2h
- **Affects**: api, docs
- **Current**: packages/api/src/modules/knosia/comment/ exists and is router-mounted at /comment, but not mentioned in any documentation
- **Desired**: Add comment/ module to project structure documentation with purpose, key endpoints, and integration examples
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 30. API-006 - insight/ module completely undocumented

- **Domain**: api-structure (SUBTASK2)
- **Effort**: 2h
- **Affects**: api, docs
- **Current**: packages/api/src/modules/knosia/insight/ exists and is router-mounted at /insight, but not mentioned in any documentation
- **Desired**: Add insight/ module to project structure documentation with purpose, key endpoints, and integration examples
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 31. API-007 - notification/ module completely undocumented

- **Domain**: api-structure (SUBTASK2)
- **Effort**: 2h
- **Affects**: api, docs
- **Current**: packages/api/src/modules/knosia/notification/ exists and is router-mounted at /notification, but not mentioned in any documentation
- **Desired**: Add notification/ module to project structure documentation with purpose, key endpoints, and integration examples
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 32. API-008 - search/ module completely undocumented

- **Domain**: api-structure (SUBTASK2)
- **Effort**: 2h
- **Affects**: api, docs
- **Current**: packages/api/src/modules/knosia/search/ exists and is router-mounted at /search, but not mentioned in any documentation
- **Desired**: Add search/ module to project structure documentation with purpose, key endpoints, and integration examples
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 33. GLUE-004 - generateSemanticLayer function name and signature mismatch

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 2h
- **Affects**: api, vocabulary, pipeline
- **Blocks**: SUBTASK9
- **Current**: async generateSemanticLayerForUser(userId, workspaceId, schema) fetches resolved internally
- **Desired**: generateSemanticLayer(resolved, schema, options?) expects pre-resolved vocabulary (sync)
- **Files**: packages/liquid-connect/src/semantic/from-vocabulary.ts, packages/api/src/modules/knosia/pipeline/index.ts

### 34. GLUE-014 - Missing business type YAML templates

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 2h
- **Affects**: pipeline
- **Blocks**: SUBTASK9
- **Current**: No business type templates defined
- **Desired**: Create business type YAML templates (~300 LOC) in packages/liquid-connect/src/business-types/templates/
- **Files**: packages/liquid-connect/src/business-types/templates/saas.ts

### 35. PIPE-006 - Missing semantic API module

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 2h
- **Affects**: api, pipeline
- **Current**: NOT VERIFIED - expected location packages/api/src/modules/knosia/semantic/ does not exist or not checked
- **Desired**: API module with routes: POST /semantic/generate, GET /semantic/:workspaceId, PATCH /semantic/:workspaceId
- **Files**: packages/api/src/modules/knosia/semantic/router.ts, packages/api/src/modules/knosia/semantic/schemas.ts, packages/api/src/modules/knosia/semantic/queries.ts (+2 more)

### 36. PIPE-007 - Missing dashboard API module

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 2h
- **Affects**: api, pipeline
- **Current**: NOT VERIFIED - expected location packages/api/src/modules/knosia/dashboard/ does not exist or not checked
- **Desired**: API module with routes: POST /dashboard/generate, GET /dashboard/:workspaceId, GET /dashboard/templates
- **Files**: packages/api/src/modules/knosia/dashboard/router.ts, packages/api/src/modules/knosia/dashboard/schemas.ts, packages/api/src/modules/knosia/dashboard/queries.ts (+2 more)

### 37. GLUE-002 - LOC estimates wildly different (700 vs 1,250 vs 2,650)

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: unknown
- **Affects**: pipeline, api, vocabulary
- **Current**: Estimates range from 700 to 2,650 LOC with unclear scope boundaries
- **Desired**: Use 1,250 LOC estimate from doc 1800 (~950 glue + ~300 templates)

### 38. DASH-007 - AI Canvas Edit (prompt bar) has no instruction interpretation

- **Domain**: dashboard-architecture (SUBTASK6)
- **Effort**: 4h
- **Affects**: api, ui, pipeline
- **Current**: canvas-prompt-bar.tsx submits to api.knosia.canvas[':id'].edit.$post but backend logic for NL instruction parsing is unknown/missing
- **Desired**: Implement NL instruction parser in packages/api/src/modules/knosia/canvas/mutations.ts that interprets user instructions and modifies canvas blocks
- **Files**: packages/api/src/modules/knosia/canvas/mutations.ts

### 39. PIPE-010 - Missing UVB to compiler integration bridge

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 4h
- **Affects**: pipeline, database, vocabulary
- **Current**: UVB extraction works. createRegistry(semanticLayer) works IF you have SemanticLayer. Manual transformation and database insertion required.
- **Desired**: Implement saveDetectedVocabulary() and generateSemanticLayer() functions to automate UVB → DB → SemanticLayer → Compiler flow
- **Files**: packages/api/src/modules/knosia/vocabulary/mutations.ts, packages/liquid-connect/src/semantic/generator.ts

### 40. DASH-003 - DashboardSpec interface not defined in implementation

- **Domain**: dashboard-architecture (SUBTASK6)
- **Effort**: 1d
- **Affects**: pipeline, ui
- **Blocks**: SUBTASK8
- **Current**: DashboardSpec interface not found in packages/liquid-connect/src/dashboard/. Implementation uses direct CanvasBlock → LiquidSchema conversion.
- **Desired**: Create packages/liquid-connect/src/dashboard/types.ts with DashboardSpec and related interfaces (DashboardSection, DashboardKPI, DashboardChart)
- **Files**: packages/liquid-connect/src/dashboard/types.ts

### 41. PIPE-011 - Missing query results to UI schema integration

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 1d
- **Affects**: pipeline, ui
- **Current**: Executor returns QueryResult. LiquidUI can render IF you have LiquidSchema. Manual LiquidSchema construction required.
- **Desired**: Implement generateChartSchema() and dashboardSpecToLiquidSchema() to automate QueryResult → LiquidSchema flow
- **Files**: packages/liquid-render/src/dashboard/schema-generator.ts

### 42. DASH-005 - Home/Briefing page module not implemented

- **Domain**: dashboard-architecture (SUBTASK6)
- **Effort**: 2d
- **Affects**: ui
- **Blocked by**: SUBTASK8
- **Current**: apps/web/src/modules/knosia/home/ directory does not exist. No home/briefing page route.
- **Desired**: Create home module with KPI grid using existing canvas blocks (hero-metric, etc.) at apps/web/src/app/[locale]/dashboard/[org]/home/page.tsx
- **Files**: apps/web/src/app/[locale]/dashboard/[org]/home/page.tsx, apps/web/src/modules/knosia/home/components/kpi-grid.tsx, apps/web/src/modules/knosia/home/components/insights-panel.tsx

### 43. DASH-004 - Canvas implementation uses minimal schemas, not full pipeline

- **Domain**: dashboard-architecture (SUBTASK6)
- **Effort**: 1w
- **Affects**: pipeline, vocabulary
- **Current**: Implementation uses createMinimalSchema() function that directly creates LiquidSchema with minimal fields, bypassing the documented 7-step pipeline
- **Desired**: Document as 'Phase 1: Direct Binding' vs 'Phase 2: Full Pipeline' and keep both approaches. Full pipeline implementation for advanced features.
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, apps/web/src/modules/knosia/canvas/components/blocks/liquid-render-block.tsx


## MEDIUM Priority

### 44. DB-002 - Proposed tables that don't exist and aren't needed

- **Domain**: database-schema (SUBTASK1)
- **Effort**: 15min
- **Affects**: database, docs
- **Current**: Document proposes knosia_dashboard, knosia_dashboard_kpi, knosia_semantic_layer as new tables, but Canvas system (knosiaCanvas + knosiaCanvasBlock) and Workspace.compiledVocabulary JSONB already handle these use cases
- **Desired**: Remove these 3 tables from 'new tables' section and document existing Canvas + compiledVocabulary solutions instead
- **Files**: .artifacts/2026-01-02-1700-knosia-project-structure.md

### 45. FILE-002 - GLUE 2 module name inconsistency

- **Domain**: file-locations (SUBTASK3)
- **Effort**: 15min
- **Affects**: vocabulary
- **Current**: Blueprint says from-vocabulary.ts, project structure says generator.ts, consolidated doc doesn't specify filename
- **Desired**: Standardize on generator.ts (more descriptive, matches dashboard/generator.ts pattern, consistent with project structure)
- **Files**: packages/liquid-connect/src/semantic/generator.ts

### 46. FILE-004 - Dashboard module path documentation gap

- **Domain**: file-locations (SUBTASK3)
- **Effort**: 15min
- **Affects**: ui, docs
- **Current**: Dashboard files split between packages without clear explanation of why (liquid-connect/dashboard/generator.ts and liquid-render/dashboard/schema-generator.ts)
- **Desired**: Add clarification to consolidated doc explaining the split: GLUE 3C (liquid-connect) creates DashboardSpec, GLUE 4 (liquid-render) converts to LiquidSchema
- **Files**: packages/liquid-connect/src/dashboard/generator.ts, packages/liquid-render/src/dashboard/schema-generator.ts

### 47. GLUE-007 - File location inconsistencies for saveDetectedVocabulary

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 15min
- **Affects**: api
- **Current**: Modify packages/api/.../vocabulary/mutations.ts
- **Desired**: Create packages/api/.../vocabulary/from-detected.ts
- **Files**: packages/api/src/modules/knosia/vocabulary/from-detected.ts

### 48. GLUE-008 - File location inconsistencies for generateSemanticLayer

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 15min
- **Affects**: vocabulary
- **Current**: packages/liquid-connect/.../uvb/semantic-generator.ts
- **Desired**: packages/liquid-connect/.../semantic/from-vocabulary.ts
- **Files**: packages/liquid-connect/src/semantic/from-vocabulary.ts

### 49. OB-003 - Consolidated implementation shows different flow than project structure

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Multiple flow variations across documentation files
- **Desired**: Clarify whether 'summary' step exists and standardize documentation to single canonical flow
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 50. BIZ-007 - V1/V2 Implementation Scope Not Documented

- **Domain**: business-type-detection (SUBTASK8)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Platform architecture: 5 types. Glue blueprint: 9 types. No explicit V1/V2 split documented across all 5 architecture documents
- **Desired**: All documents updated with explicit V1 scope (saas, ecommerce, marketplace, custom) and V2 roadmap (fintech, healthcare, edtech, media, logistics)
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1535-knosia-ux-journeys.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md (+2 more)

### 51. PIPE-005 - UVB not exported from main package index

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 15min
- **Affects**: api, pipeline
- **Current**: UVB has its own index.ts with full exports BUT packages/liquid-connect/src/index.ts does NOT re-export UVB
- **Desired**: Either document subpath import pattern (@repo/liquid-connect/uvb) in architecture docs OR add UVB to main index.ts exports
- **Files**: packages/liquid-connect/src/index.ts, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 52. IMPL-003 - No explicit P0/P1/P2 priority labels

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 15min
- **Affects**: docs
- **Current**: No explicit P0/P1/P2 labels in any document, only sequential phase numbering (0-4)
- **Desired**: Add explicit priority labels to phases: Phase 0-1 (P0), Phase 2-3 (P1), Phase 4 (P2)
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 53. DB-005 - Table rename not reflected: Conversation → Thread

- **Domain**: database-schema (SUBTASK1)
- **Effort**: 30min
- **Affects**: database, docs, ui
- **Current**: Schema uses knosiaThread and knosiaThreadMessage (lines 664-733) with comment 'renamed from Conversations', but UX docs still say 'Conversation'
- **Desired**: Global find/replace: 'Conversation' → 'Thread', 'knosiaConversation' → 'knosiaThread', 'knosiaConversationMessage' → 'knosiaThreadMessage' across all .artifacts/
- **Files**: .artifacts/2026-01-02-1535-knosia-ux-journeys.md

### 54. DB-007 - Collaboration tables missing from documentation

- **Domain**: database-schema (SUBTASK1)
- **Effort**: 30min
- **Affects**: database, docs
- **Current**: knosiaComment and knosiaActivity tables exist (lines 912-950) supporting multi-user workflows, but docs don't mention them
- **Desired**: Add Collaboration section to architecture docs listing these tables, include in 'What's Already Built' sections as part of V1 foundation
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 55. DB-008 - Notification system tables missing from documentation

- **Domain**: database-schema (SUBTASK1)
- **Effort**: 30min
- **Affects**: database, docs
- **Current**: knosiaNotification, knosiaDigest, knosiaAiInsight tables exist (lines 959-1039) supporting features described in UX Journeys, but missing from implementation status tables
- **Desired**: Add Notification System section to architecture docs, list these tables as supporting alerts, briefings, and AI insights features
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 56. FILE-006 - Web routes ambiguity

- **Domain**: file-locations (SUBTASK3)
- **Effort**: 30min
- **Affects**: ui, docs
- **Current**: Project structure shows /dashboard/[org]/home but UX journeys show /home, creating conflict between org-scoped and global routes
- **Desired**: Use org-scoped routes (/dashboard/[org]/home, /dashboard/[org]/canvas, etc.) and update UX journeys to reflect actual routes
- **Files**: apps/web/src/app/[locale]/dashboard/[org]/home/page.tsx, apps/web/src/app/[locale]/dashboard/[org]/canvas/page.tsx, apps/web/src/app/[locale]/dashboard/[org]/threads/page.tsx (+1 more)

### 57. GLUE-009 - Missing MappingResult interface

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 30min
- **Affects**: api, pipeline
- **Current**: No MappingResult interface defined
- **Desired**: MappingResult interface with businessType, template, mappedKPIs, unmappedKPIs, coverage fields
- **Files**: packages/liquid-connect/src/dashboard/types.ts

### 58. OB-010 - Analysis component directory mentioned but may not exist

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 30min
- **Affects**: ui, docs
- **Current**: Documentation shows: web/src/modules/onboarding/components/analysis/ directory. Glob results showed: connect, review, role, confirm, ready components.
- **Desired**: Verify component directory existence and remove from docs if not used
- **Files**: .artifacts/2026-01-02-1700-knosia-project-structure.md, apps/web/src/modules/onboarding/components/

### 59. BIZ-001 - Business Type Enumeration Mismatch

- **Domain**: business-type-detection (SUBTASK8)
- **Effort**: 30min
- **Affects**: database, api, ui
- **Current**: Platform architecture: 5 types (saas|ecommerce|marketplace|fintech|custom), Glue blueprint: 9 types (adds healthcare|edtech|media|logistics), Project structure: 3 templates (saas, ecommerce, marketplace) + generic
- **Desired**: Canonical list: 9 types total. V1 implementation: saas, ecommerce, marketplace, custom. V2 roadmap: fintech, healthcare, edtech, media, logistics
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1700-knosia-project-structure.md, packages/liquid-connect/src/business-types/types.ts

### 60. BIZ-004 - Template Structure Definition Gaps

- **Domain**: business-type-detection (SUBTASK8)
- **Effort**: 30min
- **Affects**: api, pipeline
- **Current**: Platform architecture: no template schema. Glue blueprint lines 486-530: BusinessTypeTemplate interface with kpis, entities, dashboard, questions. Consolidated implementation lines 579-612: DashboardSpec (output format)
- **Desired**: Use glue blueprint BusinessTypeTemplate as canonical input structure. Ensure clear distinction: BusinessTypeTemplate (input/catalog) vs DashboardSpec (output/generated)
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, packages/liquid-connect/src/business-types/types.ts

### 61. PIPE-013 - Inconsistent BusinessType enum values across docs

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 30min
- **Affects**: pipeline, docs
- **Current**: Inconsistent business type taxonomy across documents. Need canonical list before implementation.
- **Desired**: Establish canonical BusinessType enum and update all docs to use consistent values
- **Files**: .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md, .artifacts/2026-01-02-1500-knosia-platform-architecture.md

### 62. IMPL-002 - Conversation module scope unclear

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 30min
- **Affects**: docs, ui
- **Current**: UX spec exists for Conversation UI, implementation plan (1600) excludes it from Phase 0-4, file structure (1700) lists it as NEW (~10 files)
- **Desired**: Clear decision: Either add Conversation UI to Phase 4, move to Phase 5 (post-MVP), or remove from 1700 new file list
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 63. API-009 - Module naming mismatch: conversation vs thread

- **Domain**: api-structure (SUBTASK2)
- **Effort**: 1h
- **Affects**: api, database, docs, ui
- **Current**: Implementation: packages/api/src/modules/knosia/thread/ with router mount at /thread. Documentation: references conversation/ module. Database: knosia_conversation table.
- **Desired**: Update all documentation to use 'thread' consistently (renaming module would be breaking change)
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 64. GLUE-003 - saveDetectedVocabulary signature mismatch

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 1h
- **Affects**: api, vocabulary
- **Current**: saveDetectedVocabulary(detected, orgId, workspaceId, { promoteToOrg?: string[] }) → Promise<void>
- **Desired**: saveDetectedVocabulary(detected, orgId, workspaceId, { promoteHighCertaintyToOrg?: boolean, certaintyThreshold?: number, skipExisting?: boolean }) → Promise<SaveDetectedVocabularyResult>
- **Files**: packages/api/src/modules/knosia/vocabulary/from-detected.ts

### 65. GLUE-013 - Missing options interfaces (SaveDetectedVocabularyOptions, GenerateSemanticLayerOptions)

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 1h
- **Affects**: api, vocabulary
- **Current**: No formal options interfaces defined
- **Desired**: Define SaveDetectedVocabularyOptions, GenerateSemanticLayerOptions, PipelineOptions, and PipelineResult interfaces
- **Files**: packages/api/src/modules/knosia/vocabulary/types.ts, packages/liquid-connect/src/semantic/types.ts, packages/api/src/modules/knosia/pipeline/types.ts

### 66. DASH-010 - BLOCK_TYPE_TO_LIQUID_TYPE mapping undocumented

- **Domain**: dashboard-architecture (SUBTASK6)
- **Effort**: 1h
- **Affects**: docs
- **Current**: BLOCK_TYPE_TO_LIQUID_TYPE mapping exists in liquid-render-block.tsx:26-120 with 77 mappings but no documentation explaining delegation pattern
- **Desired**: Add section to project structure doc explaining delegation pattern and how to extend block type mappings
- **Files**: .artifacts/2026-01-02-1700-knosia-project-structure.md

### 67. OB-007 - Summary route mentioned but not in implementation

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 1h
- **Affects**: ui, docs
- **Current**: Project structure shows 'summary/' as NEW STEP but no 'summary' step in stepMap
- **Desired**: Clarify if summary step should be implemented or documentation should be updated
- **Files**: .artifacts/2026-01-02-1700-knosia-project-structure.md, apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts

### 68. OB-012 - Business type detection mentioned but location unclear

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 1h
- **Affects**: ui, docs
- **Current**: Documentation shows business type detection ('Looks like a SaaS business!', 'Detected: subscriptions, customers, invoices') during ANALYZING step which doesn't exist. Unclear if review step performs this or if it's backend only.
- **Desired**: Clarify which step displays business type detection results
- **Files**: .artifacts/2026-01-02-1535-knosia-ux-journeys.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 69. GLUE-010 - Return type inconsistencies across functions

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 2h
- **Affects**: api, vocabulary, pipeline
- **Current**: Functions return void or minimal data
- **Desired**: All functions return structured results with metadata for error handling and UI feedback
- **Files**: packages/api/src/modules/knosia/vocabulary/from-detected.ts, packages/liquid-connect/src/semantic/from-vocabulary.ts, packages/liquid-connect/src/business-types/detector.ts

### 70. OB-008 - Implementation has full multi-connection support, docs inconsistent

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 2h
- **Affects**: docs
- **Current**: Implementation has full multi-connection support with connectionIds[], addConnection(), removeConnection(), setPrimaryConnection(). Documentation only shows single connection flow.
- **Desired**: Update UX journeys to include: 'Add Another Connection' flow after first connection, Connection summary screen showing all connections, Primary connection selection UI
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1535-knosia-ux-journeys.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 71. PIPE-009 - Type mismatch between DetectedVocabulary and SemanticLayer

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 2h
- **Affects**: pipeline, vocabulary
- **Current**: UVB produces DetectedVocabulary. SemanticRegistry expects SemanticLayer. Bridge function does NOT exist.
- **Desired**: PIPE-003 (generateSemanticLayer) implements transformation mapping DetectedEntity → EntityDefinition and DetectedMetric → MetricDefinition
- **Files**: packages/liquid-connect/src/semantic/generator.ts

### 72. API-011 - Wrong package location for semantic/dashboard modules

- **Domain**: api-structure (SUBTASK2)
- **Effort**: 4h
- **Affects**: api, pipeline
- **Current**: Documentation proposes packages/api/src/modules/knosia/semantic/ and dashboard/
- **Desired**: If implementing as data transformation, move to packages/liquid-connect/src/ and update all documentation accordingly
- **Files**: .artifacts/2026-01-02-1700-knosia-project-structure.md, .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md

### 73. BIZ-006 - KPIDefinition Formula Template Specification

- **Domain**: business-type-detection (SUBTASK8)
- **Effort**: 4h
- **Affects**: pipeline
- **Blocks**: SUBTASK9
- **Current**: Glue blueprint lines 363-383: KPIDefinition interface with formula.template and SlotMapping interface defined, but no concrete examples of pattern matching logic
- **Desired**: Create reference saas.ts template with complete KPIDefinition examples showing: formula templates, slot mappings, pattern regexes, and mapping algorithm
- **Files**: packages/liquid-connect/src/business-types/templates/saas.ts, packages/liquid-connect/src/business-types/mapper.ts, .artifacts/working/examples/saas-template-example.ts

### 74. DASH-008 - Only field bindings supported, not computed/indexed/iterator

- **Domain**: dashboard-architecture (SUBTASK6)
- **Effort**: 1d
- **Affects**: ui
- **Current**: liquid-render-block.tsx line 180 only uses field bindings: { kind: 'field', value: 'rows' }
- **Desired**: Support computed, indexed, and iterator bindings for advanced dashboard features with transformations and nested data
- **Files**: apps/web/src/modules/knosia/canvas/components/blocks/liquid-render-block.tsx


## LOW Priority

### 75. DB-004 - Field name inconsistency: business_type vs businessType

- **Domain**: database-schema (SUBTASK1)
- **Effort**: 15min
- **Affects**: database, docs
- **Current**: knosiaAnalysis.businessType exists as JSONB<{detected, confidence, reasoning, alternatives}> (lines 619-658), doc proposes adding 'business_type' field
- **Desired**: Remove business_type addition proposal, clarify if mapping_coverage is needed and if so, define its structure and purpose
- **Files**: .artifacts/2026-01-02-1700-knosia-project-structure.md

### 76. VOC-001 - Inconsistent terminology for user-level vocabulary

- **Domain**: vocabulary-system (SUBTASK4)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Mixed usage of 'private vocabulary', 'user private vocabulary', and 'personal vocabulary' across documentation
- **Desired**: Consistent use of 'private vocabulary' across all documentation
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1535-knosia-ux-journeys.md

### 77. VOC-002 - Schema field 'aggregationConfidence' not documented in architecture

- **Domain**: vocabulary-system (SUBTASK4)
- **Effort**: 15min
- **Affects**: docs
- **Current**: aggregationConfidence field exists in schema but is not mentioned in architecture documentation
- **Desired**: aggregationConfidence field documented in platform architecture and consolidated implementation docs
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 78. VOC-003 - Glue code example shows incorrect default storage level

- **Domain**: vocabulary-system (SUBTASK4)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Glue blueprint example shows 'workspaceId, // WORKSPACE level by default' (misleading)
- **Desired**: Glue blueprint updated to show that DetectedVocabulary items default to org-level (workspaceId = NULL) unless explicitly workspace-specific
- **Files**: .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md

### 79. VOC-004 - Scope badge descriptions vary between UX and architecture docs

- **Domain**: vocabulary-system (SUBTASK4)
- **Effort**: 15min
- **Affects**: docs
- **Current**: UX docs use emoji badges, architecture docs use plain text, code uses lowercase strings
- **Desired**: Accept as intentional - document this as a deliberate design choice in architecture docs
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md

### 80. DASH-009 - BlockDataSource uses string literals instead of enum

- **Domain**: dashboard-architecture (SUBTASK6)
- **Effort**: 15min
- **Affects**: ui
- **Current**: BlockDataSource interface has inline type union for type property
- **Desired**: Extract to BlockDataSourceType type alias: export type BlockDataSourceType = 'vocabulary' | 'query' | 'static'
- **Files**: apps/web/src/modules/knosia/canvas/types.ts

### 81. OB-005 - Confirm vs Confirmation inconsistency

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Mixed usage of 'confirm' and 'confirmation' in documentation
- **Desired**: Use 'confirm' consistently (already correct in implementation)
- **Files**: .artifacts/2026-01-02-1535-knosia-ux-journeys.md

### 82. OB-011 - Summary and ready components marked as NEW but not in all docs

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Project structure shows 'summary/' and 'ready/' marked as NEW STEP. Ready exists in stepMap, summary does not.
- **Desired**: Remove 'NEW STEP' markers or add summary to implementation
- **Files**: .artifacts/2026-01-02-1700-knosia-project-structure.md

### 83. BIZ-003 - Detection Algorithm Detail Variance

- **Domain**: business-type-detection (SUBTASK8)
- **Effort**: 15min
- **Affects**: pipeline
- **Current**: Platform architecture lines 625-650: pseudocode only. Glue blueprint lines 450-477: detailed requirements with table/column patterns, weighting (table: 30, column: 10), confidence threshold (>60), ambiguity detection (top 2 within 15 points)
- **Desired**: Use glue blueprint detailed requirements as source of truth. Extract patterns into separate signatures.ts module
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, packages/liquid-connect/src/business-types/detector.ts, packages/liquid-connect/src/business-types/signatures.ts

### 84. PIPE-008 - Pipeline step numbering inconsistency in docs

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 15min
- **Affects**: docs
- **Current**: 7-step is user-facing flow (what happens end-to-end). 4-glue is implementation view (code to build). No cross-reference.
- **Desired**: Add cross-reference noting: '7-step pipeline = end-to-end flow, 4 glue functions = implementation components'
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md

### 85. IMPL-004 - Business Type Detection LOC varies

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Different LOC estimates: 200 LOC (function only) vs 400 LOC (full module)
- **Desired**: Specify 'detector.ts' (200 LOC) vs 'business-types module' (400 LOC) clearly in all documents
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 86. IMPL-005 - Phase structure inconsistency

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Only 1600 has phases (Phase 0-4), other docs lack phase structure
- **Desired**: Use Phase 0-4 from 1600 as canonical timeline, reference in other docs
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1700-knosia-project-structure.md, .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md

### 87. IMPL-006 - Timeline only in 1600

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Timeline specified only in 1600 (14 days)
- **Desired**: Add timeline reference to other implementation docs pointing to 1600
- **Files**: .artifacts/2026-01-02-1500-knosia-platform-architecture.md, .artifacts/2026-01-02-1700-knosia-project-structure.md, .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md

### 88. IMPL-007 - File counts only in 1700

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 15min
- **Affects**: docs
- **Current**: File counts only in 1700 (59 new, 13 modified)
- **Desired**: Reference 1700 as source of truth for file counts in implementation plan
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 89. IMPL-009 - Phase duration rationale missing

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Phase durations vary without explanation (Phase 1: 2 days for ~950 LOC, Phase 3: 4 days for ~800 LOC)
- **Desired**: Add rationale notes to phase durations explaining factors like design iteration, integration complexity, testing requirements
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 90. IMPL-010 - Canvas marked as both existing and new

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 15min
- **Affects**: docs
- **Current**: Canvas module exists (canvas-view.tsx, liquid-render-block.tsx), but HOME page integration needs building
- **Desired**: Clarify that Canvas components exist but need HOME page integration in Phase 3
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md, .artifacts/2026-01-02-1700-knosia-project-structure.md

### 91. FILE-003 - Business types catalog structure ambiguity

- **Domain**: file-locations (SUBTASK3)
- **Effort**: 30min
- **Affects**: vocabulary
- **Current**: Unclear if catalog/ subdirectory (packages/liquid-connect/src/business-types/catalog/saas.yaml) is V1 or future enhancement
- **Desired**: Clarify whether V1 uses hardcoded patterns in detector.ts, loads from YAML catalog, or YAML catalog is V2+ enhancement
- **Files**: packages/liquid-connect/src/business-types/catalog/saas.yaml, packages/liquid-connect/src/business-types/detector.ts

### 92. GLUE-006 - Missing options parameter in dashboardSpecToLiquidSchema

- **Domain**: glue-functions (SUBTASK5)
- **Effort**: 30min
- **Affects**: ui
- **Current**: dashboardSpecToLiquidSchema(spec)
- **Desired**: dashboardSpecToLiquidSchema(spec, options?: { maxKPIsPerRow?, includeSectionHeaders?, gap? })
- **Files**: packages/liquid-render/src/dashboard/schema-generator.ts

### 93. OB-009 - Legacy connectionId field still exists alongside connectionIds array

- **Domain**: onboarding-flow (SUBTASK7)
- **Effort**: 30min
- **Affects**: docs
- **Current**: Both connectionId: string | null and connectionIds: string[] exist. When adding first connection, sets both primaryConnectionId and connectionId for legacy support.
- **Desired**: Document the migration strategy and deprecation timeline for connectionId field
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 94. PIPE-012 - Unclear type ownership for glue interfaces

- **Domain**: data-pipeline (SUBTASK9)
- **Effort**: 30min
- **Affects**: pipeline
- **Current**: Type ownership not specified for glue interfaces. Unclear if they should live in @repo/liquid-connect/types, @repo/api/modules/knosia/shared-schemas, or new shared types package.
- **Desired**: Define in @repo/liquid-connect/types since used by both liquid-connect and API, and semantic domain types belong with semantic layer
- **Files**: packages/liquid-connect/src/types/index.ts

### 95. IMPL-008 - Modified file list incomplete

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 30min
- **Affects**: docs
- **Current**: 13 modified files claimed but only ~10 listed by name
- **Desired**: All 13 modified files explicitly documented with reasons for modification
- **Files**: .artifacts/2026-01-02-1700-knosia-project-structure.md

### 96. IMPL-011 - Mobile experience scope unclear

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 30min
- **Affects**: docs, ui
- **Current**: Full mobile UX spec exists in 1535, but implementation plan only mentions responsive CSS in Phase 4
- **Desired**: Clarify if mobile = responsive CSS only or includes separate mobile app development
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 97. IMPL-012 - Missing cross-reference metrics table

- **Domain**: implementation-phases (SUBTASK10)
- **Effort**: 30min
- **Affects**: docs
- **Current**: Metrics scattered across multiple documents (1500, 1600, 1700, 1800)
- **Desired**: Add unified metrics table to 1600 showing: Phase | Days | LOC | Files (New/Mod) | Depends On
- **Files**: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

### 98. API-010 - Unclear shared/ module scope and purpose

- **Domain**: api-structure (SUBTASK2)
- **Effort**: 1h
- **Affects**: api, docs
- **Current**: packages/api/src/modules/knosia/shared/ contains semantic.ts, transforms.ts with tests. Documentation vague about contents and relationship to proposed semantic/ module.
- **Desired**: Document actual shared/ contents, clarify relationship to proposed semantic/ module, define guidelines for what belongs in shared/
- **Files**: .artifacts/2026-01-02-1700-knosia-project-structure.md

### 99. BIZ-005 - Detection Signatures Module Organization

- **Domain**: business-type-detection (SUBTASK8)
- **Effort**: 2h
- **Affects**: pipeline
- **Current**: Project structure lines 48-50: mentions detector.ts, signatures.ts, mapper.ts. Glue blueprint: patterns listed in requirements (lines 450-477) not as file specification
- **Desired**: Create signatures.ts with structure: export const businessTypeSignatures: Record<BusinessType, { tablePatterns: RegExp[]; columnPatterns: RegExp[]; weights: { table: number; column: number } }> = { ... }
- **Files**: packages/liquid-connect/src/business-types/signatures.ts, .artifacts/2026-01-02-1700-knosia-project-structure.md

