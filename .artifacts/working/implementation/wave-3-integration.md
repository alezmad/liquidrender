# Wave 3: Integration [SEQUENTIAL]

**Duration:** 5.5 days (+1.5 days from Wave 0 decisions)
**LOC:** ~1,020 (+420 LOC for canvas editing + RBAC)
**Files:** 10 (+4 new files for canvas editor)
**Mode:** SEQUENTIAL (must execute in order)

**⚠️ IMPORTANT:** This wave has been updated based on WAVE-0-DECISIONS-AND-CHANGES.md
- Canvas editing scope expanded (not just view-only)
- RBAC implementation added (bundled with canvas)
- Database migration required for new canvas schema

---

## Entry Criteria

- ✅ Wave 2 complete (all 4 glue functions working)
- ✅ `saveDetectedVocabulary()` tested
- ✅ `generateSemanticLayer()` tested
- ✅ `generateDashboardSpec()` tested
- ✅ `dashboardSpecToLiquidSchema()` tested

---

## Overview

Wave 3 integrates all glue functions into a unified pipeline and builds the HOME dashboard page.

**Why Sequential:** Each task depends on the previous one:
1. Pipeline orchestrator needs all glue functions
2. API endpoint needs pipeline
3. Onboarding needs API endpoint
4. HOME page needs onboarding + API

---

## Task 1: Pipeline Orchestrator

**File:** `packages/api/src/modules/knosia/pipeline/index.ts`
**LOC:** ~150
**Duration:** 1 day

### Purpose

Orchestrate the full flow from database connection to rendered dashboard.

### Reference

All glue functions from Wave 2:
- `saveDetectedVocabulary` from `../vocabulary/from-detected`
- `generateSemanticLayer` from `@repo/liquid-connect/semantic`
- `generateDashboardSpec` from `@repo/liquid-connect/dashboard`
- `dashboardSpecToLiquidSchema` from `@repo/liquid-render/dashboard`

Plus existing modules:
- Connection adapter from `@repo/liquid-connect/uvb/adapters`
- `extractSchema` from `@repo/liquid-connect/uvb`
- `applyHardRules` from `@repo/liquid-connect/uvb`
- `detectBusinessType` from `@repo/liquid-connect/business-types`
- `mapToTemplate` from `@repo/liquid-connect/business-types`
- `resolveVocabulary` from `../vocabulary/resolution`

### Implementation

