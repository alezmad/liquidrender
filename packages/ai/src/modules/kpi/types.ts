/**
 * KPI Recipe Types
 *
 * Defines calculated metrics that can be generated from raw database columns.
 * Used by LLM to transform business KPI names into LiquidConnect MetricDefinitions.
 */

import { z } from "zod";

/**
 * Aggregation types (aligned with LiquidConnect semantic layer)
 */
export const AggregationType = z.enum([
  "SUM",
  "AVG",
  "COUNT",
  "COUNT_DISTINCT",
  "MIN",
  "MAX",
]);

export type AggregationType = z.infer<typeof AggregationType>;

/**
 * Time granularity for time-series metrics
 */
export const TimeGranularity = z.enum([
  "hour",
  "day",
  "week",
  "month",
  "quarter",
  "year",
]);

export type TimeGranularity = z.infer<typeof TimeGranularity>;

/**
 * Metric type (aligned with LiquidConnect semantic layer)
 */
export const MetricType = z.enum(["simple", "derived", "cumulative"]);
export type MetricType = z.infer<typeof MetricType>;

/**
 * Filter operator (aligned with LiquidConnect semantic layer)
 */
export const FilterOperator = z.enum([
  "=",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "IN",
  "NOT IN",
  "LIKE",
  "IS NULL",
  "IS NOT NULL",
]);
export type FilterOperator = z.infer<typeof FilterOperator>;

/**
 * Display format type
 */
export const DisplayFormat = z.enum(["number", "currency", "percent", "duration"]);
export type DisplayFormat = z.infer<typeof DisplayFormat>;

/**
 * Filter condition (aligned with LiquidConnect FilterCondition)
 */
export const FilterConditionSchema = z.object({
  field: z.string().describe("Field to filter on (e.g., 'status', 'subscription_type')"),
  operator: FilterOperator,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number()]))
  ]).optional().describe("Filter value (optional for NULL checks)"),
});

export type FilterCondition = z.infer<typeof FilterConditionSchema>;

/**
 * Aggregation component for ratio KPIs.
 * Used in numerator/denominator of ratio definitions.
 */
export const AggregationComponentSchema = z.object({
  aggregation: AggregationType.describe("Aggregation function to apply"),
  expression: z.string().describe("Column name or arithmetic expression (NO SQL functions)"),
  filterCondition: z.string().optional().describe("Optional FILTER clause condition"),
});

export type AggregationComponentType = z.infer<typeof AggregationComponentSchema>;

/**
 * Simple KPI Definition - Single aggregation on a column/expression.
 *
 * Examples:
 *   - Total Revenue: { type: "simple", aggregation: "SUM", expression: "unit_price * quantity" }
 *   - Order Count: { type: "simple", aggregation: "COUNT", expression: "*" }
 */
export const SimpleKPIDefinitionSchema = z.object({
  type: z.literal("simple"),
  aggregation: AggregationType.describe("Aggregation function: SUM, AVG, COUNT, COUNT_DISTINCT, MIN, MAX"),
  expression: z.string().describe("Column name or arithmetic expression (e.g., 'unit_price * quantity'). Use '*' for COUNT(*)"),
  entity: z.string().describe("Source table name"),
  timeField: z.string().optional().describe("Timestamp column for time-series"),
  grain: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']).optional().describe("Time-series grain for temporal aggregation (requires timeField). Inferred from KPI name if not specified."),
  filters: z.array(FilterConditionSchema).optional().describe("WHERE conditions"),
});

/**
 * Ratio KPI Definition - Numerator divided by denominator.
 *
 * Examples:
 *   - Average Order Value: { numerator: {aggregation: "SUM", expression: "revenue"},
 *                            denominator: {aggregation: "COUNT_DISTINCT", expression: "order_id"} }
 *   - Discount Rate: { numerator: {...}, denominator: {...}, multiplier: 100 }
 */
export const RatioKPIDefinitionSchema = z.object({
  type: z.literal("ratio"),
  numerator: AggregationComponentSchema.describe("Numerator aggregation"),
  denominator: AggregationComponentSchema.describe("Denominator aggregation"),
  multiplier: z.number().optional().describe("Multiply result by this (e.g., 100 for percentages)"),
  entity: z.string().describe("Source table name"),
  timeField: z.string().optional().describe("Timestamp column for time-series"),
  filters: z.array(FilterConditionSchema).optional().describe("WHERE conditions"),
});

/**
 * Derived KPI Definition - References other KPIs/metrics.
 *
 * Examples:
 *   - Profit Margin: { expression: "(@revenue - @cost) / @revenue * 100", dependencies: ["revenue", "cost"] }
 */
export const DerivedKPIDefinitionSchema = z.object({
  type: z.literal("derived"),
  expression: z.string().describe("Expression using @metric references (e.g., '@revenue - @cost')"),
  dependencies: z.array(z.string()).describe("List of metric slugs this KPI depends on"),
  entity: z.string().describe("Source table name (primary)"),
  timeField: z.string().optional().describe("Timestamp column for time-series"),
});

/**
 * KPI Semantic Definition - Basic 3 types (simple, ratio, derived).
 *
 * NOTE: For advanced types (filtered, window, case, composite, etc.),
 * see ExtendedKPISemanticDefinitionSchema defined later in this file.
 * The KPIRecipeSchema below uses this basic schema for initial validation,
 * but the generator supports all 10 types via the Extended schema.
 */
export const KPISemanticDefinitionSchema = z.discriminatedUnion("type", [
  SimpleKPIDefinitionSchema,
  RatioKPIDefinitionSchema,
  DerivedKPIDefinitionSchema,
]);

export type KPISemanticDefinitionType = z.infer<typeof KPISemanticDefinitionSchema>;

/**
 * LEGACY: Semantic Metric Definition (for backward compatibility)
 * This is the old format that allowed raw SQL in expression field.
 *
 * @deprecated Use KPISemanticDefinitionSchema instead
 */
