# Knosia Vision: Implementation Specification

**Date:** 2025-12-31
**Decisions Made:**
- MVP Scope: All three surfaces (Brief, Canvases, Threads)
- Thread Identity: Rename Conversations → Threads
- AI Proactivity: Balanced (daily suggestions, user controls)
- Canvas Blocks: Hybrid (LiquidRender + Canvas-native)

---

## Implementation Phases Overview

```
Phase 0: Schema Foundation     (~4h)  ← Database migrations
Phase 1: Threads Evolution     (~6h)  ← Rename + enhance conversations
Phase 2: Block Trust Metadata  (~4h)  ← Provenance system
Phase 3: Brief Enhancement     (~6h)  ← AI-initiated sections
Phase 4: Canvases             (~10h)  ← New surface
Phase 5: Collaboration        (~4h)  ← Comments, sharing, activity
Phase 6: Notifications        (~4h)  ← Alerts, digests

Total: ~38h estimated
```

---

## Phase 0: Schema Foundation

### 0.1 Rename Conversations → Threads

```sql
-- Migration: 0001_rename_conversations_to_threads.sql

-- Rename tables
ALTER TABLE knosia_conversation RENAME TO knosia_thread;
ALTER TABLE knosia_conversation_message RENAME TO knosia_thread_message;

-- Rename enums
ALTER TYPE knosia_conversation_status RENAME TO knosia_thread_status;

-- Rename foreign key columns (in knosia_thread_message)
ALTER TABLE knosia_thread_message
  RENAME COLUMN conversation_id TO thread_id;

-- Add new Thread-specific columns
ALTER TABLE knosia_thread ADD COLUMN
  is_ai_initiated BOOLEAN DEFAULT FALSE,
  starred BOOLEAN DEFAULT FALSE,
  parent_thread_id TEXT REFERENCES knosia_thread(id),
  forked_from_message_id TEXT;

-- Add index for forking queries
CREATE INDEX idx_thread_parent ON knosia_thread(parent_thread_id);
```

### 0.2 New Tables

