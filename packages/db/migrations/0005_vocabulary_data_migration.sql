-- Vocabulary Data Migration
-- Renames "metric" → "measure" and migrates calculated metrics to vocabulary
-- Part of: Consolidate knosiaCalculatedMetric into knosiaVocabularyItem

-- ============================================================================
-- Step 1: Update type 'metric' -> 'measure' for raw columns
-- This keeps backward compatibility while adopting new terminology
-- ============================================================================

UPDATE "knosia_vocabulary_item"
SET "type" = 'measure'
WHERE "type" = 'metric';

-- ============================================================================
-- Step 2: Migrate calculated metrics to vocabulary items as KPIs
-- Note: This preserves IDs to maintain any existing references
-- ============================================================================

INSERT INTO "knosia_vocabulary_item" (
  "id",
  "org_id",
  "workspace_id",
  "canonical_name",
  "slug",
  "type",
  "category",
  "status",
  "definition",
  "formula_sql",
  "formula_human",
  "confidence",
  "feasible",
  "source",
  "source_vocabulary_ids",
  "execution_count",
  "last_executed_at",
  "last_execution_result",
  "created_at",
  "updated_at"
)
SELECT
  cm."id",
  (SELECT w."org_id" FROM "knosia_workspace" w WHERE w."id" = cm."workspace_id"),
  cm."workspace_id",
  cm."name",
  LOWER(REGEXP_REPLACE(cm."name", '[^a-zA-Z0-9]+', '_', 'g')),
  'kpi',
  cm."category",
  'approved'::knosia_vocabulary_status,
  jsonb_build_object(
    'descriptionHuman', cm."description",
    'formulaHuman', cm."description",
    'formulaSql', cm."semantic_definition"->>'expression',
    'sourceTables', COALESCE(cm."semantic_definition"->'dependencies', '[]'::jsonb)
  ),
  cm."semantic_definition"->>'expression',
  cm."description",
  cm."confidence"::DECIMAL(3,2),
  cm."feasible",
  cm."source",
  to_jsonb(cm."vocabulary_item_ids"),
  cm."execution_count",
  cm."last_executed_at",
  cm."last_execution_result",
  cm."created_at",
  cm."updated_at"
FROM "knosia_calculated_metric" cm
WHERE NOT EXISTS (
  -- Skip if already migrated (same ID exists in vocabulary)
  SELECT 1 FROM "knosia_vocabulary_item" vi WHERE vi."id" = cm."id"
);

-- ============================================================================
-- Step 3: Log migration stats (for verification)
-- ============================================================================

-- Note: Run these queries manually to verify migration:
-- SELECT COUNT(*) as measure_count FROM knosia_vocabulary_item WHERE type = 'measure';
-- SELECT COUNT(*) as kpi_count FROM knosia_vocabulary_item WHERE type = 'kpi';
-- SELECT COUNT(*) as old_metric_count FROM knosia_vocabulary_item WHERE type = 'metric';
-- SELECT COUNT(*) as calculated_metric_count FROM knosia_calculated_metric;
