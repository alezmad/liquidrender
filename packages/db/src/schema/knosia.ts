import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateId } from "@turbostarter/shared/utils";

import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "../lib/zod";

import { user } from "./auth";

import type * as z from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const knosiaConnectionTypeEnum = pgEnum("knosia_connection_type", [
  "postgres",
  "mysql",
  "snowflake",
  "bigquery",
  "redshift",
  "duckdb",
]);

export const knosiaConnectionStatusEnum = pgEnum("knosia_connection_status", [
  "connected",
  "error",
  "stale",
]);

export const knosiaVocabularyTypeEnum = pgEnum("knosia_vocabulary_type", [
  "metric",
  "dimension",
  "entity",
  "event",
]);

export const knosiaVocabularyStatusEnum = pgEnum("knosia_vocabulary_status", [
  "approved",
  "draft",
  "deprecated",
  "archived",
]);

export const knosiaAggregationEnum = pgEnum("knosia_aggregation", [
  "SUM",
  "AVG",
  "COUNT",
  "MIN",
  "MAX",
]);

export const knosiaRoleArchetypeEnum = pgEnum("knosia_role_archetype", [
  "strategist",
  "operator",
  "analyst",
  "builder",
]);

export const knosiaSeniorityEnum = pgEnum("knosia_seniority", [
  "executive",
  "director",
  "manager",
  "ic",
]);

export const knosiaWorkspaceVisibilityEnum = pgEnum(
  "knosia_workspace_visibility",
  ["org_wide", "team_only", "private"],
);

export const knosiaMembershipStatusEnum = pgEnum("knosia_membership_status", [
  "active",
  "invited",
  "suspended",
]);

export const knosiaAnalysisStatusEnum = pgEnum("knosia_analysis_status", [
  "running",
  "completed",
  "failed",
]);

export const knosiaThreadStatusEnum = pgEnum("knosia_thread_status", [
  "active",
  "archived",
  "shared",
]);

export const knosiaMessageRoleEnum = pgEnum("knosia_message_role", [
  "user",
  "assistant",
]);

export const knosiaMismatchIssueEnum = pgEnum("knosia_mismatch_issue", [
  "wrong_mapping",
  "wrong_name",
  "missing",
  "other",
]);

export const knosiaMismatchStatusEnum = pgEnum("knosia_mismatch_status", [
  "pending",
  "reviewed",
  "resolved",
  "dismissed",
]);

// ============================================================================
// CANVAS ENUMS
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

// ============================================================================
// COLLABORATION ENUMS
// ============================================================================

export const knosiaCommentTargetEnum = pgEnum("knosia_comment_target", [
  "thread_message",
  "canvas_block",
  "thread",
]);

// ============================================================================
// NOTIFICATION ENUMS
// ============================================================================

export const knosiaNotificationTypeEnum = pgEnum("knosia_notification_type", [
  "alert", // Canvas threshold crossed
  "mention", // @mentioned in comment
  "share", // Thread/Canvas shared with you
  "ai_insight", // AI found something
  "thread_activity", // Activity on your Thread
  "digest", // Scheduled digest
]);

export const knosiaAiInsightStatusEnum = pgEnum("knosia_ai_insight_status", [
  "pending", // Waiting for user to see
  "viewed", // User saw it
  "engaged", // User clicked to investigate
  "dismissed", // User dismissed
  "converted", // Became a Thread
]);

export const knosiaActivityTypeEnum = pgEnum("knosia_activity_type", [
  "thread_created",
  "thread_shared",
  "canvas_created",
  "canvas_shared",
  "canvas_updated",
  "comment_added",
  "insight_converted",
]);

// ============================================================================
// PLATFORM TABLES
// ============================================================================

/**
 * Organizations - Top-level organizational entity
 *
 * Guest organizations have a 7-day TTL (expiresAt set).
 * When expiresAt passes, org and all related data are eligible for cleanup.
 * Converting guest → registered clears expiresAt.
 */
