import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  real,
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

export const knosiaConversationStatusEnum = pgEnum(
  "knosia_conversation_status",
  ["active", "archived", "shared"],
);

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
 * Conversations - Chat sessions
 */
export const knosiaConversation = pgTable("knosia_conversation", {
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
  status: knosiaConversationStatusEnum().notNull().default("active"),
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
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
});

/**
 * Conversation Messages - Individual messages in a conversation
 */
export const knosiaConversationMessage = pgTable(
  "knosia_conversation_message",
  {
    id: text().primaryKey().$defaultFn(generateId),
    conversationId: text()
      .references(() => knosiaConversation.id, { onDelete: "cascade" })
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
    createdAt: timestamp().notNull().defaultNow(),
  },
);

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

// Conversations
export const insertKnosiaConversationSchema =
  createInsertSchema(knosiaConversation);
export const selectKnosiaConversationSchema =
  createSelectSchema(knosiaConversation);
export const updateKnosiaConversationSchema =
  createUpdateSchema(knosiaConversation);
export type InsertKnosiaConversation = z.infer<
  typeof insertKnosiaConversationSchema
>;
export type SelectKnosiaConversation = z.infer<
  typeof selectKnosiaConversationSchema
>;

// Conversation Messages
export const insertKnosiaConversationMessageSchema = createInsertSchema(
  knosiaConversationMessage,
);
export const selectKnosiaConversationMessageSchema = createSelectSchema(
  knosiaConversationMessage,
);
export type InsertKnosiaConversationMessage = z.infer<
  typeof insertKnosiaConversationMessageSchema
>;
export type SelectKnosiaConversationMessage = z.infer<
  typeof selectKnosiaConversationMessageSchema
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
