import { and, eq } from "@turbostarter/db";
import {
  knosiaCanvas,
  knosiaCanvasBlock,
  knosiaCanvasAlert,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

import type {
  CreateCanvasInput,
  UpdateCanvasInput,
  CreateBlockInput,
  UpdateBlockInput,
  ReorderBlocksInput,
  CreateAlertInput,
  UpdateAlertInput,
  GeneratedBlockSpec,
  CanvasEditChange,
  ShareCanvasInput,
  Collaborator,
} from "./schemas";

// Infer block type from Drizzle schema for DB compatibility
type DbCanvasBlock = typeof knosiaCanvasBlock.$inferSelect;

// ============================================================================
// CANVAS MUTATIONS
// ============================================================================

/**
 * Create a new canvas
 */
export async function createCanvas(input: CreateCanvasInput & { userId: string }) {
  const [canvas] = await db
    .insert(knosiaCanvas)
    .values({
      id: generateId(),
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      icon: input.icon,
      createdBy: input.userId,
      status: "draft",
      layout: { type: "grid" as const, columns: 12 },
    })
    .returning();

  return canvas;
}

/**
 * Update a canvas
 */
export async function updateCanvas(
  id: string,
  input: UpdateCanvasInput,
  _userId: string,
) {
  const [canvas] = await db
    .update(knosiaCanvas)
    .set({
      name: input.name,
      description: input.description,
      icon: input.icon,
      status: input.status,
      layout: input.layout as typeof knosiaCanvas.$inferInsert.layout,
    })
    .where(eq(knosiaCanvas.id, id))
    .returning();

  return canvas ?? null;
}

/**
 * Delete a canvas and its blocks/alerts
 */
export async function deleteCanvas(id: string, userId: string) {
  // Blocks and alerts cascade delete via FK
  const [canvas] = await db
    .delete(knosiaCanvas)
    .where(eq(knosiaCanvas.id, id))
    .returning();

  return canvas ?? null;
}

// ============================================================================
// BLOCK MUTATIONS
// ============================================================================

/**
 * Create a new block
 */
export async function createBlock(input: CreateBlockInput) {
  const [block] = await db
    .insert(knosiaCanvasBlock)
    .values({
      id: generateId(),
      canvasId: input.canvasId,
      type: input.type,
      title: input.title,
      position: input.position,
      config: input.config,
      dataSource: input.dataSource,
    })
    .returning();

  return block;
}

/**
 * Update a block
 */
export async function updateBlock(id: string, input: UpdateBlockInput) {
  const [block] = await db
    .update(knosiaCanvasBlock)
    .set({
      title: input.title,
      position: input.position as typeof knosiaCanvasBlock.$inferInsert.position,
      config: input.config as typeof knosiaCanvasBlock.$inferInsert.config,
      dataSource: input.dataSource as typeof knosiaCanvasBlock.$inferInsert.dataSource,
      cachedData: input.cachedData as typeof knosiaCanvasBlock.$inferInsert.cachedData,
    })
    .where(eq(knosiaCanvasBlock.id, id))
    .returning();

  return block ?? null;
}

/**
 * Delete a block
 */
export async function deleteBlock(id: string) {
  const [block] = await db
    .delete(knosiaCanvasBlock)
    .where(eq(knosiaCanvasBlock.id, id))
    .returning();

  return block ?? null;
}

/**
 * Reorder blocks (batch update positions)
 */
export async function reorderBlocks(input: ReorderBlocksInput) {
  const updates = input.blocks.map(({ id, position }) =>
    db
      .update(knosiaCanvasBlock)
      .set({
        position: position as typeof knosiaCanvasBlock.$inferInsert.position,
      })
      .where(eq(knosiaCanvasBlock.id, id))
      .returning()
  );

  const results = await Promise.all(updates);
  return results.flat();
}

// ============================================================================
// ALERT MUTATIONS
// ============================================================================

/**
 * Create a new alert
 */
export async function createAlert(input: CreateAlertInput) {
  const [alert] = await db
    .insert(knosiaCanvasAlert)
    .values({
      id: generateId(),
      canvasId: input.canvasId,
      blockId: input.blockId,
      name: input.name,
      condition: input.condition,
      channels: input.channels,
      enabled: true,
    })
    .returning();

  return alert;
}

/**
 * Update an alert
 */
export async function updateAlert(id: string, input: UpdateAlertInput) {
  const [alert] = await db
    .update(knosiaCanvasAlert)
    .set({
      name: input.name,
      condition: input.condition as typeof knosiaCanvasAlert.$inferInsert.condition,
      channels: input.channels as typeof knosiaCanvasAlert.$inferInsert.channels,
      enabled: input.enabled,
    })
    .where(eq(knosiaCanvasAlert.id, id))
    .returning();

  return alert ?? null;
}

/**
 * Delete an alert
 */
export async function deleteAlert(id: string) {
  const [alert] = await db
    .delete(knosiaCanvasAlert)
    .where(eq(knosiaCanvasAlert.id, id))
    .returning();

  return alert ?? null;
}

// ============================================================================
// AI CANVAS GENERATION
// ============================================================================

/**
 * Keyword patterns for detecting block types from prompts
 */
const BLOCK_TYPE_KEYWORDS = {
  // Chart types
  line_chart: ["trend", "over time", "timeline", "progress", "line chart", "line graph"],
  bar_chart: ["bar chart", "bar graph", "comparison", "compare", "breakdown"],
  area_chart: ["area chart", "area graph", "cumulative", "stacked area"],
  pie_chart: ["pie chart", "distribution", "percentage", "share", "proportion"],
  // Metrics and KPIs
  kpi: ["kpi", "metric", "key", "indicator"],
  hero_metric: ["total", "overall", "summary", "main metric", "hero"],
  // Tables and lists
  table: ["table", "list", "details", "records", "data"],
  watch_list: ["watch", "monitor", "alerts", "anomalies", "exceptions"],
  // Analysis
  comparison: ["vs", "versus", "compared to", "difference"],
  insight: ["insight", "analysis", "finding", "observation"],
  text: ["note", "text", "description", "explanation"],
};

/**
 * Keyword patterns for detecting metrics from prompts
 */
const METRIC_KEYWORDS = {
  revenue: ["revenue", "sales", "income", "earnings", "money", "dollar", "$"],
  users: ["user", "users", "customer", "customers", "subscriber", "member"],
  growth: ["growth", "increase", "gain", "rise"],
  conversion: ["conversion", "convert", "funnel", "rate"],
  retention: ["retention", "churn", "return", "loyal"],
  engagement: ["engagement", "active", "activity", "usage", "session"],
  orders: ["order", "orders", "purchase", "transaction", "checkout"],
  cost: ["cost", "expense", "spend", "spending"],
};

/**
 * Detect block type from prompt text
 */
function detectBlockType(prompt: string): GeneratedBlockSpec["type"] {
  const normalizedPrompt = prompt.toLowerCase();

  for (const [type, keywords] of Object.entries(BLOCK_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedPrompt.includes(keyword)) {
        return type as GeneratedBlockSpec["type"];
      }
    }
  }

  // Default to line_chart for time-based prompts, otherwise kpi
  if (normalizedPrompt.includes("time") || normalizedPrompt.includes("trend")) {
    return "line_chart";
  }
  return "kpi";
}

