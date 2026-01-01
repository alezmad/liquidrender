# Knosia Implementation Gaps

**Date:** 2025-12-31
**Reference:** `.artifacts/2025-12-31-knosia-vision-implementation-spec.md`
**Previous Workflow:** WF-0030 (marked complete but descoped)

---

## Executive Summary

WF-0030 delivered schema foundation and basic CRUD, but left significant gaps:
- 6 Thread API endpoints not implemented
- Block Trust (provenance) system not started
- AI insight generation not built
- AI canvas generation/editing are TODOs
- Zero dashboard pages created (components exist but unmounted)
- Sidebar menu missing Canvases and Threads links

---

## Gap 1: Thread API Endpoints

**Location:** `packages/api/src/modules/knosia/thread/router.ts`
**Spec Reference:** Lines 477-504

### Missing Endpoints

```typescript
// 1. Fork a thread from a specific message
.post("/:id/fork", enforceAuth, async (c) => {
  const { id } = c.req.param();
  const { fromMessageId, name } = await c.req.json();
  const fork = await forkThread(id, fromMessageId, name, c.var.user.id);
  return c.json(fork, 201);
})

// 2. Create a snapshot (frozen state)
.post("/:id/snapshot", enforceAuth, async (c) => {
  const { id } = c.req.param();
  const { name, description } = await c.req.json();
  const snapshot = await createThreadSnapshot(id, name, description, c.var.user.id);
  return c.json(snapshot, 201);
})

// 3. List snapshots
.get("/:id/snapshots", enforceAuth, async (c) => {
  const { id } = c.req.param();
  const snapshots = await getThreadSnapshots(id, c.var.user.id);
  return c.json({ data: snapshots });
})

// 4. Star a thread
.post("/:id/star", enforceAuth, async (c) => {
  const { id } = c.req.param();
  const thread = await starThread(id, c.var.user.id);
  return c.json(thread);
})

// 5. Unstar a thread
.delete("/:id/star", enforceAuth, async (c) => {
  const { id } = c.req.param();
  const thread = await unstarThread(id, c.var.user.id);
  return c.json(thread);
})

// 6. Share with users
.post("/:id/share", enforceAuth, async (c) => {
  const { id } = c.req.param();
  const { userIds, mode } = await c.req.json(); // mode: "view" | "collaborate"
  const result = await shareThread(id, userIds, mode);
  return c.json(result);
})
```

### Required Mutations

**File:** `packages/api/src/modules/knosia/thread/mutations.ts`

```typescript
export async function forkThread(
  threadId: string,
  fromMessageId: string,
  name: string,
  userId: string
): Promise<Thread>

export async function createThreadSnapshot(
  threadId: string,
  name: string,
  description: string | undefined,
  userId: string
): Promise<ThreadSnapshot>

export async function starThread(threadId: string, userId: string): Promise<Thread>
export async function unstarThread(threadId: string, userId: string): Promise<Thread>

export async function shareThread(
  threadId: string,
  userIds: string[],
  mode: "view" | "collaborate"
): Promise<{ success: boolean; sharedWith: string[] }>
```

### Required Queries

**File:** `packages/api/src/modules/knosia/thread/queries.ts`

```typescript
export async function getThreadSnapshots(
  threadId: string,
  userId: string
): Promise<ThreadSnapshot[]>
```

### Required Schemas

**File:** `packages/api/src/modules/knosia/thread/schemas.ts`

```typescript
export const forkThreadInputSchema = z.object({
  fromMessageId: z.string(),
  name: z.string().min(1).max(255),
});

export const createSnapshotInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const shareThreadInputSchema = z.object({
  userIds: z.array(z.string()).min(1),
  mode: z.enum(["view", "collaborate"]),
});
```

---

## Gap 2: Block Trust Metadata (Provenance)

**Location:** `packages/liquid-connect/src/executor/`
**Spec Reference:** Lines 535-559

### Overview

Every query result should include provenance metadata so users know:
- When data was fetched (freshness)
- What tables/sources were used
- Confidence level (exact, calculated, estimated, predicted)
- Any assumptions made