```typescript
// packages/db/src/schema/knosia.ts additions

// ============================================================================
// THREAD EXTENSIONS
// ============================================================================

/**
 * Thread Snapshots - Frozen states of a Thread
 */
export const knosiaThreadSnapshot = pgTable("knosia_thread_snapshot", {
  id: text().primaryKey().$defaultFn(generateId),
  threadId: text()
    .references(() => knosiaThread.id, { onDelete: "cascade" })
    .notNull(),
  name: text().notNull(),
  description: text(),
  messageCount: integer().notNull(),
  snapshotData: jsonb().$type<{
    messages: unknown[];
    context: unknown;
  }>().notNull(),
  createdBy: text().references(() => user.id),
  createdAt: timestamp().notNull().defaultNow(),
});

// ============================================================================
// CANVAS TABLES
// ============================================================================

export const knosiaCanvasStatusEnum = pgEnum("knosia_canvas_status", [
  "draft",
  "active",
  "archived",
]);

export const knosiaCanvasBlockTypeEnum = pgEnum("knosia_canvas_block_type", [
  // Data visualization (delegated to LiquidRender)
  "kpi",
  "line_chart",
  "bar_chart",
  "area_chart",
  "pie_chart",
  "table",
  // Canvas-native blocks
  "hero_metric",
  "watch_list",
  "comparison",
  "insight",
  "text",
]);

/**
 * Canvases - Living business views
 */
export const knosiaCanvas = pgTable("knosia_canvas", {
  id: text().primaryKey().$defaultFn(generateId),
  workspaceId: text()
    .references(() => knosiaWorkspace.id, { onDelete: "cascade" })
    .notNull(),
  createdBy: text()
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  name: text().notNull(),
  description: text(),
  icon: text(),
  status: knosiaCanvasStatusEnum().notNull().default("active"),
  isAiGenerated: boolean().default(false),
  // Layout configuration
  layout: jsonb().$type<{
    type: "grid" | "freeform";
    columns?: number;
    rows?: number;
  }>().default({ type: "grid", columns: 12 }),
  // Sharing
  visibility: knosiaWorkspaceVisibilityEnum().notNull().default("private"),
  sharedWith: jsonb().$type<string[]>().default([]),
  // Metadata
  lastViewedAt: timestamp(),
  viewCount: integer().default(0),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().$onUpdate(() => new Date()),
});

/**
 * Canvas Blocks - Individual blocks within a Canvas
 */
export const knosiaCanvasBlock = pgTable("knosia_canvas_block", {
  id: text().primaryKey().$defaultFn(generateId),
  canvasId: text()
    .references(() => knosiaCanvas.id, { onDelete: "cascade" })
    .notNull(),
  type: knosiaCanvasBlockTypeEnum().notNull(),
  title: text(),
  // Position (grid-based)
  position: jsonb().$type<{
    x: number;      // Column start (0-based)
    y: number;      // Row start (0-based)
    width: number;  // Columns span
    height: number; // Rows span
  }>().notNull(),
  // Block configuration
  config: jsonb().$type<{
    // For data blocks
    metric?: string;           // Vocabulary item slug
    dimensions?: string[];     // Group by
    timeRange?: string;        // Last 7 days, MTD, etc.
    comparison?: string;       // WoW, MoM, etc.
    // For hero_metric
    target?: number;
    targetLabel?: string;
    // For watch_list
    maxItems?: number;
    severityFilter?: string[];
    // For LiquidRender delegation
    liquidRenderType?: string;
    liquidRenderConfig?: unknown;
  }>(),
  // Data binding
  dataSource: jsonb().$type<{
    type: "vocabulary" | "query" | "static";
    vocabularyId?: string;
    sql?: string;
    staticData?: unknown;
  }>(),
  // Cache
  cachedData: jsonb(),
  cachedAt: timestamp(),
  // Metadata
  sortOrder: integer().default(0),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().$onUpdate(() => new Date()),
});

/**
 * Canvas Alerts - Threshold-based notifications for Canvas blocks
 */
export const knosiaCanvasAlert = pgTable("knosia_canvas_alert", {
  id: text().primaryKey().$defaultFn(generateId),
  canvasId: text()
    .references(() => knosiaCanvas.id, { onDelete: "cascade" })
    .notNull(),
  blockId: text().references(() => knosiaCanvasBlock.id, { onDelete: "cascade" }),
  name: text().notNull(),
  condition: jsonb().$type<{
    metric: string;
    operator: "gt" | "lt" | "eq" | "gte" | "lte" | "change_gt" | "change_lt";
    threshold: number;
    timeWindow?: string;
  }>().notNull(),
  channels: jsonb().$type<("in_app" | "email" | "slack")[]>().default(["in_app"]),
  enabled: boolean().default(true),
  lastTriggeredAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
});

// ============================================================================
// COLLABORATION TABLES
// ============================================================================

export const knosiaCommentTargetEnum = pgEnum("knosia_comment_target", [
  "thread_message",
  "canvas_block",
  "thread",
]);

/**
 * Comments - Annotations on messages, blocks, or threads
 */
export const knosiaComment = pgTable("knosia_comment", {
  id: text().primaryKey().$defaultFn(generateId),
  targetType: knosiaCommentTargetEnum().notNull(),
  targetId: text().notNull(), // ID of the target (message, block, thread)
  userId: text()
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  content: text().notNull(),
  mentions: jsonb().$type<string[]>().default([]), // User IDs mentioned
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().$onUpdate(() => new Date()),
});

// ============================================================================
// NOTIFICATION TABLES
// ============================================================================

export const knosiaNotificationTypeEnum = pgEnum("knosia_notification_type", [
  "alert",           // Canvas threshold crossed
  "mention",         // @mentioned in comment
  "share",           // Thread/Canvas shared with you
  "ai_insight",      // AI found something
  "thread_activity", // Activity on your Thread
  "digest",          // Scheduled digest
]);

/**
 * Notifications - User notifications
 */
export const knosiaNotification = pgTable("knosia_notification", {
  id: text().primaryKey().$defaultFn(generateId),
  userId: text()
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  workspaceId: text().references(() => knosiaWorkspace.id, { onDelete: "cascade" }),
  type: knosiaNotificationTypeEnum().notNull(),
  title: text().notNull(),
  body: text(),
  // Link to source
  sourceType: text(), // "thread", "canvas", "alert", etc.
  sourceId: text(),
  // Status
  read: boolean().default(false),
  dismissed: boolean().default(false),
  // Actions
  actions: jsonb().$type<{
    primary?: { label: string; href: string };
    secondary?: { label: string; href: string };
  }>(),
  createdAt: timestamp().notNull().defaultNow(),
});

/**
 * Digests - Scheduled notification bundles
 */
export const knosiaDigest = pgTable("knosia_digest", {
  id: text().primaryKey().$defaultFn(generateId),
  userId: text()
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  workspaceId: text()
    .references(() => knosiaWorkspace.id, { onDelete: "cascade" })
    .notNull(),
  name: text().notNull(),
  schedule: text().notNull(), // Cron expression
  channels: jsonb().$type<("email" | "slack")[]>().default(["email"]),
  // What to include
  include: jsonb().$type<{
    canvasIds?: string[];
    metrics?: string[];
    includeAlerts?: boolean;
    includeAiInsights?: boolean;
  }>(),
  enabled: boolean().default(true),
  lastSentAt: timestamp(),
  nextSendAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
});

// ============================================================================
// AI INSIGHT TABLES
// ============================================================================

export const knosiaAiInsightStatusEnum = pgEnum("knosia_ai_insight_status", [
  "pending",    // Waiting for user to see
  "viewed",     // User saw it
  "engaged",    // User clicked to investigate
  "dismissed",  // User dismissed
  "converted",  // Became a Thread
]);

/**
 * AI Insights - Proactive AI-generated observations
 */
export const knosiaAiInsight = pgTable("knosia_ai_insight", {
  id: text().primaryKey().$defaultFn(generateId),
  workspaceId: text()
    .references(() => knosiaWorkspace.id, { onDelete: "cascade" })
    .notNull(),
  targetUserId: text().references(() => user.id), // null = all workspace users
  // Content
  headline: text().notNull(),
  explanation: text().notNull(),
  evidence: jsonb().$type<{
    metric: string;
    currentValue: number;
    previousValue?: number;
    changePercent?: number;
    pattern?: string;
  }>(),
  // Classification
  severity: text().default("info"), // info, warning, critical
  category: text(), // anomaly, trend, pattern, correlation
  // User interaction
  status: knosiaAiInsightStatusEnum().notNull().default("pending"),
  threadId: text().references(() => knosiaThread.id), // If converted to Thread
  // Metadata
  surfacedAt: timestamp().notNull().defaultNow(),
  viewedAt: timestamp(),
  engagedAt: timestamp(),
  dismissedAt: timestamp(),
});

// ============================================================================
// ACTIVITY FEED
// ============================================================================

export const knosiaActivityTypeEnum = pgEnum("knosia_activity_type", [
  "thread_created",
  "thread_shared",
  "canvas_created",
  "canvas_shared",
  "canvas_updated",
  "comment_added",
  "insight_converted",
]);

/**
 * Activity - Team activity feed
 */
export const knosiaActivity = pgTable("knosia_activity", {
  id: text().primaryKey().$defaultFn(generateId),
  workspaceId: text()
    .references(() => knosiaWorkspace.id, { onDelete: "cascade" })
    .notNull(),
  userId: text()
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  type: knosiaActivityTypeEnum().notNull(),
  // Target
  targetType: text().notNull(), // "thread", "canvas", etc.
  targetId: text().notNull(),
  targetName: text(),
  // Details
  metadata: jsonb().$type<{
    sharedWith?: string[];
    oldValue?: unknown;
    newValue?: unknown;
  }>(),
  createdAt: timestamp().notNull().defaultNow(),
});
```

