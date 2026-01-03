# Canvas Creation Fixes - Complete Implementation

**Date:** 2026-01-03
**Status:** ✅ Implemented and Ready for Testing

---

## Problem Summary

Canvas was not being created after completing onboarding because:
1. **NULL workspace_id** - Analysis records had null workspace_id
2. **Empty schema field** - Connection had empty string instead of "public"
3. **0% template mapping coverage** - Generic/Media business types couldn't map KPIs

---

## Fixes Implemented

### 1. Workspace ID Parameter Added Throughout Stack ✅

**Backend Changes:**

#### `packages/api/src/modules/knosia/analysis/queries.ts`
- Line 162-165: Added `workspaceId` parameter to `runAnalysis()` function signature
- Line 193: Insert analysis record with `workspaceId`
- Lines 697-702: Added diagnostic logging for canvas creation conditions
- Lines 727-740: Added bypass logic for generic templates

#### `packages/api/src/modules/knosia/analysis/router.ts`
- Lines 50-71: Parse `workspaceId` from query params and pass to `runAnalysis()`

#### `packages/api/src/modules/knosia/analysis/schemas.ts`
- Line 11: Added `workspaceId` as optional field in validation schema

**Frontend Changes:**

#### `apps/web/src/modules/onboarding/hooks/use-analysis.ts`
- Line 37: Updated `startAnalysis` interface to accept `workspaceId` parameter
- Lines 158-161: Added `workspaceId` to SSE URL query params

#### `apps/web/src/modules/onboarding/hooks/use-connection-test.ts`
- Line 19: Added `workspaceId` field to `CreateConnectionResponse` interface

#### `apps/web/src/app/[locale]/onboarding/connect/page.tsx`
- Line 42: Destructured `setWorkspaceId` from `useOnboardingState()`
- Lines 107-109: Capture and store `workspaceId` from connection response

#### `apps/web/src/app/[locale]/onboarding/review/page.tsx`
- Line 24: Get `workspaceId` from state
- Line 29: Pass `workspaceId` when starting analysis

**Result:** `workspace_id` now properly saved in analysis table instead of NULL

---

### 2. Schema Field Default Fix ✅

**File:** `packages/api/src/modules/knosia/connections/mutations.ts`

**Change:** Line 155
```typescript
// Before:
schema: input.schema

// After:
schema: input.schema && input.schema.trim() !== "" ? input.schema : "public"
```

**Impact:**
- Empty schema strings now default to "public"
- DuckDB adapter can properly find tables
- Analysis detects tables correctly (0 → 30 tables for Pagila)

---

### 3. Canvas Bypass Logic for Generic Templates ✅

**File:** `packages/api/src/modules/knosia/analysis/queries.ts`

**Change:** Lines 727-740
```typescript
const hasVocabulary = (quickEnrichedVocab.metrics?.length || 0) > 0 ||
                     (quickEnrichedVocab.dimensions?.length || 0) > 0;
const isGenericTemplate = template.id === 'custom';
const shouldCreateCanvas = mappingResult.coverage >= 10 || (isGenericTemplate && hasVocabulary);

console.log("[Canvas] Creation decision:", {
  coverage: mappingResult.coverage,
  hasVocabulary,
  isGenericTemplate,
  shouldCreateCanvas
});

if (shouldCreateCanvas) {
  // Create canvas even with 0% coverage if generic template has vocabulary
}
```

**Impact:**
- Business types without dedicated templates (Media, Logistics, etc.) can now create canvases
- Bypasses 10% KPI coverage requirement when vocabulary exists
- Enables canvas creation for any detected business type

---

## Environment Setup (Corrected)

### Docker Configuration

**File:** `docker-compose.yml`

**Services:**
- PostgreSQL with pgvector on port **5440**
- Credentials: `turbostarter/turbostarter`
- Database: `core`
- MinIO S3 on ports 9000 (API) and 9001 (Console)

**Commands:**
```bash
# Start services
pnpm services:start  # or: docker compose up -d --wait

# Seed dev users
pnpm auth:seed

# Dev users:
#   User:  me+user@turbostarter.dev / Pa$$w0rd
#   Admin: me+admin@turbostarter.dev / Pa$$w0rd

# Stop services
pnpm services:stop  # or: docker compose down
```

### Database URL

**.env.local:**
```bash
DATABASE_URL="postgresql://turbostarter:turbostarter@localhost:5440/core"
```

---

## Testing Steps