```typescript
import { generateId } from "@turbostarter/shared/utils";
import { db } from "@turbostarter/db/server";
import { knosiaConnection, knosiaAnalysis } from "@turbostarter/db/schema";
import { eq } from "drizzle-orm";

// LiquidConnect imports
import { createAdapter } from "@repo/liquid-connect/uvb/adapters";
import { extractSchema, applyHardRules } from "@repo/liquid-connect/uvb";
import { detectBusinessType, mapToTemplate, getTemplate } from "@repo/liquid-connect/business-types";
import { generateSemanticLayer } from "@repo/liquid-connect/semantic";
import { generateDashboardSpec } from "@repo/liquid-connect/dashboard";
import { dashboardSpecToLiquidSchema } from "@repo/liquid-render/dashboard";

// Knosia imports
import { saveDetectedVocabulary } from "../vocabulary/from-detected";
import { resolveVocabulary } from "../vocabulary/resolution";

interface PipelineOptions {
  skipSaveVocabulary?: boolean;
  skipDashboardGeneration?: boolean;
  forceBusinessType?: BusinessType;
  debug?: boolean;
}

interface PipelineResult {
  success: boolean;
  analysisId: string;
  businessType: BusinessType | null;
  businessTypeConfidence: number;
  vocabularyStats: { metrics: number; dimensions: number; entities: number };
  dashboardSpec: DashboardSpec | null;
  liquidSchema: LiquidSchema | null;
  warnings: string[];
  errors: string[];
  debug?: {
    extractedSchema: ExtractedSchema;
    detectedVocabulary: DetectedVocabulary;
    resolvedVocabulary: ResolvedVocabulary;
    semanticLayer: SemanticLayer;
    mappingResult: MappingResult;
  };
}

export async function runKnosiaPipeline(
  connectionId: string,
  userId: string,
  workspaceId: string,
  options?: PipelineOptions
): Promise<PipelineResult> {
  const analysisId = generateId();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Step 1: Get connection details
    const [connection] = await db
      .select()
      .from(knosiaConnection)
      .where(eq(knosiaConnection.id, connectionId))
      .limit(1);

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Step 2: Create database adapter
    const adapter = createAdapter(connection.type, {
      connectionString: connection.connectionString,
    });

    // Step 3: Extract schema
    const extractedSchema = await extractSchema(adapter);

    // Step 4: Apply hard rules → DetectedVocabulary
    const detectedVocabulary = await applyHardRules(extractedSchema);

    // Step 5: Detect business type
    const detection = options?.forceBusinessType
      ? { primary: { type: options.forceBusinessType, confidence: 100 }, matches: [], ambiguous: false }
      : detectBusinessType(extractedSchema);

    if (!detection.primary) {
      warnings.push("No business type detected with sufficient confidence");
    }

    // Step 6: Save vocabulary to DB
    let vocabStats = { metrics: { created: 0, skipped: 0 }, dimensions: { created: 0, skipped: 0 }, entities: { created: 0, skipped: 0 }, errors: [] };
    if (!options?.skipSaveVocabulary) {
      vocabStats = await saveDetectedVocabulary(
        detectedVocabulary,
        connection.orgId,
        workspaceId
      );
    }

    // Step 7: Resolve vocabulary
    const resolvedVocabulary = await resolveVocabulary(userId, workspaceId);

    // Step 8: Generate semantic layer
    const semanticLayer = generateSemanticLayer(resolvedVocabulary, extractedSchema);

    // Step 9: Map to template & generate dashboard spec
    let dashboardSpec: DashboardSpec | null = null;
    let liquidSchema: LiquidSchema | null = null;
    let mappingResult: MappingResult | null = null;

    if (!options?.skipDashboardGeneration && detection.primary) {
      const template = getTemplate(detection.primary.type);
      mappingResult = mapToTemplate(detectedVocabulary, template);

      if (mappingResult.coverage < 50) {
        warnings.push(`Low KPI coverage: ${mappingResult.coverage}%`);
      }

      dashboardSpec = generateDashboardSpec(mappingResult);
      liquidSchema = dashboardSpecToLiquidSchema(dashboardSpec);
    }

    // Step 10: Store analysis results
    await db.insert(knosiaAnalysis).values({
      id: analysisId,
      connectionId,
      workspaceId,
      orgId: connection.orgId,
      status: "completed",
      businessType: detection.primary ? { type: detection.primary.type, confidence: detection.primary.confidence } : null,
      completedAt: new Date().toISOString(),
    });

    return {
      success: true,
      analysisId,
      businessType: detection.primary?.type || null,
      businessTypeConfidence: detection.primary?.confidence || 0,
      vocabularyStats: {
        metrics: vocabStats.metrics.created,
        dimensions: vocabStats.dimensions.created,
        entities: vocabStats.entities.created,
      },
      dashboardSpec,
      liquidSchema,
      warnings,
      errors,
      debug: options?.debug ? {
        extractedSchema,
        detectedVocabulary,
        resolvedVocabulary,
        semanticLayer,
        mappingResult: mappingResult!,
      } : undefined,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));

    // Store failed analysis
    await db.insert(knosiaAnalysis).values({
      id: analysisId,
      connectionId,
      workspaceId,
      orgId: connection?.orgId || "",
      status: "failed",
      completedAt: new Date().toISOString(),
    });

    return {
      success: false,
      analysisId,
      businessType: null,
      businessTypeConfidence: 0,
      vocabularyStats: { metrics: 0, dimensions: 0, entities: 0 },
      dashboardSpec: null,
      liquidSchema: null,
      warnings,
      errors,
    };
  }
}
```

**Issues:** PIPE-004, PIPE-012, INT-001

---

## Task 2: Analysis API Enhancement

**File:** `packages/api/src/modules/knosia/analysis/mutations.ts`
**LOC:** ~50 (modifications)
**Duration:** 0.5 days

### Purpose