### 0.3 Enhanced Thread Message (Block Trust Metadata)

```typescript
// Modify existing knosiaThreadMessage (was knosiaConversationMessage)

export const knosiaThreadMessage = pgTable("knosia_thread_message", {
  id: text().primaryKey().$defaultFn(generateId),
  threadId: text()
    .references(() => knosiaThread.id, { onDelete: "cascade" })
    .notNull(),
  role: knosiaMessageRoleEnum().notNull(),
  content: text().notNull(),
  intent: text(),
  grounding: jsonb().$type<string[]>(),
  sqlGenerated: text(),
  visualization: jsonb().$type<{
    type?: string;
    data?: unknown;
    config?: unknown;
  }>(),
  // ENHANCED: Block Trust Metadata
  provenance: jsonb().$type<{
    freshness: string;           // "As of Dec 31, 2:30 PM"
    sources: {
      name: string;              // "Stripe.subscriptions"
      query?: string;            // SQL preview
    }[];
    assumptions?: string[];      // ["USD only", "excludes refunds"]
    confidenceLevel: "exact" | "calculated" | "estimated" | "predicted";
    confidenceScore: number;     // 0-100
  }>(),
  // Engagement
  commentCount: integer().default(0),
  createdAt: timestamp().notNull().defaultNow(),
});
```