export const knosiaOrganization = pgTable("knosia_organization", {
  id: text().primaryKey().$defaultFn(generateId),
  name: text().notNull(),
  domain: text(),
  industry: text(),
  size: text(), // startup, smb, enterprise
  logoUrl: text(),
  aiConfig: jsonb().$type<{
    tone?: string;
    industryContext?: string;
    companyVoice?: string;
  }>(),
  governance: jsonb().$type<{
    approvalRequired?: boolean;
    reviewCycle?: string;
  }>(),
  // Guest workspace TTL - null means never expires (registered user)
  isGuest: boolean().default(false),
  expiresAt: timestamp(), // null = never expires
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ============================================================================
// WORKSPACE TABLES
// ============================================================================

/**
 * Workspaces - Bounded contexts within an organization
 */
export const knosiaWorkspace = pgTable("knosia_workspace", {
  id: text().primaryKey().$defaultFn(generateId),
  orgId: text()
    .references(() => knosiaOrganization.id, { onDelete: "cascade" })
    .notNull(),
  name: text().notNull(),
  slug: text().notNull(),
  description: text(),
  icon: text(),
  visibility: knosiaWorkspaceVisibilityEnum().notNull().default("org_wide"),
  defaults: jsonb().$type<{
    comparisonPeriod?: "WoW" | "MoM" | "QoQ" | "YoY";
    currency?: string;
    timezone?: string;
    fiscalYearStart?: string;
  }>(),
  aiConfig: jsonb().$type<{
    briefingSchedule?: string;
    anomalyDetection?: { enabled: boolean; sensitivity: string };
    autoInsights?: { enabled: boolean; maxPerDay: number };
    proactiveAlerts?: { enabled: boolean; channels: string[] };
  }>(),
  // LiquidConnect compiled vocabulary (cached)
  compiledVocabulary: jsonb().$type<{
    version: string;
    vocabularyId?: string;
    compiledAt: string; // ISO date string
    patterns: unknown[];
    slots: {
      m: unknown[]; // MetricSlotEntry[]
      d: unknown[]; // DimensionSlotEntry[]
      f: unknown[]; // SlotEntry[]
      t: unknown[]; // SlotEntry[]
    };
    synonyms: {
      global: Record<string, string>;
      org: Record<string, string>;
      user: Record<string, string>;
    };
    metricAggregations: Record<string, string>;
    dimensionCardinalities: Record<string, number>;
    safeDimensions: string[];
  }>(),
  vocabularyVersion: integer().default(1),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
});

/**
 * Workspace Connections - Links workspaces to data connections
 */
export const knosiaWorkspaceConnection = pgTable(
  "knosia_workspace_connection",
  {
    id: text().primaryKey().$defaultFn(generateId),
    workspaceId: text()
      .references(() => knosiaWorkspace.id, { onDelete: "cascade" })
      .notNull(),
    connectionId: text()
      .references(() => knosiaConnection.id, { onDelete: "cascade" })
      .notNull(),
    schemaFilters: jsonb().$type<{
      include?: string[];
      exclude?: string[];
    }>(),
    createdAt: timestamp().notNull().defaultNow(),
  },
);

// ============================================================================
// CONNECTION TABLES
// ============================================================================

/**
 * Connections - Database connections
 */
export const knosiaConnection = pgTable("knosia_connection", {
  id: text().primaryKey().$defaultFn(generateId),
  orgId: text()
    .references(() => knosiaOrganization.id, { onDelete: "cascade" })
    .notNull(),
  name: text().notNull(),
  type: knosiaConnectionTypeEnum().notNull(),
  host: text().notNull(),
  port: integer(),
  database: text().notNull(),
  schema: text().default("public"),
  credentials: text(), // encrypted in production
  sslEnabled: boolean().default(true),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
});

/**
 * Connection Health - Tracks connection status
 */
export const knosiaConnectionHealth = pgTable("knosia_connection_health", {
  id: text().primaryKey().$defaultFn(generateId),
  connectionId: text()
    .references(() => knosiaConnection.id, { onDelete: "cascade" })
    .notNull(),
  status: knosiaConnectionStatusEnum().notNull().default("connected"),
  lastCheck: timestamp(),
  errorMessage: text(),
  latencyMs: integer(),
  uptimePercent: real(),
  createdAt: timestamp().notNull().defaultNow(),
});

/**
 * Connection Schemas - Cached schema snapshots
 */
export const knosiaConnectionSchema = pgTable("knosia_connection_schema", {
  id: text().primaryKey().$defaultFn(generateId),
  connectionId: text()
    .references(() => knosiaConnection.id, { onDelete: "cascade" })
    .notNull(),
  schemaSnapshot: jsonb().$type<{
    tables: {
      name: string;
      columns: {
        name: string;
        type: string;
        nullable: boolean;
        primaryKey?: boolean;
        foreignKey?: { table: string; column: string };
      }[];
    }[];
  }>(),
  tablesCount: integer().default(0),
  extractedAt: timestamp().notNull().defaultNow(),
  version: integer().default(1),
});

// ============================================================================
// VOCABULARY TABLES
// ============================================================================

/**
 * Vocabulary Items - Core vocabulary entries (metrics, dimensions, entities, events)
 */
export const knosiaVocabularyItem = pgTable("knosia_vocabulary_item", {
  id: text().primaryKey().$defaultFn(generateId),
  workspaceId: text().references(() => knosiaWorkspace.id, {
    onDelete: "cascade",
  }),
  orgId: text()
    .references(() => knosiaOrganization.id, { onDelete: "cascade" })
    .notNull(),
  canonicalName: text().notNull(),
  abbreviation: text(),
  slug: text().notNull(),
  aliases: jsonb().$type<string[]>().default([]),
  type: knosiaVocabularyTypeEnum().notNull(),
  category: text(),
  semantics: jsonb().$type<{
    direction?: "higher_is_better" | "lower_is_better" | "target_range";
    format?: "currency" | "percentage" | "count" | "duration" | "ratio";
    grain?: "daily" | "weekly" | "monthly" | "point_in_time";
    sensitivity?: "public" | "internal" | "confidential" | "pii";
  }>(),
  currentVersion: integer().default(1),
  status: knosiaVocabularyStatusEnum().notNull().default("draft"),
  governance: jsonb().$type<{
    ownerTeam?: string;
    stewardUserId?: string;
    reviewSchedule?: string;
  }>(),
  // Extraction metadata (7 Hard Rules)
  aggregation: knosiaAggregationEnum(),
  aggregationConfidence: integer(),
  cardinality: integer(),
  isPrimaryTime: boolean().default(false),
  joinsTo: jsonb().$type<
    {
      target: string;
      via: string;
      type: "many_to_one" | "one_to_many" | "many_to_many";
    }[]
  >(),
  // Definition
  definition: jsonb().$type<{
    descriptionHuman?: string;
    formulaHuman?: string;
    formulaSql?: string;
    sourceTables?: string[];
    sourceColumn?: string; // DB column name for simple mappings
    caveats?: string[];
    exampleValues?: { low?: string; typical?: string; high?: string };
  }>(),
  // Role-based suggestions: which archetypes should see this item suggested
  suggestedForRoles: jsonb().$type<string[]>(), // ["strategist", "operator", "analyst", "builder"]
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
});

/**
 * Vocabulary Versions - Version history for vocabulary items
 */
export const knosiaVocabularyVersion = pgTable("knosia_vocabulary_version", {
  id: text().primaryKey().$defaultFn(generateId),
  itemId: text()
    .references(() => knosiaVocabularyItem.id, { onDelete: "cascade" })
    .notNull(),
  version: integer().notNull(),
  definition: jsonb().$type<{
    descriptionHuman?: string;
    formulaHuman?: string;
    formulaSql?: string;
    sourceTables?: string[];
    caveats?: string[];
  }>(),
  createdBy: text().references(() => user.id),
  approvedBy: text().references(() => user.id),
  changelog: text(),
  createdAt: timestamp().notNull().defaultNow(),
});

// ============================================================================
// ROLE TABLES
// ============================================================================

/**
 * Role Templates - Predefined and custom role configurations
 */
export const knosiaRoleTemplate = pgTable("knosia_role_template", {
  id: text().primaryKey().$defaultFn(generateId),
  orgId: text().references(() => knosiaOrganization.id, {
    onDelete: "cascade",
  }),
  name: text().notNull(),
  description: text(),
  archetype: knosiaRoleArchetypeEnum(),
  industryVariant: text(),
  seniority: knosiaSeniorityEnum(),
  cognitiveProfile: jsonb().$type<{
    timeHorizon?: "weeks" | "months" | "quarters" | "years";
    decisionStyle?: "data_first" | "intuition_guided" | "consensus_driven";
    detailPreference?: "executive_summary" | "balanced" | "deep_dive";
    comparisonDefault?: "WoW" | "MoM" | "QoQ" | "YoY";
    uncertaintyTolerance?: "needs_precision" | "comfortable_with_estimates";
  }>(),
  briefingConfig: jsonb().$type<{
    schedule?: string;
    tone?: "concise" | "narrative" | "analytical";
    include?: string[];
    exclude?: string[];
    delivery?: string[];
    maxLength?: string;
  }>(),
  questionPatterns: jsonb().$type<{
    frequent?: string[];
    followUpChains?: { trigger: string; sequence: string[] }[];
  }>(),
  learningPath: jsonb().$type<string[]>(),
  isTemplate: boolean().default(false), // true for global templates
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ============================================================================
// USER TABLES
// ============================================================================

/**
 * Workspace Memberships - User membership in workspaces with role assignment
 */
export const knosiaWorkspaceMembership = pgTable(
  "knosia_workspace_membership",
  {
    id: text().primaryKey().$defaultFn(generateId),
    userId: text()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: text()
      .references(() => knosiaWorkspace.id, { onDelete: "cascade" })
      .notNull(),
    roleId: text().references(() => knosiaRoleTemplate.id),
    permissions: jsonb().$type<{
      canEdit?: boolean;
      canInvite?: boolean;
      canManageConnections?: boolean;
      canApproveVocabulary?: boolean;
    }>(),
    joinedAt: timestamp().notNull().defaultNow(),
    invitedBy: text().references(() => user.id),
    status: knosiaMembershipStatusEnum().notNull().default("active"),
  },
);

/**
 * User Preferences - Per-workspace user customizations
 */
export const knosiaUserPreference = pgTable("knosia_user_preference", {
  id: text().primaryKey().$defaultFn(generateId),
  userId: text()
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  workspaceId: text()
    .references(() => knosiaWorkspace.id, { onDelete: "cascade" })
    .notNull(),
  favorites: jsonb().$type<{
    pinnedMetrics?: string[];
    pinnedDashboards?: string[];
    pinnedQueries?: string[];
    pinnedFilters?: { field: string; value: unknown }[];
  }>(),
  aliases: jsonb().$type<Record<string, string>>(),
  notes: jsonb().$type<Record<string, string>>(),
  hiddenItems: jsonb().$type<string[]>(),
  customViews: jsonb().$type<{ name: string; config: unknown }[]>(),
  notification: jsonb().$type<{
    briefingTime?: string;
    alertChannels?: string[];
    digestFrequency?: string;
    quietHours?: string[];
  }>(),
  comparisonPeriod: text().default("MoM"),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
});

/**
 * User Vocabulary Preferences - Per-workspace vocabulary customizations
 * Stores favorites, synonyms, recently used items, dismissed suggestions,
 * and private vocabulary formulas
 */
export const knosiaUserVocabularyPrefs = pgTable(
  "knosia_user_vocabulary_prefs",
  {
    id: text().primaryKey().$defaultFn(generateId),
    userId: text()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: text()
      .references(() => knosiaWorkspace.id, { onDelete: "cascade" })
      .notNull(),
    // Favorited vocabulary item slugs
    favorites: jsonb().$type<string[]>().default([]),
    // Personal synonyms: { "my_term": "official_slug" }
    synonyms: jsonb().$type<Record<string, string>>().default({}),
    // Recently used vocabulary items with usage tracking
    recentlyUsed: jsonb()
      .$type<{ slug: string; lastUsedAt: string; useCount: number }[]>()
      .default([]),
    // Dismissed role-based suggestions
    dismissedSuggestions: jsonb().$type<string[]>().default([]),
    // Private vocabulary formulas (user-only, not shared)
    privateVocabulary: jsonb()
      .$type<
        {
          id: string;
          name: string;
          slug: string;
          type: "metric" | "dimension" | "filter";
          formula: string;
          description?: string;
          createdAt: string;
          updatedAt?: string;
        }[]
      >()
      .default([]),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_user_vocab_prefs").on(table.userId, table.workspaceId),
  ]
);

// ============================================================================
// INTELLIGENCE TABLES
// ============================================================================

/**
 * Analyses - Schema analysis runs
 */
export const knosiaAnalysis = pgTable("knosia_analysis", {
  id: text().primaryKey().$defaultFn(generateId),
  connectionId: text()
    .references(() => knosiaConnection.id, { onDelete: "cascade" })
    .notNull(),
  workspaceId: text().references(() => knosiaWorkspace.id, {
    onDelete: "cascade",
  }),
  status: knosiaAnalysisStatusEnum().notNull().default("running"),
  currentStep: integer().default(0),
  totalSteps: integer().default(5),
  summary: jsonb().$type<{
    tables?: number;
    metrics?: number;
    dimensions?: number;
    entities?: string[];
  }>(),
  businessType: jsonb().$type<{
    detected?: string;
    confidence?: number;
    reasoning?: string;
    alternatives?: { type: string; confidence: number }[];
  }>(),
  detectedVocab: jsonb().$type<{
    entities?: unknown[];
    metrics?: unknown[];
    dimensions?: unknown[];
    timeFields?: unknown[];
    filters?: unknown[];
    relationships?: unknown[];
  }>(),
  error: jsonb().$type<{
    code?: string;
    message?: string;
    details?: string;
  }>(),
  startedAt: timestamp().notNull().defaultNow(),
  completedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
});

/**
 * Threads - Chat sessions (renamed from Conversations)
 * Threads are persistent question-answer chains with forking and snapshot support.
 */
export const knosiaThread = pgTable("knosia_thread", {
  id: text().primaryKey().$defaultFn(generateId),
  userId: text()
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  workspaceId: text()
    .references(() => knosiaWorkspace.id, { onDelete: "cascade" })
    .notNull(),
  title: text(),
  context: jsonb().$type<{
    filters?: { field: string; operator: string; value: unknown }[];
    timeRange?: { start?: string; end?: string };
    vocabularyFocus?: string[];
  }>(),
  status: knosiaThreadStatusEnum().notNull().default("active"),
  sharing: jsonb().$type<{
    sharedWith?: string[];
    publicLink?: string;
  }>(),
  outcomes: jsonb().$type<{
    insightsGenerated?: { id: string; title: string; saved: boolean }[];
    actionsTaken?: string[];
    decisionsMade?: string[];
    followUpScheduled?: string;
  }>(),
  // NEW: Thread-specific columns
  isAiInitiated: boolean().default(false),
  starred: boolean().default(false),
  parentThreadId: text(), // Self-reference for forking (FK added after table def)
  forkedFromMessageId: text(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
});

/**
 * Thread Messages - Individual messages in a thread
 * Enhanced with Block Trust Metadata (provenance) for transparency.
 */
export const knosiaThreadMessage = pgTable("knosia_thread_message", {
  id: text().primaryKey().$defaultFn(generateId),
  threadId: text()
    .references(() => knosiaThread.id, { onDelete: "cascade" })
    .notNull(),
  role: knosiaMessageRoleEnum().notNull(),
  content: text().notNull(),
  intent: text(), // causal_analysis, data_retrieval, comparison, forecast
  grounding: jsonb().$type<string[]>(), // vocabulary item IDs
  sqlGenerated: text(),
  visualization: jsonb().$type<{
    type?: string;
    data?: unknown;
    config?: unknown;
  }>(),
  confidence: real(),
  // NEW: Block Trust Metadata (provenance)
  provenance: jsonb().$type<{
    freshness: string; // "As of Dec 31, 2:30 PM"
    sources: {
      name: string; // "Stripe.subscriptions"
      query?: string; // SQL preview
    }[];
    assumptions?: string[]; // ["USD only", "excludes refunds"]
    confidenceLevel: "exact" | "calculated" | "estimated" | "predicted";
    confidenceScore: number; // 0-100
  }>(),
  commentCount: integer().default(0),
  createdAt: timestamp().notNull().defaultNow(),
});

// ============================================================================
// GOVERNANCE TABLES
// ============================================================================

/**
 * Mismatch Reports - User-reported vocabulary issues
 */
export const knosiaMismatchReport = pgTable("knosia_mismatch_report", {
  id: text().primaryKey().$defaultFn(generateId),
  itemId: text()
    .references(() => knosiaVocabularyItem.id, { onDelete: "cascade" })
    .notNull(),
  userId: text()
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  workspaceId: text().references(() => knosiaWorkspace.id, {
    onDelete: "cascade",
  }),
  issueType: knosiaMismatchIssueEnum().notNull(),
  description: text(),
  status: knosiaMismatchStatusEnum().notNull().default("pending"),
  resolvedBy: text().references(() => user.id),
  resolutionNotes: text(),
  createdAt: timestamp().notNull().defaultNow(),
  resolvedAt: timestamp(),
});

// ============================================================================
// THREAD EXTENSION TABLES
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
  snapshotData: jsonb()
    .$type<{
      messages: unknown[];
      context: unknown;
    }>()
    .notNull(),
  createdBy: text().references(() => user.id),
  createdAt: timestamp().notNull().defaultNow(),
});

// ============================================================================
// CANVAS TABLES
// ============================================================================

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
  layout: jsonb()
    .$type<{
      type: "grid" | "freeform";
      columns?: number;
      rows?: number;
    }>()
    .default({ type: "grid", columns: 12 }),
  // Sharing
  visibility: knosiaWorkspaceVisibilityEnum().notNull().default("private"),
  sharedWith: jsonb().$type<string[]>().default([]),
  // Metadata
  lastViewedAt: timestamp(),
  viewCount: integer().default(0),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
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
  position: jsonb()
    .$type<{
      x: number; // Column start (0-based)
      y: number; // Row start (0-based)
      width: number; // Columns span
      height: number; // Rows span
    }>()
    .notNull(),
  // Block configuration
  config: jsonb().$type<{
    // For data blocks
    metric?: string; // Vocabulary item slug
    dimensions?: string[]; // Group by
    timeRange?: string; // Last 7 days, MTD, etc.
    comparison?: string; // WoW, MoM, etc.
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
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
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
  condition: jsonb()
    .$type<{
      metric: string;
      operator: "gt" | "lt" | "eq" | "gte" | "lte" | "change_gt" | "change_lt";
      threshold: number;
      timeWindow?: string;
    }>()
    .notNull(),
  channels: jsonb().$type<("in_app" | "email" | "slack")[]>().default(["in_app"]),
  enabled: boolean().default(true),
  lastTriggeredAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
});

// ============================================================================
// COLLABORATION TABLES
// ============================================================================

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
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
});

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

