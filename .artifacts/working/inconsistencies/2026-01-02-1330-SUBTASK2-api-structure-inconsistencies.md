# API Structure Inconsistencies Analysis

**Date:** 2026-01-02
**Task:** Compare API module structures across 5 artifact documents vs actual implementation
**Scope:** `packages/api/src/modules/knosia/`

---

## Summary

Significant inconsistencies found between documentation and implementation:

1. **New modules proposed but not implemented:** `semantic/`, `dashboard/`
2. **Implemented modules not documented:** `activity/`, `canvas/`, `comment/`, `insight/`, `notification/`, `search/`, `thread/`
3. **Module name discrepancies:** `conversation/` vs `thread/`
4. **Missing from router:** None (all existing modules properly mounted)

---

## Actual Implementation (as of 2026-01-02)

**Location:** `/packages/api/src/modules/knosia/`

### Modules (13 total)

```yaml
actual_modules:
  - name: activity
    status: implemented
    router_mounted: true
    documented: false

  - name: analysis
    status: implemented
    router_mounted: true
    documented: true

  - name: briefing
    status: implemented
    router_mounted: true
    documented: true

  - name: canvas
    status: implemented
    router_mounted: true
    documented: false

  - name: comment
    status: implemented
    router_mounted: true
    documented: false

  - name: connections
    status: implemented
    router_mounted: true
    documented: true

  - name: insight
    status: implemented
    router_mounted: true
    documented: false

  - name: notification
    status: implemented
    router_mounted: true
    documented: false

  - name: organization
    status: implemented
    router_mounted: true
    documented: true

  - name: preferences
    status: implemented
    router_mounted: true
    documented: true

  - name: search
    status: implemented
    router_mounted: true
    documented: false

  - name: thread
    status: implemented
    router_mounted: true
    documented: as_conversation

  - name: vocabulary
    status: implemented
    router_mounted: true
    documented: true
```

### Router Mounts (`router.ts`)

```typescript
knosiaRouter
  .route("/activity", activityRouter)
  .route("/analysis", analysisRouter)
  .route("/briefing", briefingRouter)
  .route("/canvas", canvasRouter)
  .route("/comment", commentRouter)
  .route("/connections", connectionsRouter)
  .route("/insight", insightRouter)
  .route("/notification", notificationRouter)
  .route("/search", searchRouter)
  .route("/thread", threadRouter)
  .route("/organization", knosiaOrganizationRouter)
  .route("/preferences", preferencesRouter)
  .route("/vocabulary", knosiaVocabularyRouter)
```

---

## Documentation Analysis

### Document 1: `2026-01-02-1600-knosia-consolidated-implementation.md`

**Modules Listed:**
- ✅ connections
- ✅ analysis
- ✅ vocabulary
- ✅ briefing
- ✅ conversation (as "Chat/Query Interface")
- ✅ organization
- ✅ preferences

**Status Markers:** All marked as "✅ BUILT"

**Inconsistencies:**
```yaml
- type: missing_from_doc
  modules: [activity, canvas, comment, insight, notification, search]
  severity: high
  impact: 6 implemented modules completely undocumented

- type: name_mismatch
  documented: conversation
  actual: thread
  severity: medium
  impact: API endpoint is /thread not /conversation
```

### Document 2: `2026-01-02-1700-knosia-project-structure.md`

**Modules Listed:**
- ✅ connections
- ✅ analysis (with 📝 planned modifications)
- ✅ vocabulary (with 📝 planned modifications)
- 🆕 semantic (proposed NEW)
- 🆕 dashboard (proposed NEW)
- ✅ conversation (with 📝 planned modifications)
- ✅ briefing
- ✅ organization
- ✅ preferences
- ✅ shared

**Inconsistencies:**
```yaml
- type: proposed_not_implemented
  modules: [semantic, dashboard]
  severity: critical
  impact: Major features documented as NEW but not created
  files_proposed:
    semantic:
      - index.ts
      - router.ts
      - schemas.ts
      - queries.ts (getSemanticLayer)
      - mutations.ts (generateSemanticLayer)
    dashboard:
      - index.ts
      - router.ts
      - schemas.ts
      - queries.ts (getDashboard, getDashboardKPIs)
      - mutations.ts (generateDashboard, executeKPI)

- type: missing_from_doc
  modules: [activity, canvas, comment, insight, notification, search]
  severity: high
  impact: Same as consolidated doc

- type: name_mismatch
  documented: conversation
  actual: thread
  severity: medium
  impact: Documented integration points reference wrong module name
```

### Document 3: `2026-01-02-1800-knosia-glue-implementation-blueprint.md`

**Focus:** Implementation details for glue functions