### 0.4 Migration Execution Plan

```bash
# Step 1: Generate migration
pnpm with-env -F @turbostarter/db db:generate

# Step 2: Review generated SQL in packages/db/drizzle/

# Step 3: Apply migration
pnpm with-env -F @turbostarter/db db:migrate

# Step 4: Update all TypeScript references
# - conversation → thread
# - conversationId → threadId
# - ConversationMessage → ThreadMessage
```

---

## Phase 1: Threads Evolution

### 1.1 API Module Restructure

```
packages/api/src/modules/knosia/
├── thread/                    ← RENAME from conversation/
│   ├── router.ts
│   ├── schemas.ts
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
├── thread-snapshot/           ← NEW
│   ├── router.ts
│   ├── schemas.ts
│   └── mutations.ts
```

### 1.2 Thread Router Enhancements

```typescript
// packages/api/src/modules/knosia/thread/router.ts

export const threadRouter = new Hono<{ Variables: Variables }>()
  // Existing
  .get("/", enforceAuth, ...)           // List threads
  .get("/:id", enforceAuth, ...)        // Get thread
  .post("/", enforceAuth, ...)          // Create thread
  .post("/:id/message", enforceAuth, ...)  // Add message

  // NEW: Forking
  .post("/:id/fork", enforceAuth, async (c) => {
    const { id } = c.req.param();
    const { fromMessageId, name } = await c.req.json();
    const fork = await forkThread(id, fromMessageId, name, c.var.user.id);
    return c.json(fork, 201);
  })

  // NEW: Snapshots
  .post("/:id/snapshot", enforceAuth, async (c) => {
    const { id } = c.req.param();
    const { name, description } = await c.req.json();
    const snapshot = await createThreadSnapshot(id, name, description, c.var.user.id);
    return c.json(snapshot, 201);
  })
  .get("/:id/snapshots", enforceAuth, ...)

  // NEW: Starring
  .post("/:id/star", enforceAuth, ...)
  .delete("/:id/star", enforceAuth, ...)

  // NEW: Sharing
  .post("/:id/share", enforceAuth, async (c) => {
    const { id } = c.req.param();
    const { userIds, mode } = await c.req.json(); // mode: "view" | "collaborate"
    const result = await shareThread(id, userIds, mode);
    return c.json(result);
  });
```

### 1.3 Frontend Module