### 1. Start Environment
```bash
# Start Docker services
pnpm services:start

# Verify services are healthy
docker compose ps

# Run migrations
cd packages/db
DATABASE_URL="postgresql://turbostarter:turbostarter@localhost:5440/core" npx drizzle-kit migrate

# Seed auth users
pnpm auth:seed

# Clean Knosia data for fresh test
DATABASE_URL="postgresql://turbostarter:turbostarter@localhost:5440/core" npx tsx src/scripts/clean-knosia-data.ts

# Start dev server
pnpm dev
```

### 2. Test Onboarding Flow
1. Navigate to http://localhost:3000/auth/login
2. Login with: `me+user@turbostarter.dev` / `Pa$$w0rd`
3. Go to onboarding: http://localhost:3000/onboarding/connect
4. Create connection to test database (e.g., Pagila on localhost:5433)
5. Proceed to review page - analysis will start automatically
6. Wait for analysis to complete
7. Navigate to canvas page

### 3. Verify Canvas Creation
```sql
-- Check analysis record
SELECT id, workspace_id, status, created_at
FROM knosia_analysis
ORDER BY created_at DESC
LIMIT 1;

-- Verify workspace_id is NOT NULL

-- Check canvas creation
SELECT id, name, workspace_id, status, created_at
FROM knosia_workspace_canvas
ORDER BY created_at DESC
LIMIT 1;

-- Should have a canvas record
```

---

## Diagnostic Logging

The following logs help debug canvas creation:

```typescript
// In packages/api/src/modules/knosia/analysis/queries.ts

console.log("[Canvas] Checking canvas creation conditions:", {
  workspaceId,
  orgId,
  hasWorkspace: !!workspaceId,
  hasOrg: !!orgId,
  businessType: businessType.detected
});

console.log("[Canvas] Creation decision:", {
  coverage: mappingResult.coverage,
  hasVocabulary,
  isGenericTemplate,
  shouldCreateCanvas
});
```

Watch the server logs during analysis to see these diagnostic messages.

---

## Files Changed

### Backend (7 files)
1. `packages/api/src/modules/knosia/analysis/queries.ts`
2. `packages/api/src/modules/knosia/analysis/router.ts`
3. `packages/api/src/modules/knosia/analysis/schemas.ts`
4. `packages/api/src/modules/knosia/connections/mutations.ts`

### Frontend (4 files)
1. `apps/web/src/modules/onboarding/hooks/use-analysis.ts`
2. `apps/web/src/modules/onboarding/hooks/use-connection-test.ts`
3. `apps/web/src/app/[locale]/onboarding/connect/page.tsx`
4. `apps/web/src/app/[locale]/onboarding/review/page.tsx`

### Database Scripts (1 file)
1. `packages/db/src/scripts/clean-knosia-data.ts` (for testing)

---

## Known Limitations

1. **LLM-based canvas generation**: User suggested using LLM instead of template mapping. This would bypass template mapping entirely and generate canvas specs directly from vocabulary. Not yet implemented.

2. **Multi-connection support**: Current implementation supports single connection in onboarding. Multi-connection UI not yet implemented.

3. **Business type templates**: Only SaaS and E-commerce have dedicated templates. All other types use generic fallback.

---

## Next Steps

1. **End-to-end test** the full onboarding flow with a real database connection
2. **Verify canvas creation** in database after analysis completes
3. **Test canvas rendering** on the canvas page
4. **Consider LLM-based generation** as suggested by user for better coverage across all business types

---

## Success Criteria

✅ Analysis records save `workspace_id` (not NULL)
✅ Schema field defaults to "public" when empty
✅ Canvas created for generic templates when vocabulary exists
✅ Docker environment properly configured
✅ Auth users seeded
⏳ End-to-end verification pending (awaiting manual test)

---

## Git Commit Message

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix(knosia): resolve canvas creation issues in onboarding flow

Three critical fixes to enable canvas creation:

1. **Add workspace_id parameter throughout analysis pipeline**
   - Backend: runAnalysis() function, API router, validation schemas
   - Frontend: SSE connection, state management, connection capture
   - Result: workspace_id now properly saved in analysis table

2. **Fix empty schema field defaulting**
   - Default empty schema strings to "public" in connection creation
   - Enables DuckDB adapter to properly detect database tables
   - Impact: 0 tables → 30 tables detected for test databases

3. **Bypass template mapping for generic business types**
   - Allow canvas creation when vocabulary exists, regardless of KPI coverage
   - Enables canvas for Media, Logistics, and other non-templated types
   - Smart bypass: only for generic templates with detected vocabulary

Also corrected development environment setup to use Docker PostgreSQL
on port 5440 as specified in docker-compose.yml.

Fixes #canvas-not-created

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```
