# Canvas API Implementation Specification

**Date**: 2026-01-03
**Wave**: Wave 3 Integration
**Status**: Ready for Implementation

---

## Overview

The Canvas API provides workspace members with visual dashboard capabilities powered by LiquidRender. Canvases can be private (owner-only) or workspace-scoped (shared with team), with full version history for safe experimentation.

### Core Principles

1. **Simplicity First**: Two scopes (private/workspace), linear version history
2. **Auto-generation**: One workspace canvas auto-created from analysis
3. **Safe Editing**: All changes versioned, easy rollback
4. **Collaboration**: Workspace canvases enable team collaboration
5. **Experimentation**: Private canvases for testing before sharing

### Key Features

- ✅ Create private/workspace canvases
- ✅ Scope-based permissions (view/edit)
- ✅ Automatic version history (last 50 versions)
- ✅ Version restore (creates new version)
- ✅ Soft delete with cascade
- ✅ Optimistic locking for concurrent edits
- ✅ Scope transitions (private → workspace)

---

## Database Schema

### Primary Table: `knosia_workspace_canvas`

```sql
CREATE TABLE knosia_workspace_canvas (
  -- Identity
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  -- Core Data
  title TEXT NOT NULL,
  schema JSONB NOT NULL,              -- LiquidSchema JSON

  -- Ownership & Permissions
  owner_id TEXT NOT NULL,             -- Creator/owner
  scope TEXT NOT NULL                 -- 'private' | 'workspace'
    CHECK (scope IN ('private', 'workspace')),

  -- Metadata
  is_default BOOLEAN DEFAULT false,   -- Auto-created workspace canvas
  current_version INTEGER DEFAULT 1,  -- Current version number
  last_edited_by TEXT,                -- Last editor user ID

  -- Soft Delete
  deleted_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  -- Foreign Keys
  CONSTRAINT fk_workspace
    FOREIGN KEY (workspace_id)
    REFERENCES knosia_workspace(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_owner
    FOREIGN KEY (owner_id)
    REFERENCES user(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_last_editor
    FOREIGN KEY (last_edited_by)
    REFERENCES user(id)
    ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_canvas_workspace ON knosia_workspace_canvas(workspace_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_canvas_owner ON knosia_workspace_canvas(owner_id)
  WHERE deleted_at IS NULL;

-- Ensure only one default canvas per workspace
CREATE UNIQUE INDEX idx_default_workspace_canvas
  ON knosia_workspace_canvas(workspace_id)
  WHERE is_default = true AND deleted_at IS NULL;
```

### Version History: `knosia_canvas_version`

```sql
CREATE TABLE knosia_canvas_version (
  -- Identity
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,

  -- Version Data
  schema JSONB NOT NULL,              -- Snapshot at this version

  -- Change Metadata
  created_by TEXT NOT NULL,           -- Who created this version
  change_summary TEXT,                -- Optional description

  -- Timestamp
  created_at TIMESTAMP DEFAULT now() NOT NULL,

  -- Foreign Keys
  CONSTRAINT fk_canvas
    FOREIGN KEY (canvas_id)
    REFERENCES knosia_workspace_canvas(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_creator
    FOREIGN KEY (created_by)
    REFERENCES user(id),

  -- Unique version per canvas
  CONSTRAINT unique_canvas_version
    UNIQUE(canvas_id, version_number)
);

-- Index for version queries
CREATE INDEX idx_canvas_versions
  ON knosia_canvas_version(canvas_id, version_number DESC);
```

---

## Permission Model

### View Permissions

| Canvas Scope | Who Can View |
|--------------|--------------|
| **private** | Owner only |
| **workspace** | All workspace members |

### Edit Permissions

| Canvas Scope | Who Can Edit |
|--------------|--------------|
| **private** | Owner only |
| **workspace** | All workspace members |

### Delete Permissions

| Canvas Scope | Who Can Delete |
|--------------|----------------|
| **private** | Owner only |
| **workspace** | Owner only |

### Scope Transition Permissions

| Transition | Allowed | Who Can Do It |
|------------|---------|---------------|
| private → workspace | ✅ Yes | Owner only |
| workspace → private | ❌ No | N/A (would hide from team) |