/**
 * Detect metrics from prompt text
 */
function detectMetrics(prompt: string): string[] {
  const normalizedPrompt = prompt.toLowerCase();
  const detected: string[] = [];

  for (const [metric, keywords] of Object.entries(METRIC_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedPrompt.includes(keyword)) {
        detected.push(metric);
        break;
      }
    }
  }

  return detected.length > 0 ? detected : ["revenue"]; // Default fallback
}

/**
 * Generate title from metric name
 */
function generateBlockTitle(metric: string, type: GeneratedBlockSpec["type"]): string {
  const metricTitle = metric
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  switch (type) {
    case "hero_metric":
      return `Total ${metricTitle}`;
    case "line_chart":
      return `${metricTitle} Over Time`;
    case "bar_chart":
      return `${metricTitle} by Category`;
    case "pie_chart":
      return `${metricTitle} Distribution`;
    case "table":
      return `${metricTitle} Details`;
    case "comparison":
      return `${metricTitle} Comparison`;
    case "watch_list":
      return `${metricTitle} Alerts`;
    default:
      return metricTitle;
  }
}

/**
 * Calculate block position on a 12-column grid
 */
function calculateBlockPosition(
  index: number,
  blockType: GeneratedBlockSpec["type"],
  totalBlocks: number
): GeneratedBlockSpec["position"] {
  // Default sizes based on block type
  const sizeMap: Record<GeneratedBlockSpec["type"], { w: number; h: number }> = {
    hero_metric: { w: 3, h: 2 },
    kpi: { w: 3, h: 2 },
    line_chart: { w: 6, h: 3 },
    bar_chart: { w: 6, h: 3 },
    area_chart: { w: 6, h: 3 },
    pie_chart: { w: 4, h: 3 },
    table: { w: 12, h: 4 },
    watch_list: { w: 4, h: 3 },
    comparison: { w: 6, h: 3 },
    insight: { w: 4, h: 2 },
    text: { w: 6, h: 2 },
  };

  const size = sizeMap[blockType] || { w: 4, h: 2 };

  // Simple row-based layout: 12 columns, stack vertically
  // Position blocks left-to-right, top-to-bottom
  const columnsPerRow = 12;
  let currentX = 0;
  let currentY = 0;

  // For first few blocks, use a dashboard-like layout
  if (totalBlocks <= 4 && blockType === "kpi") {
    // 4 KPIs in a row
    return {
      x: (index % 4) * 3,
      y: Math.floor(index / 4) * 2,
      w: 3,
      h: 2,
    };
  }

  // For mixed layouts, stack based on index
  const positions = [
    { x: 0, y: 0, w: 3, h: 2 }, // KPI 1
    { x: 3, y: 0, w: 3, h: 2 }, // KPI 2
    { x: 6, y: 0, w: 3, h: 2 }, // KPI 3
    { x: 9, y: 0, w: 3, h: 2 }, // KPI 4
    { x: 0, y: 2, w: 6, h: 3 }, // Chart 1
    { x: 6, y: 2, w: 6, h: 3 }, // Chart 2
    { x: 0, y: 5, w: 12, h: 4 }, // Table
    { x: 0, y: 9, w: 4, h: 3 }, // Extra 1
    { x: 4, y: 9, w: 4, h: 3 }, // Extra 2
    { x: 8, y: 9, w: 4, h: 3 }, // Extra 3
  ];

  if (index < positions.length) {
    return positions[index]!;
  }

  // Fallback: stack vertically
  return {
    x: 0,
    y: index * 3,
    w: size.w,
    h: size.h,
  };
}

