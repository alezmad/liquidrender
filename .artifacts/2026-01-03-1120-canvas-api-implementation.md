# Canvas API Implementation

**Created:** 2026-01-03
**Status:** ✅ Complete
**Migration:** `0002_canvas_api_migration.sql`

## Overview

The Canvas API enables multi-canvas workspaces with version history, collaboration scoping, and optimistic locking. Each workspace can have multiple canvases (dashboards), with support for private vs. workspace-scoped sharing and complete version history tracking.

## Architecture

### Database Schema

#### knosia_workspace_canvas

Primary table for storing canvas configurations.

```sql
CREATE TABLE "knosia_workspace_canvas" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "title" text NOT NULL,
  "schema" jsonb NOT NULL,              -- LiquidSchema JSON
  "owner_id" text NOT NULL,
  "scope" "knosia_canvas_scope" NOT NULL,  -- 'private' | 'workspace'
  "is_default" boolean DEFAULT false,
  "current_version" integer DEFAULT 1,
  "last_edited_by" text,
  "deleted_at" timestamp,               -- Soft delete support
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp NOT NULL
);
```

**Foreign Keys:**
- `workspace_id` → `knosia_workspace.id` (CASCADE)
- `owner_id` → `user.id` (CASCADE)
- `last_edited_by` → `user.id` (SET NULL)

**Indexes:**
- `idx_default_workspace_canvas` - Unique partial index ensuring only one default canvas per workspace

#### knosia_canvas_version

Version history table for tracking all canvas changes.