export const SemanticMetricDefinitionSchema = z.object({
  // Core definition (LiquidConnect MetricDefinition fields)
  type: MetricType.describe("Metric type: simple (aggregation), derived (formula), cumulative (running total)"),
  expression: z.string().describe("Column name or expression to aggregate (e.g., 'amount', 'price * quantity')"),
  aggregation: AggregationType.optional().describe("Aggregation function (required for simple metrics)"),
  entity: z.string().describe("Source table/entity name"),

  // Time-series support
  timeField: z.string().optional().describe("Timestamp column for time-series metrics"),
  timeGranularity: TimeGranularity.optional().describe("Time grouping (month, week, day, etc.)"),

  // Filters (converted to LiquidConnect FilterCondition)
  filters: z.array(FilterConditionSchema).optional().describe("WHERE conditions for this metric"),

  // Derived metric support
  dependencies: z.array(z.string()).optional().describe("Other metrics this depends on (for derived metrics)"),

  // Display metadata
  label: z.string().optional().describe("Display label"),
  description: z.string().optional().describe("Metric description"),
  unit: z.string().optional().describe("Unit of measurement (e.g., '$', '%', 'users')"),
  format: z.object({
    type: DisplayFormat,
    decimals: z.number().optional(),
    currency: z.string().optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }).optional().describe("Display formatting"),
});

export type SemanticMetricDefinition = z.infer<typeof SemanticMetricDefinitionSchema>;

/**
 * NEW: Recipe for calculating a business KPI using DSL definitions.
 * The LLM generates these structured definitions, which are then
 * compiled to SQL by the KPI compiler using dialect-specific emitters.
 */
export const KPIRecipeSchema = z.object({
  // Display metadata
  name: z.string().describe("Business-friendly name (e.g., 'Average Order Value')"),
  description: z.string().describe("What this KPI measures and why it matters"),
  category: z.enum([
    "revenue", "growth", "retention", "engagement", "efficiency",
    "fulfillment", "inventory", "finance", "pricing", "logistics",
    "operational", "risk", "custom"
  ]),

  // DSL-based semantic definition (dialect-agnostic)
  kpiDefinition: KPISemanticDefinitionSchema,

  // Display formatting
  format: z.object({
    type: DisplayFormat,
    decimals: z.number().optional(),
    currency: z.string().optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }).optional().describe("Display formatting"),

  // Metadata for LLM confidence
  businessType: z.array(z.string()).describe("Business types this KPI applies to"),
  confidence: z.number().min(0).max(1).describe("LLM confidence (0-1)"),
  feasible: z.boolean().describe("Whether this KPI can be calculated from available data"),
  infeasibilityReason: z.string().optional().describe("Why KPI can't be calculated, if infeasible"),

  // Column dependencies (informational)
  requiredColumns: z.array(z.object({
    tableName: z.string(),
    columnName: z.string(),
    purpose: z.string(),
  })).optional().describe("Column dependencies"),
});

export type KPIRecipe = z.infer<typeof KPIRecipeSchema>;

/**
 * LEGACY: Recipe for calculating a business metric (backward compatibility)
 * Contains semantic definition + metadata for feasibility/confidence
 *
 * @deprecated Use KPIRecipeSchema for new KPI generation
 */
export const CalculatedMetricRecipeSchema = z.object({
  // Display metadata
  name: z.string().describe("Business-friendly name (e.g., 'Monthly Recurring Revenue')"),
  description: z.string().describe("What this metric measures and why it matters"),
  category: z.enum([
    "revenue", "growth", "retention", "engagement", "efficiency",
    "fulfillment", "inventory", "finance", "pricing", "logistics",
    "operational", "risk", "custom"
  ]),

  // Semantic definition (database-agnostic)
  semanticDefinition: SemanticMetricDefinitionSchema,

  // Metadata for LLM confidence
  businessType: z.array(z.string()).describe("Business types this metric applies to (e.g., ['saas', 'ecommerce'])"),
  confidence: z.number().min(0).max(1).describe("LLM confidence in definition correctness (0-1)"),
  feasible: z.boolean().describe("Whether this metric can be calculated from available data"),
  infeasibilityReason: z.string().optional().describe("Why metric can't be calculated, if infeasible"),

  // Legacy compatibility (for reference only - semantic definition is source of truth)
  requiredColumns: z.array(z.object({
    tableName: z.string(),
    columnName: z.string(),
    purpose: z.string().describe("How this column is used in the calculation"),
  })).optional().describe("Column dependencies (informational only)"),

  // Validation log for training data collection (optional - only present if repairs occurred)
  validationLog: z.array(z.object({
    timestamp: z.string(),
    attempt: z.number(),
    stage: z.string(),
    error: z.string().optional(),
    result: z.string().optional(),
    model: z.string().optional(),
    rawInput: z.unknown().optional(),
    rawOutput: z.unknown().optional(),
    latencyMs: z.number().optional(),
    tokensIn: z.number().optional(),
    tokensOut: z.number().optional(),
  })).optional().describe("Validation and repair attempts for training"),
});

export type CalculatedMetricRecipe = z.infer<typeof CalculatedMetricRecipeSchema>;

/**
 * Semantic role for column classification
 */
export const SemanticRole = z.enum([
  "measure", // Numeric values that can be summed/averaged
  "id", // Unique identifier (primary key)
  "foreign_key", // Reference to another table
  "date", // Timestamp/date for time-series
  "dimension", // Categorical values for grouping
  "boolean", // True/false flags
  "text", // Free-form text
]);
export type SemanticRole = z.infer<typeof SemanticRole>;

/**
 * Column statistics from profiling
 */
export const ColumnStatistics = z.object({
  min: z.union([z.number(), z.string()]).optional(),
  max: z.union([z.number(), z.string()]).optional(),
  mean: z.number().optional(),
  distinctCount: z.number().optional(),
  nullPercentage: z.number().optional(),
  topValues: z.array(z.object({
    value: z.unknown(),
    percentage: z.number(),
  })).optional(),
});
export type ColumnStatistics = z.infer<typeof ColumnStatistics>;