// ============================================================================
// NOTIFICATION TABLES
// ============================================================================

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
// ZOD SCHEMAS & TYPES
// ============================================================================

// Organizations
export const insertKnosiaOrganizationSchema =
  createInsertSchema(knosiaOrganization);
export const selectKnosiaOrganizationSchema =
  createSelectSchema(knosiaOrganization);
export const updateKnosiaOrganizationSchema =
  createUpdateSchema(knosiaOrganization);
export type InsertKnosiaOrganization = z.infer<
  typeof insertKnosiaOrganizationSchema
>;
export type SelectKnosiaOrganization = z.infer<
  typeof selectKnosiaOrganizationSchema
>;

// Workspaces
export const insertKnosiaWorkspaceSchema = createInsertSchema(knosiaWorkspace);
export const selectKnosiaWorkspaceSchema = createSelectSchema(knosiaWorkspace);
export const updateKnosiaWorkspaceSchema = createUpdateSchema(knosiaWorkspace);
export type InsertKnosiaWorkspace = z.infer<typeof insertKnosiaWorkspaceSchema>;
export type SelectKnosiaWorkspace = z.infer<typeof selectKnosiaWorkspaceSchema>;

// Connections
export const insertKnosiaConnectionSchema =
  createInsertSchema(knosiaConnection);
