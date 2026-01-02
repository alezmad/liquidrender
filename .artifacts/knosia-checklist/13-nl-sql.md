# NL → SQL Translation

**Section:** 13 of 32
**Items:** ~20
**Status:** [~] Partially verified

---

## Query Resolution

- [x] Natural language parsed correctly <!-- KNOSIA:DONE - packages/liquid-connect/src/query/normalizer.ts implements normalization -->
- [x] Intent detection (question type) <!-- KNOSIA:DONE - packages/liquid-connect/src/query/types.ts has QueryContext with RoleContext -->
- [x] Entity extraction (metrics, dimensions, filters) <!-- KNOSIA:DONE - packages/liquid-connect/src/query/matcher.ts extracts slots -->
- [x] Vocabulary lookup <!-- KNOSIA:DONE - packages/liquid-connect/src/query/engine.ts uses CompiledVocabulary -->
- [ ] SQL generation <!-- KNOSIA:TODO priority=high category=query - Query engine produces LC DSL, but no final SQL generation from NL yet -->

## SQL Emitters

- [x] DuckDB SQL emitter works <!-- KNOSIA:DONE - packages/liquid-connect/src/emitters/duckdb/index.ts -->
- [x] PostgreSQL dialect emitter works <!-- KNOSIA:DONE - packages/liquid-connect/src/emitters/postgres/index.ts -->
- [x] Handles aggregations (SUM, AVG, COUNT, etc.) <!-- KNOSIA:DONE - packages/liquid-connect/src/emitters/base.ts buildAggregation() -->
- [x] Handles grouping (GROUP BY) <!-- KNOSIA:DONE - packages/liquid-connect/src/emitters/base.ts buildGroupBy() -->
- [x] Handles filtering (WHERE) <!-- KNOSIA:DONE - packages/liquid-connect/src/emitters/base.ts buildWhere() -->
- [x] Handles time ranges <!-- KNOSIA:DONE - packages/liquid-connect/src/emitters/base.ts buildTimeCondition() -->
- [x] Handles comparisons (vs previous period) <!-- KNOSIA:DONE - packages/liquid-connect/src/emitters/base.ts buildComparisonSelect() (v7) -->

## Query Validation

- [ ] Generated SQL is valid <!-- KNOSIA:TODO priority=medium category=validation - No explicit SQL validation step -->
- [x] Prevents SQL injection <!-- KNOSIA:DONE - packages/liquid-connect/src/emitters/base.ts uses parameterized queries -->
- [x] Respects row limits <!-- KNOSIA:DONE - packages/liquid-connect/src/executor/index.ts enforces maxRows (default 10000) -->
- [x] Respects timeout <!-- KNOSIA:DONE - packages/liquid-connect/src/executor/index.ts uses withTimeout() (default 30s) -->

---

**Verified by:** Claude (Batch F verification)
**Date:** 2026-01-01
**Notes:**
- Query engine converts NL to LC DSL (not directly to SQL)
- LC DSL then goes through compiler/resolver to LiquidFlow, then emitter produces SQL
- DuckDB and PostgreSQL emitters are complete with full aggregation/time support
- v7 comparison mode (period-over-period) is implemented
- Row limits and timeouts are enforced in QueryExecutor

**Summary:** 13/17 items complete (76%)
- DONE: 13
- TODO: 2
- PARTIAL: 0