/**
 * Request to generate KPI recipes
 */
export const GenerateRecipeRequestSchema = z.object({
  businessType: z.string(),
  vocabularyContext: z.object({
    tables: z.array(z.object({
      name: z.string(),
      rowCount: z.number().optional(),
      columns: z.array(z.object({
        name: z.string(),
        type: z.string(),
        semanticType: z.string().optional(),
        businessType: z.string().optional(),
        // NEW: Enriched column fields for schema-first generation
        semanticRole: SemanticRole.optional(),
        aggregationHint: z.enum(["SUM", "AVG", "COUNT_DISTINCT", "COUNT", "MIN", "MAX"]).nullable().optional(),
        statistics: ColumnStatistics.optional(),
      })),
    })),
    detectedMetrics: z.array(z.string()).optional(),
    detectedDimensions: z.array(z.string()).optional(),
    // NEW: Pre-formatted markdown for schema-first prompt
    enrichedSchemaMarkdown: z.string().optional(),
  }),
  requestedKPIs: z.array(z.string()).optional().describe("Specific KPI names to generate (e.g., ['MRR', 'Churn Rate'])"),
  generateCommonKPIs: z.boolean().optional().default(true).describe("Whether to auto-generate common KPIs for business type"),
  // NEW: Use schema-first generation approach (recommended)
  useSchemaFirstGeneration: z.boolean().optional().default(false).describe("Use schema-first approach instead of generic KPI list"),
});

export type GenerateRecipeRequest = z.infer<typeof GenerateRecipeRequestSchema>;

/**
 * Validation log entry for tracking repair attempts.
 *
 * Enhanced with prompt versioning and full LLM I/O tracing for:
 * - Reproducing exact generation conditions
 * - Comparing success rates across prompt versions
 * - Extracting (failing_input, fixed_output) pairs for learning
 * - Tracking token usage and latency trends
 */
export const ValidationLogEntrySchema = z.object({
  // === Core fields ===
  timestamp: z.string(),
  attempt: z.number(),
  stage: z.enum(["schema", "compile", "repair"]),
  error: z.string().optional(),
  model: z.string().optional(),
  result: z.enum(["success", "failed", "fixed"]).optional(),

  // === Prompt tracking ===
  promptName: z.string().optional().describe("Prompt template name (e.g., 'schema-first-kpi-generation')"),
  promptVersion: z.string().optional().describe("Prompt template version (e.g., '1.0.0')"),

  // === Full LLM I/O (critical for learning) ===
  fullPrompt: z.string().optional().describe("Complete rendered prompt sent to LLM"),
  rawInput: z.unknown().optional().describe("Object being validated (before repair)"),
  rawOutput: z.unknown().optional().describe("LLM response (after repair)"),

  // === Performance metrics ===
  latencyMs: z.number().optional().describe("LLM call duration in milliseconds"),
  tokensIn: z.number().optional().describe("Input token count"),
  tokensOut: z.number().optional().describe("Output token count"),
});

export type ValidationLogEntry = z.infer<typeof ValidationLogEntrySchema>;

/**
 * A KPI that failed validation after all repair attempts
 */
export const FailedRecipeSchema = z.object({
  name: z.string(),
  originalDefinition: z.unknown(),
  failureStage: z.enum(["schema", "compile"]),
  lastError: z.string(),
  validationLog: z.array(ValidationLogEntrySchema),
});

export type FailedRecipe = z.infer<typeof FailedRecipeSchema>;

/**
 * Generation statistics for observability
 */
export const GenerationStatsSchema = z.object({
  attempted: z.number().describe("Total KPIs attempted"),
  passedSchema: z.number().describe("KPIs that passed schema validation"),
  passedCompile: z.number().describe("KPIs that passed compilation"),
  repairedByHaiku: z.number().describe("KPIs repaired by Haiku (1st attempt)"),
  repairedBySonnet: z.number().describe("KPIs repaired by Sonnet (2nd attempt)"),
  finalSuccess: z.number().describe("KPIs that succeeded after all stages"),
  finalFailed: z.number().describe("KPIs that failed after all attempts"),
});

export type GenerationStats = z.infer<typeof GenerationStatsSchema>;

/**
 * Response from recipe generation
 */
export const GenerateRecipeResponseSchema = z.object({
  recipes: z.array(CalculatedMetricRecipeSchema),
  failedRecipes: z.array(FailedRecipeSchema).optional(),
  generationStats: GenerationStatsSchema.optional(),
  totalGenerated: z.number(),
  feasibleCount: z.number(),
  infeasibleCount: z.number(),
  averageConfidence: z.number(),
  warnings: z.array(z.string()).optional(),
});

export type GenerateRecipeResponse = z.infer<typeof GenerateRecipeResponseSchema>;

/**
 * Common KPI definitions by business type
 */