```
apps/web/src/modules/knosia/threads/
├── components/
│   ├── thread-view.tsx           ← Full thread conversation
│   ├── thread-sidebar.tsx        ← List with starred, AI-created, recent
│   ├── thread-message.tsx        ← Single message with trust metadata
│   ├── block-trust-badge.tsx     ← Confidence visualization
│   ├── thread-actions.tsx        ← Fork, snapshot, share buttons
│   └── snapshot-modal.tsx
├── hooks/
│   ├── use-thread.ts
│   ├── use-threads-list.ts
│   └── use-thread-actions.ts
├── types.ts
└── index.ts
```

---

## Phase 2: Block Trust Metadata

### 2.1 Provenance Generation

Wire into query execution layer:

```typescript
// packages/liquid-connect/src/executor/query-executor.ts

interface QueryResult {
  data: unknown[];
  metadata: {
    rowCount: number;
    executionTimeMs: number;
  };
  // NEW: Provenance
  provenance: {
    freshness: string;
    sources: { name: string; query: string }[];
    confidenceLevel: "exact" | "calculated" | "estimated" | "predicted";
    confidenceScore: number;
  };
}

function calculateConfidence(query: string, sources: string[]): { level: string; score: number } {
  // Heuristics:
  // - Direct SELECT from single table = exact (100)
  // - JOINs or aggregations = calculated (80-90)
  // - SAMPLE or LIMIT with extrapolation = estimated (60-70)
  // - ML predictions = predicted (40-60)
}
```

### 2.2 Trust Badge Component

```typescript
// apps/web/src/modules/knosia/threads/components/block-trust-badge.tsx

interface BlockTrustBadgeProps {
  provenance: {
    freshness: string;
    sources: { name: string; query?: string }[];
    assumptions?: string[];
    confidenceLevel: "exact" | "calculated" | "estimated" | "predicted";
    confidenceScore: number;
  };
}

const confidenceLevels = {
  exact: { bars: 10, label: "Exact", color: "green" },
  calculated: { bars: 8, label: "Calculated", color: "blue" },
  estimated: { bars: 6, label: "Estimated", color: "yellow" },
  predicted: { bars: 4, label: "Predicted", color: "orange" },
};
```

---

## Phase 3: Brief Enhancement

### 3.1 Brief Sections

```
apps/web/src/modules/knosia/brief/
├── components/
│   ├── brief-view.tsx            ← Main container
│   ├── attention-section.tsx     ← 🔴 Anomalies, risks
│   ├── on-track-section.tsx      ← 🟢 Healthy metrics
│   ├── thinking-section.tsx      ← 💡 AI observations
│   ├── tasks-section.tsx         ← 📋 Pending actions
│   └── insight-card.tsx          ← Individual AI insight
├── hooks/
│   └── use-brief-data.ts
└── index.ts
```

### 3.2 AI Insight Generation

```typescript
// packages/api/src/modules/knosia/insight/mutations.ts

export async function generateDailyInsights(workspaceId: string) {
  // 1. Get recent metrics data
  const metrics = await getWorkspaceMetrics(workspaceId);

  // 2. Detect anomalies
  const anomalies = detectAnomalies(metrics);

  // 3. Find patterns (compare to historical)
  const patterns = findPatterns(metrics);

  // 4. Generate insights (max 2-3 per day for "balanced" setting)
  const insights = [...anomalies, ...patterns]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3);

  // 5. Store in knosia_ai_insight
  for (const insight of insights) {
    await db.insert(knosiaAiInsight).values({
      workspaceId,
      headline: insight.headline,
      explanation: insight.explanation,
      evidence: insight.evidence,
      severity: insight.severity,
      category: insight.category,
    });
  }
}
```

### 3.3 Briefing API Enhancement

```typescript
// packages/api/src/modules/knosia/briefing/queries.ts

export async function getBriefingData(workspaceId: string, userId: string) {
  const [metrics, insights, tasks] = await Promise.all([
    getWorkspaceMetrics(workspaceId),
    getPendingInsights(workspaceId, userId),
    getUserTasks(workspaceId, userId),
  ]);

  // Categorize metrics
  const attention = metrics.filter(m => m.status === "anomaly" || m.trend === "declining");
  const onTrack = metrics.filter(m => m.status === "healthy");

  return {
    greeting: generateGreeting(userId),
    attention: attention.map(formatAttentionItem),
    onTrack: onTrack.map(formatOnTrackItem),
    thinking: insights.map(formatInsightCard),
    tasks,
  };
}
```

