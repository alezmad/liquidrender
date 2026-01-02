# Knosia Inconsistency Master Matrix

Generated from 10 SUBTASK analysis documents.

## Overview

- **Total Issues**: 99
- **Critical**: 17
- **High**: 25
- **Medium**: 33
- **Low**: 24

## Domain Breakdown

| Subtask | Domain | Total | Critical | High | Medium | Low |
|---------|--------|-------|----------|------|--------|-----|
| SUBTASK1 | database-schema | 8 | 0 | 3 | 4 | 1 |
| SUBTASK10 | implementation-phases | 12 | 0 | 1 | 2 | 9 |
| SUBTASK2 | api-structure | 11 | 2 | 6 | 2 | 1 |
| SUBTASK3 | file-locations | 6 | 0 | 2 | 3 | 1 |
| SUBTASK4 | vocabulary-system | 4 | 0 | 0 | 0 | 4 |
| SUBTASK5 | glue-functions | 15 | 4 | 3 | 7 | 1 |
| SUBTASK6 | dashboard-architecture | 11 | 3 | 5 | 2 | 1 |
| SUBTASK7 | onboarding-flow | 12 | 3 | 1 | 5 | 3 |
| SUBTASK8 | business-type-detection | 7 | 1 | 0 | 4 | 2 |
| SUBTASK9 | data-pipeline | 13 | 4 | 4 | 4 | 1 |

## CRITICAL Issues

### SUBTASK2: api-structure

**API-001**: Proposed semantic/ module not implemented
- **Affects**: api, vocabulary, pipeline
- **Effort**: 1d
- **Current**: No semantic/ directory in packages/api/src/modules/knosia/. No router mounts or imports.
- **Desired**: Decision needed: Either implement as API module in packages/api/src/modules/knosia/semantic/ OR move to liquid-connect package as data transformation layer

**API-002**: Proposed dashboard/ module not implemented
- **Affects**: api, ui, vocabulary
- **Effort**: 2d
- **Current**: No dashboard/ directory in packages/api/src/modules/knosia/. No router mounts or imports.
- **Desired**: Decision needed: Either implement as API module in packages/api/src/modules/knosia/dashboard/ OR move to liquid-connect package as data transformation layer

### SUBTASK5: glue-functions

**GLUE-001**: Function count mismatch across documents
- **Affects**: api, pipeline, vocabulary
- **Effort**: 2h
- **Blocks**: SUBTASK9
- **Current**: Conflicting function counts: 4 (1500) vs 5 (1600) vs 7 (1800)
- **Desired**: Use 7 functions from doc 1800 with proper separation of concerns (mapToTemplate as distinct from generateDashboardSpec)

**GLUE-005**: GLUE 3 granularity mismatch (mapping concern)
- **Affects**: pipeline, api
- **Effort**: 4h
- **Blocks**: SUBTASK9
- **Current**: detectBusinessType → generateDashboardSpec (mapping implicit)
- **Desired**: detectBusinessType → mapToTemplate → generateDashboardSpec (3 separate functions)

**GLUE-011**: Missing mapToTemplate function in early docs
- **Affects**: pipeline, api
- **Effort**: 4h
- **Blocks**: SUBTASK9
- **Current**: No mapToTemplate function exists
- **Desired**: Create mapToTemplate(detected, template) → MappingResult (~150 LOC) in packages/liquid-connect/src/dashboard/mapper.ts

**GLUE-012**: Missing runKnosiaPipeline orchestration function
- **Affects**: api, pipeline
- **Effort**: 4h
- **Blocks**: SUBTASK9
- **Current**: No pipeline orchestration function exists
- **Desired**: Create runKnosiaPipeline(connectionId, userId, workspaceId, options?) → Promise<PipelineResult> (~150 LOC) in packages/api/src/modules/knosia/pipeline/index.ts

### SUBTASK6: dashboard-architecture

**DASH-001**: DashboardSpec to LiquidSchema transformer not implemented
- **Affects**: ui, pipeline
- **Effort**: 2d
- **Blocks**: SUBTASK8
- **Current**: dashboardSpecToLiquidSchema() function not found in packages/liquid-render/src/dashboard/
- **Desired**: Implement in packages/liquid-render/src/dashboard/schema-generator.ts using the createMinimalSchema pattern from liquid-render-block.tsx

**DASH-002**: BlockType enum doesn't match architecture spec
- **Affects**: docs, ui
- **Effort**: 2h
- **Current**: BlockType includes hero_metric, watch_list, comparison, insight which are not mentioned in architecture docs. Docs only reference LiquidRender types.
- **Desired**: Update architecture docs to document native block types and the delegation pattern to LiquidRender