Update analysis API to use the new pipeline.

### Modifications

```typescript
import { runKnosiaPipeline } from "../pipeline";

// Add new mutation
export async function triggerAnalysis(
  connectionId: string,
  userId: string,
  workspaceId: string
) {
  // Run pipeline
  const result = await runKnosiaPipeline(connectionId, userId, workspaceId, {
    debug: false,
  });

  return {
    analysisId: result.analysisId,
    success: result.success,
    businessType: result.businessType,
    confidence: result.businessTypeConfidence,
    vocabularyStats: result.vocabularyStats,
    warnings: result.warnings,
    errors: result.errors,
  };
}
```

**File:** `packages/api/src/modules/knosia/analysis/router.ts`

Add endpoint:
```typescript
.post(
  "/trigger",
  enforceAuth,
  validate("json", triggerAnalysisInputSchema),
  async (c) => {
    const { user } = c.get("auth");
    const { connectionId, workspaceId } = c.req.valid("json");

    const result = await triggerAnalysis(connectionId, user.id, workspaceId);
    return c.json(result);
  }
)
```

**Issues:** API-001, PIPE-005

---

## Task 3: Onboarding Enhancement

**Files:**
- `apps/web/src/modules/onboarding/components/analysis/analysis-step.tsx` (modify)
- `apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts` (modify)

**LOC:** ~100 (modifications)
**Duration:** 1 day

### Purpose

Show business type detection progress in onboarding.

### Modifications

**hooks/use-onboarding-state.ts:**
```typescript
interface OnboardingProgress {
  connectionId: string | null;
  analysisId: string | null;
  businessType: BusinessType | null;  // NEW
  businessTypeConfidence: number;     // NEW
  workspaceId: string | null;
  selectedRole: UserRole | null;
  completedSteps: OnboardingStep[];
}

// Add actions
setBusinessType: (type: BusinessType, confidence: number) => void;
```

**components/analysis/analysis-step.tsx:**
```typescript
// Show business type detection in progress
{analysis && analysis.businessType && (
  <div className="mt-4">
    <div className="text-sm font-medium">
      Detected: {analysis.businessType}
      ({analysis.businessTypeConfidence}% confidence)
    </div>
  </div>
)}
```

**Issues:** UI-002, ONB-001

---

## Task 4: Canvas Editor + RBAC

**Duration:** 2 days (+1.5 days from original plan)
**LOC:** ~420 (was ~50)
**Dependencies:** Wave 2 complete, Analysis API, database migration

### Purpose

Implement full canvas editor with drag-drop, RBAC, save/load functionality.

**Original Plan:** View-only canvas (50 LOC, 0.5 days)
**Updated Plan:** Full editor with permissions (420 LOC, 2 days)

### Subtasks

#### Task 4.1: Database Migration

**Duration:** 0.5 hours
**LOC:** ~20

Generate and apply migration for new canvas schema:

```bash
pnpm with-env -F @turbostarter/db db:generate
# Creates migration for:
# - CREATE ENUM knosia_canvas_source_type
# - DROP TABLE knosia_canvas_block, knosia_canvas_alert, knosia_canvas
# - CREATE TABLE knosia_workspace_canvas
pnpm with-env -F @turbostarter/db db:migrate
```

**Issues:** CANVAS-MIGRATION-001

---

#### Task 4.2: Canvas API with RBAC

**File:** `packages/api/src/modules/knosia/canvas/router.ts` (create)
**LOC:** ~100
**Duration:** 0.5 days