export const selectKnosiaConnectionSchema =
  createSelectSchema(knosiaConnection);
export const updateKnosiaConnectionSchema =
  createUpdateSchema(knosiaConnection);
export type InsertKnosiaConnection = z.infer<
  typeof insertKnosiaConnectionSchema
>;
export type SelectKnosiaConnection = z.infer<
  typeof selectKnosiaConnectionSchema
>;

// Connection Health
export const insertKnosiaConnectionHealthSchema = createInsertSchema(
  knosiaConnectionHealth,
);
export const selectKnosiaConnectionHealthSchema = createSelectSchema(
  knosiaConnectionHealth,
);
export type InsertKnosiaConnectionHealth = z.infer<
  typeof insertKnosiaConnectionHealthSchema
>;
export type SelectKnosiaConnectionHealth = z.infer<
  typeof selectKnosiaConnectionHealthSchema
>;

// Connection Schema
export const insertKnosiaConnectionSchemaSchema = createInsertSchema(
  knosiaConnectionSchema,
);
export const selectKnosiaConnectionSchemaSchema = createSelectSchema(
  knosiaConnectionSchema,
);
export type InsertKnosiaConnectionSchema = z.infer<
  typeof insertKnosiaConnectionSchemaSchema
>;
export type SelectKnosiaConnectionSchema = z.infer<
  typeof selectKnosiaConnectionSchemaSchema
