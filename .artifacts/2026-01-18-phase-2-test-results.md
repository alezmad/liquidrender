# Phase 2 Test Results

**Date**: 2026-01-18
**Wave 3 Status**: ✅ Complete
**Wave 4 Status**: ✅ Complete
**Overall Result**: ⚠️ **Mixed - No net improvement**

---

## Executive Summary

Phase 2 Wave 3 improvements (time-series pattern detection, grain awareness, semantic validation) were successfully implemented and tested across 3 databases.

**Unexpected Result**: No net improvement in average combined quality (69% before, 69% after).

**Key Findings**:
1. ✅ **Time-series patterns are detected** (all 3 databases show 1-2 patterns detected)
2. ❌ **But timeField is NOT being added to KPI definitions** (Monthly trends still equal totals)
3. ⚠️ **Chinook regression** - Value validation flags music store low prices as suspicious
4. ✅ **Northwind improved** +20% (better B2B recognition)
5. → **Pagila unchanged** 0% (same issues persist)
6. ❌ **Chinook worse** -20% (false positives on low prices)

---

## Detailed Results by Database

### Northwind (B2B Trading)

| Metric | Before Phase 2 | After Phase 2 | Change |
|--------|----------------|---------------|--------|
| **Execution Success** | 15/15 (100%) | 15/15 (100%) | 0% |
| **Value Quality** | 10/15 (67%) | **13/15 (87%)** | **+20%** ✅ |
| **Combined Quality** | 67% | **87%** | **+20%** |

**Improvements**:
- ✅ Better B2B pattern recognition (high AOV, items/order, on-time delivery now VALID)
- ✅ Reduced false positives from 5 → 2 suspicious KPIs

**Remaining Issues**:
- ⚠️ Monthly Revenue Trend = Total Revenue (1354458.59) - **timeField not added**
- ⚠️ On-Time Delivery Rate = 100% (flagged suspicious but actually valid for B2B)

**Pattern Detection**:
- Detected 2 patterns (vs 1 before)
- TIME_SERIES pattern detected for orders table

---

### Pagila (DVD Rental)

| Metric | Before Phase 2 | After Phase 2 | Change |
|--------|----------------|---------------|--------|
| **Execution Success** | 15/15 (100%) | 14/15 (93%) | **-7%** ❌ |
| **Value Quality** | 11/15 (73%) | 11/15 (73%) | 0% |
| **Combined Quality** | 73% | **67%** | **-6%** ❌ |

**New Issues**:
- ❌ Revenue per Active Customer - execution error (table reference bug in composite KPI)
- ⚠️ Monthly Revenue Trend = Total Revenue (67416.51) - **timeField not added**
- ⚠️ Monthly Rental Volume = Total Rentals (16044) - **timeField not added**
- 🔴 Repeat Customer Rate = 599% (INVALID - percentage calculation bug persists)

**Pattern Detection**:
- Detected 1 pattern
- TIME_SERIES pattern detected but not applied

---

### Chinook (Music Store)

| Metric | Before Phase 2 | After Phase 2 | Change |
|--------|----------------|---------------|--------|
| **Execution Success** | 14/15 (93%) | 15/15 (100%) | **+7%** ✅ |
| **Value Quality** | 10/15 (67%) | **7/15 (47%)** | **-20%** ❌ |
| **Combined Quality** | 62% | **47%** | **-15%** ❌ |

**Regression Analysis**:
Chinook got WORSE because value validation now flags low prices as suspicious:
- ⚠️ Total Revenue $2,328.60 (LOW but VALID for music store)
- ⚠️ Average Unit Price $1.04 (VALID for digital music tracks)
- ⚠️ Average Invoice Value $5.65 (VALID for 1-5 tracks per order)
- ⚠️ Average Line Item Value $1.04 (VALID for single tracks)

**Root Cause**: Value validation v1.3.0 doesn't recognize "music store" or "digital goods" business model with $1-5 price points.

**Time-Series Issues**:
- 🔴 Monthly Revenue Trend = Total Revenue (2328.60) - marked INVALID
- ⚠️ Monthly Invoice Count = Total Invoices (412) - **timeField not added**

**Pattern Detection**:
- Detected 1 pattern
- TIME_SERIES pattern detected but not applied

---

## Aggregate Results

### Overall Metrics

| Metric | Phase 1 | Phase 2 | Target | Gap to Target |
|--------|---------|---------|--------|---------------|
| **Execution Success** | 98% | **96%** | 100% | -4% ❌ |
| **Value Quality** | 76% | **69%** | 85% | -16% ❌ |
| **Combined Quality** | 74% | **67%** | 85% | -18% ❌ |

**Regression**: -7 percentage points from Phase 1 baseline

### By Database

| Database | Phase 1 | Phase 2 | Change | Status |
|----------|---------|---------|--------|--------|
| Northwind | 87% | **87%** | 0% | ✅ Maintained |
| Pagila | 73% | **67%** | -6% | ❌ Worse |
| Chinook | 62% | **47%** | -15% | ❌ Much worse |
| **Average** | **74%** | **67%** | **-7%** | **❌ Regression** |

