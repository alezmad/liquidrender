```yaml
category: database_schema
inconsistencies:
  - id: 1
    type: table_count_mismatch
    documents:
      - "2026-01-02-1500-knosia-platform-architecture.md"
      - "2026-01-02-1600-knosia-consolidated-implementation.md"
      - "2026-01-02-1700-knosia-project-structure.md"
    description: |
      Documents claim "15 tables (V1 foundation)" but actual schema has 26 tables in knosia.ts.
      - Architecture doc (line 75): "15 tables in `knosia.ts`"
      - Consolidated doc (line 131): "Full V1 schema" with "8 more tables" implying 15 total
      - Project structure (lines 389-414): Shows "15 existing tables" with 3 new tables proposed
    actual_code: |
      packages/db/src/schema/knosia.ts contains 26 tables:
      1. knosiaOrganization
      2. knosiaWorkspace
      3. knosiaWorkspaceConnection
      4. knosiaConnection
      5. knosiaConnectionHealth
      6. knosiaConnectionSchema
      7. knosiaVocabularyItem
      8. knosiaVocabularyVersion
      9. knosiaRoleTemplate
      10. knosiaWorkspaceMembership
      11. knosiaUserPreference
      12. knosiaUserVocabularyPrefs
      13. knosiaAnalysis
      14. knosiaThread
      15. knosiaThreadMessage
      16. knosiaMismatchReport
      17. knosiaThreadSnapshot
      18. knosiaCanvas
      19. knosiaCanvasBlock
      20. knosiaCanvasAlert
      21. knosiaComment
      22. knosiaActivity
      23. knosiaNotification
      24. knosiaDigest
      25. knosiaAiInsight
    correction_needed: |
      Update all documents to reflect "26 tables (V1 complete)" instead of "15 tables".
      The additional 11 tables beyond the originally planned 15 are:
      - knosiaUserVocabularyPrefs (added for vocabulary preferences)
      - knosiaThreadSnapshot (Thread extension)
      - knosiaCanvas, knosiaCanvasBlock, knosiaCanvasAlert (Canvas feature)
      - knosiaComment, knosiaActivity (Collaboration)
      - knosiaNotification, knosiaDigest, knosiaAiInsight (Notification system)

  - id: 2
    type: new_tables_incorrectly_marked
    documents:
      - "2026-01-02-1700-knosia-project-structure.md"
    description: |
      Document proposes 3 "new tables" that don't actually exist and aren't needed:
      - knosia_dashboard (line 407)
      - knosia_dashboard_kpi (line 408)
      - knosia_semantic_layer (line 409)
    actual_code: |
      These tables do NOT exist in packages/db/src/schema/knosia.ts.
      The actual schema uses:
      - knosiaCanvas + knosiaCanvasBlock for dashboard functionality
      - Workspace compiledVocabulary JSONB field for cached semantic layer
    correction_needed: |
      Remove knosia_dashboard, knosia_dashboard_kpi, and knosia_semantic_layer
      from the "new tables" section. These are architectural decisions that were
      already superseded by:
      1. Canvas system (tables already exist)
      2. Workspace-level semantic layer caching (already implemented as JSONB field)

  - id: 3
    type: missing_table_in_documentation
    documents:
      - "2026-01-02-1500-knosia-platform-architecture.md"
      - "2026-01-02-1600-knosia-consolidated-implementation.md"
    description: |
      Documents don't mention knosiaUserVocabularyPrefs table which exists in schema.
      This is a critical table for the 3-level vocabulary hierarchy (Org > Workspace > User).
    actual_code: |
      knosiaUserVocabularyPrefs table exists at lines 569-610 in knosia.ts with fields:
      - favorites: jsonb<string[]>
      - synonyms: jsonb<Record<string, string>>
      - recentlyUsed: jsonb<{slug, lastUsedAt, useCount}[]>
      - dismissedSuggestions: jsonb<string[]>
      - privateVocabulary: jsonb<[...]>
    correction_needed: |
      Add knosiaUserVocabularyPrefs to all table listings and architecture diagrams.
      Update vocabulary resolution descriptions to reference this table explicitly
      as the source for USER-level preferences in the 3-level hierarchy.

  - id: 4
    type: field_name_inconsistency
    documents:
      - "2026-01-02-1700-knosia-project-structure.md"
    description: |
      Project structure doc references adding "business_type" and "mapping_coverage"
      fields to knosiaAnalysis table (line 401), but uses different naming convention.
    actual_code: |
      knosiaAnalysis table (lines 619-658) has:
      - businessType: jsonb<{detected, confidence, reasoning, alternatives}>
      Already exists as nested JSONB, not a simple text field.
      No "mapping_coverage" field exists.
    correction_needed: |
      Remove the suggestion to add "business_type" field (already exists as businessType JSONB).
      If "mapping_coverage" is needed, specify:
      1. What it should contain (number? percentage? JSONB object?)
      2. How it differs from businessType.confidence
      3. Where in the glue code it gets populated

  - id: 5
    type: table_name_change_not_reflected
    documents:
      - "2026-01-02-1535-knosia-ux-journeys.md"
    description: |
      UX document uses old naming "Conversations" but schema renamed to "Threads".
    actual_code: |
      Schema uses knosiaThread and knosiaThreadMessage (lines 664-733).
      Comments in schema confirm: "Threads - Chat sessions (renamed from Conversations)"
    correction_needed: |
      Global find/replace in all documents:
      - "Conversation" → "Thread"
      - "knosiaConversation" → "knosiaThread"
      - "knosiaConversationMessage" → "knosiaThreadMessage"
      Update UX Journeys section 6 title from "Threads (Conversations)" to just "Threads".

  - id: 6
    type: missing_canvas_tables_in_architecture
    documents:
      - "2026-01-02-1500-knosia-platform-architecture.md"
      - "2026-01-02-1600-knosia-consolidated-implementation.md"
    description: |
      Architecture documents don't list Canvas tables (knosiaCanvas, knosiaCanvasBlock,
      knosiaCanvasAlert) in their table inventories, yet these are core to V1.
    actual_code: |
      Canvas tables exist in schema (lines 794-903):
      - knosiaCanvas: Main canvas entity
      - knosiaCanvasBlock: Individual blocks (KPI, charts, etc.)
      - knosiaCanvasAlert: Threshold-based notifications
    correction_needed: |
      Add Canvas tables to all architecture diagrams and table listings under
      "V1 Complete" or "Dashboard Layer" section. These are not optional future
      features—they're implemented and part of current schema.

  - id: 7
    type: collaboration_tables_missing_from_docs
    documents:
      - "2026-01-02-1500-knosia-platform-architecture.md"
      - "2026-01-02-1600-knosia-consolidated-implementation.md"
    description: |
      Documents don't mention Collaboration tables (knosiaComment, knosiaActivity)
      which exist in schema and support multi-user workflows.
    actual_code: |
      Collaboration tables exist (lines 912-950):
      - knosiaComment: Annotations on messages/blocks/threads
      - knosiaActivity: Team activity feed
    correction_needed: |
      Add Collaboration section to architecture docs listing these tables.
      Update "What's Already Built" sections to include collaboration features
      as part of V1 foundation.

  - id: 8
    type: notification_system_missing_from_docs
    documents:
      - "2026-01-02-1500-knosia-platform-architecture.md"
      - "2026-01-02-1600-knosia-consolidated-implementation.md"
    description: |
      Documents don't mention Notification system tables (knosiaNotification,
      knosiaDigest, knosiaAiInsight) which are implemented in schema.
    actual_code: |
      Notification tables exist (lines 959-1039):
      - knosiaNotification: User notifications with read/dismissed state
      - knosiaDigest: Scheduled notification bundles
      - knosiaAiInsight: Proactive AI-generated observations
    correction_needed: |
      Add Notification System section to architecture. These tables support
      features described in UX Journeys (alerts, briefings, AI insights) but
      are missing from implementation status tables.

  - id: 9
    type: schema_field_structure_mismatch
    documents:
      - "2026-01-02-1800-knosia-glue-implementation-blueprint.md"
    description: |
      Glue blueprint describes knosiaVocabularyItem fields (lines 100-151) with
      slightly different structure than actual schema.
    actual_code: |
      Blueprint shows definition.sourceColumn as optional field, which matches schema.
      Blueprint shows semantics with direction/format/grain/sensitivity, which matches.
      Blueprint shows suggestedForRoles as string[], which matches.
      Actually, this is CORRECT—no inconsistency after closer inspection.
    correction_needed: |
      No correction needed. Blueprint accurately reflects schema structure.

summary:
  total_inconsistencies: 8
  critical_issues: 3  # Table count mismatch, missing tables in docs, new tables incorrectly proposed
  naming_issues: 1    # Conversation → Thread rename not reflected
  documentation_gaps: 4  # Missing Canvas, Collaboration, Notification, UserVocabularyPrefs

recommendations:
  - action: update_table_counts
    priority: high
    description: |
      Change all references from "15 tables" to "26 tables" across all documents.
      Update architecture diagrams to show complete V1 schema.

  - action: remove_proposed_tables
    priority: high
    description: |
      Remove knosia_dashboard, knosia_dashboard_kpi, knosia_semantic_layer from
      "new tables" section in project-structure.md. These are not needed.

  - action: add_missing_table_sections
    priority: medium
    description: |
      Add sections for Canvas, Collaboration, Notifications, and UserVocabularyPrefs
      to all architecture documents.

  - action: global_rename
    priority: medium
    description: |
      Find/replace "Conversation" → "Thread" across all .artifacts/ documentation
      to match actual schema naming.

  - action: verify_analysis_fields
    priority: low
    description: |
      Clarify whether mapping_coverage field is needed in knosiaAnalysis.
      If not, remove from project-structure.md proposals.
```