**Implementation:**
```typescript
import { Hono } from "hono";
import { enforceAuth } from "../../../middleware";
import { knosiaWorkspaceCanvas, knosiaWorkspaceMembership } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { eq, and } from "drizzle-orm";
import { generateId } from "@turbostarter/shared/utils";

export const canvasRouter = new Hono()
  // GET /canvas/:workspaceId - Load canvas
  .get('/:workspaceId', enforceAuth, async (c) => {
    const { workspaceId } = c.req.param();
    const userId = c.get('user').id;

    // Check workspace membership (canView)
    const [membership] = await db
      .select()
      .from(knosiaWorkspaceMembership)
      .where(
        and(
          eq(knosiaWorkspaceMembership.workspaceId, workspaceId),
          eq(knosiaWorkspaceMembership.userId, userId)
        )
      )
      .limit(1);

    if (!membership) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Get canvas
    const [canvas] = await db
      .select()
      .from(knosiaWorkspaceCanvas)
      .where(eq(knosiaWorkspaceCanvas.workspaceId, workspaceId))
      .limit(1);

    return c.json(canvas || null);
  })

  // POST /canvas/:workspaceId - Save canvas (requires canEdit)
  .post('/:workspaceId', enforceAuth, async (c) => {
    const { workspaceId } = c.req.param();
    const userId = c.get('user').id;
    const body = await c.req.json();

    // Check edit permission
    const [membership] = await db
      .select()
      .from(knosiaWorkspaceMembership)
      .where(
        and(
          eq(knosiaWorkspaceMembership.workspaceId, workspaceId),
          eq(knosiaWorkspaceMembership.userId, userId)
        )
      )
      .limit(1);

    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      return c.json({ error: 'Forbidden - edit permission required' }, 403);
    }

    // Upsert canvas
    const [canvas] = await db
      .insert(knosiaWorkspaceCanvas)
      .values({
        id: generateId(),
        workspaceId,
        schema: body.schema,
        sourceType: body.sourceType || 'custom',
        templateId: body.templateId,
        lastEditedBy: userId,
      })
      .onConflictDoUpdate({
        target: knosiaWorkspaceCanvas.workspaceId,
        set: {
          schema: body.schema,
          sourceType: body.sourceType || 'hybrid',
          lastEditedBy: userId,
          updatedAt: new Date(),
        },
      })
      .returning();

    return c.json(canvas);
  });
```

**Issues:** CANVAS-001, RBAC-001

---

#### Task 4.3: useCanvasPermissions Hook

**File:** `apps/web/src/modules/knosia/canvas/hooks/use-canvas-permissions.ts` (create)
**LOC:** ~30
**Duration:** 0.5 hours

**Implementation:**
```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api/client";
import { handle } from "@turbostarter/api/utils";

export function useCanvasPermissions(workspaceId: string) {
  // Get current user's membership
  const { data: membership } = useQuery({
    queryKey: ['workspace', workspaceId, 'membership'],
    queryFn: async () => {
      const res = await api.workspaces[':id'].membership.$get({
        param: { id: workspaceId }
      });
      return res.json();
    }
  });

  const role = membership?.role;

  return {
    canView: !!membership,
    canEdit: role === 'admin' || role === 'owner',
    canReset: role === 'owner',
  };
}
```

**Issues:** RBAC-002

---

#### Task 4.4: CanvasEditorToolbar

**File:** `apps/web/src/modules/knosia/canvas/components/canvas-editor-toolbar.tsx` (create)
**LOC:** ~50
**Duration:** 0.25 days

**Implementation:**
```typescript
import { Button } from "@turbostarter/ui-web/button";

interface CanvasEditorToolbarProps {
  mode: 'view' | 'edit';
  onModeChange: (mode: 'view' | 'edit') => void;
  onReset: () => void;
  canEdit: boolean;
  canReset: boolean;
}

export function CanvasEditorToolbar({
  mode,
  onModeChange,
  onReset,
  canEdit,
  canReset,
}: CanvasEditorToolbarProps) {
  if (!canEdit) return null;

  return (
    <div className="flex items-center justify-between border-b p-4">
      <div className="flex gap-2">
        <Button
          variant={mode === 'view' ? 'default' : 'outline'}
          onClick={() => onModeChange(mode === 'view' ? 'edit' : 'view')}
        >
          {mode === 'view' ? 'Edit' : 'Done'}
        </Button>

        {mode === 'edit' && (
          <Button variant="outline" onClick={onReset} disabled={!canReset}>
            Reset to Template
          </Button>
        )}
      </div>
    </div>
  );
}
```

**Issues:** UI-013

---

#### Task 4.5: BlockPalette

**File:** `apps/web/src/modules/knosia/canvas/components/block-palette.tsx` (create)
**LOC:** ~100
**Duration:** 0.25 days