>;

// Vocabulary Items
export const insertKnosiaVocabularyItemSchema =
  createInsertSchema(knosiaVocabularyItem);
export const selectKnosiaVocabularyItemSchema =
  createSelectSchema(knosiaVocabularyItem);
export const updateKnosiaVocabularyItemSchema =
  createUpdateSchema(knosiaVocabularyItem);
export type InsertKnosiaVocabularyItem = z.infer<
  typeof insertKnosiaVocabularyItemSchema
>;
export type SelectKnosiaVocabularyItem = z.infer<
  typeof selectKnosiaVocabularyItemSchema
>;

// Vocabulary Versions
export const insertKnosiaVocabularyVersionSchema = createInsertSchema(
  knosiaVocabularyVersion,
);
export const selectKnosiaVocabularyVersionSchema = createSelectSchema(
  knosiaVocabularyVersion,
);
export type InsertKnosiaVocabularyVersion = z.infer<
  typeof insertKnosiaVocabularyVersionSchema
>;
export type SelectKnosiaVocabularyVersion = z.infer<
  typeof selectKnosiaVocabularyVersionSchema
>;

// Role Templates
export const insertKnosiaRoleTemplateSchema =
  createInsertSchema(knosiaRoleTemplate);
export const selectKnosiaRoleTemplateSchema =
  createSelectSchema(knosiaRoleTemplate);