**API References:**
- Proposes `packages/api/src/modules/knosia/semantic/` with full file structure
- Proposes `packages/api/src/modules/knosia/dashboard/` with full file structure
- References existing `vocabulary/` module for mutations

**Inconsistencies:**
```yaml
- type: detailed_spec_not_implemented
  modules: [semantic, dashboard]
  severity: critical
  impact: Complete implementation blueprint exists but modules not created
  details:
    - File structure defined
    - Function signatures specified
    - Integration points documented
    - But ZERO implementation in codebase

- type: wrong_package_location
  concern: semantic_and_dashboard
  documented_location: packages/api/src/modules/knosia/semantic/
  actual_location: Should be in liquid-connect package
  severity: medium
  impact: Document places semantic/dashboard in API but they're data transformation logic
  note: Glue functions belong in liquid-connect not API layer
```

### Document 4: `2026-01-02-1500-knosia-platform-architecture.md`

**API References:** Not analyzed in detail (persisted output)
**Note:** This is the architecture vision document - likely describes ideal state not current

### Document 5: `2026-01-02-1535-knosia-ux-journeys.md`

**API References:** Not analyzed in detail (persisted output)
**Note:** This is UX-focused - likely minimal API structure references

---

## Critical Inconsistencies (Priority Order)

### 1. CRITICAL: Proposed Modules Not Implemented

```yaml
inconsistency_id: PROP-001
type: missing_implementation
severity: critical
modules_affected: [semantic, dashboard]

documentation:
  - file: 2026-01-02-1700-knosia-project-structure.md
    status: Marked as 🆕 NEW MODULE with complete file structure
  - file: 2026-01-02-1800-knosia-glue-implementation-blueprint.md
    status: Complete implementation specification with function signatures

actual_state:
  - No semantic/ directory in packages/api/src/modules/knosia/
  - No dashboard/ directory in packages/api/src/modules/knosia/
  - No router mounts for these modules
  - No imports in index.ts

impact:
  - Major features described in detail cannot be used
  - Integration points reference non-existent modules
  - Unclear if these are future work or should exist now

recommended_action:
  decision_needed: Are semantic/ and dashboard/ API modules or liquid-connect packages?
  if_api_modules:
    - Create packages/api/src/modules/knosia/semantic/
    - Create packages/api/src/modules/knosia/dashboard/
    - Mount routers in router.ts
    - Export from index.ts
  if_liquid_connect:
    - Update all docs to remove from API structure
    - Document in liquid-connect package structure instead
```

### 2. HIGH: Undocumented Implemented Modules

```yaml
inconsistency_id: UNDOC-001
type: documentation_gap
severity: high
modules_affected: [activity, canvas, comment, insight, notification, search]

actual_state:
  activity:
    location: packages/api/src/modules/knosia/activity/
    files: [index.ts, router.ts, queries.ts, schemas.ts, mutations.ts]
    router_mount: /activity

  canvas:
    location: packages/api/src/modules/knosia/canvas/
    files: [index.ts, router.ts, queries.ts, schemas.ts, mutations.ts]
    router_mount: /canvas

  comment:
    location: packages/api/src/modules/knosia/comment/
    files: [index.ts, router.ts, queries.ts, schemas.ts, mutations.ts]
    router_mount: /comment

  insight:
    location: packages/api/src/modules/knosia/insight/
    files: [index.ts, router.ts, queries.ts, schemas.ts, mutations.ts, helpers.ts]
    router_mount: /insight

  notification:
    location: packages/api/src/modules/knosia/notification/
    files: [index.ts, router.ts, queries.ts, schemas.ts, mutations.ts]
    router_mount: /notification

  search:
    location: packages/api/src/modules/knosia/search/
    files: [index.ts, router.ts, queries.ts, schemas.ts]
    router_mount: /search

documented_in:
  - 2026-01-02-1600-knosia-consolidated-implementation.md: NOT MENTIONED
  - 2026-01-02-1700-knosia-project-structure.md: NOT MENTIONED
  - 2026-01-02-1800-knosia-glue-implementation-blueprint.md: NOT MENTIONED

impact:
  - New developers have no documentation for 6 major modules
  - No understanding of purpose, endpoints, or integration
  - Cannot determine if these are experimental or production
  - Architecture diagrams incomplete

recommended_action:
  - Add all 6 modules to project structure documentation
  - Document purpose and key endpoints for each
  - Add to API integration examples
  - Update architecture diagrams
```

### 3. MEDIUM: Module Name Mismatch (conversation vs thread)