### Implementation

**New File:** `packages/liquid-connect/src/executor/provenance.ts`

```typescript
export interface Provenance {
  freshness: string;           // "As of Dec 31, 2:30 PM"
  sources: {
    name: string;              // "Stripe.subscriptions"
    query?: string;            // SQL preview (truncated)
  }[];
  assumptions?: string[];      // ["USD only", "excludes refunds"]
  confidenceLevel: "exact" | "calculated" | "estimated" | "predicted";
  confidenceScore: number;     // 0-100
}

export function calculateConfidence(
  query: string,
  sources: string[]
): { level: Provenance["confidenceLevel"]; score: number } {
  // Heuristics:
  // - Direct SELECT from single table = exact (95-100)
  // - JOINs = calculated (80-94)
  // - Aggregations with GROUP BY = calculated (75-89)
  // - SAMPLE or LIMIT with extrapolation = estimated (50-74)
  // - ML predictions = predicted (30-49)

  const hasJoins = /\bJOIN\b/i.test(query);
  const hasAggregation = /\b(SUM|AVG|COUNT|MIN|MAX)\b/i.test(query);
  const hasSample = /\bSAMPLE\b/i.test(query);
  const hasLimit = /\bLIMIT\b/i.test(query);

  if (hasSample) {
    return { level: "estimated", score: 65 };
  }
  if (hasJoins && hasAggregation) {
    return { level: "calculated", score: 82 };
  }
  if (hasAggregation) {
    return { level: "calculated", score: 88 };
  }
  if (hasJoins) {
    return { level: "calculated", score: 85 };
  }
  return { level: "exact", score: 98 };
}

export function generateProvenance(
  query: string,
  tables: string[],
  executedAt: Date
): Provenance {
  const { level, score } = calculateConfidence(query, tables);

  return {
    freshness: formatFreshness(executedAt),
    sources: tables.map(t => ({ name: t, query: truncateQuery(query) })),
    confidenceLevel: level,
    confidenceScore: score,
  };
}

function formatFreshness(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60000) return "Just now";
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)} min ago`;

  return `As of ${date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function truncateQuery(query: string, maxLength = 100): string {
  if (query.length <= maxLength) return query;
  return query.substring(0, maxLength) + "...";
}
```

### Integration Point

**File:** `packages/liquid-connect/src/query/executor.ts`

```typescript
import { generateProvenance } from "../executor/provenance";

export interface QueryResult {
  data: unknown[];
  metadata: {
    rowCount: number;
    executionTimeMs: number;
  };
  provenance: Provenance; // ADD THIS
}

export async function executeQuery(sql: string, connection: Connection): Promise<QueryResult> {
  const startTime = Date.now();
  const tables = extractTablesFromQuery(sql);

  const result = await connection.query(sql);

  return {
    data: result.rows,
    metadata: {
      rowCount: result.rows.length,
      executionTimeMs: Date.now() - startTime,
    },
    provenance: generateProvenance(sql, tables, new Date()),
  };
}
```

### Frontend Component

**File:** `apps/web/src/modules/knosia/threads/components/block-trust-badge.tsx`

Component EXISTS but needs data. Wire it to receive provenance from thread messages:

```typescript
// In thread-message.tsx
{message.provenance && (
  <BlockTrustBadge provenance={message.provenance} />
)}
```

---

## Gap 3: AI Insight Generation

**Location:** `packages/api/src/modules/knosia/insight/`
**Spec Reference:** Lines 609-636

### Overview

Daily AI analysis that generates 1-3 proactive insights per workspace.

### Implementation

**New File:** `packages/api/src/modules/knosia/insight/mutations.ts`