/**
 * Generate canvas layout from natural language prompt
 * TODO: Wire to actual AI service (Claude, OpenAI, etc.)
 */
export async function generateCanvasFromAI(input: {
  prompt: string;
  workspaceId: string;
  roleId?: string;
  userId: string;
}): Promise<{
  name: string;
  description: string;
  blocks: GeneratedBlockSpec[];
}> {
  const { prompt, roleId } = input;
  const normalizedPrompt = prompt.toLowerCase();

  // Detect what kind of dashboard is requested
  const isRevenueFocused = normalizedPrompt.includes("revenue") ||
    normalizedPrompt.includes("sales") || normalizedPrompt.includes("money");
  const isUserFocused = normalizedPrompt.includes("user") ||
    normalizedPrompt.includes("customer") || normalizedPrompt.includes("member");
  const isOverviewDashboard = normalizedPrompt.includes("overview") ||
    normalizedPrompt.includes("dashboard") || normalizedPrompt.includes("summary");

  // Detect specific metrics mentioned
  const metrics = detectMetrics(prompt);

  // Generate blocks based on detected intent
  const blocks: GeneratedBlockSpec[] = [];

  // For overview dashboards, create a comprehensive layout
  if (isOverviewDashboard || metrics.length >= 2) {
    // Hero metrics row (4 KPIs)
    const heroMetrics = ["revenue", "users", "conversion", "growth"];
    heroMetrics.slice(0, 4).forEach((metric, i) => {
      blocks.push({
        type: i === 0 ? "hero_metric" : "kpi",
        title: generateBlockTitle(metric, i === 0 ? "hero_metric" : "kpi"),
        position: calculateBlockPosition(i, "kpi", 4),
        config: { metric },
        dataSource: { type: "vocabulary" },
      });
    });

    // Main chart
    blocks.push({
      type: "line_chart",
      title: isRevenueFocused ? "Revenue Over Time" : "Users Over Time",
      position: { x: 0, y: 2, w: 6, h: 3 },
      config: { metric: isRevenueFocused ? "revenue" : "users", timeRange: "30d" },
      dataSource: { type: "vocabulary" },
    });

    // Secondary chart
    blocks.push({
      type: "bar_chart",
      title: isRevenueFocused ? "Revenue by Source" : "Users by Channel",
      position: { x: 6, y: 2, w: 6, h: 3 },
      config: { metric: isRevenueFocused ? "revenue" : "users" },
      dataSource: { type: "vocabulary" },
    });

    // Table
    blocks.push({
      type: "table",
      title: "Recent Activity",
      position: { x: 0, y: 5, w: 8, h: 4 },
      config: { maxRows: 10 },
      dataSource: { type: "query", query: "SELECT * FROM recent_activity LIMIT 10" },
    });

    // Watch list
    blocks.push({
      type: "watch_list",
      title: "Anomalies & Alerts",
      position: { x: 8, y: 5, w: 4, h: 4 },
      config: { maxItems: 5 },
      dataSource: { type: "vocabulary" },
    });
  } else {
    // Single-focus prompt - create targeted blocks
    const primaryMetric = metrics[0] || "revenue";
    const blockType = detectBlockType(prompt);

    // Main metric
    blocks.push({
      type: "hero_metric",
      title: generateBlockTitle(primaryMetric, "hero_metric"),
      position: { x: 0, y: 0, w: 4, h: 2 },
      config: { metric: primaryMetric },
      dataSource: { type: "vocabulary" },
    });

    // Primary visualization
    blocks.push({
      type: blockType,
      title: generateBlockTitle(primaryMetric, blockType),
      position: { x: 4, y: 0, w: 8, h: 4 },
      config: { metric: primaryMetric, timeRange: "30d" },
      dataSource: { type: "vocabulary" },
    });

    // Supporting comparison
    blocks.push({
      type: "comparison",
      title: `${primaryMetric.charAt(0).toUpperCase() + primaryMetric.slice(1)} vs Last Period`,
      position: { x: 0, y: 2, w: 4, h: 2 },
      config: { metric: primaryMetric, comparison: "previous_period" },
      dataSource: { type: "vocabulary" },
    });
  }

  // Generate descriptive name
  const name = isOverviewDashboard
    ? "Business Overview Dashboard"
    : isRevenueFocused
      ? "Revenue Analytics"
      : isUserFocused
        ? "User Analytics"
        : `${metrics[0]?.charAt(0).toUpperCase()}${metrics[0]?.slice(1) || ""} Dashboard`;

  return {
    name,
    description: `AI-generated from prompt: "${prompt}"${roleId ? ` (Role: ${roleId})` : ""}`,
    blocks,
  };
}