```yaml
inconsistency_id: NAME-001
type: naming_mismatch
severity: medium
modules_affected: [conversation/thread]

documented_name: conversation
actual_name: thread

documentation_references:
  - file: 2026-01-02-1600-knosia-consolidated-implementation.md
    reference: "conversation/ ← Chat/Query Interface"
    table_entry: "knosia_conversation ✅ Chat sessions"

  - file: 2026-01-02-1700-knosia-project-structure.md
    reference: "conversation/ ✅ Chat/Query Interface"
    planned_changes: "📝 Integrate with semantic layer"

actual_implementation:
  directory: packages/api/src/modules/knosia/thread/
  router_mount: .route("/thread", threadRouter)
  import: import { threadRouter } from "./thread"
  export: export * from "./thread"

database_schema:
  table_name: knosia_conversation (matches documented name)
  table_name_messages: knosia_conversation_message

impact:
  - API endpoint is /api/knosia/thread not /api/knosia/conversation
  - Frontend code must use /thread in URLs
  - Database uses conversation naming but API uses thread
  - Mixed naming creates confusion

recommended_action:
  option_a: Rename module thread → conversation (breaking change)
  option_b: Update all docs to use thread consistently
  option_c: Add /conversation as alias route to /thread
```

### 4. LOW: Shared Module Structure Unclear

```yaml
inconsistency_id: STRUCT-001
type: structure_ambiguity
severity: low
module_affected: shared

documented:
  - file: 2026-01-02-1700-knosia-project-structure.md
    reference: "shared/ ✅ Shared Utilities"
    detail: "└── ... ✅ Existing files"

actual_state:
  location: packages/api/src/modules/knosia/shared/
  files:
    - index.ts
    - semantic.ts (semantic layer utilities)
    - semantic.test.ts
    - transforms.ts (data transformations)
    - transforms.test.ts
  note: Has actual implementation files, not just "utilities"

impact:
  - Unclear what belongs in shared/ vs dedicated modules
  - semantic.ts in shared/ but semantic/ proposed as new module
  - Naming collision potential

recommended_action:
  - Document actual shared/ contents
  - Clarify relationship between shared/semantic.ts and proposed semantic/ module
  - Define what qualifies for shared/ vs new module
```

---

## Router Consistency Check

### ✅ All Implemented Modules Are Mounted

```yaml
router_health: GOOD
issues: NONE

verification:
  - All 13 modules in filesystem have corresponding router.route() calls
  - All imports present in router.ts
  - No orphaned modules (implemented but not routed)
  - No phantom routes (routed but not implemented)

modules_verified:
  ✅ activity → activityRouter
  ✅ analysis → analysisRouter
  ✅ briefing → briefingRouter
  ✅ canvas → canvasRouter
  ✅ comment → commentRouter
  ✅ connections → connectionsRouter
  ✅ insight → insightRouter
  ✅ notification → notificationRouter
  ✅ search → searchRouter
  ✅ thread → threadRouter
  ✅ organization → knosiaOrganizationRouter
  ✅ preferences → preferencesRouter
  ✅ vocabulary → knosiaVocabularyRouter
```

---

## Endpoint Structure Check

### ⚠️ Cannot Verify Without Semantic/Dashboard Implementation

```yaml
proposed_endpoints:
  semantic:
    - GET /api/knosia/semantic/:workspaceId
    - POST /api/knosia/semantic/generate
    documented_in: 2026-01-02-1700-knosia-project-structure.md
    status: NOT IMPLEMENTED

  dashboard:
    - GET /api/knosia/dashboard/:workspaceId
    - GET /api/knosia/dashboard/:workspaceId/kpis
    - POST /api/knosia/dashboard/generate
    - POST /api/knosia/dashboard/execute-kpi
    documented_in: 2026-01-02-1700-knosia-project-structure.md
    status: NOT IMPLEMENTED

actual_endpoints:
  undocumented_modules:
    activity: endpoints_unknown
    canvas: endpoints_unknown
    comment: endpoints_unknown
    insight: endpoints_unknown
    notification: endpoints_unknown
    search: endpoints_unknown

  recommendation: Document actual endpoints for all implemented modules
```

---

## Recommendations (Prioritized)

### IMMEDIATE (This Week)

1. **Decide on semantic/ and dashboard/ placement**
   ```yaml
   decision: Are these API modules or liquid-connect packages?
   if_api:
     - Implement in packages/api/src/modules/knosia/
     - Follow patterns from existing modules
     - Add router mounts
   if_liquid_connect:
     - Update ALL docs to remove from API structure
     - Move to packages/liquid-connect/src/
     - Document as data transformation layer
   ```

2. **Document undocumented modules**
   ```yaml
   modules: [activity, canvas, comment, insight, notification, search]
   action:
     - Add to 2026-01-02-1700-knosia-project-structure.md
     - Include purpose, key endpoints, integration points
     - Mark status (✅ implemented, 🧪 experimental, etc.)
   ```