export const updateKnosiaRoleTemplateSchema =
  createUpdateSchema(knosiaRoleTemplate);
export type InsertKnosiaRoleTemplate = z.infer<
  typeof insertKnosiaRoleTemplateSchema
>;
export type SelectKnosiaRoleTemplate = z.infer<
  typeof selectKnosiaRoleTemplateSchema
>;

// Workspace Memberships
export const insertKnosiaWorkspaceMembershipSchema = createInsertSchema(
  knosiaWorkspaceMembership,
);
export const selectKnosiaWorkspaceMembershipSchema = createSelectSchema(
  knosiaWorkspaceMembership,
);
export const updateKnosiaWorkspaceMembershipSchema = createUpdateSchema(
  knosiaWorkspaceMembership,
);
export type InsertKnosiaWorkspaceMembership = z.infer<
  typeof insertKnosiaWorkspaceMembershipSchema
>;
export type SelectKnosiaWorkspaceMembership = z.infer<
  typeof selectKnosiaWorkspaceMembershipSchema
>;

// User Preferences
export const insertKnosiaUserPreferenceSchema =
  createInsertSchema(knosiaUserPreference);
export const selectKnosiaUserPreferenceSchema =
  createSelectSchema(knosiaUserPreference);
export const updateKnosiaUserPreferenceSchema =
  createUpdateSchema(knosiaUserPreference);