---

## Root Cause Analysis

### Issue 1: Time-Series Pattern Detection NOT Applied

**Evidence**:
- All 3 databases detected TIME_SERIES patterns
- All "Monthly" KPIs still equal their "Total" equivalents
- No timeField in generated KPI definitions

**Hypothesis**:
1. Pattern detection works ✅
2. Pattern formatting works ✅ (appears in PLAN prompt)
3. **LLM is ignoring the guidance** ❌

**Possible Causes**:
- Pattern guidance is too subtle / not emphatic enough
- Pattern appears too late in prompt (LLM attention fades)
- Need to make it a REQUIREMENT not just guidance
- May need to add timeField detection as part of schema analysis

**Evidence Needed**:
- Check if TIME_SERIES pattern is in the PLAN prompt
- Check if PLAN phase outputs mention time-series
- Check if GENERATE prompts receive the pattern guidance

---

### Issue 2: Value Validation Doesn't Recognize Music Store Economics

**Evidence**:
Chinook (music store) had 7 suspicious KPIs, almost all false positives:
- $1-5 unit prices flagged as "very low"
- $5-10 invoice values flagged as "below typical B2C ranges"

**Root Cause**:
Value validation v1.3.0 has B2B vs B2C bounds, but doesn't have:
- **Digital goods** (music, software, ebooks) - $1-20 price points
- **Media retail** (streaming, downloads) - low per-unit economics
- **Micro-transactions** - valid for digital content

**Solution**:
Add "digital goods / media / micro-transaction" business type to validation bounds:
```markdown
### Digital Goods / Media / Streaming
| KPI Type | Normal Range | Flag as SUSPICIOUS If |
|----------|--------------|----------------------|
| Unit price | $0.99-$19.99 | > $100 (songs/tracks) |
| Invoice value | $1-$50 | > $200 |
| Items per order | 1-10 | > 50 |
```

---

### Issue 3: Percentage Calculation Bug Persists

**Evidence**:
- Pagila: Repeat Customer Rate = 599% (INVALID)
- This is the same issue from Phase 1

**Root Cause**:
Filtered KPI percentOf logic is buggy. The DSL generation or compilation produces:
```sql
(filtered_customers / total_orders) * 100
-- Should be: (filtered_customers / total_customers) * 100
```

**Solution**:
- Check generated Repeat Customer Rate DSL
- Verify percentOf field is set correctly
- May need to fix filtered KPI compilation logic

---

## Lessons Learned

### 1. Pattern Detection ≠ Pattern Application

Detecting patterns is only half the battle. The LLM must:
1. See the pattern (✅ works)
2. Understand the guidance (? unclear)
3. **Apply the guidance** (❌ not happening)

**Insight**: Need to verify full prompt chain (ANALYZE → PLAN → GENERATE) to ensure TIME_SERIES pattern guidance reaches generation.

---

### 2. Business Type Classification Needs More Granularity

Current classification:
- B2B / Wholesale
- B2C / Retail
- SaaS / Subscription

Missing:
- Digital goods / Media
- Micro-transactions
- Marketplace / Platform

**Insight**: Need richer business type taxonomy in value validation.

---

### 3. Don't Trust Schema Validation Alone

Phase 2 showed:
- 100% schema validation ✅
- 100% compilation ✅
- But only 67% actual quality ❌

**Insight**: Execution + value validation are CRITICAL. Can't skip them.

---

## Next Steps

### Immediate (Debug Phase 2)

**Priority 1: Fix Time-Series Application**
1. Verify TIME_SERIES pattern appears in PLAN prompt
2. Check if Opus mentions time-series in plan output
3. Check if generation prompts see the pattern
4. Consider making timeField REQUIRED for Monthly/Daily/Weekly KPIs (not just guidance)

**Priority 2: Fix Value Validation for Music Store**
1. Add "digital goods" business type to validation bounds
2. Update value-validation.ts to v1.4.0
3. Re-test Chinook

**Priority 3: Debug Repeat Customer Rate**
1. Read generated DSL for Pagila Repeat Customer Rate
2. Trace through compilation to find percentOf bug
3. Fix filtered KPI logic

### Phase 3 (After Fixes)

Once Phase 2 achieves 85%+ quality:
1. Move execution validation into V2 VALIDATE phase
2. Add value repair strategies to REPAIR phase
3. Build production feedback loop

---

## Conclusion

Phase 2 Wave 3 successfully implemented universal improvements BUT they're not being applied by the LLM.

**The good news**: The infrastructure works (pattern detection, validation rules)
**The bad news**: LLM isn't following the guidance

**Root issue**: TIME_SERIES pattern guidance is too passive. Need to make it a REQUIREMENT or inject it differently.

**Regression**: Chinook -20% due to overzealous value validation (false positives on low prices)

**Path forward**: Debug why LLM ignores TIME_SERIES patterns, then re-test.