```typescript
import { db } from "@turbostarter/db/server";
import { knosiaAiInsight } from "@turbostarter/db/schema";
import { generateId } from "@turbostarter/shared/utils";

export async function generateDailyInsights(workspaceId: string): Promise<void> {
  // 1. Get recent metrics data
  const metrics = await getWorkspaceMetrics(workspaceId);

  // 2. Detect anomalies (values outside 2 std deviations)
  const anomalies = detectAnomalies(metrics);

  // 3. Find patterns (compare to historical)
  const patterns = findPatterns(metrics);

  // 4. Generate insights (max 3 per day for "balanced" setting)
  const insights = [...anomalies, ...patterns]
    .sort((a, b) => severityScore(b.severity) - severityScore(a.severity))
    .slice(0, 3);

  // 5. Store in knosia_ai_insight
  for (const insight of insights) {
    await db.insert(knosiaAiInsight).values({
      id: generateId(),
      workspaceId,
      headline: insight.headline,
      explanation: insight.explanation,
      evidence: insight.evidence,
      severity: insight.severity,
      category: insight.category,
      status: "pending",
    });
  }
}

interface AnomalyCandidate {
  headline: string;
  explanation: string;
  evidence: {
    metric: string;
    currentValue: number;
    previousValue?: number;
    changePercent?: number;
    pattern?: string;
  };
  severity: "info" | "warning" | "critical";
  category: "anomaly" | "trend" | "pattern" | "correlation";
}

function detectAnomalies(metrics: MetricData[]): AnomalyCandidate[] {
  // Compare current values to rolling average
  // Flag anything > 2 standard deviations
  return [];
}

function findPatterns(metrics: MetricData[]): AnomalyCandidate[] {
  // Look for:
  // - Consistent week-over-week trends
  // - Seasonal patterns
  // - Correlations between metrics
  return [];
}

function severityScore(severity: string): number {
  return { critical: 3, warning: 2, info: 1 }[severity] || 0;
}
```

### Cron Job (Future)

This needs a scheduled job to run daily. For now, expose via API:

```typescript
// packages/api/src/modules/knosia/insight/router.ts
.post("/generate", enforceAuth, async (c) => {
  const { workspaceId } = await c.req.json();
  await generateDailyInsights(workspaceId);
  return c.json({ success: true });
})
```

---

## Gap 4: AI Canvas Generation

**Location:** `packages/api/src/modules/knosia/canvas/router.ts`
**Spec Reference:** Lines 697-712

### Current State

Lines 153-154 and 179-180 have TODO comments:
```typescript
// TODO: Implement AI canvas generation
// TODO: Implement AI canvas editing
```

### Implementation

```typescript
// POST /generate - AI generates Canvas from prompt
.post("/generate", enforceAuth, async (c) => {
  const { prompt, roleId, workspaceId } = await c.req.json();

  // 1. Get role context (what metrics this role cares about)
  const roleContext = await getRoleContext(roleId);

  // 2. Get available vocabulary items
  const vocabulary = await getWorkspaceVocabulary(workspaceId);

  // 3. Use AI to generate canvas structure
  const canvasSpec = await generateCanvasFromAI({
    prompt,
    roleContext,
    vocabulary,
  });

  // 4. Create canvas and blocks
  const canvas = await createCanvas({
    workspaceId,
    createdBy: c.var.user.id,
    name: canvasSpec.name,
    description: canvasSpec.description,
    isAiGenerated: true,
  });

  for (const blockSpec of canvasSpec.blocks) {
    await createCanvasBlock({
      canvasId: canvas.id,
      ...blockSpec,
    });
  }

  return c.json(canvas, 201);
})

// POST /:id/edit - Natural language edit
.post("/:id/edit", enforceAuth, async (c) => {
  const { id } = c.req.param();
  const { instruction } = await c.req.json();

  // 1. Get current canvas state
  const canvas = await getCanvasWithBlocks(id);

  // 2. Use AI to interpret instruction and generate changes
  const changes = await interpretCanvasEdit({
    canvas,
    instruction, // "Add churn by region chart"
  });

  // 3. Apply changes
  for (const change of changes) {
    if (change.type === "add") {
      await createCanvasBlock({ canvasId: id, ...change.block });
    } else if (change.type === "update") {
      await updateCanvasBlock(change.blockId, change.updates);
    } else if (change.type === "remove") {
      await deleteCanvasBlock(change.blockId);
    }
  }

  return c.json({ success: true, changes });
})
```

