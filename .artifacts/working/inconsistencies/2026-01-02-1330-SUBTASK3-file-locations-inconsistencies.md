# File Location Inconsistencies Analysis

**Date:** 2026-01-02
**Task:** SUBTASK3 - Cross-reference file locations across 5 architecture documents
**Documents Analyzed:**
1. `.artifacts/2026-01-02-1500-knosia-platform-architecture.md`
2. `.artifacts/2026-01-02-1535-knosia-ux-journeys.md`
3. `.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md`
4. `.artifacts/2026-01-02-1700-knosia-project-structure.md`
5. `.artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md`

---

## Analysis Summary

### Overall Findings

**Total Inconsistencies Found:** 6

**Categories:**
- Module path mismatches: 2
- Status marker conflicts: 0 (markers are consistent)
- Conflicting locations for same functionality: 3
- Referenced files that don't exist: 1 (expected - all 🆕 files)

**Verification Status:**
- All files marked as 🆕 (new) were verified to NOT exist - ✅ Consistent
- All files marked as ✅ (existing) need verification against actual filesystem

---

## Detailed Inconsistencies

```yaml
inconsistencies:

  # ============================================================================
  # 1. GLUE 1 Location Conflict
  # ============================================================================

  - id: GLUE1_LOCATION_MISMATCH
    severity: HIGH
    category: conflicting_locations
    description: "GLUE 1 (DetectedVocabulary → DB) has two different locations specified"

    locations:
      - document: "1800-glue-implementation-blueprint.md"
        line: 154
        path: "packages/api/src/modules/knosia/vocabulary/from-detected.ts"
        marker: "🆕"
        context: "GLUE 1 implementation location"

      - document: "1600-consolidated-implementation.md"
        line: ~530
        path: "Implied in API vocabulary mutations section"
        marker: "Implicit - no explicit file path given"
        context: "saveDetectedVocabulary() function"

    impact: |
      The glue blueprint specifies a dedicated file for this transformation,
      but the consolidated doc shows it as part of vocabulary mutations module.
      Need to decide: dedicated file vs. integrated into existing mutations.

    recommendation: |
      Use the dedicated file approach from blueprint:
      packages/api/src/modules/knosia/vocabulary/from-detected.ts

      This provides better separation of concerns and matches the "glue" pattern.

  # ============================================================================
  # 2. GLUE 2 Module Name Inconsistency
  # ============================================================================

  - id: GLUE2_MODULE_PATH
    severity: MEDIUM
    category: module_path_mismatch
    description: "GLUE 2 (ResolvedVocabulary → SemanticLayer) has inconsistent module paths"

    locations:
      - document: "1800-glue-implementation-blueprint.md"
        line: 337
        path: "packages/liquid-connect/src/semantic/from-vocabulary.ts"
        marker: "🆕"
        context: "GLUE 2 implementation location"

      - document: "1700-knosia-project-structure.md"
        line: ~75
        path: "packages/liquid-connect/src/semantic/generator.ts"
        marker: "🆕"
        context: "File structure section"

      - document: "1600-consolidated-implementation.md"
        line: ~575
        path: "Referred to as generateSemanticLayerForUser() function"
        marker: "No explicit file path"
        context: "Function implementation example"

    conflict: |
      - Blueprint says: from-vocabulary.ts
      - Project structure says: generator.ts
      - Consolidated doc doesn't specify filename

    recommendation: |
      Choose one naming convention:

      Option A (Recommended): generator.ts
      - More descriptive of what it does
      - Matches pattern: dashboard/generator.ts
      - Consistent with project structure doc

      Option B: from-vocabulary.ts
      - Describes data source (input)
      - Matches GLUE 1 pattern (from-detected.ts)

  # ============================================================================
  # 3. Business Types Module Location
  # ============================================================================

  - id: BUSINESS_TYPES_LOCATION
    severity: LOW
    category: conflicting_locations
    description: "Business types detection module referenced in multiple contexts"

    locations:
      - document: "1700-knosia-project-structure.md"
        line: 55
        path: "packages/liquid-connect/src/business-types/catalog/saas.yaml"
        marker: "🆕"
        context: "YAML catalog file for SaaS signatures"

      - document: "1800-glue-implementation-blueprint.md"
        line: 449
        path: "packages/liquid-connect/src/business-types/detector.ts"
        marker: "🆕"
        context: "GLUE 3A - Business type detection"

      - document: "1600-consolidated-implementation.md"
        line: ~617
        path: "Function shown inline, no file path specified"
        marker: "N/A"
        context: "detectBusinessType() implementation"

    issue: |
      The project structure doc shows a catalog/ subdirectory with YAML files,
      but this isn't mentioned in the blueprint or consolidated docs.

    clarification_needed: |
      Is the catalog/ subdirectory part of V1 implementation or future enhancement?
      The detector.ts file is clearly V1, but catalog/ structure is unclear.

    recommendation: |
      Clarify in implementation plan whether:
      1. V1 uses hardcoded patterns in detector.ts
      2. V1 loads from YAML catalog
      3. YAML catalog is V2+ enhancement

  # ============================================================================
  # 4. Dashboard Module Path Divergence
  # ============================================================================

  - id: DASHBOARD_MODULE_PATHS
    severity: MEDIUM
    category: module_path_mismatch
    description: "Dashboard-related files spread across multiple packages with unclear boundaries"

    locations:
      - document: "1800-glue-implementation-blueprint.md"
        line: 640
        path: "packages/liquid-connect/src/dashboard/generator.ts"
        marker: "🆕"
        context: "GLUE 3C - DashboardSpec generation"

      - document: "1800-glue-implementation-blueprint.md"
        line: 787
        path: "packages/liquid-render/src/dashboard/schema-generator.ts"
        marker: "🆕"
        context: "GLUE 4 - LiquidSchema from DashboardSpec"

      - document: "1700-knosia-project-structure.md"
        line: 165
        path: "packages/liquid-render/src/dashboard/schema-generator.ts"
        marker: "🆕"
        context: "File structure listing"

      - document: "1600-consolidated-implementation.md"
        line: ~655
        path: "Functions shown inline, paths implied"
        marker: "N/A"
        context: "generateDashboardSpec() and dashboardSpecToLiquidSchema()"

    analysis: |
      Dashboard generation is split across two packages:
      - liquid-connect: Creates DashboardSpec (business logic)
      - liquid-render: Converts to LiquidSchema (presentation logic)

      This is intentional and correct, but could be clearer in docs.

    recommendation: |
      Add clarification to consolidated doc explaining the split:

      "Dashboard generation has two phases:
       1. GLUE 3C (liquid-connect): Business → DashboardSpec
       2. GLUE 4 (liquid-render): DashboardSpec → LiquidSchema

       This maintains package boundaries:
       - liquid-connect: knows about business types
       - liquid-render: knows about UI rendering"

  # ============================================================================
  # 5. Pipeline Integration Location
  # ============================================================================

  - id: PIPELINE_MODULE_LOCATION
    severity: LOW
    category: conflicting_locations
    description: "Pipeline integration module location varies between documents"

    locations:
      - document: "1800-glue-implementation-blueprint.md"
        line: 920
        path: "packages/api/src/modules/knosia/pipeline/index.ts"
        marker: "🆕"
        context: "Pipeline orchestration"

      - document: "1700-knosia-project-structure.md"
        line: 215
        path: "packages/api/src/modules/knosia/pipeline/"
        marker: "🆕"
        context: "Directory listing (no index.ts specified)"

      - document: "1600-consolidated-implementation.md"
        line: N/A
        path: "Pipeline not mentioned"
        marker: "N/A"
        context: "Missing from this doc"

    issue: |
      The pipeline module is mentioned in blueprint and project structure,
      but completely missing from the consolidated implementation doc.

    impact: "Medium - Pipeline orchestration is critical for V1"

    recommendation: |
      Add pipeline section to consolidated implementation doc.
      Ensure it covers:
      - How glue functions are orchestrated
      - Error handling between phases
      - Transaction boundaries

  # ============================================================================
  # 6. Knosia Web Routes Ambiguity
  # ============================================================================

  - id: WEB_ROUTES_AMBIGUITY
    severity: MEDIUM
    category: conflicting_locations
    description: "Web app routes for Knosia features have unclear structure"

    locations:
      - document: "1700-knosia-project-structure.md"
        line: 355-360
        path: "apps/web/src/app/[locale]/dashboard/[org]/home/page.tsx"
        marker: "🆕"
        context: "Home/briefing page route"

      - document: "1535-ux-journeys.md"
        line: 340
        path: "/home (implied route)"
        marker: "N/A"
        context: "UX spec shows /home as route"

      - document: "1600-consolidated-implementation.md"
        line: ~670
        path: "apps/web/src/app/[locale]/dashboard/[org]/home/page.tsx"
        marker: "Referenced in file locations"
        context: "Listed as new file"

    conflict: |
      The route pattern suggests:
      /dashboard/[org]/home

      But UX journeys show:
      /home

      These are different paths and would require different routing setup.

    clarification_needed: |
      Which is correct?
      1. /dashboard/[org]/home (scoped to org)
      2. /home (global, not org-scoped)

      The org-scoped version makes more sense given multi-workspace architecture,
      but conflicts with UX mockups.

    recommendation: |
      Use org-scoped routes:
      /dashboard/[org]/home
      /dashboard/[org]/canvas
      /dashboard/[org]/threads
      /dashboard/[org]/vocabulary

      Update UX journeys doc to reflect actual routes.

# ============================================================================
# Status Marker Verification
# ============================================================================

status_markers:
  summary: "All status markers are internally consistent within each document"

  existing_files_marked_✅:
    - "packages/db/src/schema/knosia.ts"
    - "packages/api/src/modules/knosia/router.ts"
    - "packages/api/src/modules/knosia/vocabulary/"
    - "packages/liquid-connect/src/index.ts"
    - "packages/liquid-connect/src/uvb/"
    - "packages/liquid-render/src/index.ts"
    - "packages/liquid-render/src/compiler/ui-compiler.ts"
    - "apps/web/src/modules/knosia/canvas/"
    - "apps/web/src/modules/onboarding/"

  new_files_marked_🆕:
    verified_not_exist: true
    note: "All glob searches confirmed these files don't exist yet - consistent with 🆕 marker"
    examples:
      - "packages/liquid-connect/src/business-types/**/*"
      - "packages/liquid-connect/src/semantic/**/*"
      - "packages/liquid-connect/src/dashboard/**/*"
      - "packages/liquid-render/src/dashboard/**/*"
      - "packages/api/src/modules/knosia/semantic/**/*"
      - "packages/api/src/modules/knosia/dashboard/**/*"
      - "packages/api/src/modules/knosia/pipeline/**/*"
      - "apps/web/src/modules/knosia/home/**/*"
      - "apps/web/src/app/**/knosia/**/*"

  files_marked_📝:
    note: "No files marked for modification in the analyzed sections"
    recommendation: "Check if onboarding module modifications need 📝 markers"

# ============================================================================
# Recommendations
# ============================================================================

recommendations:

  priority_high:
    - id: REC-01
      action: "Resolve GLUE 1 location conflict"
      decision_needed: "Use dedicated from-detected.ts vs. integrate into mutations"
      impact: "Affects API module structure"

    - id: REC-02
      action: "Clarify pipeline module scope"
      decision_needed: "Add pipeline to consolidated doc or defer to V2"
      impact: "Critical for V1 orchestration"

  priority_medium:
    - id: REC-03
      action: "Standardize GLUE 2 filename"
      decision_needed: "from-vocabulary.ts vs. generator.ts"
      impact: "Affects liquid-connect module structure"

    - id: REC-04
      action: "Reconcile web routes"
      decision_needed: "Org-scoped vs. global routes"
      impact: "Affects URL structure and navigation"

    - id: REC-05
      action: "Document dashboard package split"
      decision_needed: "Add explanation to consolidated doc"
      impact: "Developer understanding of architecture"

  priority_low:
    - id: REC-06
      action: "Clarify business types catalog structure"
      decision_needed: "V1 vs. V2+ feature"
      impact: "Nice-to-have clarification"

# ============================================================================
# Next Steps
# ============================================================================

next_steps:
  immediate:
    - "Review and resolve HIGH priority recommendations"
    - "Create standardized file naming convention document"
    - "Update UX journeys to reflect actual route patterns"

  before_implementation:
    - "Finalize all module paths"
    - "Create implementation checklist from project structure doc"
    - "Verify existing files actually exist (✅ markers)"

  during_implementation:
    - "Use project structure doc as source of truth for file paths"
    - "Cross-reference with blueprint for implementation details"
    - "Update consolidated doc with any path changes"

# ============================================================================
# Metadata
# ============================================================================

metadata:
  analysis_date: "2026-01-02"
  documents_analyzed: 5
  total_lines_analyzed: 3637
  inconsistencies_found: 6
  verification_method: "Manual cross-reference + glob verification"
  confidence_level: "HIGH"

  notes: |
    This analysis focused on structural inconsistencies in file paths and
    module organization. Functional inconsistencies (e.g., differing function
    signatures, conflicting architecture decisions) were not in scope.

    All files marked as 🆕 were verified to NOT exist, confirming consistency
    of status markers. Files marked as ✅ should be verified against actual
    filesystem before implementation begins.