/**
 * Interpret natural language edit instructions for a canvas
 * TODO: Wire to actual AI service (Claude, OpenAI, etc.)
 */
export async function interpretCanvasEdit(input: {
  canvasId: string;
  existingBlocks: DbCanvasBlock[];
  instruction: string;
  userId: string;
}): Promise<CanvasEditChange[]> {
  const { existingBlocks, instruction } = input;
  const normalizedInstruction = instruction.toLowerCase();
  const changes: CanvasEditChange[] = [];

  // Detect add operations
  if (normalizedInstruction.includes("add") || normalizedInstruction.includes("create")) {
    const metrics = detectMetrics(instruction);
    const blockType = detectBlockType(instruction);
    const metric = metrics[0] || "revenue";

    // Find next available position
    const maxY = existingBlocks.reduce((max, block) => {
      const pos = block.position as { y: number; height: number };
      return Math.max(max, pos.y + pos.height);
    }, 0);

    changes.push({
      type: "add",
      block: {
        type: blockType,
        title: generateBlockTitle(metric, blockType),
        position: { x: 0, y: maxY, w: 6, h: 3 },
        config: { metric },
        dataSource: { type: "vocabulary" },
      },
    });
  }

  // Detect remove operations
  if (normalizedInstruction.includes("remove") || normalizedInstruction.includes("delete")) {
    // Try to match block by title or type
    for (const block of existingBlocks) {
      const blockTitle = (block.title || "").toLowerCase();
      const blockType = block.type.toLowerCase();

      // Check if instruction mentions this block
      if (normalizedInstruction.includes(blockTitle) ||
          normalizedInstruction.includes(blockType.replace("_", " "))) {
        changes.push({
          type: "remove",
          blockId: block.id,
        });
        break; // Only remove first match
      }
    }

    // If no specific block matched but "last" or "recent" mentioned
    if (changes.length === 0 && existingBlocks.length > 0) {
      if (normalizedInstruction.includes("last") || normalizedInstruction.includes("recent")) {
        const lastBlock = existingBlocks[existingBlocks.length - 1];
        if (lastBlock) {
          changes.push({
            type: "remove",
            blockId: lastBlock.id,
          });
        }
      }
    }
  }

  // Detect resize/move operations
  if (normalizedInstruction.includes("resize") || normalizedInstruction.includes("make")) {
    const isBigger = normalizedInstruction.includes("bigger") ||
      normalizedInstruction.includes("larger") || normalizedInstruction.includes("expand");
    const isSmaller = normalizedInstruction.includes("smaller") ||
      normalizedInstruction.includes("reduce") || normalizedInstruction.includes("shrink");

    if (isBigger || isSmaller) {
      // Find the block being referenced
      for (const block of existingBlocks) {
        const blockTitle = (block.title || "").toLowerCase();
        if (normalizedInstruction.includes(blockTitle) ||
            normalizedInstruction.includes(block.type.replace("_", " "))) {
          const currentPos = block.position as { x: number; y: number; width: number; height: number };
          const scaleFactor = isBigger ? 1.5 : 0.75;

          changes.push({
            type: "update",
            blockId: block.id,
            updates: {
              position: {
                x: currentPos.x,
                y: currentPos.y,
                w: Math.max(1, Math.round(currentPos.width * scaleFactor)),
                h: Math.max(1, Math.round(currentPos.height * scaleFactor)),
              },
            },
          });
          break;
        }
      }
    }
  }

  // Detect rename operations
  if (normalizedInstruction.includes("rename") || normalizedInstruction.includes("change title")) {
    // Extract new title from instruction (simple extraction after "to")
    const toMatch = instruction.match(/(?:to|as)\s+["']?([^"']+)["']?/i);
    if (toMatch && toMatch[1]) {
      const newTitle = toMatch[1].trim();

      // Find which block to rename
      for (const block of existingBlocks) {
        const blockTitle = (block.title || "").toLowerCase();
        // Check if the old title is mentioned before "to"
        const beforeTo = instruction.split(/\s+to\s+/i)[0]?.toLowerCase() || "";
        if (beforeTo.includes(blockTitle)) {
          changes.push({
            type: "update",
            blockId: block.id,
            updates: { title: newTitle },
          });
          break;
        }
      }
    }
  }

  return changes;
}