export type InsertKnosiaUserPreference = z.infer<
  typeof insertKnosiaUserPreferenceSchema
>;
export type SelectKnosiaUserPreference = z.infer<
  typeof selectKnosiaUserPreferenceSchema
>;

// Analyses
export const insertKnosiaAnalysisSchema = createInsertSchema(knosiaAnalysis);
export const selectKnosiaAnalysisSchema = createSelectSchema(knosiaAnalysis);
export const updateKnosiaAnalysisSchema = createUpdateSchema(knosiaAnalysis);
export type InsertKnosiaAnalysis = z.infer<typeof insertKnosiaAnalysisSchema>;
export type SelectKnosiaAnalysis = z.infer<typeof selectKnosiaAnalysisSchema>;

// Threads (renamed from Conversations)
export const insertKnosiaThreadSchema = createInsertSchema(knosiaThread);
export const selectKnosiaThreadSchema = createSelectSchema(knosiaThread);
export const updateKnosiaThreadSchema = createUpdateSchema(knosiaThread);
export type InsertKnosiaThread = z.infer<typeof insertKnosiaThreadSchema>;
export type SelectKnosiaThread = z.infer<typeof selectKnosiaThreadSchema>;

// Thread Messages (renamed from Conversation Messages)
export const insertKnosiaThreadMessageSchema =
  createInsertSchema(knosiaThreadMessage);
export const selectKnosiaThreadMessageSchema =
  createSelectSchema(knosiaThreadMessage);
export type InsertKnosiaThreadMessage = z.infer<
  typeof insertKnosiaThreadMessageSchema
>;
export type SelectKnosiaThreadMessage = z.infer<
  typeof selectKnosiaThreadMessageSchema
>;

// Workspace Connections
export const insertKnosiaWorkspaceConnectionSchema = createInsertSchema(
  knosiaWorkspaceConnection,
);
export const selectKnosiaWorkspaceConnectionSchema = createSelectSchema(
  knosiaWorkspaceConnection,
);
export type InsertKnosiaWorkspaceConnection = z.infer<
  typeof insertKnosiaWorkspaceConnectionSchema
>;
export type SelectKnosiaWorkspaceConnection = z.infer<
  typeof selectKnosiaWorkspaceConnectionSchema
>;

// Mismatch Reports
export const insertKnosiaMismatchReportSchema =
  createInsertSchema(knosiaMismatchReport);
export const selectKnosiaMismatchReportSchema =
  createSelectSchema(knosiaMismatchReport);
export const updateKnosiaMismatchReportSchema =
  createUpdateSchema(knosiaMismatchReport);
export type InsertKnosiaMismatchReport = z.infer<
  typeof insertKnosiaMismatchReportSchema
>;
export type SelectKnosiaMismatchReport = z.infer<
  typeof selectKnosiaMismatchReportSchema