export const COMMON_KPIS_BY_BUSINESS_TYPE: Record<string, string[]> = {
  // ===================
  // SaaS / Subscription
  // ===================
  saas: [
    // Revenue
    "Monthly Recurring Revenue (MRR)",
    "Annual Recurring Revenue (ARR)",
    "Average Revenue Per User (ARPU)",
    "Net Revenue Retention (NRR)",
    "Expansion Revenue",
    "Revenue per Employee",
    // Growth & Retention
    "Customer Churn Rate",
    "Revenue Churn Rate",
    "Customer Lifetime Value (LTV)",
    "Customer Acquisition Cost (CAC)",
    "LTV/CAC Ratio",
    "Payback Period",
    // Engagement
    "Daily Active Users (DAU)",
    "Monthly Active Users (MAU)",
    "DAU/MAU Ratio",
    "Feature Adoption Rate",
    "Time to Value",
    // Operational
    "Trial-to-Paid Conversion Rate",
    "Onboarding Completion Rate",
    "Support Tickets per Customer",
    // Risk
    "Customer Concentration",
    "Revenue Concentration",
  ],

  // ===================
  // E-Commerce / Retail
  // ===================
  ecommerce: [
    // Revenue & Sales
    "Gross Merchandise Value (GMV)",
    "Average Order Value (AOV)",
    "Customer Lifetime Value (LTV)",
    "Revenue Per Visitor",
    "Net Revenue (after discounts)",
    "Revenue per Employee",
    // Conversion & Growth
    "Conversion Rate",
    "Repeat Purchase Rate",
    "Customer Acquisition Cost (CAC)",
    // Fulfillment & Operations
    "On-Time Delivery Rate",
    "Average Shipping Days",
    "Order Fulfillment Rate",
    "Average Items per Order",
    // Finance & Discounting
    "Discount Rate",
    "Average Freight per Order",
    "Total Freight Cost",
    // Inventory & Supply Chain
    "Inventory Turnover",
    "Products Below Reorder Level",
    "Stock Coverage Days",
    // Customer Risk
    "Top Customer Concentration",
    "Cart Abandonment Rate",
    "Return Rate",
  ],

  // ===================
  // ERP / Operations
  // ===================
  erp: [
    // Financial
    "Total Revenue",
    "Gross Profit Margin",
    "Operating Expenses",
    "Net Profit Margin",
    "Accounts Receivable Days",
    "Accounts Payable Days",
    // Inventory
    "Inventory Turnover",
    "Stock Coverage Days",
    "Products Below Reorder Level",
    "Inventory Accuracy",
    // Procurement
    "Purchase Order Cycle Time",
    "Supplier On-Time Delivery",
    "Cost Savings from Procurement",
    // Operations
    "Order-to-Cash Cycle Time",
    "On-Time Delivery Rate",
    "Order Fulfillment Rate",
    "Revenue per Employee",
    // Workforce
    "Employee Headcount",
    "Revenue per Employee",
    "Labor Cost Ratio",
  ],

  // ===================
  // Marketplace
  // ===================
  marketplace: [
    // GMV & Revenue
    "Gross Merchandise Value (GMV)",
    "Take Rate (Commission %)",
    "Net Revenue",
    "Average Order Value (AOV)",
    // Supply Side (Sellers)
    "Active Sellers",
    "New Seller Acquisition",
    "Seller Churn Rate",
    "GMV per Seller",
    "Seller NPS",
    // Demand Side (Buyers)
    "Active Buyers",
    "Buyer Acquisition Cost",
    "Repeat Purchase Rate",
    "Buyer-to-Seller Ratio",
    // Liquidity
    "Listing-to-Sale Conversion",
    "Time to First Sale",
    "Search-to-Purchase Rate",
    // Trust & Safety
    "Dispute Rate",
    "Fraud Rate",
    "Review Coverage",
  ],

  // ===================
  // CRM / Sales
  // ===================
  crm: [
    // Pipeline
    "Pipeline Value",
    "Pipeline Coverage Ratio",
    "Deals in Pipeline",
    "Average Deal Size",
    // Conversion
    "Lead Conversion Rate",
    "Win Rate",
    "Sales Cycle Length",
    "Quote-to-Close Rate",
    // Revenue
    "Revenue Per Customer",
    "Upsell Rate",
    "Cross-sell Rate",
    "Expansion Revenue",
    // Retention
    "Customer Retention Rate",
    "Net Promoter Score (NPS)",
    "Customer Satisfaction Score (CSAT)",
    // Productivity
    "Deals per Sales Rep",
    "Activities per Deal",
    "Revenue per Sales Rep",
    "Forecast Accuracy",
  ],

  // ===================
  // Marketing
  // ===================
  marketing: [
    // Acquisition
    "Cost Per Lead (CPL)",
    "Cost Per Acquisition (CPA)",
    "Customer Acquisition Cost (CAC)",
    "Lead-to-Customer Rate",
    // Pipeline
    "Marketing Qualified Leads (MQL)",
    "Sales Qualified Leads (SQL)",
    "MQL-to-SQL Conversion",
    // Campaign Performance
    "Return on Ad Spend (ROAS)",
    "Campaign ROI",
    "Click-Through Rate (CTR)",
    "Conversion Rate by Channel",
    // Engagement
    "Email Open Rate",
    "Email Click Rate",
    "Website Traffic",
    "Bounce Rate",
    // Attribution
    "Marketing Sourced Revenue",
    "Marketing Influenced Revenue",
    "Channel Mix Efficiency",
    // Budget
    "Marketing Spend",
    "Budget Utilization",
  ],

  // ===================
  // Support / Service
  // ===================
  support: [
    // Response & Resolution
    "First Response Time",
    "Average Resolution Time",
    "First Contact Resolution Rate",
    "Resolution Rate",
    // Volume
    "Ticket Volume",
    "Ticket Backlog",
    "Tickets per Customer",
    "Peak Hour Volume",
    // Quality
    "Customer Satisfaction Score (CSAT)",
    "Net Promoter Score (NPS)",
    "Quality Assurance Score",
    "Customer Effort Score (CES)",
    // Efficiency
    "Agent Utilization",
    "Average Handle Time",
    "Cost per Ticket",
    "Self-Service Rate",
    // Escalation
    "Escalation Rate",
    "Reopened Ticket Rate",
    "SLA Compliance Rate",
  ],

  // ===================
  // FinTech / Banking
  // ===================
  fintech: [
    // Volume
    "Total Transaction Volume",
    "Transaction Count",
    "Average Transaction Size",
    "Active Accounts",
    // Revenue
    "Net Interest Margin",
    "Fee Revenue",
    "Revenue per Account",
    "Cost per Transaction",
    // Risk
    "Default Rate",
    "Non-Performing Loans",
    "Fraud Rate",
    "Chargeback Rate",
    // Growth
    "New Account Openings",
    "Account Churn Rate",
    "Customer Acquisition Cost",
    // Compliance
    "KYC Completion Rate",
    "Regulatory Compliance Score",
    "Audit Finding Rate",
  ],

  // ===================
  // Healthcare
  // ===================
  healthcare: [
    // Patient Volume
    "Patient Volume",
    "New Patient Registrations",
    "Patient Retention Rate",
    "No-Show Rate",
    // Clinical
    "Average Length of Stay",
    "Readmission Rate",
    "Bed Occupancy Rate",
    "Patient Satisfaction Score",
    // Financial
    "Revenue per Patient",
    "Cost per Patient",
    "Collection Rate",
    "Days in Accounts Receivable",
    // Operational
    "Appointment Wait Time",
    "Staff-to-Patient Ratio",
    "Equipment Utilization",
    // Quality
    "Clinical Outcome Score",
    "Infection Rate",
    "Medication Error Rate",
  ],

  // ===================
  // Logistics / Supply Chain
  // ===================
  logistics: [
    // Delivery
    "On-Time Delivery Rate",
    "Average Delivery Time",
    "Delivery Success Rate",
    "Failed Delivery Rate",
    // Cost
    "Cost per Delivery",
    "Cost per Mile",
    "Fuel Cost Ratio",
    "Total Freight Cost",
    // Fleet
    "Fleet Utilization",
    "Vehicle Downtime",
    "Maintenance Cost per Vehicle",
    // Warehouse
    "Warehouse Utilization",
    "Pick Accuracy",
    "Order Cycle Time",
    "Inventory Accuracy",
    // Performance
    "Orders per Driver",
    "Revenue per Route",
    "Capacity Utilization",
  ],

  // ===================
  // Manufacturing
  // ===================
  manufacturing: [
    // Production
    "Total Output",
    "Production Yield",
    "Defect Rate",
    "Scrap Rate",
    // Efficiency
    "Overall Equipment Effectiveness (OEE)",
    "Machine Utilization",
    "Downtime Percentage",
    "Cycle Time",
    // Quality
    "First Pass Yield",
    "Rework Rate",
    "Customer Return Rate",
    "Quality Score",
    // Inventory
    "Raw Material Inventory Days",
    "Work-in-Progress Inventory",
    "Finished Goods Turnover",
    // Cost
    "Cost per Unit",
    "Labor Cost per Unit",
    "Energy Cost per Unit",
    // Safety
    "Incident Rate",
    "Lost Time Injury Rate",
  ],

  // ===================
  // Education / E-Learning
  // ===================
  edtech: [
    // Enrollment
    "Total Enrollments",
    "New Student Registrations",
    "Course Enrollment Rate",
    "Student Retention Rate",
    // Engagement
    "Course Completion Rate",
    "Average Time on Platform",
    "Content Engagement Score",
    "Assignment Submission Rate",
    // Performance
    "Average Grade/Score",
    "Pass Rate",
    "Certification Rate",
    "Student Progress Rate",
    // Revenue
    "Revenue per Student",
    "Course Revenue",
    "Tuition Collection Rate",
    // Satisfaction
    "Student Satisfaction Score",
    "Net Promoter Score (NPS)",
    "Instructor Rating",
  ],

  // ===================
  // Real Estate / Property
  // ===================
  realestate: [
    // Portfolio
    "Total Properties",
    "Occupied Units",
    "Vacancy Rate",
    "Average Rent per Unit",
    // Revenue
    "Gross Rental Income",
    "Net Operating Income",
    "Revenue per Square Foot",
    "Rent Collection Rate",
    // Leasing
    "New Leases Signed",
    "Lease Renewal Rate",
    "Average Lease Term",
    "Days on Market",
    // Maintenance
    "Maintenance Requests",
    "Average Resolution Time",
    "Maintenance Cost per Unit",
    // Tenant
    "Tenant Satisfaction Score",
    "Tenant Turnover Rate",
    "Eviction Rate",
  ],

  // ===================
  // Hospitality / Hotels
  // ===================
  hospitality: [
    // Occupancy
    "Occupancy Rate",
    "Average Daily Rate (ADR)",
    "Revenue Per Available Room (RevPAR)",
    "Room Nights Sold",
    // Revenue
    "Total Revenue",
    "Food & Beverage Revenue",
    "Ancillary Revenue",
    "Revenue per Guest",
    // Booking
    "Booking Conversion Rate",
    "Direct Booking Rate",
    "Cancellation Rate",
    "Average Length of Stay",
    // Service
    "Guest Satisfaction Score",
    "Net Promoter Score (NPS)",
    "Online Review Score",
    "Complaint Rate",
    // Operations
    "Housekeeping Efficiency",
    "Check-in Time",
    "Staff-to-Room Ratio",
  ],

  // ===================
  // Media / Publishing
  // ===================
  media: [
    // Audience
    "Total Subscribers",
    "Monthly Active Users",
    "New Subscribers",
    "Subscriber Churn Rate",
    // Engagement
    "Content Views",
    "Average Time on Content",
    "Pages per Session",
    "Engagement Rate",
    // Revenue
    "Subscription Revenue",
    "Ad Revenue",
    "Revenue per User",
    "ARPU (Average Revenue Per User)",
    // Content
    "Content Published",
    "Content Performance Score",
    "Viral Coefficient",
    // Advertising
    "Ad Impressions",
    "Click-Through Rate",
    "CPM (Cost Per Mille)",
    "Fill Rate",
  ],

  // ===================
  // Insurance
  // ===================
  insurance: [
    // Policies
    "Total Policies",
    "New Policies Written",
    "Policy Renewal Rate",
    "Premium Volume",
    // Claims
    "Claims Filed",
    "Claims Paid",
    "Loss Ratio",
    "Average Claim Amount",
    // Efficiency
    "Claims Processing Time",
    "First Notice of Loss (FNOL) Time",
    "Claims Settlement Rate",
    "Expense Ratio",
    // Risk
    "Combined Ratio",
    "Reserve Adequacy",
    "Fraud Detection Rate",
    // Customer
    "Customer Retention Rate",
    "Net Promoter Score (NPS)",
    "Policy Lapse Rate",
  ],

  // ===================
  // Telecom
  // ===================
  telecom: [
    // Subscribers
    "Total Subscribers",
    "New Activations",
    "Subscriber Churn Rate",
    "Net Subscriber Additions",
    // Revenue
    "Average Revenue Per User (ARPU)",
    "Total Revenue",
    "Data Revenue",
    "Voice Revenue",
    // Usage
    "Data Usage per Subscriber",
    "Minutes of Use",
    "Network Utilization",
    // Service
    "Network Uptime",
    "Call Drop Rate",
    "Customer Complaints",
    "First Call Resolution",
    // Quality
    "Net Promoter Score (NPS)",
    "Customer Satisfaction Score",
    "Service Level Agreement (SLA) Compliance",
  ],

  // ===================
  // HR / Recruiting
  // ===================
  hr: [
    // Hiring
    "Open Positions",
    "Applications Received",
    "Time to Hire",
    "Cost per Hire",
    // Pipeline
    "Interview-to-Offer Ratio",
    "Offer Acceptance Rate",
    "Quality of Hire Score",
    "Source of Hire",
    // Retention
    "Employee Turnover Rate",
    "Voluntary Turnover Rate",
    "Average Tenure",
    "Retention Rate",
    // Engagement
    "Employee Satisfaction Score",
    "Employee Net Promoter Score (eNPS)",
    "Engagement Score",
    // Performance
    "Training Completion Rate",
    "Performance Review Completion",
    "Promotion Rate",
    "Internal Mobility Rate",
  ],

  // ===================
  // Travel / Booking
  // ===================
  travel: [
    // Bookings
    "Total Bookings",
    "Booking Value",
    "Average Booking Value",
    "Bookings per User",
    // Conversion
    "Search-to-Book Conversion",
    "Cart Abandonment Rate",
    "Mobile Booking Rate",
    "Repeat Booking Rate",
    // Revenue
    "Gross Booking Revenue",
    "Net Revenue",
    "Commission Revenue",
    "Ancillary Revenue",
    // Customer
    "Customer Acquisition Cost",
    "Customer Lifetime Value",
    "Net Promoter Score (NPS)",
    // Operations
    "Cancellation Rate",
    "Refund Rate",
    "Support Tickets per Booking",
  ],

  // ===================
  // Non-Profit
  // ===================
  nonprofit: [
    // Donations
    "Total Donations",
    "Number of Donors",
    "Average Donation Size",
    "Recurring Donation Rate",
    // Fundraising
    "Fundraising Goal Attainment",
    "Cost per Dollar Raised",
    "Donor Retention Rate",
    "New Donor Acquisition",
    // Programs
    "Program Expense Ratio",
    "Beneficiaries Served",
    "Cost per Beneficiary",
    "Program Outcomes Score",
    // Volunteers
    "Active Volunteers",
    "Volunteer Hours",
    "Volunteer Retention Rate",
    // Financial
    "Operating Reserve Ratio",
    "Administrative Cost Ratio",
    "Grant Success Rate",
  ],

  // ===================
  // Energy / Utilities
  // ===================
  energy: [
    // Supply
    "Total Energy Generated",
    "Peak Demand",
    "Capacity Utilization",
    "Renewable Energy Percentage",
    // Distribution
    "System Average Interruption Duration (SAIDI)",
    "System Average Interruption Frequency (SAIFI)",
    "Line Loss Percentage",
    "Grid Reliability",
    // Customer
    "Total Customers",
    "Customer Churn Rate",
    "Average Revenue per Customer",
    "Bill Collection Rate",
    // Operations
    "Operating Cost per Unit",
    "Maintenance Backlog",
    "Outage Response Time",
    // Sustainability
    "Carbon Emissions",
    "Energy Efficiency Score",
    "Renewable Capacity Growth",
  ],

  // ===================
  // Construction
  // ===================
  construction: [
    // Projects
    "Active Projects",
    "Project Completion Rate",
    "On-Time Delivery Rate",
    "On-Budget Delivery Rate",
    // Financial
    "Total Contract Value",
    "Revenue Recognition",
    "Gross Profit Margin",
    "Backlog Value",
    // Efficiency
    "Labor Productivity",
    "Equipment Utilization",
    "Rework Percentage",
    "Change Order Rate",
    // Safety
    "Incident Rate",
    "Lost Time Injury Rate",
    "Safety Compliance Score",
    // Quality
    "Defect Rate",
    "Customer Satisfaction Score",
    "Warranty Claims",
  ],

  // ===================
  // Legal
  // ===================
  legal: [
    // Cases
    "Active Cases",
    "New Cases Opened",
    "Cases Closed",
    "Win Rate",
    // Billing
    "Billable Hours",
    "Realization Rate",
    "Collection Rate",
    "Revenue per Lawyer",
    // Efficiency
    "Average Case Duration",
    "Hours per Case",
    "Utilization Rate",
    "Leverage Ratio",
    // Client
    "Client Retention Rate",
    "Client Satisfaction Score",
    "Net Promoter Score (NPS)",
    "New Client Acquisition",
    // Financial
    "Revenue per Partner",
    "Profit per Partner",
    "Operating Margin",
  ],

  // ===================
  // Gaming
  // ===================
  gaming: [
    // Users
    "Daily Active Users (DAU)",
    "Monthly Active Users (MAU)",
    "New User Registrations",
    "User Retention (Day 1/7/30)",
    // Engagement
    "Average Session Length",
    "Sessions per User",
    "Level Completion Rate",
    "Feature Usage Rate",
    // Monetization
    "Average Revenue Per User (ARPU)",
    "Average Revenue Per Paying User (ARPPU)",
    "Conversion to Paying",
    "In-App Purchase Revenue",
    // Virality
    "Viral Coefficient",
    "Invite Conversion Rate",
    "Social Shares",
    // Retention
    "Churn Rate",
    "Lifetime Value (LTV)",
    "LTV/CAC Ratio",
  ],

  // ===================
  // Agriculture
  // ===================
  agriculture: [
    // Production
    "Total Yield",
    "Yield per Acre",
    "Crop Quality Score",
    "Harvest Efficiency",
    // Costs
    "Cost per Acre",
    "Input Costs (Seeds/Fertilizer)",
    "Labor Cost per Unit",
    "Equipment Operating Cost",
    // Inventory
    "Livestock Count",
    "Feed Conversion Ratio",
    "Storage Utilization",
    // Revenue
    "Revenue per Acre",
    "Price per Unit",
    "Gross Margin",
    // Sustainability
    "Water Usage per Acre",
    "Pesticide Usage",
    "Soil Health Score",
    "Carbon Footprint",
  ],
};