### Permission Check Functions

```typescript
// Check if user can view canvas
export function canViewCanvas(
  canvas: Canvas,
  userId: string,
  userWorkspaceIds: string[]
): boolean {
  // Deleted canvases not viewable
  if (canvas.deletedAt) return false;

  // Private: owner only
  if (canvas.scope === 'private') {
    return canvas.ownerId === userId;
  }

  // Workspace: any workspace member
  if (canvas.scope === 'workspace') {
    return userWorkspaceIds.includes(canvas.workspaceId);
  }

  return false;
}

// Check if user can edit canvas
export function canEditCanvas(
  canvas: Canvas,
  userId: string,
  userWorkspaceIds: string[]
): boolean {
  // Must be able to view first
  if (!canViewCanvas(canvas, userId, userWorkspaceIds)) {
    return false;
  }

  // Private: owner only
  if (canvas.scope === 'private') {
    return canvas.ownerId === userId;
  }

  // Workspace: any workspace member
  if (canvas.scope === 'workspace') {
    return userWorkspaceIds.includes(canvas.workspaceId);
  }

  return false;
}

// Check if user can delete canvas
export function canDeleteCanvas(
  canvas: Canvas,
  userId: string
): boolean {
  // Only owner can delete (regardless of scope)
  return canvas.ownerId === userId;
}

// Check if user can change canvas scope
export function canChangeScope(
  canvas: Canvas,
  userId: string,
  newScope: 'private' | 'workspace'
): boolean {
  // Only owner can change scope
  if (canvas.ownerId !== userId) return false;

  // Can only transition private → workspace
  return canvas.scope === 'private' && newScope === 'workspace';
}
```

---

## API Endpoints

### 1. List Canvases

**GET** `/api/knosia/workspaces/:workspaceId/canvases`

Returns all canvases the user can view in a workspace.

**Path Parameters:**
- `workspaceId` (string, required) - Workspace ID

**Query Parameters:**
- `scope` (string, optional) - Filter by scope: `private` | `workspace`
- `includeDeleted` (boolean, optional, default: false) - Include soft-deleted canvases

**Response:**
```typescript
{
  canvases: [
    {
      id: string;
      workspaceId: string;
      title: string;
      scope: 'private' | 'workspace';
      ownerId: string;
      isDefault: boolean;
      currentVersion: number;
      lastEditedBy: string | null;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
    }
  ]
}
```

**Permissions:**
- User must be workspace member

**Implementation:**
```typescript
async function listCanvases(
  workspaceId: string,
  userId: string,
  options: { scope?: string; includeDeleted?: boolean }
) {
  // Verify workspace membership
  const membership = await db
    .select()
    .from(knosiaWorkspaceMembership)
    .where(
      and(
        eq(knosiaWorkspaceMembership.workspaceId, workspaceId),
        eq(knosiaWorkspaceMembership.userId, userId)
      )
    )
    .limit(1);

  if (!membership.length) {
    throw new Error('Not a workspace member');
  }

  // Build query
  let query = db
    .select({
      id: knosiaWorkspaceCanvas.id,
      workspaceId: knosiaWorkspaceCanvas.workspaceId,
      title: knosiaWorkspaceCanvas.title,
      scope: knosiaWorkspaceCanvas.scope,
      ownerId: knosiaWorkspaceCanvas.ownerId,
      isDefault: knosiaWorkspaceCanvas.isDefault,
      currentVersion: knosiaWorkspaceCanvas.currentVersion,
      lastEditedBy: knosiaWorkspaceCanvas.lastEditedBy,
      createdAt: knosiaWorkspaceCanvas.createdAt,
      updatedAt: knosiaWorkspaceCanvas.updatedAt,
      deletedAt: knosiaWorkspaceCanvas.deletedAt,
    })
    .from(knosiaWorkspaceCanvas)
    .where(
      and(
        eq(knosiaWorkspaceCanvas.workspaceId, workspaceId),
        or(
          eq(knosiaWorkspaceCanvas.scope, 'workspace'),
          eq(knosiaWorkspaceCanvas.ownerId, userId)
        )
      )
    );

  // Apply filters
  if (options.scope) {
    query = query.where(eq(knosiaWorkspaceCanvas.scope, options.scope));
  }

  if (!options.includeDeleted) {
    query = query.where(isNull(knosiaWorkspaceCanvas.deletedAt));
  }

  const canvases = await query.orderBy(
    desc(knosiaWorkspaceCanvas.isDefault),
    desc(knosiaWorkspaceCanvas.updatedAt)
  );

  return { canvases };
}
```