```sql
CREATE TABLE "knosia_canvas_version" (
  "id" text PRIMARY KEY NOT NULL,
  "canvas_id" text NOT NULL,
  "version_number" integer NOT NULL,
  "schema" jsonb NOT NULL,
  "created_by" text NOT NULL,
  "change_summary" text,                -- Optional description of changes
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

**Foreign Keys:**
- `canvas_id` → `knosia_workspace_canvas.id` (CASCADE)
- `created_by` → `user.id` (NO ACTION)

**Indexes:**
- `unique_canvas_version` - Unique composite index on (canvas_id, version_number)

#### knosia_canvas_scope Enum

```sql
CREATE TYPE "knosia_canvas_scope" AS ENUM('private', 'workspace');
```

- **private**: Only visible/editable by owner
- **workspace**: Visible/editable by all workspace members

---

## API Endpoints

All endpoints are mounted at `/api/knosia/canvas`

### List Canvases

```
GET /api/knosia/canvas
```

**Query Parameters:**
```typescript
{
  workspaceId: string;
  scope?: 'private' | 'workspace';  // Filter by scope
  includeDeleted?: boolean;         // Include soft-deleted canvases
  limit?: number;                   // Default: 50, max: 100
  offset?: number;                  // For pagination
}
```

**Response:**
```typescript
{
  data: Array<{
    id: string;
    workspaceId: string;
    title: string;
    schema: LiquidSchema;
    ownerId: string;
    scope: 'private' | 'workspace';
    isDefault: boolean;
    currentVersion: number;
    lastEditedBy: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
}
```

**Permissions:**
- User must be workspace member
- Private canvases: only owner sees them
- Workspace canvases: all members see them

---

### Get Canvas

```
GET /api/knosia/canvas/:id
```

**Response:**
```typescript
{
  id: string;
  workspaceId: string;
  title: string;
  schema: LiquidSchema;
  ownerId: string;
  scope: 'private' | 'workspace';
  isDefault: boolean;
  currentVersion: number;
  lastEditedBy: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Permissions:**
- Owner can view private canvas
- Workspace members can view workspace canvas

---

### Create Canvas

```
POST /api/knosia/canvas
```

**Body:**
```typescript
{
  workspaceId: string;
  title: string;
  schema: LiquidSchema;
  scope: 'private' | 'workspace';
}
```

**Response:** Created canvas object (201)

**Behavior:**
- Sets `ownerId` to authenticated user
- Sets `currentVersion` to 1
- Creates initial version history entry automatically
- Cannot create default canvas (use separate endpoint)

**Permissions:**
- User must be workspace member

---

### Update Canvas

```
PUT /api/knosia/canvas/:id
```

**Body:**
```typescript
{
  title?: string;              // Optional: update title
  schema?: LiquidSchema;       // Optional: update schema
  expectedVersion: number;     // Required: for optimistic locking
}
```

**Response:** Updated canvas object

**Behavior:**
- Increments `currentVersion`
- Saves previous version to `knosia_canvas_version`
- Updates `lastEditedBy` to current user
- Prunes old versions (keeps last 50)

**Optimistic Locking:**
- If `expectedVersion !== currentVersion`, returns 409 Conflict
- Prevents concurrent edit conflicts

**Permissions:**
- Owner can edit private canvas
- Workspace members can edit workspace canvas

---

### Delete Canvas

```
DELETE /api/knosia/canvas/:id?permanent=false
```

**Query Parameters:**
```typescript
{
  permanent?: boolean;  // true = hard delete, false = soft delete (default)
}
```

**Soft Delete:**
- Sets `deletedAt` timestamp
- Canvas hidden by default in list queries
- Can be restored by clearing `deletedAt`

**Hard Delete:**
- Permanently removes canvas
- Cascades to version history

**Restrictions:**
- Cannot delete default workspace canvas
- Must be owner

---

### Change Canvas Scope

```
PUT /api/knosia/canvas/:id/scope
```

**Body:**
```typescript
{
  scope: 'workspace';  // Only private → workspace allowed
}
```

**Response:** Updated canvas object

**Restrictions:**
- Only owner can change scope
- Only `private → workspace` transition allowed
- Cannot change workspace → private (prevents accidental data exposure)

**Permissions:**
- Must be owner

---

### List Versions

```
GET /api/knosia/canvas/:id/versions
```

**Query Parameters:**
```typescript
{
  limit?: number;   // Default: 20, max: 100
  offset?: number;  // For pagination
}
```

**Response:**
```typescript
{
  data: Array<{
    id: string;
    canvasId: string;
    versionNumber: number;
    schema: LiquidSchema;
    createdBy: string;
    changeSummary: string | null;
    createdAt: Date;
  }>;
  total: number;
}
```

**Permissions:**
- Same as view canvas

---

### Get Version

```
GET /api/knosia/canvas/:id/versions/:versionNumber
```

**Response:** Single version object

**Permissions:**
- Same as view canvas

---

### Restore Version

```
POST /api/knosia/canvas/:id/versions/:versionNumber/restore
```

**Response:** Updated canvas object

**Behavior:**
- Creates new version with old schema
- Increments `currentVersion`
- Saves current state to version history before restoring

**Permissions:**
- Same as edit canvas

---

## Permission Model

Implemented in `packages/api/src/modules/knosia/canvas/permissions.ts`

### Helper Functions

```typescript
function canViewCanvas(canvas: Canvas, userId: string, userWorkspaceIds: string[]): boolean
function canEditCanvas(canvas: Canvas, userId: string, userWorkspaceIds: string[]): boolean
function canDeleteCanvas(canvas: Canvas, userId: string): boolean
function canChangeScope(canvas: Canvas, userId: string, newScope: CanvasScope): boolean
```

### Permission Matrix

| Action        | Private Canvas (Owner) | Private Canvas (Other) | Workspace Canvas (Member) |
|---------------|------------------------|------------------------|---------------------------|
| View          | ✅                      | ❌                      | ✅                         |
| Edit          | ✅                      | ❌                      | ✅                         |
| Delete        | ✅                      | ❌                      | ❌ (owner only)            |
| Change Scope  | ✅                      | ❌                      | ❌ (owner only)            |

---

## Key Features

### 1. Multi-Canvas Support

- Each workspace can have unlimited canvases
- Default canvas created automatically on workspace creation
- Users can create additional canvases as needed

### 2. Scope-Based Sharing

- **Private canvases**: Personal dashboards, only owner can see/edit
- **Workspace canvases**: Team dashboards, all members can collaborate
- Owner can promote private → workspace (one-way only)

### 3. Version History

- Every update creates a version history entry
- Full schema preserved for each version
- Optional change summaries for documentation
- Restore any previous version
- Auto-prune keeps last 50 versions per canvas

### 4. Optimistic Locking

- `expectedVersion` parameter prevents concurrent edit conflicts
- Returns 409 Conflict if version mismatch
- Client must fetch latest version and retry

### 5. Soft Delete

- Default delete behavior preserves data
- Soft-deleted canvases excluded from normal queries
- Can be permanently deleted with `?permanent=true`
- Default canvas cannot be deleted

### 6. Default Canvas

- Each workspace has one default canvas
- Unique constraint enforces at database level
- Cannot be deleted (must transfer default first)
- Created automatically when workspace is created

---

## Implementation Files

### Database

- **Schema:** `packages/db/src/schema/knosia.ts` (lines 285-371)
- **Migration:** `packages/db/migrations/0002_canvas_api_migration.sql`

### API Module

```
packages/api/src/modules/knosia/canvas/
├── router.ts          - Hono route definitions
├── schemas.ts         - Zod input/output schemas
├── queries.ts         - Read operations
├── mutations.ts       - Write operations
├── permissions.ts     - Permission helper functions
├── index.ts           - Barrel exports
└── __tests__/
    └── canvas-api.test.ts  - 37 unit tests (all passing)
```

### Integration

- **Main Router:** `packages/api/src/modules/knosia/router.ts:22` - Canvas router mounted
- **Pipeline:** `packages/api/src/modules/knosia/analysis/mutations.ts:115-141` - Default canvas auto-creation

---

## Testing

### Unit Tests

Location: `packages/api/src/modules/knosia/canvas/__tests__/canvas-api.test.ts`

**Coverage:**
- ✅ List canvases (scope filtering, deleted filtering)
- ✅ Get canvas (permissions)
- ✅ Create canvas (private/workspace)
- ✅ Update canvas (version history, optimistic locking)
- ✅ Delete canvas (soft/hard, default protection)
- ✅ Change scope (transitions, permissions)
- ✅ List versions (pagination)
- ✅ Get version
- ✅ Restore version
- ✅ Permission helpers

**Results:**
```
✓ 37 tests passed
Duration: 118ms
```

### Database Verification

**Schema Verification:**
- ✅ knosia_workspace_canvas: 12 columns (all correct)
- ✅ knosia_canvas_version: 7 columns (all correct)
- ✅ Foreign key constraints: 5 total (all working)
- ✅ Indexes: 4 total (including unique constraints)

---

## Usage Example

### Creating a Canvas

```typescript
import { api } from "~/lib/api/client";

const response = await api.knosia.canvas.$post({
  json: {
    workspaceId: "workspace-123",
    title: "Sales Dashboard",
    schema: {
      version: "1.0",
      metadata: { title: "Sales Dashboard" },
      theme: "light",
      layers: [
        {
          id: "page-1",
          type: "page",
          root: {
            type: "container",
            children: [
              {
                type: "kpi",
                binding: { source: "metrics", field: "revenue" },
                label: "Monthly Revenue"
              }
            ]
          }
        }
      ]
    },
    scope: "workspace"
  }
});

const canvas = await response.json();
console.log("Canvas created:", canvas.id);
```

### Updating with Optimistic Locking

```typescript
// Fetch current canvas
const canvas = await api.knosia.canvas[":id"].$get({
  param: { id: "canvas-123" }
}).then(r => r.json());

// Update with expected version
try {
  const updated = await api.knosia.canvas[":id"].$put({
    param: { id: "canvas-123" },
    json: {
      schema: modifiedSchema,
      expectedVersion: canvas.currentVersion  // ← Optimistic lock
    }
  }).then(r => r.json());

  console.log("Updated to version:", updated.currentVersion);
} catch (error) {
  if (error.status === 409) {
    // Version conflict - someone else edited
    // Fetch latest and retry
  }
}
```

### Restoring a Previous Version

```typescript
// List available versions
const versions = await api.knosia.canvas[":id"].versions.$get({
  param: { id: "canvas-123" }
}).then(r => r.json());

// Restore version 5
const restored = await api.knosia.canvas[":id"].versions[":versionNumber"].restore.$post({
  param: {
    id: "canvas-123",
    versionNumber: "5"
  }
}).then(r => r.json());

console.log("Restored to version 5, created new version:", restored.currentVersion);
```

---

## Migration Notes

### Breaking Changes from Old Schema

The migration drops the old canvas tables completely:

**Removed Tables:**
- `knosia_canvas`
- `knosia_canvas_alert`
- `knosia_canvas_block`

**Removed Enums:**
- `knosia_canvas_block_type`
- `knosia_canvas_status`

**New Tables:**
- `knosia_workspace_canvas`
- `knosia_canvas_version`

**New Enum:**
- `knosia_canvas_scope`

### Migration File

`packages/db/migrations/0002_canvas_api_migration.sql`

Applied via: `pnpm with-env pnpm -F @turbostarter/db db:migrate`

### Pre-Migration Cleanup

If you encounter "table already exists" errors:

```typescript
// Run cleanup script
cd packages/db
tsx src/scripts/cleanup-canvas-table.ts
```

Then rerun migration.

---

## Future Enhancements

### Planned (Not Yet Implemented)

1. **Canvas Templates**
   - Pre-built canvas templates for common use cases
   - Template marketplace

2. **Collaboration Features**
   - Real-time collaborative editing
   - Cursor presence indicators
   - Comment threads on canvas elements

3. **Access Control Lists**
   - Fine-grained permissions beyond owner/workspace
   - Share with specific users
   - View-only vs. edit access

4. **Canvas Snapshots**
   - Named snapshots (beyond version numbers)
   - Scheduled automatic snapshots
   - Compare versions side-by-side

5. **Canvas Duplication**
   - Clone canvas within workspace
   - Copy canvas to different workspace
   - Template from existing canvas

6. **Version Branching**
   - Create branch from version
   - Merge branches back to main
   - Conflict resolution UI

---

## API Reference Summary

| Endpoint                                      | Method | Auth | Purpose                           |
|-----------------------------------------------|--------|------|-----------------------------------|
| `/api/knosia/canvas`                          | GET    | ✅    | List canvases                     |
| `/api/knosia/canvas`                          | POST   | ✅    | Create canvas                     |
| `/api/knosia/canvas/:id`                      | GET    | ✅    | Get canvas                        |
| `/api/knosia/canvas/:id`                      | PUT    | ✅    | Update canvas                     |
| `/api/knosia/canvas/:id`                      | DELETE | ✅    | Delete canvas                     |
| `/api/knosia/canvas/:id/scope`                | PUT    | ✅    | Change scope                      |
| `/api/knosia/canvas/:id/versions`             | GET    | ✅    | List versions                     |
| `/api/knosia/canvas/:id/versions/:version`    | GET    | ✅    | Get version                       |
| `/api/knosia/canvas/:id/versions/:version/restore` | POST   | ✅    | Restore version                   |

---

## Conclusion

The Canvas API is production-ready with:

- ✅ Complete database schema with proper constraints
- ✅ Full CRUD operations with permissions
- ✅ Version history and rollback capabilities
- ✅ Optimistic locking for concurrent edits
- ✅ Soft delete with recovery option
- ✅ Comprehensive test coverage (37 tests)
- ✅ Type-safe Zod schemas
- ✅ Integration with workspace pipeline

Next steps:
1. Build frontend UI components for canvas management
2. Implement real-time collaboration features
3. Add canvas templates and duplication
