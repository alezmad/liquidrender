# Vocabulary System Inconsistency Analysis

**Date:** 2026-01-02
**Task:** SUBTASK4 - Compare vocabulary system across 5 artifact files and implementation
**Scope:** 3-level hierarchy, resolution algorithm, storage structures

---

## Summary

The vocabulary system documentation is **HIGHLY CONSISTENT** across all reviewed artifacts and implementation. The core concepts (3-level hierarchy, resolution priority, storage structure) are uniformly described. Minor inconsistencies are limited to:
- Terminology variations (cosmetic)
- Implementation-specific schema fields not documented in architecture docs
- One incorrect example in the glue blueprint (already fixed in implementation)

---

## Analysis Results

```yaml
inconsistencies:
  # CRITICAL: No critical inconsistencies found

  # MINOR: Cosmetic and documentation completeness issues
  - id: INC-001
    severity: minor
    category: terminology
    title: "Inconsistent terminology for user-level vocabulary"
    description: |
      Different documents use slightly different terms for user-level vocabulary:
      - "Private vocabulary" (most common)
      - "User private vocabulary"
      - "Personal vocabulary" (UX journeys)
      All refer to the same concept.
    locations:
      - file: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md
        line: 245
        text: "privateVocabulary: [{ my_conversion: formula }]"
      - file: .artifacts/2026-01-02-1535-knosia-ux-journeys.md
        line: 839
        text: "Personal conversion tracking"
      - file: packages/api/src/modules/knosia/vocabulary/resolution.ts
        line: 148
        text: "const privateVocab = (prefs?.privateVocabulary..."
    recommendation: "Standardize on 'private vocabulary' (already used in implementation)"
    impact: "Documentation clarity only, no functional impact"

  - id: INC-002
    severity: minor
    category: documentation_completeness
    title: "Schema field 'aggregationConfidence' not documented in architecture"
    description: |
      The database schema includes knosia_vocabulary_item.aggregationConfidence field,
      but architecture documents don't mention this field in their examples.
    locations:
      - file: packages/db/src/schema/knosia.ts
        line: ~410
        text: "aggregationConfidence: integer()"
      - file: .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md
        note: "References aggregationConfidence in glue code example (line 548)"
      - file: .artifacts/2026-01-02-1500-knosia-platform-architecture.md
        note: "Does not mention aggregationConfidence field"
    recommendation: "Add aggregationConfidence to architectural documentation of vocabulary items"
    impact: "Documentation completeness, no functional impact"

  - id: INC-003
    severity: minor
    category: implementation_correction
    title: "Glue code example fixed in actual implementation"
    description: |
      The glue implementation blueprint shows saving all DetectedVocabulary items
      to workspace level by default, but this was corrected in the actual implementation
      which properly handles both org-level (workspaceId = NULL) and workspace-level
      vocabulary items.
    locations:
      - file: .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md
        line: 538
        text: "workspaceId,            // WORKSPACE level by default"
        note: "Example shows only workspace-level storage"
      - file: packages/api/src/modules/knosia/vocabulary/resolution.ts
        line: 168-186
        text: "First pass: org-level items (workspaceId === null)"
        note: "Correctly handles org-level items"
    recommendation: "Update glue blueprint to show both org and workspace level storage"
    impact: "Documentation accuracy, implementation is already correct"

  - id: INC-004
    severity: informational
    category: scope_terminology
    title: "Scope badge descriptions vary between UX and architecture docs"
    description: |
      UX journey document uses emoji badges for scopes:
      - 🏢 Organization
      - 📁 Workspace
      - 👤 Private

      While architecture documents use plain text:
      - "org" (or "Organization")
      - "workspace" (or "Workspace")
      - "private" (or "User")

      Implementation uses lowercase strings: "org", "workspace", "private"
    locations:
      - file: .artifacts/2026-01-02-1535-knosia-ux-journeys.md
        line: 1318-1321
        text: "🏢 Organization, 📁 Workspace, 👤 Private"
      - file: packages/api/src/modules/knosia/vocabulary/resolution.ts
        line: 31
        text: "scope: 'org' | 'workspace' | 'private'"
    recommendation: "Accept as intentional - UX uses visual badges, code uses enum strings"
    impact: "None, this is appropriate separation of concerns"

consistency_verified:
  - aspect: 3-level_hierarchy
    status: CONSISTENT
    description: |
      All documents consistently describe the 3-level hierarchy:
      - Organization level (workspaceId = NULL)
      - Workspace level (specific workspaceId)
      - User level (in knosia_user_vocabulary_prefs)
    verified_in:
      - .artifacts/2026-01-02-1500-knosia-platform-architecture.md (lines 165-218)
      - .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md (lines 219-257)
      - .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md (lines 177-217)
      - packages/api/src/modules/knosia/vocabulary/resolution.ts (lines 66-238)

  - aspect: resolution_priority
    status: CONSISTENT
    description: |
      All sources agree on resolution priority: PRIVATE > WORKSPACE > ORG
      Implementation correctly implements this as three sequential passes with
      Map.set() overwriting earlier entries.
    verified_in:
      - .artifacts/2026-01-02-1500-knosia-platform-architecture.md (line 179)
      - .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md (line 242)
      - .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md (line 192)
      - packages/api/src/modules/knosia/vocabulary/resolution.ts (lines 168-229)

  - aspect: storage_structure
    status: CONSISTENT
    description: |
      Two-table storage model consistently documented:
      - knosia_vocabulary_item: Org + workspace level items
      - knosia_user_vocabulary_prefs: User preferences + private vocabulary
      Implementation matches exactly.
    verified_in:
      - .artifacts/2026-01-02-1500-knosia-platform-architecture.md (lines 184-218)
      - .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md (lines 219-257)
      - .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md (lines 99-151)
      - packages/db/src/schema/knosia.ts (lines ~377-432, ~480-508)
      - packages/api/src/modules/knosia/vocabulary/resolution.ts (lines 73-238)

  - aspect: resolved_vocabulary_interface
    status: CONSISTENT
    description: |
      ResolvedVocabulary and ResolvedVocabularyItem interfaces match exactly
      between glue blueprint and actual implementation.
    verified_in:
      - .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md (lines 220-255)
      - packages/api/src/modules/knosia/vocabulary/resolution.ts (lines 24-50)

  - aspect: vocabulary_types
    status: CONSISTENT
    description: |
      All documents agree on vocabulary types: metric, dimension, entity, event
    verified_in:
      - .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md (line 234)
      - packages/api/src/modules/knosia/vocabulary/resolution.ts (line 29)
      - packages/db/src/schema/knosia.ts (line ~387 enum definition)

  - aspect: special_workspace_default
    status: CONSISTENT
    description: |
      Implementation correctly handles "default" workspaceId as documented
      (returns all org-level vocabulary items only).
    verified_in:
      - packages/api/src/modules/knosia/vocabulary/resolution.ts (lines 71-103)
    note: "Not explicitly documented in architecture files, but implementation is correct"

cross_reference_matrix:
  hierarchy:
    platform_architecture: "✅ Documented (lines 165-218)"
    consolidated_implementation: "✅ Documented (lines 219-257)"
    glue_blueprint: "✅ Documented (lines 177-217)"
    ux_journeys: "✅ Shown in UI (badges at lines 818, 821, etc.)"
    actual_implementation: "✅ Implemented (resolution.ts lines 168-229)"

  resolution_algorithm:
    platform_architecture: "✅ Documented (line 222-246, shows merge priority)"
    consolidated_implementation: "✅ Documented (lines 237-257)"
    glue_blueprint: "✅ Documented (lines 183-217)"
    ux_journeys: "⚪ Not detailed (user-facing doc)"
    actual_implementation: "✅ Implemented (resolution.ts lines 168-229)"

  storage_tables:
    platform_architecture: "✅ Documented (lines 184-218)"
    consolidated_implementation: "✅ Documented (lines 219-257)"
    glue_blueprint: "✅ Documented (lines 99-151 for schema, 177-217 for usage)"
    ux_journeys: "⚪ Not detailed (user-facing doc)"
    actual_implementation: "✅ Implemented (schema/knosia.ts, resolution.ts)"

recommendations:
  high_priority: []

  medium_priority:
    - title: "Update glue blueprint with corrected org/workspace storage example"
      description: |
        File: .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md
        Update GLUE 1 example (around line 526-561) to show that DetectedVocabulary
        items should default to org-level (workspaceId = NULL) unless explicitly
        workspace-specific. Current example shows "WORKSPACE level by default"
        which is misleading.

    - title: "Standardize 'private vocabulary' terminology"
      description: |
        Consistently use "private vocabulary" across all docs instead of mixing
        "private", "personal", and "user private".

  low_priority:
    - title: "Document aggregationConfidence field in architecture docs"
      description: |
        Add aggregationConfidence to the vocabulary item examples in platform
        architecture and consolidated implementation docs.

conclusion: |
  The vocabulary system is remarkably well-documented and consistently implemented.
  The 3-level hierarchy (Org → Workspace → User), resolution priority
  (Private > Workspace > Org), and two-table storage structure are uniformly
  described across all artifacts and correctly implemented in code.

  The minor inconsistencies found are:
  1. Cosmetic terminology variations (no functional impact)
  2. Documentation completeness (missing aggregationConfidence field mention)
  3. One glue code example that was corrected in actual implementation

  No changes to code are needed. Documentation updates are optional and low priority.

verification_methodology: |
  1. Read all 5 artifact files completely
  2. Read actual implementation (resolution.ts, knosia.ts schema)
  3. Extract all mentions of:
     - 3-level hierarchy (org/workspace/user)
     - Resolution algorithm and priority
     - Storage structure (tables and fields)
     - ResolvedVocabulary interface
  4. Cross-reference each concept across all documents
  5. Compare documented behavior with actual implementation
  6. Document any discrepancies found

files_analyzed:
  artifacts:
    - .artifacts/2026-01-02-1500-knosia-platform-architecture.md
    - .artifacts/2026-01-02-1535-knosia-ux-journeys.md
    - .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md
    - .artifacts/2026-01-02-1700-knosia-project-structure.md
    - .artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md

  implementation:
    - packages/api/src/modules/knosia/vocabulary/resolution.ts
    - packages/db/src/schema/knosia.ts (knosia_vocabulary_item table)

analysis_date: 2026-01-02
status: COMPLETE
```