/**
 * Example KPI recipes for testing (using semantic definitions)
 */
export const EXAMPLE_RECIPES: CalculatedMetricRecipe[] = [
  {
    name: "Monthly Recurring Revenue (MRR)",
    description: "Total predictable revenue generated from active subscriptions each month",
    category: "revenue",
    semanticDefinition: {
      type: "simple",
      expression: "amount",
      aggregation: "SUM",
      entity: "subscriptions",
      timeField: "created_at",
      timeGranularity: "month",
      filters: [
        {
          field: "subscription_type",
          operator: "=",
          value: "recurring",
        },
        {
          field: "status",
          operator: "=",
          value: "active",
        },
      ],
      label: "Monthly Recurring Revenue",
      description: "Sum of recurring subscription amounts per month",
      unit: "$",
      format: {
        type: "currency",
        decimals: 2,
        currency: "USD",
      },
    },
    businessType: ["saas"],
    confidence: 0.95,
    feasible: true,
    requiredColumns: [
      {
        tableName: "subscriptions",
        columnName: "amount",
        purpose: "Subscription amount to sum",
      },
      {
        tableName: "subscriptions",
        columnName: "created_at",
        purpose: "Time dimension for monthly grouping",
      },
      {
        tableName: "subscriptions",
        columnName: "subscription_type",
        purpose: "Filter for recurring subscriptions",
      },
      {
        tableName: "subscriptions",
        columnName: "status",
        purpose: "Filter for active subscriptions",
      },
    ],
  },
  {
    name: "Customer Churn Rate",
    description: "Percentage of customers who cancelled their subscription in a given period",
    category: "retention",
    semanticDefinition: {
      type: "derived",
      expression: "(churned_customers / total_customers) * 100",
      entity: "customers",
      timeField: "cancelled_at",
      timeGranularity: "month",
      dependencies: ["churned_customers", "total_customers"],
      filters: [
        {
          field: "cancelled_at",
          operator: "IS NOT NULL",
        },
      ],
      label: "Churn Rate",
      description: "Percentage of customers who churned",
      unit: "%",
      format: {
        type: "percent",
        decimals: 1,
      },
    },
    businessType: ["saas", "crm"],
    confidence: 0.90,
    feasible: true,
    requiredColumns: [
      {
        tableName: "customers",
        columnName: "cancelled_at",
        purpose: "Identifies churned customers and when they churned",
      },
      {
        tableName: "customers",
        columnName: "status",
        purpose: "Filter for active customer base",
      },
    ],
  },
];