**DASH-011**: Business type detection and templates not implemented
- **Affects**: pipeline, vocabulary
- **Effort**: 1w
- **Blocks**: SUBTASK7
- **Current**: packages/liquid-connect/src/business-types/ directory and all documented components (detector.ts, signatures.ts, catalog/*.yaml, mapper.ts) do not exist
- **Desired**: Implement business-types module as documented in glue implementation blueprint with detector, signatures, catalog loader, and mapper

### SUBTASK7: onboarding-flow

**OB-001**: Analysis step missing in implementation
- **Affects**: ui, docs
- **Effort**: 4h
- **Blocks**: SUBTASK6
- **Current**: Documentation shows 6-step flow with 'analyze' step, but stepMap only contains: connect, review, role, confirm, ready
- **Desired**: Either add /onboarding/analysis route and implement the step, OR update all documentation to remove 'analyze' step, OR merge 'analyze' functionality into 'review' step

**OB-004**: Analyze vs Analysis naming inconsistency
- **Affects**: docs
- **Effort**: 15min
- **Current**: Route naming confusion - /onboarding/analyze vs /onboarding/analysis
- **Desired**: If step is added, standardize on one name (suggest: 'analysis')

**OB-006**: Analysis route documented but doesn't exist
- **Affects**: ui, docs
- **Effort**: 2h
- **Current**: Documentation references /onboarding/analyze and /onboarding/analysis routes. Implemented routes: /onboarding/connect, /onboarding/review, /onboarding/role, /onboarding/confirm, /onboarding/ready
- **Desired**: Either implement the route or remove from documentation

### SUBTASK8: business-type-detection

**BIZ-002**: Template File Format Conflict (YAML vs TypeScript)
- **Affects**: api, pipeline
- **Effort**: 1h
- **Blocks**: SUBTASK5, SUBTASK9
- **Current**: Platform architecture line 508: saas.yaml, Project structure lines 425-427: .yaml files, Glue blueprint lines 483-542: saas.ts with BusinessTypeTemplate interface
- **Desired**: TypeScript (.ts) format with Zod schemas for runtime validation. YAML can be added later as import format. File pattern: packages/liquid-connect/src/business-types/templates/{type}.ts

### SUBTASK9: data-pipeline

**PIPE-001**: Missing business-types detection module
- **Affects**: pipeline, vocabulary
- **Effort**: 4h
- **Blocks**: SUBTASK6
- **Current**: MODULE DOES NOT EXIST at packages/liquid-connect/src/business-types/
- **Desired**: Implement business-types module with detectBusinessType(vocabulary: DetectedVocabulary): BusinessType, BUSINESS_TYPE_PATTERNS, and BusinessType enum (saas, ecommerce, marketplace, etc.)

**PIPE-002**: Missing dashboard specification generator
- **Affects**: pipeline, ui
- **Effort**: 1d
- **Blocks**: SUBTASK6
- **Current**: MODULE DOES NOT EXIST at packages/liquid-connect/src/dashboard/
- **Desired**: Implement dashboard module with generateDashboardSpec(businessType, vocabulary, role): DashboardSpec, TEMPLATES record<BusinessType, DashboardTemplate>, and DashboardSpec type

**PIPE-003**: Missing semantic layer generator
- **Affects**: pipeline, vocabulary
- **Effort**: 4h
- **Current**: FILE DOES NOT EXIST at packages/liquid-connect/src/semantic/generator.ts
- **Desired**: Implement generator.ts with generateSemanticLayer(vocabulary: ResolvedVocabulary): SemanticLayer function

**PIPE-004**: Missing dashboard-to-UI schema transformer
- **Affects**: pipeline, ui
- **Effort**: 1d
- **Blocks**: SUBTASK6
- **Current**: MODULE DOES NOT EXIST at packages/liquid-render/src/dashboard/
- **Desired**: Implement dashboard module with dashboardSpecToLiquidSchema(spec: DashboardSpec): LiquidSchema and schemaGenerator.ts with generateChartSchema() helper


## HIGH Issues

### SUBTASK1: database-schema

**DB-001**: Table count mismatch: docs claim 15 tables, schema has 26
- **Affects**: database, docs
- **Effort**: 30min
- **Current**: Architecture docs say '15 tables in knosia.ts' but actual schema has 26 tables including Canvas, Collaboration, and Notification systems
- **Desired**: All documents updated to reflect '26 tables (V1 complete)' with accurate table listings in architecture diagrams

**DB-003**: knosiaUserVocabularyPrefs table missing from documentation
- **Affects**: database, docs, vocabulary
- **Effort**: 30min
- **Current**: knosiaUserVocabularyPrefs exists in schema (lines 569-610) with favorites, synonyms, recentlyUsed, dismissedSuggestions, privateVocabulary fields, but architecture docs don't list it
- **Desired**: Add knosiaUserVocabularyPrefs to all table listings and architecture diagrams, document as USER-level preference source in vocabulary hierarchy

**DB-006**: Canvas tables missing from architecture docs
- **Affects**: database, docs, dashboard
- **Effort**: 30min
- **Current**: Canvas tables exist in schema (lines 794-903) for dashboard functionality, but architecture docs don't list them in table inventories
- **Desired**: Add Canvas tables to all architecture diagrams and table listings under 'V1 Complete' or 'Dashboard Layer' section

### SUBTASK2: api-structure

**API-003**: activity/ module completely undocumented
- **Affects**: api, docs
- **Effort**: 2h
- **Current**: packages/api/src/modules/knosia/activity/ exists and is router-mounted at /activity, but not mentioned in any documentation
- **Desired**: Add activity/ module to project structure documentation with purpose, key endpoints, and integration examples

**API-004**: canvas/ module completely undocumented
- **Affects**: api, docs, ui
- **Effort**: 2h
- **Current**: packages/api/src/modules/knosia/canvas/ exists and is router-mounted at /canvas, but not mentioned in any documentation
- **Desired**: Add canvas/ module to project structure documentation with purpose, key endpoints, and integration examples

**API-005**: comment/ module completely undocumented
- **Affects**: api, docs
- **Effort**: 2h
- **Current**: packages/api/src/modules/knosia/comment/ exists and is router-mounted at /comment, but not mentioned in any documentation
- **Desired**: Add comment/ module to project structure documentation with purpose, key endpoints, and integration examples

**API-006**: insight/ module completely undocumented
- **Affects**: api, docs
- **Effort**: 2h
- **Current**: packages/api/src/modules/knosia/insight/ exists and is router-mounted at /insight, but not mentioned in any documentation
- **Desired**: Add insight/ module to project structure documentation with purpose, key endpoints, and integration examples

**API-007**: notification/ module completely undocumented
- **Affects**: api, docs
- **Effort**: 2h
- **Current**: packages/api/src/modules/knosia/notification/ exists and is router-mounted at /notification, but not mentioned in any documentation
- **Desired**: Add notification/ module to project structure documentation with purpose, key endpoints, and integration examples

**API-008**: search/ module completely undocumented
- **Affects**: api, docs
- **Effort**: 2h
- **Current**: packages/api/src/modules/knosia/search/ exists and is router-mounted at /search, but not mentioned in any documentation
- **Desired**: Add search/ module to project structure documentation with purpose, key endpoints, and integration examples

### SUBTASK3: file-locations

**FILE-001**: GLUE 1 location conflict
- **Affects**: api, vocabulary
- **Effort**: 15min
- **Current**: Blueprint specifies packages/api/src/modules/knosia/vocabulary/from-detected.ts but consolidated doc implies integration into vocabulary mutations module without explicit file path
- **Desired**: Use dedicated file packages/api/src/modules/knosia/vocabulary/from-detected.ts for better separation of concerns

**FILE-005**: Pipeline module missing from consolidated doc
- **Affects**: pipeline, docs
- **Effort**: 1h
- **Current**: Pipeline module (packages/api/src/modules/knosia/pipeline/index.ts) documented in blueprint but absent from consolidated implementation
- **Desired**: Add pipeline section to consolidated doc covering orchestration, error handling, and transaction boundaries

### SUBTASK5: glue-functions

**GLUE-002**: LOC estimates wildly different (700 vs 1,250 vs 2,650)
- **Affects**: pipeline, api, vocabulary
- **Effort**: unknown
- **Current**: Estimates range from 700 to 2,650 LOC with unclear scope boundaries
- **Desired**: Use 1,250 LOC estimate from doc 1800 (~950 glue + ~300 templates)

**GLUE-004**: generateSemanticLayer function name and signature mismatch
- **Affects**: api, vocabulary, pipeline
- **Effort**: 2h
- **Blocks**: SUBTASK9
- **Current**: async generateSemanticLayerForUser(userId, workspaceId, schema) fetches resolved internally
- **Desired**: generateSemanticLayer(resolved, schema, options?) expects pre-resolved vocabulary (sync)

**GLUE-014**: Missing business type YAML templates
- **Affects**: pipeline
- **Effort**: 2h
- **Blocks**: SUBTASK9
- **Current**: No business type templates defined
- **Desired**: Create business type YAML templates (~300 LOC) in packages/liquid-connect/src/business-types/templates/

**GLUE-015**: Doc 1700 conflates glue code with UI components in LOC estimate
- **Affects**: docs
- **Effort**: 15min
- **Current**: Doc 1700 counts UI components as glue functions (total 2,650 LOC)
- **Desired**: Clearly separate glue layer (~1,250 LOC) from UI layer in documentation

### SUBTASK6: dashboard-architecture

**DASH-003**: DashboardSpec interface not defined in implementation
- **Affects**: pipeline, ui
- **Effort**: 1d
- **Blocks**: SUBTASK8
- **Current**: DashboardSpec interface not found in packages/liquid-connect/src/dashboard/. Implementation uses direct CanvasBlock → LiquidSchema conversion.
- **Desired**: Create packages/liquid-connect/src/dashboard/types.ts with DashboardSpec and related interfaces (DashboardSection, DashboardKPI, DashboardChart)

**DASH-004**: Canvas implementation uses minimal schemas, not full pipeline
- **Affects**: pipeline, vocabulary
- **Effort**: 1w
- **Current**: Implementation uses createMinimalSchema() function that directly creates LiquidSchema with minimal fields, bypassing the documented 7-step pipeline
- **Desired**: Document as 'Phase 1: Direct Binding' vs 'Phase 2: Full Pipeline' and keep both approaches. Full pipeline implementation for advanced features.

**DASH-005**: Home/Briefing page module not implemented
- **Affects**: ui
- **Effort**: 2d
- **Blocked By**: SUBTASK8
- **Current**: apps/web/src/modules/knosia/home/ directory does not exist. No home/briefing page route.
- **Desired**: Create home module with KPI grid using existing canvas blocks (hero-metric, etc.) at apps/web/src/app/[locale]/dashboard/[org]/home/page.tsx

**DASH-006**: BlockRenderer location doesn't match project structure doc
- **Affects**: docs
- **Effort**: 15min
- **Current**: Project structure doc expects canvas/blocks/block-renderer.tsx but actual file is at canvas/components/blocks/block-renderer.tsx
- **Desired**: Update project structure doc to reflect actual path: apps/web/src/modules/knosia/canvas/components/blocks/block-renderer.tsx

**DASH-007**: AI Canvas Edit (prompt bar) has no instruction interpretation
- **Affects**: api, ui, pipeline
- **Effort**: 4h
- **Current**: canvas-prompt-bar.tsx submits to api.knosia.canvas[':id'].edit.$post but backend logic for NL instruction parsing is unknown/missing
- **Desired**: Implement NL instruction parser in packages/api/src/modules/knosia/canvas/mutations.ts that interprets user instructions and modifies canvas blocks

### SUBTASK7: onboarding-flow

**OB-002**: Progress indicator shows 6 steps, implementation has 5
- **Affects**: ui, docs
- **Effort**: 30min
- **Blocked By**: SUBTASK7
- **Current**: Documentation shows: Connect ──── Analyze ──── Review ──── Role ──── Ready. Implementation only has 5 steps.
- **Desired**: Update progress indicator documentation to show 5 steps matching implementation

### SUBTASK9: data-pipeline

**PIPE-006**: Missing semantic API module
- **Affects**: api, pipeline
- **Effort**: 2h
- **Current**: NOT VERIFIED - expected location packages/api/src/modules/knosia/semantic/ does not exist or not checked
- **Desired**: API module with routes: POST /semantic/generate, GET /semantic/:workspaceId, PATCH /semantic/:workspaceId

**PIPE-007**: Missing dashboard API module
- **Affects**: api, pipeline
- **Effort**: 2h
- **Current**: NOT VERIFIED - expected location packages/api/src/modules/knosia/dashboard/ does not exist or not checked
- **Desired**: API module with routes: POST /dashboard/generate, GET /dashboard/:workspaceId, GET /dashboard/templates

**PIPE-010**: Missing UVB to compiler integration bridge
- **Affects**: pipeline, database, vocabulary
- **Effort**: 4h
- **Current**: UVB extraction works. createRegistry(semanticLayer) works IF you have SemanticLayer. Manual transformation and database insertion required.
- **Desired**: Implement saveDetectedVocabulary() and generateSemanticLayer() functions to automate UVB → DB → SemanticLayer → Compiler flow

**PIPE-011**: Missing query results to UI schema integration
- **Affects**: pipeline, ui
- **Effort**: 1d
- **Current**: Executor returns QueryResult. LiquidUI can render IF you have LiquidSchema. Manual LiquidSchema construction required.
- **Desired**: Implement generateChartSchema() and dashboardSpecToLiquidSchema() to automate QueryResult → LiquidSchema flow

### SUBTASK10: implementation-phases

**IMPL-001**: LOC estimate mismatch across documents (700 vs 2,650)
- **Affects**: docs
- **Effort**: 15min
- **Current**: 1500 says '~700 LOC total glue code', 1600/1700 say '~2,650 LOC new code', 1800 says '~1,250 LOC glue + templates'
- **Desired**: 1500 clarified to show: Core glue ~700 LOC (5 functions), Full glue layer ~1,250 LOC (glue + templates + pipeline), Complete implementation ~2,650 LOC (includes UI/routes)


## MEDIUM Issues

### SUBTASK1: database-schema

**DB-002**: Proposed tables that don't exist and aren't needed
- **Affects**: database, docs
- **Effort**: 15min
- **Current**: Document proposes knosia_dashboard, knosia_dashboard_kpi, knosia_semantic_layer as new tables, but Canvas system (knosiaCanvas + knosiaCanvasBlock) and Workspace.compiledVocabulary JSONB already handle these use cases
- **Desired**: Remove these 3 tables from 'new tables' section and document existing Canvas + compiledVocabulary solutions instead

**DB-005**: Table rename not reflected: Conversation → Thread
- **Affects**: database, docs, ui
- **Effort**: 30min
- **Current**: Schema uses knosiaThread and knosiaThreadMessage (lines 664-733) with comment 'renamed from Conversations', but UX docs still say 'Conversation'
- **Desired**: Global find/replace: 'Conversation' → 'Thread', 'knosiaConversation' → 'knosiaThread', 'knosiaConversationMessage' → 'knosiaThreadMessage' across all .artifacts/

**DB-007**: Collaboration tables missing from documentation
- **Affects**: database, docs
- **Effort**: 30min
- **Current**: knosiaComment and knosiaActivity tables exist (lines 912-950) supporting multi-user workflows, but docs don't mention them
- **Desired**: Add Collaboration section to architecture docs listing these tables, include in 'What's Already Built' sections as part of V1 foundation

**DB-008**: Notification system tables missing from documentation
- **Affects**: database, docs
- **Effort**: 30min
- **Current**: knosiaNotification, knosiaDigest, knosiaAiInsight tables exist (lines 959-1039) supporting features described in UX Journeys, but missing from implementation status tables
- **Desired**: Add Notification System section to architecture docs, list these tables as supporting alerts, briefings, and AI insights features

### SUBTASK2: api-structure

**API-009**: Module naming mismatch: conversation vs thread
- **Affects**: api, database, docs, ui
- **Effort**: 1h
- **Current**: Implementation: packages/api/src/modules/knosia/thread/ with router mount at /thread. Documentation: references conversation/ module. Database: knosia_conversation table.
- **Desired**: Update all documentation to use 'thread' consistently (renaming module would be breaking change)

**API-011**: Wrong package location for semantic/dashboard modules
- **Affects**: api, pipeline
- **Effort**: 4h
- **Current**: Documentation proposes packages/api/src/modules/knosia/semantic/ and dashboard/
- **Desired**: If implementing as data transformation, move to packages/liquid-connect/src/ and update all documentation accordingly

### SUBTASK3: file-locations

**FILE-002**: GLUE 2 module name inconsistency
- **Affects**: vocabulary
- **Effort**: 15min
- **Current**: Blueprint says from-vocabulary.ts, project structure says generator.ts, consolidated doc doesn't specify filename
- **Desired**: Standardize on generator.ts (more descriptive, matches dashboard/generator.ts pattern, consistent with project structure)

**FILE-004**: Dashboard module path documentation gap
- **Affects**: ui, docs
- **Effort**: 15min
- **Current**: Dashboard files split between packages without clear explanation of why (liquid-connect/dashboard/generator.ts and liquid-render/dashboard/schema-generator.ts)
- **Desired**: Add clarification to consolidated doc explaining the split: GLUE 3C (liquid-connect) creates DashboardSpec, GLUE 4 (liquid-render) converts to LiquidSchema

**FILE-006**: Web routes ambiguity
- **Affects**: ui, docs
- **Effort**: 30min
- **Current**: Project structure shows /dashboard/[org]/home but UX journeys show /home, creating conflict between org-scoped and global routes
- **Desired**: Use org-scoped routes (/dashboard/[org]/home, /dashboard/[org]/canvas, etc.) and update UX journeys to reflect actual routes

### SUBTASK5: glue-functions

**GLUE-003**: saveDetectedVocabulary signature mismatch
- **Affects**: api, vocabulary
- **Effort**: 1h
- **Current**: saveDetectedVocabulary(detected, orgId, workspaceId, { promoteToOrg?: string[] }) → Promise<void>
- **Desired**: saveDetectedVocabulary(detected, orgId, workspaceId, { promoteHighCertaintyToOrg?: boolean, certaintyThreshold?: number, skipExisting?: boolean }) → Promise<SaveDetectedVocabularyResult>

**GLUE-007**: File location inconsistencies for saveDetectedVocabulary
- **Affects**: api
- **Effort**: 15min
- **Current**: Modify packages/api/.../vocabulary/mutations.ts
- **Desired**: Create packages/api/.../vocabulary/from-detected.ts

**GLUE-008**: File location inconsistencies for generateSemanticLayer
- **Affects**: vocabulary
- **Effort**: 15min
- **Current**: packages/liquid-connect/.../uvb/semantic-generator.ts
- **Desired**: packages/liquid-connect/.../semantic/from-vocabulary.ts

**GLUE-009**: Missing MappingResult interface
- **Affects**: api, pipeline
- **Effort**: 30min
- **Current**: No MappingResult interface defined
- **Desired**: MappingResult interface with businessType, template, mappedKPIs, unmappedKPIs, coverage fields

**GLUE-010**: Return type inconsistencies across functions
- **Affects**: api, vocabulary, pipeline
- **Effort**: 2h
- **Current**: Functions return void or minimal data
- **Desired**: All functions return structured results with metadata for error handling and UI feedback

**GLUE-013**: Missing options interfaces (SaveDetectedVocabularyOptions, GenerateSemanticLayerOptions)
- **Affects**: api, vocabulary
- **Effort**: 1h
- **Current**: No formal options interfaces defined
- **Desired**: Define SaveDetectedVocabularyOptions, GenerateSemanticLayerOptions, PipelineOptions, and PipelineResult interfaces

### SUBTASK6: dashboard-architecture

**DASH-008**: Only field bindings supported, not computed/indexed/iterator
- **Affects**: ui
- **Effort**: 1d
- **Current**: liquid-render-block.tsx line 180 only uses field bindings: { kind: 'field', value: 'rows' }
- **Desired**: Support computed, indexed, and iterator bindings for advanced dashboard features with transformations and nested data

**DASH-010**: BLOCK_TYPE_TO_LIQUID_TYPE mapping undocumented
- **Affects**: docs
- **Effort**: 1h
- **Current**: BLOCK_TYPE_TO_LIQUID_TYPE mapping exists in liquid-render-block.tsx:26-120 with 77 mappings but no documentation explaining delegation pattern
- **Desired**: Add section to project structure doc explaining delegation pattern and how to extend block type mappings

### SUBTASK7: onboarding-flow

**OB-003**: Consolidated implementation shows different flow than project structure
- **Affects**: docs
- **Effort**: 15min
- **Current**: Multiple flow variations across documentation files
- **Desired**: Clarify whether 'summary' step exists and standardize documentation to single canonical flow

**OB-007**: Summary route mentioned but not in implementation
- **Affects**: ui, docs
- **Effort**: 1h
- **Current**: Project structure shows 'summary/' as NEW STEP but no 'summary' step in stepMap
- **Desired**: Clarify if summary step should be implemented or documentation should be updated

**OB-008**: Implementation has full multi-connection support, docs inconsistent
- **Affects**: docs
- **Effort**: 2h
- **Current**: Implementation has full multi-connection support with connectionIds[], addConnection(), removeConnection(), setPrimaryConnection(). Documentation only shows single connection flow.
- **Desired**: Update UX journeys to include: 'Add Another Connection' flow after first connection, Connection summary screen showing all connections, Primary connection selection UI

**OB-010**: Analysis component directory mentioned but may not exist
- **Affects**: ui, docs
- **Effort**: 30min
- **Current**: Documentation shows: web/src/modules/onboarding/components/analysis/ directory. Glob results showed: connect, review, role, confirm, ready components.
- **Desired**: Verify component directory existence and remove from docs if not used

**OB-012**: Business type detection mentioned but location unclear
- **Affects**: ui, docs
- **Effort**: 1h
- **Current**: Documentation shows business type detection ('Looks like a SaaS business!', 'Detected: subscriptions, customers, invoices') during ANALYZING step which doesn't exist. Unclear if review step performs this or if it's backend only.
- **Desired**: Clarify which step displays business type detection results

### SUBTASK8: business-type-detection

**BIZ-001**: Business Type Enumeration Mismatch
- **Affects**: database, api, ui
- **Effort**: 30min
- **Current**: Platform architecture: 5 types (saas|ecommerce|marketplace|fintech|custom), Glue blueprint: 9 types (adds healthcare|edtech|media|logistics), Project structure: 3 templates (saas, ecommerce, marketplace) + generic
- **Desired**: Canonical list: 9 types total. V1 implementation: saas, ecommerce, marketplace, custom. V2 roadmap: fintech, healthcare, edtech, media, logistics

**BIZ-004**: Template Structure Definition Gaps
- **Affects**: api, pipeline
- **Effort**: 30min
- **Current**: Platform architecture: no template schema. Glue blueprint lines 486-530: BusinessTypeTemplate interface with kpis, entities, dashboard, questions. Consolidated implementation lines 579-612: DashboardSpec (output format)
- **Desired**: Use glue blueprint BusinessTypeTemplate as canonical input structure. Ensure clear distinction: BusinessTypeTemplate (input/catalog) vs DashboardSpec (output/generated)

**BIZ-006**: KPIDefinition Formula Template Specification
- **Affects**: pipeline
- **Effort**: 4h
- **Blocks**: SUBTASK9
- **Current**: Glue blueprint lines 363-383: KPIDefinition interface with formula.template and SlotMapping interface defined, but no concrete examples of pattern matching logic
- **Desired**: Create reference saas.ts template with complete KPIDefinition examples showing: formula templates, slot mappings, pattern regexes, and mapping algorithm

**BIZ-007**: V1/V2 Implementation Scope Not Documented
- **Affects**: docs
- **Effort**: 15min
- **Current**: Platform architecture: 5 types. Glue blueprint: 9 types. No explicit V1/V2 split documented across all 5 architecture documents
- **Desired**: All documents updated with explicit V1 scope (saas, ecommerce, marketplace, custom) and V2 roadmap (fintech, healthcare, edtech, media, logistics)

### SUBTASK9: data-pipeline

**PIPE-005**: UVB not exported from main package index
- **Affects**: api, pipeline
- **Effort**: 15min
- **Current**: UVB has its own index.ts with full exports BUT packages/liquid-connect/src/index.ts does NOT re-export UVB
- **Desired**: Either document subpath import pattern (@repo/liquid-connect/uvb) in architecture docs OR add UVB to main index.ts exports

**PIPE-009**: Type mismatch between DetectedVocabulary and SemanticLayer
- **Affects**: pipeline, vocabulary
- **Effort**: 2h
- **Current**: UVB produces DetectedVocabulary. SemanticRegistry expects SemanticLayer. Bridge function does NOT exist.
- **Desired**: PIPE-003 (generateSemanticLayer) implements transformation mapping DetectedEntity → EntityDefinition and DetectedMetric → MetricDefinition

**PIPE-013**: Inconsistent BusinessType enum values across docs
- **Affects**: pipeline, docs
- **Effort**: 30min
- **Current**: Inconsistent business type taxonomy across documents. Need canonical list before implementation.
- **Desired**: Establish canonical BusinessType enum and update all docs to use consistent values

### SUBTASK10: implementation-phases

**IMPL-002**: Conversation module scope unclear
- **Affects**: docs, ui
- **Effort**: 30min
- **Current**: UX spec exists for Conversation UI, implementation plan (1600) excludes it from Phase 0-4, file structure (1700) lists it as NEW (~10 files)
- **Desired**: Clear decision: Either add Conversation UI to Phase 4, move to Phase 5 (post-MVP), or remove from 1700 new file list

**IMPL-003**: No explicit P0/P1/P2 priority labels
- **Affects**: docs
- **Effort**: 15min
- **Current**: No explicit P0/P1/P2 labels in any document, only sequential phase numbering (0-4)
- **Desired**: Add explicit priority labels to phases: Phase 0-1 (P0), Phase 2-3 (P1), Phase 4 (P2)


## LOW Issues

### SUBTASK1: database-schema

**DB-004**: Field name inconsistency: business_type vs businessType
- **Affects**: database, docs
- **Effort**: 15min
- **Current**: knosiaAnalysis.businessType exists as JSONB<{detected, confidence, reasoning, alternatives}> (lines 619-658), doc proposes adding 'business_type' field
- **Desired**: Remove business_type addition proposal, clarify if mapping_coverage is needed and if so, define its structure and purpose

### SUBTASK2: api-structure

**API-010**: Unclear shared/ module scope and purpose
- **Affects**: api, docs
- **Effort**: 1h
- **Current**: packages/api/src/modules/knosia/shared/ contains semantic.ts, transforms.ts with tests. Documentation vague about contents and relationship to proposed semantic/ module.
- **Desired**: Document actual shared/ contents, clarify relationship to proposed semantic/ module, define guidelines for what belongs in shared/

### SUBTASK3: file-locations

**FILE-003**: Business types catalog structure ambiguity
- **Affects**: vocabulary
- **Effort**: 30min
- **Current**: Unclear if catalog/ subdirectory (packages/liquid-connect/src/business-types/catalog/saas.yaml) is V1 or future enhancement
- **Desired**: Clarify whether V1 uses hardcoded patterns in detector.ts, loads from YAML catalog, or YAML catalog is V2+ enhancement

### SUBTASK4: vocabulary-system

**VOC-001**: Inconsistent terminology for user-level vocabulary
- **Affects**: docs
- **Effort**: 15min
- **Current**: Mixed usage of 'private vocabulary', 'user private vocabulary', and 'personal vocabulary' across documentation
- **Desired**: Consistent use of 'private vocabulary' across all documentation

**VOC-002**: Schema field 'aggregationConfidence' not documented in architecture
- **Affects**: docs
- **Effort**: 15min
- **Current**: aggregationConfidence field exists in schema but is not mentioned in architecture documentation
- **Desired**: aggregationConfidence field documented in platform architecture and consolidated implementation docs

**VOC-003**: Glue code example shows incorrect default storage level
- **Affects**: docs
- **Effort**: 15min
- **Current**: Glue blueprint example shows 'workspaceId, // WORKSPACE level by default' (misleading)
- **Desired**: Glue blueprint updated to show that DetectedVocabulary items default to org-level (workspaceId = NULL) unless explicitly workspace-specific

**VOC-004**: Scope badge descriptions vary between UX and architecture docs
- **Affects**: docs
- **Effort**: 15min
- **Current**: UX docs use emoji badges, architecture docs use plain text, code uses lowercase strings
- **Desired**: Accept as intentional - document this as a deliberate design choice in architecture docs

### SUBTASK5: glue-functions

**GLUE-006**: Missing options parameter in dashboardSpecToLiquidSchema
- **Affects**: ui
- **Effort**: 30min
- **Current**: dashboardSpecToLiquidSchema(spec)
- **Desired**: dashboardSpecToLiquidSchema(spec, options?: { maxKPIsPerRow?, includeSectionHeaders?, gap? })

### SUBTASK6: dashboard-architecture

**DASH-009**: BlockDataSource uses string literals instead of enum
- **Affects**: ui
- **Effort**: 15min
- **Current**: BlockDataSource interface has inline type union for type property
- **Desired**: Extract to BlockDataSourceType type alias: export type BlockDataSourceType = 'vocabulary' | 'query' | 'static'

### SUBTASK7: onboarding-flow

**OB-005**: Confirm vs Confirmation inconsistency
- **Affects**: docs
- **Effort**: 15min
- **Current**: Mixed usage of 'confirm' and 'confirmation' in documentation
- **Desired**: Use 'confirm' consistently (already correct in implementation)

**OB-009**: Legacy connectionId field still exists alongside connectionIds array
- **Affects**: docs
- **Effort**: 30min
- **Current**: Both connectionId: string | null and connectionIds: string[] exist. When adding first connection, sets both primaryConnectionId and connectionId for legacy support.
- **Desired**: Document the migration strategy and deprecation timeline for connectionId field

**OB-011**: Summary and ready components marked as NEW but not in all docs
- **Affects**: docs
- **Effort**: 15min
- **Current**: Project structure shows 'summary/' and 'ready/' marked as NEW STEP. Ready exists in stepMap, summary does not.
- **Desired**: Remove 'NEW STEP' markers or add summary to implementation

### SUBTASK8: business-type-detection

**BIZ-003**: Detection Algorithm Detail Variance
- **Affects**: pipeline
- **Effort**: 15min
- **Current**: Platform architecture lines 625-650: pseudocode only. Glue blueprint lines 450-477: detailed requirements with table/column patterns, weighting (table: 30, column: 10), confidence threshold (>60), ambiguity detection (top 2 within 15 points)
- **Desired**: Use glue blueprint detailed requirements as source of truth. Extract patterns into separate signatures.ts module

**BIZ-005**: Detection Signatures Module Organization
- **Affects**: pipeline
- **Effort**: 2h
- **Current**: Project structure lines 48-50: mentions detector.ts, signatures.ts, mapper.ts. Glue blueprint: patterns listed in requirements (lines 450-477) not as file specification
- **Desired**: Create signatures.ts with structure: export const businessTypeSignatures: Record<BusinessType, { tablePatterns: RegExp[]; columnPatterns: RegExp[]; weights: { table: number; column: number } }> = { ... }

### SUBTASK9: data-pipeline

**PIPE-008**: Pipeline step numbering inconsistency in docs
- **Affects**: docs
- **Effort**: 15min
- **Current**: 7-step is user-facing flow (what happens end-to-end). 4-glue is implementation view (code to build). No cross-reference.
- **Desired**: Add cross-reference noting: '7-step pipeline = end-to-end flow, 4 glue functions = implementation components'

**PIPE-012**: Unclear type ownership for glue interfaces
- **Affects**: pipeline
- **Effort**: 30min
- **Current**: Type ownership not specified for glue interfaces. Unclear if they should live in @repo/liquid-connect/types, @repo/api/modules/knosia/shared-schemas, or new shared types package.
- **Desired**: Define in @repo/liquid-connect/types since used by both liquid-connect and API, and semantic domain types belong with semantic layer

### SUBTASK10: implementation-phases

**IMPL-004**: Business Type Detection LOC varies
- **Affects**: docs
- **Effort**: 15min
- **Current**: Different LOC estimates: 200 LOC (function only) vs 400 LOC (full module)
- **Desired**: Specify 'detector.ts' (200 LOC) vs 'business-types module' (400 LOC) clearly in all documents

**IMPL-005**: Phase structure inconsistency
- **Affects**: docs
- **Effort**: 15min
- **Current**: Only 1600 has phases (Phase 0-4), other docs lack phase structure
- **Desired**: Use Phase 0-4 from 1600 as canonical timeline, reference in other docs

**IMPL-006**: Timeline only in 1600
- **Affects**: docs
- **Effort**: 15min
- **Current**: Timeline specified only in 1600 (14 days)
- **Desired**: Add timeline reference to other implementation docs pointing to 1600

**IMPL-007**: File counts only in 1700
- **Affects**: docs
- **Effort**: 15min
- **Current**: File counts only in 1700 (59 new, 13 modified)
- **Desired**: Reference 1700 as source of truth for file counts in implementation plan

**IMPL-008**: Modified file list incomplete
- **Affects**: docs
- **Effort**: 30min
- **Current**: 13 modified files claimed but only ~10 listed by name
- **Desired**: All 13 modified files explicitly documented with reasons for modification

**IMPL-009**: Phase duration rationale missing
- **Affects**: docs
- **Effort**: 15min
- **Current**: Phase durations vary without explanation (Phase 1: 2 days for ~950 LOC, Phase 3: 4 days for ~800 LOC)
- **Desired**: Add rationale notes to phase durations explaining factors like design iteration, integration complexity, testing requirements

**IMPL-010**: Canvas marked as both existing and new
- **Affects**: docs
- **Effort**: 15min
- **Current**: Canvas module exists (canvas-view.tsx, liquid-render-block.tsx), but HOME page integration needs building
- **Desired**: Clarify that Canvas components exist but need HOME page integration in Phase 3

**IMPL-011**: Mobile experience scope unclear
- **Affects**: docs, ui
- **Effort**: 30min
- **Current**: Full mobile UX spec exists in 1535, but implementation plan only mentions responsive CSS in Phase 4
- **Desired**: Clarify if mobile = responsive CSS only or includes separate mobile app development

**IMPL-012**: Missing cross-reference metrics table
- **Affects**: docs
- **Effort**: 30min
- **Current**: Metrics scattered across multiple documents (1500, 1600, 1700, 1800)
- **Desired**: Add unified metrics table to 1600 showing: Phase | Days | LOC | Files (New/Mod) | Depends On