**Implementation:**
```typescript
import { useState } from "react";
import { Input } from "@turbostarter/ui-web/input";
import { ScrollArea } from "@turbostarter/ui-web/scroll-area";

interface BlockPaletteProps {
  vocabularyItems: VocabularyItem[];
  onAddBlock: (item: VocabularyItem) => void;
}

export function BlockPalette({ vocabularyItems, onAddBlock }: BlockPaletteProps) {
  const [search, setSearch] = useState('');

  const filtered = vocabularyItems.filter(item =>
    item.canonicalName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-64 border-r p-4">
      <Input
        placeholder="Search metrics..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-2">
          {filtered.map(item => (
            <div
              key={item.id}
              className="p-2 border rounded cursor-pointer hover:bg-accent"
              onClick={() => onAddBlock(item)}
            >
              <div className="font-medium text-sm">{item.canonicalName}</div>
              <div className="text-xs text-muted-foreground">{item.type}</div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

**Issues:** UI-014

---

#### Task 4.6: EditableCanvas

**File:** `apps/web/src/modules/knosia/canvas/components/editable-canvas.tsx` (create)
**LOC:** ~150
**Duration:** 0.5 days

**Note:** V1 editing is simplified (add/remove blocks, no drag-drop).

**Implementation:**
```typescript
import { useState } from "react";
import { LiquidUI } from "@repo/liquid-render";
import { Button } from "@turbostarter/ui-web/button";
import type { LiquidSchema } from "@repo/liquid-render";

interface EditableCanvasProps {
  schema: LiquidSchema;
  onSave: (schema: LiquidSchema) => void;
}