---

## Phase 4: Canvases

### 4.1 Canvas API Module

```
packages/api/src/modules/knosia/canvas/
├── router.ts
├── schemas.ts
├── queries.ts           ← List, get, search
├── mutations.ts         ← Create, update, delete
├── blocks/
│   ├── router.ts
│   └── mutations.ts     ← Add, update, remove, reorder blocks
├── alerts/
│   ├── router.ts
│   └── mutations.ts
└── index.ts
```

### 4.2 Canvas Router

```typescript
export const canvasRouter = new Hono<{ Variables: Variables }>()
  // Canvas CRUD
  .get("/", enforceAuth, ...)
  .get("/:id", enforceAuth, ...)
  .post("/", enforceAuth, ...)
  .patch("/:id", enforceAuth, ...)
  .delete("/:id", enforceAuth, ...)

  // AI Generation
  .post("/generate", enforceAuth, async (c) => {
    const { prompt, roleId } = await c.req.json();
    // AI generates Canvas structure based on prompt + role
    const canvas = await generateCanvasFromPrompt(prompt, roleId, c.var.user.id);
    return c.json(canvas, 201);
  })

  // Natural language edit
  .post("/:id/edit", enforceAuth, async (c) => {
    const { id } = c.req.param();
    const { instruction } = await c.req.json();
    // "Add churn by region" → Modifies canvas
    const result = await processCanvasEdit(id, instruction);
    return c.json(result);
  })

  // Blocks
  .route("/", canvasBlockRouter)

  // Alerts
  .route("/", canvasAlertRouter);
```

### 4.3 Canvas Frontend

```
apps/web/src/modules/knosia/canvas/
├── components/
│   ├── canvas-view.tsx           ← Main canvas renderer
│   ├── canvas-grid.tsx           ← Grid layout system
│   ├── canvas-block.tsx          ← Block wrapper (delegates to type)
│   ├── blocks/
│   │   ├── hero-metric.tsx       ← Canvas-native
│   │   ├── watch-list.tsx        ← Canvas-native
│   │   ├── comparison-card.tsx   ← Canvas-native
│   │   ├── insight-card.tsx      ← Canvas-native
│   │   └── liquid-render-block.tsx  ← Delegates to LiquidRender
│   ├── canvas-editor.tsx         ← Edit mode (drag/resize)
│   ├── canvas-prompt-bar.tsx     ← Natural language edits
│   ├── canvas-alerts-panel.tsx   ← Alert configuration
│   └── canvas-share-modal.tsx
├── hooks/
│   ├── use-canvas.ts
│   ├── use-canvas-blocks.ts
│   └── use-canvas-mutations.ts
├── types.ts
└── index.ts
```

### 4.4 Block Type Rendering

```typescript
// apps/web/src/modules/knosia/canvas/components/canvas-block.tsx

export function CanvasBlock({ block }: { block: CanvasBlockData }) {
  switch (block.type) {
    // Canvas-native blocks
    case "hero_metric":
      return <HeroMetricBlock config={block.config} data={block.cachedData} />;
    case "watch_list":
      return <WatchListBlock config={block.config} data={block.cachedData} />;
    case "comparison":
      return <ComparisonCard config={block.config} data={block.cachedData} />;
    case "insight":
      return <InsightCard config={block.config} data={block.cachedData} />;

    // LiquidRender delegation
    case "kpi":
    case "line_chart":
    case "bar_chart":
    case "area_chart":
    case "pie_chart":
    case "table":
      return (
        <LiquidRenderBlock
          type={block.config.liquidRenderType}
          config={block.config.liquidRenderConfig}
          data={block.cachedData}
        />
      );

    default:
      return <div>Unknown block type: {block.type}</div>;
  }
}
```