>;

// Thread Snapshots
export const insertKnosiaThreadSnapshotSchema =
  createInsertSchema(knosiaThreadSnapshot);
export const selectKnosiaThreadSnapshotSchema =
  createSelectSchema(knosiaThreadSnapshot);
export type InsertKnosiaThreadSnapshot = z.infer<
  typeof insertKnosiaThreadSnapshotSchema
>;
export type SelectKnosiaThreadSnapshot = z.infer<
  typeof selectKnosiaThreadSnapshotSchema
>;

// Canvases
export const insertKnosiaCanvasSchema = createInsertSchema(knosiaCanvas);
export const selectKnosiaCanvasSchema = createSelectSchema(knosiaCanvas);
export const updateKnosiaCanvasSchema = createUpdateSchema(knosiaCanvas);
export type InsertKnosiaCanvas = z.infer<typeof insertKnosiaCanvasSchema>;
export type SelectKnosiaCanvas = z.infer<typeof selectKnosiaCanvasSchema>;

// Canvas Blocks
export const insertKnosiaCanvasBlockSchema =
  createInsertSchema(knosiaCanvasBlock);
export const selectKnosiaCanvasBlockSchema =
  createSelectSchema(knosiaCanvasBlock);
export const updateKnosiaCanvasBlockSchema =
  createUpdateSchema(knosiaCanvasBlock);
export type InsertKnosiaCanvasBlock = z.infer<
  typeof insertKnosiaCanvasBlockSchema
>;
export type SelectKnosiaCanvasBlock = z.infer<
  typeof selectKnosiaCanvasBlockSchema
>;

// Canvas Alerts
export const insertKnosiaCanvasAlertSchema =
  createInsertSchema(knosiaCanvasAlert);
export const selectKnosiaCanvasAlertSchema =
  createSelectSchema(knosiaCanvasAlert);
export const updateKnosiaCanvasAlertSchema =
  createUpdateSchema(knosiaCanvasAlert);
export type InsertKnosiaCanvasAlert = z.infer<
  typeof insertKnosiaCanvasAlertSchema
>;
export type SelectKnosiaCanvasAlert = z.infer<
  typeof selectKnosiaCanvasAlertSchema
>;

// Comments
export const insertKnosiaCommentSchema = createInsertSchema(knosiaComment);
export const selectKnosiaCommentSchema = createSelectSchema(knosiaComment);
export const updateKnosiaCommentSchema = createUpdateSchema(knosiaComment);
export type InsertKnosiaComment = z.infer<typeof insertKnosiaCommentSchema>;
export type SelectKnosiaComment = z.infer<typeof selectKnosiaCommentSchema>;

// Activity
export const insertKnosiaActivitySchema = createInsertSchema(knosiaActivity);
export const selectKnosiaActivitySchema = createSelectSchema(knosiaActivity);
export type InsertKnosiaActivity = z.infer<typeof insertKnosiaActivitySchema>;
export type SelectKnosiaActivity = z.infer<typeof selectKnosiaActivitySchema>;

// Notifications
export const insertKnosiaNotificationSchema =
  createInsertSchema(knosiaNotification);
export const selectKnosiaNotificationSchema =
  createSelectSchema(knosiaNotification);
export const updateKnosiaNotificationSchema =
  createUpdateSchema(knosiaNotification);
export type InsertKnosiaNotification = z.infer<
  typeof insertKnosiaNotificationSchema
>;
export type SelectKnosiaNotification = z.infer<
  typeof selectKnosiaNotificationSchema
>;

// Digests
export const insertKnosiaDigestSchema = createInsertSchema(knosiaDigest);
export const selectKnosiaDigestSchema = createSelectSchema(knosiaDigest);
export const updateKnosiaDigestSchema = createUpdateSchema(knosiaDigest);
export type InsertKnosiaDigest = z.infer<typeof insertKnosiaDigestSchema>;
export type SelectKnosiaDigest = z.infer<typeof selectKnosiaDigestSchema>;

// AI Insights
export const insertKnosiaAiInsightSchema = createInsertSchema(knosiaAiInsight);
export const selectKnosiaAiInsightSchema = createSelectSchema(knosiaAiInsight);
export const updateKnosiaAiInsightSchema = createUpdateSchema(knosiaAiInsight);
export type InsertKnosiaAiInsight = z.infer<typeof insertKnosiaAiInsightSchema>;
export type SelectKnosiaAiInsight = z.infer<typeof selectKnosiaAiInsightSchema>;