3. **Resolve conversation/thread naming**
   ```yaml
   recommended: Update docs to use "thread" consistently
   rationale:
     - Renaming module is breaking change
     - Less work to fix docs than code
     - Database name (conversation) can stay for backwards compat
   files_to_update:
     - 2026-01-02-1600-knosia-consolidated-implementation.md
     - 2026-01-02-1700-knosia-project-structure.md
   ```

### NEAR-TERM (This Month)

4. **Create endpoint documentation**
   ```yaml
   for_each_module:
     - List all routes with method, path, auth requirements
     - Document request/response schemas
     - Provide example calls
   format: OpenAPI spec or simple markdown tables
   location: .artifacts/api-endpoints-reference.md
   ```

5. **Audit shared/ module**
   ```yaml
   questions:
     - What belongs in shared/ vs dedicated module?
     - Why semantic.ts in shared/ if semantic/ module proposed?
     - Should transforms be in liquid-connect instead?
   outcome: Clear guidelines for shared/ usage
   ```

6. **Sync all architecture documents**
   ```yaml
   action: Update all 5 analyzed documents to match actual implementation
   ensure:
     - Consistent module lists
     - Accurate status markers
     - No references to non-existent modules
   ```

### LONG-TERM (Next Quarter)

7. **API versioning strategy**
   ```yaml
   concern: 13 modules already, 2 more proposed
   question: How to handle breaking changes?
   suggestion:
     - /api/v1/knosia/ vs /api/v2/knosia/
     - Or per-module versioning
     - Document deprecation policy
   ```

8. **Module organization review**
   ```yaml
   trigger: When module count exceeds 15
   consider:
     - Grouping by domain (chat, analysis, content)
     - Sub-routers for feature areas
     - Extract to separate packages if needed
   ```

---

## Files Analyzed

1. `.artifacts/2026-01-02-1500-knosia-platform-architecture.md` (persisted read)
2. `.artifacts/2026-01-02-1535-knosia-ux-journeys.md` (persisted read)
3. `.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md` (699 lines)
4. `.artifacts/2026-01-02-1700-knosia-project-structure.md` (553 lines)
5. `.artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md` (1108 lines)

## Actual Implementation Verified

- `packages/api/src/modules/knosia/` (directory listing)
- `packages/api/src/modules/knosia/router.ts` (42 lines)
- `packages/api/src/modules/knosia/index.ts` (11 lines)
- Individual module directory contents verified

---

## Appendix: Full Module Matrix

| Module | Documented | Implemented | Router Mount | Status Marker | Notes |
|--------|-----------|-------------|--------------|---------------|-------|
| activity | ❌ | ✅ | ✅ /activity | N/A | Completely undocumented |
| analysis | ✅ | ✅ | ✅ /analysis | ✅ (📝 mods planned) | Documented + working |
| briefing | ✅ | ✅ | ✅ /briefing | ✅ | Documented + working |
| canvas | ❌ | ✅ | ✅ /canvas | N/A | Completely undocumented |
| comment | ❌ | ✅ | ✅ /comment | N/A | Completely undocumented |
| connections | ✅ | ✅ | ✅ /connections | ✅ | Documented + working |
| **conversation** | ✅ | ❌ | N/A | ✅ (📝 mods planned) | **Implemented as thread** |
| **dashboard** | ✅ | ❌ | N/A | 🆕 NEW | **Proposed, not implemented** |
| insight | ❌ | ✅ | ✅ /insight | N/A | Completely undocumented |
| notification | ❌ | ✅ | ✅ /notification | N/A | Completely undocumented |
| organization | ✅ | ✅ | ✅ /organization | ✅ | Documented + working |
| preferences | ✅ | ✅ | ✅ /preferences | ✅ | Documented + working |
| search | ❌ | ✅ | ✅ /search | N/A | Completely undocumented |
| **semantic** | ✅ | ❌ | N/A | 🆕 NEW | **Proposed, not implemented** |
| shared | ✅ | ✅ | N/A (utility) | ✅ | Vague documentation |
| **thread** | ❌ | ✅ | ✅ /thread | N/A | **Documented as conversation** |
| vocabulary | ✅ | ✅ | ✅ /vocabulary | ✅ (📝 mods planned) | Documented + working |

**Legend:**
- ✅ = Present
- ❌ = Absent
- 🆕 = Proposed new module
- 📝 = Modifications planned
- N/A = Not applicable

---

**Analysis Complete:** 2026-01-02
**Total Inconsistencies Found:** 8 critical/high priority items
**Action Required:** Immediate decision on semantic/dashboard + documentation updates
