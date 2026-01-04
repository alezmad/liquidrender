# Onboarding Canvas Creation Fix

**Date:** 2026-01-03
**Issue:** Canvas not created during onboarding completion

## Problem

After completing onboarding, users saw:
1. ❌ Empty canvas page (no dashboard generated)
2. ❌ Mock briefing data (hardcoded preview)

## Root Cause

The onboarding flow used the SSE analysis endpoint (`/api/knosia/analysis/run`) which:
- ✅ Extracted schema via UVB (Universal Vocabulary Builder)
- ✅ Detected vocabulary (metrics, dimensions, entities)
- ✅ Saved vocabulary to database
- ❌ **Did NOT create a default canvas**

The full pipeline (`runKnosiaPipeline`) which creates canvases was only accessible via `/api/knosia/analysis/trigger` - but this endpoint wasn't called during onboarding.

## Solution

### 1. Canvas Creation in SSE Flow

**Modified:** `packages/api/src/modules/knosia/analysis/queries.ts`

Added canvas creation logic after analysis completion (PHASE 1.5):

```typescript
// PHASE 1.5: Create default workspace canvas (non-blocking)
if (workspaceId && orgId) {
  try {
    // Import canvas generation dependencies
    const { detectBusinessType, mapToTemplate, getTemplate } =
      await import("@repo/liquid-connect/business-types");
    const { generateDashboardSpec } =
      await import("@repo/liquid-connect/dashboard");
    const { dashboardSpecToLiquidSchema } =
      await import("@repo/liquid-render/dashboard");

    // Detect business type from vocabulary
    const detection = detectBusinessType(schema);

    if (detection.primary) {
      const template = getTemplate(detection.primary.type);
      const mappingResult = mapToTemplate(detected, template);

      if (mappingResult.coverage >= 30) { // At least 30% KPI coverage
        const dashboardSpec = generateDashboardSpec(mappingResult);
        const liquidSchema = dashboardSpecToLiquidSchema(dashboardSpec);

        // Check if default canvas already exists
        const existingCanvas = await db
          .select()
          .from(knosiaWorkspaceCanvas)
          .where(
            and(
              eq(knosiaWorkspaceCanvas.workspaceId, workspaceId),
              eq(knosiaWorkspaceCanvas.isDefault, true)
            )
          )
          .limit(1);

        if (existingCanvas.length === 0) {
          await db.insert(knosiaWorkspaceCanvas).values({
            id: generateId(),
            workspaceId,
            title: "Main Dashboard",
            schema: liquidSchema,
            scope: "workspace",
            ownerId: userId,
            isDefault: true,
            currentVersion: 1,
            lastEditedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log("[Canvas] Default canvas created successfully");
        }
      }
    }
  } catch (error) {
    console.error("[Canvas] Failed to create default canvas:", error);
    // Don't fail the analysis if canvas creation fails
  }
}
```

### 2. Pass userId to runAnalysis

**Modified:** `packages/api/src/modules/knosia/analysis/router.ts`

```typescript
// Before:
for await (const event of runAnalysis(connectionId, includeDataProfiling)) {

// After:
const user = c.get("user");
for await (const event of runAnalysis(connectionId, user.id, includeDataProfiling)) {
```

Updated `runAnalysis` signature:
```typescript
export async function* runAnalysis(
  connectionId: string,
  userId: string,      // NEW
  includeDataProfiling: boolean = false
)
```

### 3. Fix Workspace Creation

Fixed missing `slug` field when creating workspace:

```typescript
const newWorkspace = await db
  .insert(knosiaWorkspace)
  .values({
    orgId: connection.orgId,
    name: "Main Workspace",
    slug: "main",        // NEW - required field
    visibility: "org_wide",
  })
  .returning()
  .then(rows => rows[0]);
```

## Flow

### Before
```
Onboarding Complete
  ↓
SSE Analysis (/api/knosia/analysis/run)
  ↓
Extract Schema → Detect Vocabulary → Save to DB
  ↓
❌ No Canvas Created
```

### After
```
Onboarding Complete
  ↓
SSE Analysis (/api/knosia/analysis/run)
  ↓
Extract Schema → Detect Vocabulary → Save to DB
  ↓
✅ Generate Dashboard → Create Canvas
  ↓
User sees populated canvas on dashboard
```

## Implementation Details

### Canvas Creation Conditions

1. ✅ WorkspaceId and OrgId available
2. ✅ Business type detected with confidence
3. ✅ KPI coverage ≥ 30% (at least 30% of template KPIs mapped)
4. ✅ No existing default canvas for workspace

### Non-Blocking Design

Canvas creation happens **after** the `complete` SSE event is emitted:
- User sees completion immediately
- Canvas generates in background (typically <1s)
- Background enrichment continues afterward
- Analysis doesn't fail if canvas creation fails

### Error Handling

- Canvas creation errors are logged but don't fail the analysis
- If business type confidence is low → skip canvas creation
- If KPI coverage < 30% → skip canvas creation
- If canvas already exists → skip creation

## Testing

### Manual Test Steps

1. Start fresh onboarding flow
2. Connect to database (e.g., Pagila, Chinook, Northwind)
3. Complete analysis
4. Navigate to Canvas page
5. ✅ Verify: Default canvas exists with KPI dashboard
6. ✅ Verify: Dashboard shows metrics/dimensions from vocabulary

### Expected Results

- **E-Commerce DB** → Sales Dashboard (revenue, orders, customers)
- **SaaS DB** → Growth Dashboard (MRR, ARR, churn, active users)
- **CRM DB** → Pipeline Dashboard (deals, conversion, revenue)

## Related Files

| File | Change |
|------|--------|
| `packages/api/src/modules/knosia/analysis/router.ts` | Pass userId to runAnalysis |
| `packages/api/src/modules/knosia/analysis/queries.ts` | Add canvas creation logic, fix workspace creation |

## Next Steps

1. ✅ Canvas creation implemented
2. 🚧 Briefing generation (currently mockup)
3. 🚧 Real-time briefing data

## Notes

- Canvas creation uses the same logic as `runKnosiaPipeline`
- Dashboard templates come from `@repo/liquid-connect/business-types`
- LiquidRender schema is generated by `dashboardSpecToLiquidSchema`
- Minimum coverage threshold (30%) ensures reasonable dashboard quality