---

## Gap 5: Comment Mention Notifications

**Location:** `packages/api/src/modules/knosia/comment/router.ts`
**Spec Reference:** Lines 806-813

### Current State

Line 75-78 has TODO:
```typescript
// TODO: Notify mentioned users
```

### Implementation

```typescript
// In comment creation endpoint, after inserting comment:
if (mentions?.length) {
  await notifyMentions(mentions, comment, c.var.user.id);
}

// Helper function
async function notifyMentions(
  mentionedUserIds: string[],
  comment: Comment,
  authorId: string
): Promise<void> {
  const author = await getUser(authorId);

  for (const userId of mentionedUserIds) {
    await db.insert(knosiaNotification).values({
      id: generateId(),
      userId,
      workspaceId: comment.workspaceId,
      type: "mention",
      title: `${author.name} mentioned you`,
      body: truncate(comment.content, 100),
      sourceType: comment.targetType,
      sourceId: comment.targetId,
      actions: {
        primary: {
          label: "View",
          href: getCommentLink(comment),
        },
      },
    });
  }
}
```

---

## Gap 6: Digest Preview Content

**Location:** `packages/api/src/modules/knosia/notification/router.ts`
**Spec Reference:** Lines 858-862

### Current State

Lines 208-218 return stub data with empty sections.

### Implementation

```typescript
.post("/:id/preview", enforceAuth, async (c) => {
  const { id } = c.req.param();
  const digest = await getDigest(id);

  if (!digest) {
    return c.json({ error: "Digest not found" }, 404);
  }

  // Generate actual preview content
  const preview = await generateDigestPreview(digest);

  return c.json(preview);
})

async function generateDigestPreview(digest: Digest): Promise<DigestPreview> {
  const sections: DigestSection[] = [];

  // 1. Canvas metrics
  if (digest.include.canvasIds?.length) {
    const canvasData = await getCanvasesData(digest.include.canvasIds);
    sections.push({
      title: "Canvas Highlights",
      items: canvasData.map(c => ({
        label: c.name,
        value: c.summary,
      })),
    });
  }

  // 2. Metrics
  if (digest.include.metrics?.length) {
    const metricsData = await getMetricsData(
      digest.workspaceId,
      digest.include.metrics
    );
    sections.push({
      title: "Key Metrics",
      items: metricsData.map(m => ({
        label: m.name,
        value: formatMetricValue(m),
        change: m.change,
      })),
    });
  }

  // 3. Alerts
  if (digest.include.includeAlerts) {
    const alerts = await getRecentAlerts(digest.workspaceId);
    if (alerts.length) {
      sections.push({
        title: "Alerts",
        items: alerts.map(a => ({
          label: a.name,
          value: a.message,
          severity: a.severity,
        })),
      });
    }
  }

  // 4. AI Insights
  if (digest.include.includeAiInsights) {
    const insights = await getRecentInsights(digest.workspaceId);
    if (insights.length) {
      sections.push({
        title: "AI Insights",
        items: insights.map(i => ({
          label: i.headline,
          value: i.explanation,
        })),
      });
    }
  }

  return {
    digestId: digest.id,
    name: digest.name,
    generatedAt: new Date().toISOString(),
    sections,
  };
}
```

---

## Gap 7: Dashboard Pages

**Location:** `apps/web/src/app/[locale]/dashboard/`
**Spec Reference:** Lines 879-888

### Routes Needed

| Route | Page File | Component |
|-------|-----------|-----------|
| `/dashboard` | `(user)/page.tsx` | Update to use `<BriefView />` |
| `/dashboard/canvases` | `(user)/canvases/page.tsx` | `<CanvasView />` list mode |
| `/dashboard/canvases/[id]` | `(user)/canvases/[id]/page.tsx` | `<CanvasView />` detail |
| `/dashboard/threads` | `(user)/threads/page.tsx` | `<ThreadSidebar />` + list |
| `/dashboard/threads/[id]` | `(user)/threads/[id]/page.tsx` | `<ThreadView />` |
| `/dashboard/team` | `(user)/team/page.tsx` | New `<TeamView />` |
| `/dashboard/settings` | `(user)/settings/page.tsx` | Existing or new |