// ============================================================================
// Extended Aggregation Type Schema (v2)
// ============================================================================

export const ExtendedAggregationTypeSchema = z.enum([
  'SUM', 'COUNT', 'COUNT_DISTINCT', 'AVG', 'MIN', 'MAX',
  'MEDIAN', 'PERCENTILE_25', 'PERCENTILE_75', 'PERCENTILE_90', 'PERCENTILE_95', 'PERCENTILE_99',
  'STDDEV', 'VARIANCE', 'ARRAY_AGG', 'STRING_AGG'
]);

// ============================================================================
// Extended Filter Schemas (v2)
// ============================================================================

export const ExtendedFilterOperatorSchema = z.enum([
  '=', '!=', '>', '>=', '<', '<=',
  'IN', 'NOT IN', 'LIKE', 'NOT LIKE',
  'IS NULL', 'IS NOT NULL', 'BETWEEN',
  'EXISTS', 'NOT EXISTS'
]);

export const ExtendedSimpleFilterSchema = z.object({
  field: z.string(),
  operator: ExtendedFilterOperatorSchema,
  value: z.unknown().optional(),
});

export const ExtendedCompoundFilterSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal('compound'),
    operator: z.enum(['AND', 'OR']),
    conditions: z.array(z.union([ExtendedSimpleFilterSchema, ExtendedCompoundFilterSchema])),
  })
);