---

## Phase 5: Collaboration

### 5.1 Comments API

```typescript
// packages/api/src/modules/knosia/comment/router.ts

export const commentRouter = new Hono<{ Variables: Variables }>()
  .get("/", enforceAuth, async (c) => {
    const { targetType, targetId } = c.req.query();
    const comments = await getComments(targetType, targetId);
    return c.json({ data: comments });
  })
  .post("/", enforceAuth, async (c) => {
    const { targetType, targetId, content, mentions } = await c.req.json();
    const comment = await createComment({
      targetType,
      targetId,
      content,
      mentions,
      userId: c.var.user.id,
    });
    // Notify mentioned users
    if (mentions?.length) {
      await notifyMentions(mentions, comment);
    }
    return c.json(comment, 201);
  });
```

### 5.2 Activity Feed API

```typescript
// packages/api/src/modules/knosia/activity/router.ts

export const activityRouter = new Hono<{ Variables: Variables }>()
  .get("/", enforceAuth, async (c) => {
    const { workspaceId, limit, type } = c.req.query();
    const activities = await getActivityFeed(workspaceId, { limit, type });
    return c.json({ data: activities });
  });
```

---

## Phase 6: Notifications

### 6.1 Notification API

```typescript
// packages/api/src/modules/knosia/notification/router.ts

export const notificationRouter = new Hono<{ Variables: Variables }>()
  .get("/", enforceAuth, async (c) => {
    const notifications = await getUserNotifications(c.var.user.id);
    return c.json({ data: notifications });
  })
  .post("/:id/read", enforceAuth, ...)
  .post("/:id/dismiss", enforceAuth, ...)
  .post("/read-all", enforceAuth, ...);
```

### 6.2 Digest API

```typescript
// packages/api/src/modules/knosia/digest/router.ts

export const digestRouter = new Hono<{ Variables: Variables }>()
  .get("/", enforceAuth, ...)           // List user's digests
  .post("/", enforceAuth, ...)          // Create digest
  .patch("/:id", enforceAuth, ...)      // Update digest
  .delete("/:id", enforceAuth, ...)     // Delete digest
  .post("/:id/preview", enforceAuth, async (c) => {
    const { id } = c.req.param();
    const preview = await generateDigestPreview(id);
    return c.json(preview);
  });
```

---

## Navigation Structure

### Header

```
┌─────────────────────────────────────────────────────────────────────┐
│  🧠 Knosia   [Brief] [Canvases ▼] [Threads] [Team]      🔔 👤 ⚙️   │
└─────────────────────────────────────────────────────────────────────┘
```

### Routes

```
/dashboard/knosia/                    → Brief (default)
/dashboard/knosia/brief               → Brief
/dashboard/knosia/canvases            → Canvas list
/dashboard/knosia/canvases/:id        → Single canvas
/dashboard/knosia/threads             → Thread sidebar + selected thread
/dashboard/knosia/threads/:id         → Single thread (also shows sidebar)
/dashboard/knosia/team                → Team activity + shared
/dashboard/knosia/settings            → User preferences, notifications
```

---

## Implementation Order

```
Week 1:
├── Phase 0: Schema Foundation (Day 1-2)
└── Phase 1: Threads Evolution (Day 3-5)

Week 2:
├── Phase 2: Block Trust Metadata (Day 1-2)
└── Phase 3: Brief Enhancement (Day 3-5)

Week 3:
├── Phase 4: Canvases (Full week)

Week 4:
├── Phase 5: Collaboration (Day 1-2)
├── Phase 6: Notifications (Day 3-4)
└── Polish & Testing (Day 5)
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Brief loads with AI insights | < 2 seconds |
| Canvas renders all blocks | < 3 seconds |
| Thread message with trust metadata | All messages show provenance |
| AI insights per day | 1-3 (balanced setting) |
| Canvas natural language edit | > 80% success rate |

---

*End of Implementation Specification*