export function EditableCanvas({ schema, onSave }: EditableCanvasProps) {
  const [editedSchema, setEditedSchema] = useState(schema);

  const addBlock = (vocabularyItem: VocabularyItem) => {
    // Add new KPI block to schema
    const newBlock = {
      uid: generateBlockId(),
      type: 'kpi',
      binding: { kind: 'field', value: vocabularyItem.slug },
      label: vocabularyItem.canonicalName,
    };

    const updated = {
      ...editedSchema,
      layers: [{
        ...editedSchema.layers[0],
        root: {
          ...editedSchema.layers[0].root,
          children: [
            ...(editedSchema.layers[0].root.children || []),
            newBlock
          ]
        }
      }]
    };

    setEditedSchema(updated);
  };

  const removeBlock = (blockId: string) => {
    // Remove block from schema
    const updated = {
      ...editedSchema,
      layers: [{
        ...editedSchema.layers[0],
        root: {
          ...editedSchema.layers[0].root,
          children: editedSchema.layers[0].root.children.filter(
            b => b.uid !== blockId
          )
        }
      }]
    };

    setEditedSchema(updated);
  };

  return (
    <div className="relative">
      {/* Render with delete buttons on hover */}
      <LiquidUI schema={editedSchema} data={{}} />

      {/* Overlay delete buttons */}
      <BlockDeleteOverlay schema={editedSchema} onDelete={removeBlock} />

      {/* Save button */}
      <div className="fixed bottom-4 right-4">
        <Button onClick={() => onSave(editedSchema)}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
```

**Issues:** UI-015, CANVAS-002

---

#### Task 4.7: CanvasWorkspace (Main Component)

**File:** `apps/web/src/modules/knosia/canvas/components/canvas-workspace.tsx` (create)
**LOC:** ~100
**Duration:** 0.5 days

**Implementation:**
```typescript
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "~/lib/api/client";
import { dashboardSpecToLiquidSchema } from "@repo/liquid-render/dashboard";
import { LiquidUI } from "@repo/liquid-render";
import { CanvasEditorToolbar } from "./canvas-editor-toolbar";
import { EditableCanvas } from "./editable-canvas";
import { BlockPalette } from "./block-palette";
import { useCanvasPermissions } from "../hooks/use-canvas-permissions";

export function CanvasWorkspace({
  workspaceId,
  initialSpec
}: {
  workspaceId: string;
  initialSpec: DashboardSpec;
}) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const permissions = useCanvasPermissions(workspaceId);

  // Load saved canvas
  const { data: savedCanvas } = useQuery({
    queryKey: ['knosia', 'canvas', workspaceId],
    queryFn: async () => {
      const res = await api.knosia.canvas[':workspaceId'].$get({
        param: { workspaceId }
      });
      return res.json();
    }
  });

  // Save canvas mutation
  const saveMutation = useMutation({
    mutationFn: async (schema: LiquidSchema) => {
      const res = await api.knosia.canvas[':workspaceId'].$post({
        param: { workspaceId },
        json: {
          schema,
          sourceType: savedCanvas ? 'hybrid' : 'custom',
          templateId: initialSpec.businessType,
        }
      });
      return res.json();
    },
    onSuccess: () => {
      setMode('view');
    }
  });

  // Use saved canvas if exists, otherwise generate from spec
  const schema = savedCanvas?.schema
    ? savedCanvas.schema
    : dashboardSpecToLiquidSchema(initialSpec);

  // Reset to template
  const handleReset = () => {
    const templateSchema = dashboardSpecToLiquidSchema(initialSpec);
    saveMutation.mutate(templateSchema);
  };

  return (
    <div className="flex flex-col h-screen">
      <CanvasEditorToolbar
        mode={mode}
        onModeChange={setMode}
        onReset={handleReset}
        canEdit={permissions.canEdit}
        canReset={permissions.canReset}
      />

      <div className="flex flex-1 overflow-hidden">
        {mode === 'edit' && permissions.canEdit && (
          <BlockPalette
            vocabularyItems={[]} // Load from workspace vocabulary
            onAddBlock={(item) => {}}
          />
        )}

        <div className="flex-1 overflow-auto p-6">
          {mode === 'edit' ? (
            <EditableCanvas
              schema={schema}
              onSave={(s) => saveMutation.mutate(s)}
            />
          ) : (
            <LiquidUI schema={schema} data={{}} />
          )}
        </div>
      </div>
    </div>
  );
}
```

**Issues:** CANVAS-003, INT-002

---

## Task 5: HOME Page Implementation

**Files:**
- `apps/web/src/app/[locale]/dashboard/[organization]/knosia/page.tsx` (create)

**LOC:** ~50
**Duration:** 0.5 days

### Purpose

Create the HOME page that uses CanvasWorkspace for displaying/editing KPIs.

### Implementation

**page.tsx:**
```typescript
import { redirect } from "next/navigation";
import { getSession } from "~/lib/auth/server";
import { pathsConfig } from "~/config/paths";
import { CanvasWorkspace } from "~/modules/knosia/canvas";

export default async function KnosiaHomePage({
  params
}: {
  params: { organization: string }
}) {
  const { user } = await getSession();
  if (!user) return redirect(pathsConfig.auth.login);

  // Get workspace for org
  const workspace = await getWorkspaceForOrg(params.organization);

  // Get auto-generated dashboard spec
  const dashboardSpec = await getDashboardSpec(workspace.id);

  return (
    <CanvasWorkspace
      workspaceId={workspace.id}
      initialSpec={dashboardSpec}
    />
  );
}
```

**Issues:** UI-003, HOME-001

---

## Task 6: Routing & Navigation

**Files:**
- `apps/web/src/config/paths.ts` (modify)
- `apps/web/src/app/[locale]/dashboard/[organization]/layout.tsx` (modify)

**LOC:** ~50
**Duration:** 0.5 days

### Modifications

**paths.ts:**
```typescript
knosia: {
  home: (org: string) => `/dashboard/${org}/knosia`,  // Canvas IS home
  thread: (org: string) => `/dashboard/${org}/knosia/thread`,
  vocabulary: (org: string) => `/dashboard/${org}/knosia/vocabulary`,
  // NO separate /canvas route - HOME is the canvas
},
```

**layout.tsx:**
Add Knosia to sidebar menu.

**Note:** The `/canvas` route has been removed. HOME page IS the canvas now.

**Issues:** NAV-001

---

## Wave 3 Summary

**Updated Totals:**
- Duration: **5.5 days** (was 4 days, +1.5 days)
- LOC: **~1,020** (was ~600, +420 LOC)
- Files: **10** (was 6, +4 files)

**New Files Created:**
1. `packages/api/src/modules/knosia/canvas/router.ts`
2. `apps/web/src/modules/knosia/canvas/hooks/use-canvas-permissions.ts`
3. `apps/web/src/modules/knosia/canvas/components/canvas-editor-toolbar.tsx`
4. `apps/web/src/modules/knosia/canvas/components/block-palette.tsx`
5. `apps/web/src/modules/knosia/canvas/components/editable-canvas.tsx`
6. `apps/web/src/modules/knosia/canvas/components/canvas-workspace.tsx`

**Files Modified:**
1. `packages/api/src/modules/knosia/pipeline/index.ts`
2. `packages/api/src/modules/knosia/analysis/mutations.ts`
3. `apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts`
4. `apps/web/src/modules/onboarding/components/analysis/analysis-step.tsx`

**Issues Closed:**
- **Original:** DASH-004, CANVAS-001, NAV-001
- **Added:** RBAC-001, RBAC-002, UI-013, UI-014, UI-015, CANVAS-002, CANVAS-003, CANVAS-MIGRATION-001

---

## Exit Criteria

- ✅ All 10 files created/modified (was 6, +4 for canvas editor)
- ✅ Pipeline orchestrator works end-to-end:
  ```bash
  # Test pipeline
  pnpm --filter @turbostarter/api test pipeline
  ```
- ✅ Analysis API endpoint responds:
  ```bash
  curl -X POST http://localhost:3000/api/knosia/analysis/trigger \
    -H "Content-Type: application/json" \
    -d '{"connectionId":"...", "workspaceId":"..."}'
  ```
- ✅ Canvas loads with auto-generated dashboard:
  ```bash
  # Navigate to /dashboard/[org]/knosia
  # Should show canvas with KPIs
  ```
- ✅ Canvas editing works:
  - Admins see Edit button, members don't
  - Edit mode allows add/remove blocks
  - Canvas saves and persists
  - Reset to template works
- ✅ RBAC enforced:
  - API returns 403 for non-admins on POST
  - UI hides Edit button for viewers
  - Permissions check doesn't race
- ✅ Database migration applied:
  ```bash
  # knosia_workspace_canvas table exists
  # knosia_canvas_source_type enum exists
  ```
- ✅ Onboarding shows business type detection
- ✅ Git commit:
  ```bash
  git add packages/api/src/modules/knosia/pipeline/
  git add packages/api/src/modules/knosia/analysis/
  git add packages/api/src/modules/knosia/canvas/
  git add apps/web/src/modules/knosia/canvas/
  git add apps/web/src/app/[locale]/dashboard/[organization]/knosia/
  git add apps/web/src/modules/onboarding/
  git commit -m "feat(knosia): wave-3 - integration, canvas editor & RBAC

  Wave 3: Integration (sequential tasks, 5.5 days)
  Task 1: Pipeline orchestrator (runKnosiaPipeline)
  Task 2: Analysis API enhancement
  Task 3: Onboarding business type display
  Task 4: Canvas Editor + RBAC (7 subtasks, 2 days)
    - Database migration (new canvas schema)
    - Canvas API with permission checks
    - useCanvasPermissions hook
    - CanvasEditorToolbar (Edit/Done toggle)
    - BlockPalette (vocabulary item picker)
    - EditableCanvas (add/remove blocks)
    - CanvasWorkspace (main component)
  Task 5: HOME page (canvas integration)
  Task 6: Routing & navigation

  Closes: #PIPE-004 #PIPE-005 #PIPE-012 #INT-001 #INT-002
  Closes: #API-001 #UI-002 #UI-003 #UI-013 #UI-014 #UI-015
  Closes: #ONB-001 #HOME-001 #NAV-001
  Closes: #CANVAS-001 #CANVAS-002 #CANVAS-003 #CANVAS-MIGRATION-001
  Closes: #RBAC-001 #RBAC-002"
  ```

---

## Next Wave

After Wave 3 completes, proceed to **Wave 4: UI** which builds:
- Thread interface (chat with AI)
- Query result rendering
- Follow-up suggestions

---

*Wave 3 complete. Full pipeline integrated, HOME page live.*