/**
 * Create canvas with AI generation flag set
 */
export async function createAIGeneratedCanvas(input: {
  workspaceId: string;
  name: string;
  description: string;
  userId: string;
}) {
  const [canvas] = await db
    .insert(knosiaCanvas)
    .values({
      id: generateId(),
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      createdBy: input.userId,
      status: "draft",
      isAiGenerated: true,
      layout: { type: "grid" as const, columns: 12 },
    })
    .returning();

  return canvas;
}

/**
 * Create blocks from generated specs
 */
export async function createBlocksFromSpecs(
  canvasId: string,
  specs: GeneratedBlockSpec[]
) {
  if (specs.length === 0) return [];

  const blocks = specs.map((spec, index) => ({
    id: generateId(),
    canvasId,
    type: spec.type,
    title: spec.title,
    position: {
      x: spec.position.x,
      y: spec.position.y,
      width: spec.position.w,
      height: spec.position.h,
    },
    config: spec.config,
    dataSource: spec.dataSource
      ? {
          type: spec.dataSource.type,
          vocabularyId: spec.dataSource.vocabularyItemId,
          sql: spec.dataSource.query,
        }
      : undefined,
    sortOrder: index,
  }));

  const results = await db
    .insert(knosiaCanvasBlock)
    .values(blocks)
    .returning();

  return results;
}

// ============================================================================
// SHARING MUTATIONS
// ============================================================================

/**
 * Share a canvas with other users.
 * The sharedWith column stores an array of user IDs.
 * Permission mode is stored implicitly via visibility level.
 */