---

### 2. Get Canvas

**GET** `/api/knosia/canvases/:id`

Returns full canvas details including LiquidSchema.

**Path Parameters:**
- `id` (string, required) - Canvas ID

**Response:**
```typescript
{
  id: string;
  workspaceId: string;
  title: string;
  schema: LiquidSchema;  // Full LiquidSchema JSON
  scope: 'private' | 'workspace';
  ownerId: string;
  isDefault: boolean;
  currentVersion: number;
  lastEditedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

**Permissions:**
- User must have view permission (see Permission Model)

**Errors:**
- `404` - Canvas not found
- `403` - No view permission

---

### 3. Create Canvas

**POST** `/api/knosia/canvases`

Creates a new canvas (private or workspace scope).

**Request Body:**
```typescript
{
  workspaceId: string;     // Required
  title: string;           // Required, 1-255 chars
  scope: 'private' | 'workspace';  // Required
  schema: LiquidSchema;    // Required, valid LiquidSchema
}
```

**Response:**
```typescript
{
  id: string;
  workspaceId: string;
  title: string;
  schema: LiquidSchema;
  scope: 'private' | 'workspace';
  ownerId: string;
  isDefault: false;
  currentVersion: 1;
  lastEditedBy: null;
  createdAt: string;
  updatedAt: string;
  deletedAt: null;
}
```

**Permissions:**
- User must be workspace member

**Validation:**
- Title: 1-255 characters
- Schema: Valid LiquidSchema (version 1.0+)
- Scope: Must be 'private' or 'workspace'

**Implementation:**
```typescript
async function createCanvas(input: CreateCanvasInput, userId: string) {
  // Verify workspace membership
  const membership = await verifyWorkspaceMembership(input.workspaceId, userId);

  // Validate LiquidSchema
  validateLiquidSchema(input.schema);

  // Create canvas
  const [canvas] = await db
    .insert(knosiaWorkspaceCanvas)
    .values({
      id: generateId(),
      workspaceId: input.workspaceId,
      title: input.title,
      schema: input.schema,
      scope: input.scope,
      ownerId: userId,
      isDefault: false,
      currentVersion: 1,
      lastEditedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return canvas;
}
```

---

### 4. Update Canvas

**PUT** `/api/knosia/canvases/:id`

Updates canvas schema and metadata. Automatically creates version history.

**Path Parameters:**
- `id` (string, required) - Canvas ID

**Request Body:**
```typescript
{
  title?: string;         // Optional, 1-255 chars
  schema?: LiquidSchema;  // Optional, valid LiquidSchema
  expectedVersion: number;  // Required for optimistic locking
  changeSummary?: string;  // Optional, for version history
}
```

**Response:**
```typescript
{
  id: string;
  workspaceId: string;
  title: string;
  schema: LiquidSchema;
  scope: 'private' | 'workspace';
  ownerId: string;
  isDefault: boolean;
  currentVersion: number;  // Incremented
  lastEditedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: null;
}
```

**Permissions:**
- User must have edit permission (see Permission Model)

**Errors:**
- `404` - Canvas not found
- `403` - No edit permission
- `409` - Version conflict (expectedVersion mismatch)

**Implementation:**
```typescript
async function updateCanvas(
  canvasId: string,
  input: UpdateCanvasInput,
  userId: string
) {
  await db.transaction(async (tx) => {
    // 1. Get current canvas with lock
    const [canvas] = await tx
      .select()
      .from(knosiaWorkspaceCanvas)
      .where(eq(knosiaWorkspaceCanvas.id, canvasId))
      .for('update');

    if (!canvas) {
      throw new Error('Canvas not found');
    }

    // 2. Verify edit permission
    const canEdit = await verifyEditPermission(canvas, userId, tx);
    if (!canEdit) {
      throw new Error('No edit permission');
    }

    // 3. Optimistic locking check
    if (input.expectedVersion !== canvas.currentVersion) {
      throw new Error('Version conflict');
    }

    const nextVersion = canvas.currentVersion + 1;

    // 4. Save current state as version
    await tx.insert(knosiaCanvasVersion).values({
      id: generateId(),
      canvasId,
      versionNumber: canvas.currentVersion,
      schema: canvas.schema,
      createdBy: canvas.lastEditedBy || canvas.ownerId,
      changeSummary: null,
      createdAt: canvas.updatedAt,
    });

    // 5. Update canvas
    const [updated] = await tx
      .update(knosiaWorkspaceCanvas)
      .set({
        ...(input.title && { title: input.title }),
        ...(input.schema && { schema: input.schema }),
        currentVersion: nextVersion,
        lastEditedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(knosiaWorkspaceCanvas.id, canvasId))
      .returning();

    // 6. Prune old versions (keep last 50)
    await tx
      .delete(knosiaCanvasVersion)
      .where(
        and(
          eq(knosiaCanvasVersion.canvasId, canvasId),
          lt(knosiaCanvasVersion.versionNumber, nextVersion - 50)
        )
      );

    return updated;
  });
}
```

---

### 5. Delete Canvas

**DELETE** `/api/knosia/canvases/:id`

Soft-deletes a canvas (sets `deleted_at` timestamp).

**Path Parameters:**
- `id` (string, required) - Canvas ID

**Query Parameters:**
- `permanent` (boolean, optional, default: false) - Hard delete (permanent)

**Response:**
```typescript
{
  success: true;
  deletedAt: string;  // Soft delete timestamp
}
```

**Permissions:**
- User must be canvas owner

**Errors:**
- `404` - Canvas not found
- `403` - Not canvas owner
- `400` - Cannot delete default workspace canvas

**Implementation:**
```typescript
async function deleteCanvas(
  canvasId: string,
  userId: string,
  permanent = false
) {
  const [canvas] = await db
    .select()
    .from(knosiaWorkspaceCanvas)
    .where(eq(knosiaWorkspaceCanvas.id, canvasId));

  if (!canvas) {
    throw new Error('Canvas not found');
  }

  // Only owner can delete
  if (canvas.ownerId !== userId) {
    throw new Error('Not canvas owner');
  }

  // Cannot delete default workspace canvas
  if (canvas.isDefault) {
    throw new Error('Cannot delete default workspace canvas');
  }

  if (permanent) {
    // Hard delete (cascades to versions)
    await db
      .delete(knosiaWorkspaceCanvas)
      .where(eq(knosiaWorkspaceCanvas.id, canvasId));

    return { success: true, deletedAt: null };
  } else {
    // Soft delete
    const deletedAt = new Date();
    await db
      .update(knosiaWorkspaceCanvas)
      .set({ deletedAt, updatedAt: deletedAt })
      .where(eq(knosiaWorkspaceCanvas.id, canvasId));

    return { success: true, deletedAt: deletedAt.toISOString() };
  }
}
```

---

### 6. Change Canvas Scope

**PUT** `/api/knosia/canvases/:id/scope`

Changes canvas scope (private → workspace only).

**Path Parameters:**
- `id` (string, required) - Canvas ID

**Request Body:**
```typescript
{
  scope: 'workspace';  // Only workspace allowed (private→workspace)
}
```

**Response:**
```typescript
{
  id: string;
  scope: 'workspace';
  updatedAt: string;
}
```

**Permissions:**
- User must be canvas owner
- Current scope must be 'private'

**Errors:**
- `404` - Canvas not found
- `403` - Not canvas owner
- `400` - Invalid scope transition

---

### 7. List Versions

**GET** `/api/knosia/canvases/:id/versions`

Returns version history for a canvas.

**Path Parameters:**
- `id` (string, required) - Canvas ID

**Query Parameters:**
- `limit` (number, optional, default: 50, max: 50) - Number of versions to return

**Response:**
```typescript
{
  versions: [
    {
      id: string;
      versionNumber: number;
      createdBy: string;
      changeSummary: string | null;
      createdAt: string;
    }
  ]
}
```

**Permissions:**
- User must have view permission on canvas

---

### 8. Get Version

**GET** `/api/knosia/canvases/:id/versions/:versionNumber`

Returns full schema for a specific version.

**Path Parameters:**
- `id` (string, required) - Canvas ID
- `versionNumber` (number, required) - Version number

**Response:**
```typescript
{
  id: string;
  canvasId: string;
  versionNumber: number;
  schema: LiquidSchema;  // Schema at this version
  createdBy: string;
  changeSummary: string | null;
  createdAt: string;
}
```

**Permissions:**
- User must have view permission on canvas

**Errors:**
- `404` - Canvas or version not found
- `403` - No view permission

---

### 9. Restore Version

**POST** `/api/knosia/canvases/:id/versions/:versionNumber/restore`

Restores canvas to a previous version (creates new version with old schema).

**Path Parameters:**
- `id` (string, required) - Canvas ID
- `versionNumber` (number, required) - Version to restore

**Response:**
```typescript
{
  currentVersion: number;      // New version number
  restoredFromVersion: number; // Source version
  schema: LiquidSchema;        // Restored schema
  updatedAt: string;
}
```

**Permissions:**
- User must have edit permission on canvas

**Implementation:**
```typescript
async function restoreVersion(
  canvasId: string,
  versionNumber: number,
  userId: string
) {
  await db.transaction(async (tx) => {
    // 1. Get current canvas
    const [canvas] = await tx
      .select()
      .from(knosiaWorkspaceCanvas)
      .where(eq(knosiaWorkspaceCanvas.id, canvasId))
      .for('update');

    if (!canvas) {
      throw new Error('Canvas not found');
    }

    // 2. Verify edit permission
    const canEdit = await verifyEditPermission(canvas, userId, tx);
    if (!canEdit) {
      throw new Error('No edit permission');
    }

    // 3. Get version to restore
    const [version] = await tx
      .select()
      .from(knosiaCanvasVersion)
      .where(
        and(
          eq(knosiaCanvasVersion.canvasId, canvasId),
          eq(knosiaCanvasVersion.versionNumber, versionNumber)
        )
      );

    if (!version) {
      throw new Error('Version not found');
    }

    const nextVersion = canvas.currentVersion + 1;

    // 4. Save current state as version
    await tx.insert(knosiaCanvasVersion).values({
      id: generateId(),
      canvasId,
      versionNumber: canvas.currentVersion,
      schema: canvas.schema,
      createdBy: canvas.lastEditedBy || canvas.ownerId,
      changeSummary: null,
      createdAt: canvas.updatedAt,
    });

    // 5. Update canvas with restored schema
    await tx
      .update(knosiaWorkspaceCanvas)
      .set({
        schema: version.schema,  // Restored schema
        currentVersion: nextVersion,
        lastEditedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(knosiaWorkspaceCanvas.id, canvasId));

    // 6. Prune old versions
    await tx
      .delete(knosiaCanvasVersion)
      .where(
        and(
          eq(knosiaCanvasVersion.canvasId, canvasId),
          lt(knosiaCanvasVersion.versionNumber, nextVersion - 50)
        )
      );

    return {
      currentVersion: nextVersion,
      restoredFromVersion: versionNumber,
      schema: version.schema,
      updatedAt: new Date().toISOString(),
    };
  });
}
```

---

## Zod Schemas

```typescript
import { z } from "zod";

// LiquidSchema validation (simplified - full validation in liquid-render)
export const liquidSchemaSchema = z.object({
  version: z.string(),
  layers: z.array(z.any()),
});

// Canvas scope
export const canvasScopeSchema = z.enum(['private', 'workspace']);

// Create canvas input
export const createCanvasInputSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1).max(255),
  scope: canvasScopeSchema,
  schema: liquidSchemaSchema,
});

export type CreateCanvasInput = z.infer<typeof createCanvasInputSchema>;

// Update canvas input
export const updateCanvasInputSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  schema: liquidSchemaSchema.optional(),
  expectedVersion: z.number().int().positive(),
  changeSummary: z.string().max(500).optional(),
});