### Page Templates

**File:** `apps/web/src/app/[locale]/dashboard/(user)/canvases/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { getSession } from "~/lib/auth/server";
import { pathsConfig } from "~/config/paths";
import { CanvasListView } from "~/modules/knosia";

export default async function CanvasesPage() {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return <CanvasListView />;
}
```

**File:** `apps/web/src/app/[locale]/dashboard/(user)/canvases/[id]/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { getSession } from "~/lib/auth/server";
import { pathsConfig } from "~/config/paths";
import { CanvasView } from "~/modules/knosia";

export default async function CanvasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getSession();
  const { id } = await params;

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return <CanvasView canvasId={id} />;
}
```

**File:** `apps/web/src/app/[locale]/dashboard/(user)/threads/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { getSession } from "~/lib/auth/server";
import { pathsConfig } from "~/config/paths";
import { ThreadSidebar } from "~/modules/knosia";

export default async function ThreadsPage() {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return (
    <div className="flex h-full">
      <ThreadSidebar />
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a thread to view
      </div>
    </div>
  );
}
```

**File:** `apps/web/src/app/[locale]/dashboard/(user)/threads/[id]/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { getSession } from "~/lib/auth/server";
import { pathsConfig } from "~/config/paths";
import { ThreadSidebar, ThreadView } from "~/modules/knosia";

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getSession();
  const { id } = await params;

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return (
    <div className="flex h-full">
      <ThreadSidebar selectedId={id} />
      <div className="flex-1">
        <ThreadView threadId={id} />
      </div>
    </div>
  );
}
```

---

## Gap 8: Sidebar Menu

**Location:** `apps/web/src/app/[locale]/dashboard/(user)/layout.tsx`
**Current:** Lines 15-51

### Changes Needed

```typescript
const menu: MenuSection[] = [
  {
    label: "platform",
    items: [
      {
        title: "briefing",
        href: pathsConfig.knosia.index,
        icon: Icons.Home,
      },
      {
        title: "ask",
        href: pathsConfig.knosia.ask,
        icon: Icons.MessageCircle,
      },
      // ADD THESE:
      {
        title: "canvases",
        href: pathsConfig.knosia.canvas.index,
        icon: Icons.LayoutDashboard,
      },
      {
        title: "threads",
        href: pathsConfig.knosia.threads.index,
        icon: Icons.MessagesSquare,
      },
    ],
  },
  // ... manage section unchanged
];
```

### i18n Keys

**File:** `packages/i18n/src/translations/en/common.json`

```json
{
  "canvases": "Canvases",
  "threads": "Threads"
}
```

**File:** `packages/i18n/src/translations/es/common.json`

```json
{
  "canvases": "Lienzos",
  "threads": "Hilos"
}
```

---

## Implementation Priority

### Wave 1: Foundation (Parallel)
- [ ] Gap 8: Sidebar menu (quick win, enables navigation)
- [ ] Gap 7: Dashboard pages (mount existing components)
- [ ] Gap 1: Thread API endpoints (complete the router)

### Wave 2: Trust & Intelligence
- [ ] Gap 2: Block Trust Metadata (provenance system)
- [ ] Gap 3: AI Insight Generation

### Wave 3: Polish
- [ ] Gap 4: AI Canvas Generation
- [ ] Gap 5: Comment Mention Notifications
- [ ] Gap 6: Digest Preview Content

---

## Estimated Effort

| Gap | Description | Estimate |
|-----|-------------|----------|
| 1 | Thread API endpoints | 2-3h |
| 2 | Block Trust Metadata | 3-4h |
| 3 | AI Insight Generation | 3-4h |
| 4 | AI Canvas Generation | 4-5h |
| 5 | Comment Notifications | 1h |
| 6 | Digest Preview | 1-2h |
| 7 | Dashboard Pages | 2-3h |
| 8 | Sidebar Menu | 30min |

**Total: ~17-22h**

---

*End of Gap Analysis*