export async function shareCanvas(
  canvasId: string,
  input: ShareCanvasInput,
  userId: string,
) {
  // 1. Verify user owns canvas
  const canvas = await db
    .select()
    .from(knosiaCanvas)
    .where(and(eq(knosiaCanvas.id, canvasId), eq(knosiaCanvas.createdBy, userId)))
    .limit(1);

  if (!canvas[0]) {
    return null;
  }

  // 2. Get existing sharedWith user IDs
  const existingUserIds = (canvas[0].sharedWith ?? []) as string[];

  // 3. Merge with new user IDs (dedup)
  const sharedWithSet = new Set([...existingUserIds, ...input.userIds]);
  const updatedSharedWith = Array.from(sharedWithSet);

  // 4. Update canvas
  const [updated] = await db
    .update(knosiaCanvas)
    .set({
      sharedWith: updatedSharedWith,
      // Change visibility to team_only if it was private
      visibility: canvas[0].visibility === "private" ? "team_only" : canvas[0].visibility,
    })
    .where(eq(knosiaCanvas.id, canvasId))
    .returning();

  // 5. Return collaborators with the specified permission mode
  const collaborators: Collaborator[] = updatedSharedWith.map((uid) => ({
    userId: uid,
    permission: input.mode,
    addedAt: undefined, // Not tracked in simple string[] schema
  }));

  return {
    success: true,
    sharedWith: collaborators,
    mode: input.mode,
    canvas: updated,
  };
}

/**
 * Get list of collaborators for a canvas.
 * Returns the users the canvas is shared with.
 * Note: Permission is inferred from visibility level since sharedWith is string[].
 */
export async function getCanvasCollaborators(
  canvasId: string,
  userId: string,
): Promise<Collaborator[] | null> {
  // 1. Verify user owns canvas or has access
  const canvas = await db
    .select()
    .from(knosiaCanvas)
    .where(eq(knosiaCanvas.id, canvasId))
    .limit(1);

  if (!canvas[0]) {
    return null;
  }

  // Check if user is owner or collaborator
  const isOwner = canvas[0].createdBy === userId;
  const sharedWith = (canvas[0].sharedWith ?? []) as string[];
  const isCollaborator = sharedWith.includes(userId);

  if (!isOwner && !isCollaborator) {
    return null;
  }

  // 2. Map visibility to default permission level
  const defaultPermission: "view" | "comment" | "edit" =
    canvas[0].visibility === "org_wide" ? "view" :
    canvas[0].visibility === "team_only" ? "comment" : "view";

  // 3. Return collaborators list
  return sharedWith.map((uid) => ({
    userId: uid,
    permission: defaultPermission,
    addedAt: undefined,
  }));
}

/**
 * Remove a collaborator from a canvas.
 * Only the canvas owner can remove collaborators.
 */
export async function removeCanvasCollaborator(
  canvasId: string,
  collaboratorUserId: string,
  userId: string,
): Promise<{ success: boolean; sharedWith: Collaborator[] } | null> {
  // 1. Verify user owns canvas
  const canvas = await db
    .select()
    .from(knosiaCanvas)
    .where(and(eq(knosiaCanvas.id, canvasId), eq(knosiaCanvas.createdBy, userId)))
    .limit(1);

  if (!canvas[0]) {
    return null;
  }

  // 2. Remove the collaborator from the user ID list
  const existingSharedWith = (canvas[0].sharedWith ?? []) as string[];
  const updatedSharedWith = existingSharedWith.filter(
    (uid) => uid !== collaboratorUserId,
  );

  // 3. Update canvas
  await db
    .update(knosiaCanvas)
    .set({
      sharedWith: updatedSharedWith,
      // If no more collaborators, optionally set back to private
      visibility: updatedSharedWith.length === 0 ? "private" : canvas[0].visibility,
    })
    .where(eq(knosiaCanvas.id, canvasId))
    .returning();

  // 4. Map visibility to default permission level
  const defaultPermission: "view" | "comment" | "edit" =
    canvas[0].visibility === "org_wide" ? "view" :
    canvas[0].visibility === "team_only" ? "comment" : "view";

  return {
    success: true,
    sharedWith: updatedSharedWith.map((uid) => ({
      userId: uid,
      permission: defaultPermission,
      addedAt: undefined,
    })),
  };
}