export const ExtendedFilterConditionSchema = z.union([ExtendedSimpleFilterSchema, ExtendedCompoundFilterSchema]);

// ============================================================================
// Extended KPI Base Schema (v2)
// ============================================================================

const ExtendedKPIBaseSchema = z.object({
  entity: z.string(),
  timeField: z.string().optional(),
  filters: z.array(ExtendedFilterConditionSchema).optional(),
  comparison: z.object({
    period: z.enum(['previous_period', 'previous_year', 'previous_month', 'previous_week', 'custom']),
    offsetDays: z.number().optional(),
  }).optional(),
});

// ============================================================================
// Extended KPI Definition Schemas (v2 - NEW TYPES)
// ============================================================================

// Filtered KPI (v2)
// subquery.groupBy is REQUIRED when subquery is present - prevents undefined in SQL output
export const FilteredKPIDefinitionSchema = ExtendedKPIBaseSchema.extend({
  type: z.literal('filtered'),
  aggregation: ExtendedAggregationTypeSchema,
  expression: z.string(),
  subquery: z.object({
    groupBy: z.union([z.string(), z.array(z.string())]),  // REQUIRED - prevents "SELECT undefined" in SQL
    having: z.string(),  // REQUIRED - filtered KPIs must have a condition
    subqueryEntity: z.string().optional(),  // Optional - defaults to main entity
  }).optional(),
  // percentOf: Required for percentage KPIs - calculates (filtered_count / total_count) * 100
  percentOf: z.string().optional().describe("Expression to calculate percentage against (required when format.type='percent')"),
});

