# Canvas Creation Investigation - Onboarding Test

**Date:** 2026-01-03 22:30
**Issue:** Canvas not created after completing onboarding via Playwriter test

## Test Flow

✅ **Onboarding Steps Completed:**
1. Connected to Pagila database (localhost:5433)
2. Analysis ran successfully (8 steps completed)
3. Business type detected: E-Commerce (high confidence)
4. Vocabulary detected: 7 metrics, 44 dimensions
5. Role selected: Executive
6. Confirmation questions: Skipped (used defaults)
7. Ready screen: Showed mock briefing data
8. Navigated to Canvas page

❌ **Issue:** Canvas page shows "Select a canvas to view" - empty state

## Database Investigation

### Connections (6 total)
Most recent: `mYlzbf3OZOgFh5FXwdnQWTv2CzSy6NzW` - Pagila database

### Workspace (1 total)
- ID: `c4teGpci88xT3rvWdJ1YIwlwISJy00vC`
- Name: "Main Workspace"
- Slug: "main"

### Canvases (0 total)
❌ **No canvases exist in database**

### Analysis (most recent)
- ID: `9qAgniYUskjK4IghusPe2K3MaEoJ5LAx`
- Status: `completed`
- Connection: northwind database (NOT pagila)
- Result saved: `false` ❌

## LocalStorage State

```json
{
  "connectionId": "taT8aa0xV2SLA9lmv3zvmIZZ7k5PazZT",
  "primaryConnectionId": "taT8aa0xV2SLA9lmv3zvmIZZ7k5PazZT",
  "analysisId": "9qAgniYUskjK4IghusPe2K3MaEoJ5LAx",
  "workspaceId": "c4teGpci88xT3rvWdJ1YIwlwISJy00vC",
  "selectedRole": "executive",
  "completedSteps": ["role", "confirm", "ready"]
}
```

## Canvas Creation Logic Analysis

**Location:** `packages/api/src/modules/knosia/analysis/queries.ts:693-759`

### Required Conditions (PHASE 1.5)
```typescript
if (workspaceId && orgId && businessType.detected) {
  // Canvas creation logic
}
```

**Check:**
- ✅ `workspaceId`: c4teGpci88xT3rvWdJ1YIwlwISJy00vC (exists)
- ❓ `orgId`: Unknown - need to verify
- ❓ `businessType.detected`: Unknown - need to verify

### Canvas Creation Steps
1. Import dependencies (liquid-connect, liquid-render)
2. Detect business type → Convert to template key
3. Map vocabulary to template
4. Check KPI coverage (threshold: 10%)
5. Generate dashboard spec
6. Convert to LiquidSchema
7. Check for existing default canvas
8. Insert canvas into database

### Failure Points
**Possible reasons canvas wasn't created:**

1. **Missing orgId** - Line 694 checks `if (workspaceId && orgId && businessType.detected)`
   - If orgId is null/undefined, entire block is skipped

2. **Business type detection failed** - If `businessType.detected` is empty/null
   - LLM detection failed AND regex fallback failed

3. **Low KPI coverage** - Line 718: `if (mappingResult.coverage >= 10)`
   - If vocabulary mapping resulted in <10% coverage

4. **Exception thrown** - Lines 755-758 catch block
   - Error logged but analysis continues

5. **Template not found** - Line 706: `getTemplate(businessTypeKey)`
   - If business type key doesn't match any template

## Missing: Console Logs

The canvas creation code has extensive logging:
- `[Canvas] Checking canvas creation conditions:`
- `[Canvas] Generating default canvas for workspace:`
- `[Canvas] Vocabulary for mapping:`
- `[Canvas] Mapping result:`
- `[Canvas] Default canvas created successfully`
- `[Canvas] Skipping canvas creation - low KPI coverage:`
- `[Canvas] Failed to create default canvas:`

**Problem:** Cannot verify which logs fired because server logs are not accessible via Playwriter.

## Next Steps

### 1. Check orgId availability
```typescript
// In queries.ts, find where orgId is obtained
const connection = await db.select()...
const orgId = connection.orgId; // Verify this exists
```

### 2. Add debug logging to analysis endpoint
Temporarily add console.log at critical points to track:
- Whether PHASE 1.5 runs
- Values of workspaceId, orgId, businessType.detected
- Template lookup result
- KPI coverage percentage

### 3. Check business type detection
```typescript
// Verify businessType object structure at line 694
console.log("[Canvas] businessType:", JSON.stringify(businessType, null, 2));
```

### 4. Test with explicit values
Run the E2E test (`analysis-canvas-e2e.test.ts`) which:
- ✅ Creates test user, org, connection
- ✅ Runs analysis with known good data
- ✅ Verifies canvas creation
- **Status:** All tests passing ✅

## Hypothesis

**Most Likely Issue:** `orgId` is not being passed or is undefined

**Evidence:**
1. E2E test passes when orgId is explicitly created
2. Real onboarding may not be setting orgId correctly
3. Canvas creation block is skipped if any of the 3 conditions fail

**To Verify:**
Check where orgId comes from in the SSE analysis flow:

```typescript
// Line 241: Get connection
const connection = await db.select()...

// Where is connection.orgId used?
const orgId = connection.orgId; // <-- Check if this exists
```

**Likely Root Cause:**
Connection record might not have `orgId` populated during onboarding, causing the canvas creation block to be skipped entirely.

## Recommended Fix

### Option 1: Ensure orgId exists on connection
Modify connection creation during onboarding to include orgId:
```typescript
await db.insert(knosiaConnection).values({
  ...values,
  orgId: user.currentOrgId, // Add orgId from user
});
```

### Option 2: Get orgId from workspace
```typescript
// In PHASE 1.5, if orgId is not on connection:
if (!orgId && workspaceId) {
  const workspace = await db.select()
    .from(knosiaWorkspace)
    .where(eq(knosiaWorkspace.id, workspaceId))
    .limit(1);
  orgId = workspace[0]?.orgId;
}
```

### Option 3: Add better error logging
```typescript
if (!workspaceId) console.log("[Canvas] Missing workspaceId");
if (!orgId) console.log("[Canvas] Missing orgId");
if (!businessType.detected) console.log("[Canvas] Missing business type");
```

## Testing Plan

1. Add debug logging to identify which condition fails
2. Run onboarding again via Playwriter
3. Check server logs for canvas creation messages
4. Verify orgId is populated on connection
5. Fix the missing data issue
6. Re-run onboarding to confirm canvas creation

---

**Status:** Investigation complete, awaiting server log verification to confirm hypothesis.
