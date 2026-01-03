# Onboarding Data Profiling UI Enhancement

**Date:** 2026-01-02
**Task:** Update onboarding analysis step to show data profiling progress and summary

---

## Changes Made

### 1. Updated Type Definitions

**File:** `/apps/web/src/modules/onboarding/types.ts`

#### StepEvent Interface
- Extended `step` type from `1 | 2 | 3 | 4 | 5` to include steps 6, 7, and 8
- Now supports: `1 | 2 | 3 | 4 | 5 | 6 | 7 | 8`
- These map to the profiling steps:
  - Step 6: "Profiling data quality"
  - Step 7: "Assessing freshness"
  - Step 8: "Finalizing insights"

#### CompleteEvent Interface
- Added optional `profiling` property with structure:
  ```typescript
  profiling?: {
    tablesProfiled: number;
    tablesSkipped: number;
    duration: number;
    tier1Duration: number;
    tier2Duration: number;
  };
  ```

#### AnalysisResult Interface
- Added same optional `profiling` property to match CompleteEvent
- Ensures profiling data flows through to the final result

---

### 2. Updated useAnalysis Hook

**File:** `/apps/web/src/modules/onboarding/hooks/use-analysis.ts`

#### Initial Steps Array
- Expanded from 5 steps to 8 steps
- Added profiling steps with labels:
  ```typescript
  { id: 6, label: "Profiling data quality", status: "pending" },
  { id: 7, label: "Assessing freshness", status: "pending" },
  { id: 8, label: "Finalizing insights", status: "pending" },
  ```

#### handleCompleteEvent Function
- Updated to include `profiling: event.profiling` in AnalysisResult
- Ensures profiling data from SSE complete event is preserved in state

---

### 3. Enhanced Analysis Progress Component

**File:** `/apps/web/src/modules/onboarding/components/review/analysis-progress.tsx`

#### Props Interface
- Added optional `result` prop: `result?: AnalysisResult | null`
- Allows component to display profiling summary when analysis completes

#### Component Signature
- Updated to accept and use the result prop

#### Profiling Summary Display
- Added new conditional section that renders when `progress.isComplete && result?.profiling`
- Shows:
  - Checkmark icon indicating completion
  - Title: "Data Profiling Complete"
  - Tables profiled count
  - Total duration in milliseconds
  - Tier breakdown: "Tier 1 (Xms), Tier 2 (Xms)"
- Styled with:
  - Muted background with border
  - Green success icon
  - Grid layout for metrics
  - Consistent with existing step styling

---

### 4. Updated Review Page

**File:** `/apps/web/src/app/[locale]/onboarding/review/page.tsx`

#### AnalysisProgress Component Usage
- Updated both instances to pass `result` prop
- Before: `<AnalysisProgress progress={analysisProgress} />`
- After: `<AnalysisProgress progress={analysisProgress} result={result} />`

---

## UI/UX Flow

### Step Progression
1. Steps 1-5 execute as before (connect, scan, detect, extract, build)
2. **NEW:** Steps 6-8 show profiling progress:
   - Step 6: "Profiling data quality" with detail "Analyzing data completeness and patterns..."
   - Step 7: "Assessing freshness" with detail "Checking recency and update patterns..."
   - Step 8: "Finalizing insights" with detail "Compiling data health summary..."
3. Each step shows animated spinner when active, checkmark when complete

### Profiling Summary Display
- Appears below step list after analysis completes
- Only shows if `includeDataProfiling` was enabled in backend
- Displays:
  - Success icon (green checkmark)
  - Tables profiled count
  - Total duration
  - Tier-by-tier breakdown (Tier 1 and Tier 2 durations)

---

## Backend Integration

### SSE Events Handled

The frontend now properly handles all 8 SSE step events:
- Events 1-5: Existing schema analysis
- Events 6-8: **NEW** data profiling steps

### Complete Event Structure

Expected from backend:
```typescript
{
  event: "complete",
  data: {
    analysisId: string,
    summary: { tables, metrics, dimensions, entities },
    businessType: { detected, confidence, reasoning, alternatives },
    confirmations: [...],
    profiling: {  // Optional - only if includeDataProfiling=true
      tablesProfiled: number,
      tablesSkipped: number,
      duration: number,
      tier1Duration: number,
      tier2Duration: number
    }
  }
}
```

---

## Files Modified

1. `/apps/web/src/modules/onboarding/types.ts`
   - Extended StepEvent step type
   - Added profiling to CompleteEvent
   - Added profiling to AnalysisResult

2. `/apps/web/src/modules/onboarding/hooks/use-analysis.ts`
   - Added steps 6-8 to INITIAL_STEPS
   - Updated handleCompleteEvent to preserve profiling data

3. `/apps/web/src/modules/onboarding/components/review/analysis-progress.tsx`
   - Added result prop
   - Added profiling summary display section

4. `/apps/web/src/app/[locale]/onboarding/review/page.tsx`
   - Passed result prop to AnalysisProgress component

---

## Testing Notes

### Manual Testing Checklist
- [ ] Start onboarding flow with new connection
- [ ] Verify steps 1-5 show and complete as before
- [ ] Verify steps 6-8 appear and show profiling labels
- [ ] Complete analysis and verify profiling summary appears
- [ ] Check profiling summary shows correct numbers
- [ ] Test with connection where profiling is disabled (summary should not show)
- [ ] Verify error handling still works correctly

### Edge Cases
- **No profiling data:** Summary section doesn't render (graceful degradation)
- **Partial profiling:** Summary renders with whatever data is available
- **Error during profiling:** Steps show error state, profiling summary not shown

---

## Follow-up Work

### Optional Enhancements
1. Add click-to-expand for detailed profiling metrics per table
2. Show tier-specific insights (e.g., "5 tables fully profiled, 3 sampled")
3. Add visual indicators for profiling quality (e.g., completeness percentage)
4. Link to full data health dashboard from summary

### Dependencies
- Backend must emit steps 6-8 events when `includeDataProfiling=true`
- Backend must include profiling object in complete event
- Backend implementation tracked in: `.artifacts/2026-01-02-LAUNCH-data-profiling-implementation.md`

---

## Constraints Met

✅ Reused existing step UI components (StepItem, StepIcon)
✅ Only shows profiling steps if includeDataProfiling enabled
✅ Followed TurboStarter patterns (TypeScript, hooks, components)
✅ No new npm packages required
✅ Consistent with existing analysis-progress styling
