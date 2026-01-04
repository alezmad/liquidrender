# Toast Notification Bug - Root Cause Analysis

## Issue Found During Testing

**Problem:** The background enrichment toast notification never appeared during Playwriter testing.

## Root Cause

The `useAnalysis` hook closes the EventSource connection when the component unmounts:

```typescript
// In use-analysis.ts
useEffect(() => {
  return () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close(); // ❌ Closes EventSource on unmount
    }
  };
}, []);
```

**What happens:**

1. User starts analysis → `<AnalysisProgress>` component mounts
2. Analysis SSE stream starts → `eventSourceRef.current = new EventSource(...)`
3. Analysis completes in 5-8 seconds → `complete` event received
4. Page switches from `<AnalysisProgress>` to `<DetectionReview>` component
5. `<AnalysisProgress>` unmounts → **EventSource closes** 🔴
6. Background enrichment completes 30s later → **EventSource is already closed, no toast!** 💥

## Evidence from Code

### packages/app/src/app/[locale]/onboarding/review/page.tsx

```typescript
// Show progress while analyzing
if (!analysisProgress.isComplete || !result) {
  return <AnalysisProgress progress={analysisProgress} result={result} />;
}

// Show detection review when complete
return (
  <DetectionReview  // ← Component switches here, unmounting AnalysisProgress
    result={result}
    onContinue={handleContinue}
    onChangeType={handleChangeType}
    onReviewMatch={handleReviewMatch}
  />
);
```

## Why the Blue Box Didn't Appear

The "Quick Analysis Complete" blue box is rendered in `<AnalysisProgress>`:

```typescript
{progress.isComplete && result?.quickPreviewComplete && (
  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
    <p className="font-medium">Quick Analysis Complete!</p>
    ...
  </div>
)}
```

But the component switches to `<DetectionReview>` **immediately** after `isComplete` becomes true, so the blue box never renders.

## Solution Options

### Option 1: Keep EventSource Alive (Recommended ✅)

Don't close EventSource on unmount - only close when explicitly stopped:

```typescript
// In use-analysis.ts
useEffect(() => {
  return () => {
    // DON'T close EventSource automatically
    // It should stay alive for background enrichment
    // Only close via explicit stopAnalysis() call
  };
}, []);
```

**Pros:**
- Simple fix
- Toast works as intended
- Background enrichment continues server-side

**Cons:**
- Need to ensure cleanup happens somewhere (maybe on navigation away from onboarding?)

### Option 2: Move SSE to Parent Component

Move the `useAnalysis` hook to the parent page component so it doesn't unmount:

```typescript
// In review/page.tsx
const { startAnalysis, progress, result, isRunning } = useAnalysis();

return (
  <>
    {!analysisProgress.isComplete || !result ? (
      <AnalysisProgress progress={analysisProgress} result={result} />
    ) : (
      <DetectionReview ... />
    )}
  </>
);
```

**Pros:**
- Cleaner separation of concerns
- SSE connection survives component switch

**Cons:**
- Requires refactoring the page component
- Need to pass analysis state to both AnalysisProgress and DetectionReview

### Option 3: Show Blue Box in DetectionReview

Move the "Quick Analysis Complete" message to the `<DetectionReview>` component:

```typescript
// In detection-review.tsx
{result?.quickPreviewComplete && result?.backgroundEnrichmentPending > 0 && (
  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 mb-4">
    <p className="font-medium">Quick Analysis Complete!</p>
    <p className="mt-1 text-sm text-muted-foreground">
      We've analyzed your key fields and will continue enriching vocabulary
      in the background to improve accuracy.
    </p>
    <p className="mt-2 text-xs text-blue-600">
      {result.backgroundEnrichmentPending} more fields being enriched...
    </p>
  </div>
)}
```

**Pros:**
- Blue box actually visible to user
- Works with current architecture

**Cons:**
- Doesn't fix the EventSource closing issue
- Still need Option 1 or 2 for toast to work

## Recommended Fix: Combination of Option 1 + Option 3

1. **Fix EventSource cleanup** - Don't close on unmount, only on explicit stop
2. **Show blue box in DetectionReview** - So user actually sees it
3. **Add cleanup on route change** - Close EventSource when leaving onboarding

```typescript
// 1. Fix use-analysis.ts cleanup
useEffect(() => {
  return () => {
    // Only log, don't close (let background enrichment complete)
    console.log('[useAnalysis] Component unmounting, EventSource still active for background enrichment');
  };
}, []);

// 2. Add explicit cleanup on route navigation
// In onboarding layout or page navigation
useEffect(() => {
  return () => {
    if (router.pathname !== '/onboarding/*') {
      stopAnalysis(); // Close EventSource when leaving onboarding
    }
  };
}, [router.pathname]);

// 3. Move blue box to DetectionReview component
// (see Option 3 above)
```

## Testing Checklist After Fix

- [ ] Start analysis
- [ ] Verify Step 5 completes in 5-8s
- [ ] Verify page switches to DetectionReview
- [ ] **Verify blue box appears in DetectionReview** ✨
- [ ] Wait 30 seconds
- [ ] **Verify toast notification appears** 🎉
- [ ] Check console logs for background enrichment completion
- [ ] Navigate away from onboarding
- [ ] Verify EventSource gets closed on navigation

## Files to Modify

1. `apps/web/src/modules/onboarding/hooks/use-analysis.ts` - Fix EventSource cleanup
2. `apps/web/src/modules/onboarding/components/review/detection-review.tsx` - Add blue box
3. `apps/web/src/app/[locale]/onboarding/review/page.tsx` - Add route change cleanup (optional)

---

**Status:** Bug identified ✅ | Solution designed | Ready for implementation