export type UpdateCanvasInput = z.infer<typeof updateCanvasInputSchema>;

// Change scope input
export const changeScopeInputSchema = z.object({
  scope: z.literal('workspace'),
});

export type ChangeScopeInput = z.infer<typeof changeScopeInputSchema>;

// List canvases query
export const listCanvasesQuerySchema = z.object({
  scope: canvasScopeSchema.optional(),
  includeDeleted: z.boolean().optional().default(false),
});

export type ListCanvasesQuery = z.infer<typeof listCanvasesQuerySchema>;

// List versions query
export const listVersionsQuerySchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(50),
});

export type ListVersionsQuery = z.infer<typeof listVersionsQuerySchema>;
```

---

## Error Handling

### Standard Error Response

```typescript
{
  error: string;           // Human-readable error message
  code: string;            // Machine-readable error code
  details?: any;           // Optional additional context
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `CANVAS_NOT_FOUND` | 404 | Canvas doesn't exist |
| `VERSION_NOT_FOUND` | 404 | Version doesn't exist |
| `NOT_WORKSPACE_MEMBER` | 403 | User not in workspace |
| `NO_VIEW_PERMISSION` | 403 | User can't view canvas |
| `NO_EDIT_PERMISSION` | 403 | User can't edit canvas |
| `NOT_CANVAS_OWNER` | 403 | User doesn't own canvas |
| `VERSION_CONFLICT` | 409 | expectedVersion mismatch |
| `INVALID_SCOPE_TRANSITION` | 400 | Can't change scope this way |
| `CANNOT_DELETE_DEFAULT` | 400 | Can't delete default canvas |
| `INVALID_LIQUID_SCHEMA` | 400 | Schema validation failed |

---

## Router Implementation

```typescript
// packages/api/src/modules/knosia/canvas/router.ts

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { enforceAuth } from "../../../middleware";
import type { Variables } from "../../../types";

import {
  listCanvases,
  getCanvas,
  getCanvasVersions,
  getCanvasVersion,
} from "./queries";

import {
  createCanvas,
  updateCanvas,
  deleteCanvas,
  changeCanvasScope,
  restoreCanvasVersion,
} from "./mutations";

import {
  createCanvasInputSchema,
  updateCanvasInputSchema,
  changeScopeInputSchema,
  listCanvasesQuerySchema,
  listVersionsQuerySchema,
} from "./schemas";

export const canvasRouter = new Hono<{ Variables: Variables }>()
  // List canvases in workspace
  .get(
    "/workspaces/:workspaceId/canvases",
    enforceAuth,
    zValidator("query", listCanvasesQuerySchema),
    async (c) => {
      const { workspaceId } = c.req.param();
      const query = c.req.valid("query");
      const userId = c.get("user")!.id;

      const result = await listCanvases(workspaceId, userId, query);
      return c.json(result);
    }
  )

  // Get canvas
  .get("/canvases/:id", enforceAuth, async (c) => {
    const { id } = c.req.param();
    const userId = c.get("user")!.id;

    const canvas = await getCanvas(id, userId);
    return c.json(canvas);
  })

  // Create canvas
  .post(
    "/canvases",
    enforceAuth,
    zValidator("json", createCanvasInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const userId = c.get("user")!.id;

      const canvas = await createCanvas(input, userId);
      return c.json(canvas, 201);
    }
  )

  // Update canvas
  .put(
    "/canvases/:id",
    enforceAuth,
    zValidator("json", updateCanvasInputSchema),
    async (c) => {
      const { id } = c.req.param();
      const input = c.req.valid("json");
      const userId = c.get("user")!.id;

      const canvas = await updateCanvas(id, input, userId);
      return c.json(canvas);
    }
  )

  // Delete canvas
  .delete("/canvases/:id", enforceAuth, async (c) => {
    const { id } = c.req.param();
    const userId = c.get("user")!.id;
    const permanent = c.req.query("permanent") === "true";

    const result = await deleteCanvas(id, userId, permanent);
    return c.json(result);
  })

  // Change canvas scope
  .put(
    "/canvases/:id/scope",
    enforceAuth,
    zValidator("json", changeScopeInputSchema),
    async (c) => {
      const { id } = c.req.param();
      const input = c.req.valid("json");
      const userId = c.get("user")!.id;

      const result = await changeCanvasScope(id, input.scope, userId);
      return c.json(result);
    }
  )

  // List versions
  .get(
    "/canvases/:id/versions",
    enforceAuth,
    zValidator("query", listVersionsQuerySchema),
    async (c) => {
      const { id } = c.req.param();
      const query = c.req.valid("query");
      const userId = c.get("user")!.id;

      const result = await getCanvasVersions(id, userId, query);
      return c.json(result);
    }
  )

  // Get version
  .get("/canvases/:id/versions/:versionNumber", enforceAuth, async (c) => {
    const { id, versionNumber } = c.req.param();
    const userId = c.get("user")!.id;

    const version = await getCanvasVersion(
      id,
      parseInt(versionNumber),
      userId
    );
    return c.json(version);
  })

  // Restore version
  .post(
    "/canvases/:id/versions/:versionNumber/restore",
    enforceAuth,
    async (c) => {
      const { id, versionNumber } = c.req.param();
      const userId = c.get("user")!.id;

      const result = await restoreCanvasVersion(
        id,
        parseInt(versionNumber),
        userId
      );
      return c.json(result);
    }
  );
```

---

## Auto-Creation on Workspace Setup

When a workspace completes onboarding and analysis:

```typescript
// packages/api/src/modules/knosia/pipeline/index.ts

export async function runKnosiaPipeline(
  workspaceId: string,
  connectionId: string,
  userId: string
) {
  // ... existing analysis logic ...

  // Step 5: Generate default workspace canvas
  const liquidSchema = await generateCanvasFromAnalysis(
    detected,
    mapping,
    semanticLayer
  );

  await createDefaultWorkspaceCanvas({
    workspaceId,
    schema: liquidSchema,
    ownerId: userId,
  });

  return { analysisId, canvasCreated: true };
}

async function createDefaultWorkspaceCanvas(input: {
  workspaceId: string;
  schema: LiquidSchema;
  ownerId: string;
}) {
  const [canvas] = await db
    .insert(knosiaWorkspaceCanvas)
    .values({
      id: generateId(),
      workspaceId: input.workspaceId,
      title: "Main Dashboard",
      schema: input.schema,
      scope: "workspace",
      ownerId: input.ownerId,
      isDefault: true,
      currentVersion: 1,
      lastEditedBy: input.ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return canvas;
}
```

---

## Testing Checklist

### Unit Tests

- [ ] Permission functions (canViewCanvas, canEditCanvas, etc.)
- [ ] Version pruning logic (keeps last 50)
- [ ] Scope transition validation
- [ ] LiquidSchema validation

### Integration Tests

- [ ] Create private canvas → verify ownership
- [ ] Create workspace canvas → verify team access
- [ ] Update canvas → version created
- [ ] Update canvas with wrong version → 409 conflict
- [ ] Restore version → creates new version
- [ ] Delete canvas → soft delete
- [ ] Delete default canvas → error
- [ ] Change scope private→workspace → success
- [ ] Change scope workspace→private → error
- [ ] List canvases → filters by permission

### E2E Tests

- [ ] Full onboarding → default canvas created
- [ ] Edit canvas → save → reload → changes persist
- [ ] Multiple users edit workspace canvas → last write wins
- [ ] User creates private canvas → other users can't see
- [ ] Owner shares private→workspace → team gains access
- [ ] Restore old version → edit → version history correct

---

## Implementation Order

1. **Schema Migration** ✅ (Already completed)
2. **Schemas & Types** (`schemas.ts`)
3. **Permission Helpers** (`permissions.ts`)
4. **Queries** (`queries.ts`)
5. **Mutations** (`mutations.ts`)
6. **Router** (`router.ts`)
7. **Pipeline Integration** (auto-creation)
8. **Tests** (`*.test.ts`)

---

## Notes

- All timestamps are stored as `TIMESTAMP` in PostgreSQL
- All IDs use `generateId()` from `@turbostarter/shared/utils`
- Version history is write-heavy but read-light (optimize for writes)
- Soft delete allows recovery but needs cleanup cron job eventually
- LiquidSchema validation delegated to `@repo/liquid-render` package

---

**Status**: Ready for implementation
**Next**: Create `packages/api/src/modules/knosia/canvas/` module