// Window KPI (v2)
export const WindowKPIDefinitionSchema = ExtendedKPIBaseSchema.extend({
  type: z.literal('window'),
  aggregation: ExtendedAggregationTypeSchema,
  expression: z.string(),
  window: z.object({
    partitionBy: z.array(z.string()),
    orderBy: z.array(z.object({
      field: z.string(),
      direction: z.enum(['asc', 'desc']),
    })),
    frame: z.enum([
      'ROWS_UNBOUNDED_PRECEDING',
      'ROWS_BETWEEN_UNBOUNDED_AND_CURRENT',
      'ROWS_N_PRECEDING',
      'RANGE_UNBOUNDED_PRECEDING',
      'RANGE_INTERVAL_PRECEDING',
    ]).optional(),
    frameSize: z.number().optional(),
    frameInterval: z.string().optional(),
    lag: z.object({
      offset: z.number(),
      default: z.unknown().optional(),
    }).optional(),
    lead: z.object({
      offset: z.number(),
      default: z.unknown().optional(),
    }).optional(),
  }),
  outputExpression: z.string().optional(),
});

// Case KPI (v2)
export const CaseKPIDefinitionSchema = ExtendedKPIBaseSchema.extend({
  type: z.literal('case'),
  aggregation: ExtendedAggregationTypeSchema,
  cases: z.array(z.union([
    z.object({ when: z.string(), then: z.string() }),
    z.object({ else: z.string() }),
  ])),
});

// Composite KPI (v2)
export const CompositeKPIDefinitionSchema = ExtendedKPIBaseSchema.extend({
  type: z.literal('composite'),
  aggregation: ExtendedAggregationTypeSchema,
  expression: z.string(),
  sources: z.array(z.object({
    alias: z.string(),
    table: z.string(),
    schema: z.string().optional(),
    join: z.object({
      type: z.enum(['INNER', 'LEFT', 'RIGHT', 'FULL']),
      on: z.string(),
    }).optional(),
  })),
  groupBy: z.array(z.string()).optional(),
});

// Extended Simple KPI (v2) - same as v1 but with extended aggregations
export const ExtendedSimpleKPIDefinitionSchema = ExtendedKPIBaseSchema.extend({
  type: z.literal('simple'),
  aggregation: ExtendedAggregationTypeSchema,
  expression: z.string(),
});

// Extended Ratio KPI (v2)
export const ExtendedRatioKPIDefinitionSchema = ExtendedKPIBaseSchema.extend({
  type: z.literal('ratio'),
  numerator: z.object({
    aggregation: ExtendedAggregationTypeSchema,
    expression: z.string(),
    filterCondition: z.string().optional(),
  }),
  denominator: z.object({
    aggregation: ExtendedAggregationTypeSchema,
    expression: z.string(),
    filterCondition: z.string().optional(),
  }),
  multiplier: z.number().optional(),
});

// Extended Derived KPI (v2)
export const ExtendedDerivedKPIDefinitionSchema = ExtendedKPIBaseSchema.extend({
  type: z.literal('derived'),
  expression: z.string(),
  dependencies: z.array(z.string()),
});

// ============================================================================
// Extended KPI Semantic Definition Union (v2)
// ============================================================================

export const ExtendedKPISemanticDefinitionSchema = z.discriminatedUnion('type', [
  ExtendedSimpleKPIDefinitionSchema,
  ExtendedRatioKPIDefinitionSchema,
  ExtendedDerivedKPIDefinitionSchema,
  FilteredKPIDefinitionSchema,
  WindowKPIDefinitionSchema,
  CaseKPIDefinitionSchema,
  CompositeKPIDefinitionSchema,
]);

export type ExtendedKPISemanticDefinitionType = z.infer<typeof ExtendedKPISemanticDefinitionSchema>;

/**
 * Extended KPI Recipe Schema - Supports all 7 KPI types.
 * Use this for LLM validation instead of KPIRecipeSchema.
 *
 * Includes refinement to enforce percentOf requirement for filtered percentage KPIs.
 */
export const ExtendedKPIRecipeSchema = z.object({
  // Display metadata
  name: z.string().describe("Business-friendly name (e.g., 'Average Order Value')"),
  description: z.string().describe("What this KPI measures and why it matters"),
  category: z.enum([
    "revenue", "growth", "retention", "engagement", "efficiency",
    "fulfillment", "inventory", "finance", "pricing", "logistics",
    "operational", "risk", "custom"
  ]),

  // DSL-based semantic definition (supports all 7 types)
  kpiDefinition: ExtendedKPISemanticDefinitionSchema,

  // Display formatting
  format: z.object({
    type: DisplayFormat,
    decimals: z.number().optional(),
    currency: z.string().optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }).optional().describe("Display formatting"),

  // Metadata for LLM confidence
  businessType: z.array(z.string()).describe("Business types this KPI applies to"),
  confidence: z.number().min(0).max(1).describe("LLM confidence (0-1)"),
  feasible: z.boolean().describe("Whether this KPI can be calculated from available data"),
  infeasibilityReason: z.string().optional().describe("Why KPI can't be calculated, if infeasible"),

  // Column dependencies (informational)
  requiredColumns: z.array(z.object({
    tableName: z.string(),
    columnName: z.string(),
    purpose: z.string(),
  })).optional().describe("Column dependencies"),
}).refine(
  (data) => {
    // Enforce: filtered KPIs with percent format MUST have percentOf
    if (
      data.kpiDefinition.type === 'filtered' &&
      data.format?.type === 'percent' &&
      !('percentOf' in data.kpiDefinition && data.kpiDefinition.percentOf)
    ) {
      return false;
    }
    return true;
  },
  {
    message: "Filtered KPIs with format.type='percent' must include 'percentOf' field to calculate percentage. Without it, you get a raw count instead of a percentage.",
    path: ["kpiDefinition", "percentOf"],
  }
);

export type ExtendedKPIRecipe = z.infer<typeof ExtendedKPIRecipeSchema>;
