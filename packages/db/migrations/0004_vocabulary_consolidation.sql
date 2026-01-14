-- Vocabulary Schema Consolidation Migration
-- Adds "measure" and "kpi" types to vocabulary, adds KPI-specific fields
-- Part of: Consolidate knosiaCalculatedMetric into knosiaVocabularyItem

-- ============================================================================
-- Step 1: Add new enum values to knosia_vocabulary_type
-- ============================================================================

-- Add "measure" value (replacement for "metric")
ALTER TYPE "knosia_vocabulary_type" ADD VALUE IF NOT EXISTS 'measure';

-- Add "kpi" value (for calculated formulas)
ALTER TYPE "knosia_vocabulary_type" ADD VALUE IF NOT EXISTS 'kpi';

-- ============================================================================
-- Step 2: Add KPI-specific columns to knosia_vocabulary_item
-- ============================================================================

-- Formula fields
ALTER TABLE "knosia_vocabulary_item"
  ADD COLUMN IF NOT EXISTS "formula_sql" TEXT,
  ADD COLUMN IF NOT EXISTS "formula_human" TEXT;

-- KPI metadata
ALTER TABLE "knosia_vocabulary_item"
  ADD COLUMN IF NOT EXISTS "confidence" DECIMAL(3, 2),
  ADD COLUMN IF NOT EXISTS "feasible" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "source" TEXT;

-- Lineage - which vocabulary items this KPI is built from
ALTER TABLE "knosia_vocabulary_item"
  ADD COLUMN IF NOT EXISTS "source_vocabulary_ids" JSONB;

-- Execution tracking (for KPI caching)
ALTER TABLE "knosia_vocabulary_item"
  ADD COLUMN IF NOT EXISTS "execution_count" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_executed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "last_execution_result" JSONB;

-- ============================================================================
-- Step 3: Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN "knosia_vocabulary_item"."formula_sql" IS 'SQL expression for KPI calculation, e.g., SUM(unit_price * quantity)';
COMMENT ON COLUMN "knosia_vocabulary_item"."formula_human" IS 'Human-readable description of the formula';
COMMENT ON COLUMN "knosia_vocabulary_item"."confidence" IS 'AI confidence score for generated KPIs (0.00-1.00)';
COMMENT ON COLUMN "knosia_vocabulary_item"."source" IS 'Origin of vocabulary item: ai_generated, user_created, detected';
COMMENT ON COLUMN "knosia_vocabulary_item"."source_vocabulary_ids" IS 'IDs of vocabulary items this KPI formula depends on (lineage)';
