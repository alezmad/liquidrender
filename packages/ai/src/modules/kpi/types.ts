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
 * Semantic Metric Definition (aligned with LiquidConnect MetricDefinition)
 * This is what the LLM generates - database-agnostic metric definition
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
 * Recipe for calculating a business metric
 * Contains semantic definition + metadata for feasibility/confidence
 */
export const CalculatedMetricRecipeSchema = z.object({
  // Display metadata
  name: z.string().describe("Business-friendly name (e.g., 'Monthly Recurring Revenue')"),
  description: z.string().describe("What this metric measures and why it matters"),
  category: z.enum(["revenue", "growth", "retention", "engagement", "efficiency", "custom"]),

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
});

export type CalculatedMetricRecipe = z.infer<typeof CalculatedMetricRecipeSchema>;

/**
 * Request to generate KPI recipes
 */
export const GenerateRecipeRequestSchema = z.object({
  businessType: z.string(),
  vocabularyContext: z.object({
    tables: z.array(z.object({
      name: z.string(),
      columns: z.array(z.object({
        name: z.string(),
        type: z.string(),
        semanticType: z.string().optional(),
        businessType: z.string().optional(),
      })),
    })),
    detectedMetrics: z.array(z.string()).optional(),
    detectedDimensions: z.array(z.string()).optional(),
  }),
  requestedKPIs: z.array(z.string()).optional().describe("Specific KPI names to generate (e.g., ['MRR', 'Churn Rate'])"),
  generateCommonKPIs: z.boolean().default(true).describe("Whether to auto-generate common KPIs for business type"),
});

export type GenerateRecipeRequest = z.infer<typeof GenerateRecipeRequestSchema>;

/**
 * Response from recipe generation
 */
export const GenerateRecipeResponseSchema = z.object({
  recipes: z.array(CalculatedMetricRecipeSchema),
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
  saas: [
    "Monthly Recurring Revenue (MRR)",
    "Annual Recurring Revenue (ARR)",
    "Customer Churn Rate",
    "Revenue Churn Rate",
    "Customer Lifetime Value (LTV)",
    "Customer Acquisition Cost (CAC)",
    "LTV/CAC Ratio",
    "Active Users (DAU/MAU)",
    "Net Revenue Retention",
    "Expansion Revenue",
  ],
  ecommerce: [
    "Gross Merchandise Value (GMV)",
    "Average Order Value (AOV)",
    "Customer Lifetime Value (LTV)",
    "Cart Abandonment Rate",
    "Conversion Rate",
    "Return Rate",
    "Customer Acquisition Cost (CAC)",
    "Repeat Purchase Rate",
    "Revenue Per Visitor",
    "Inventory Turnover",
  ],
  crm: [
    "Lead Conversion Rate",
    "Sales Cycle Length",
    "Win Rate",
    "Average Deal Size",
    "Pipeline Value",
    "Customer Retention Rate",
    "Net Promoter Score (NPS)",
    "Customer Satisfaction Score (CSAT)",
    "Revenue Per Customer",
    "Upsell Rate",
  ],
  marketing: [
    "Cost Per Lead (CPL)",
    "Cost Per Acquisition (CPA)",
    "Return on Ad Spend (ROAS)",
    "Marketing Qualified Leads (MQL)",
    "Sales Qualified Leads (SQL)",
    "Lead-to-Customer Rate",
    "Campaign ROI",
    "Click-Through Rate (CTR)",
    "Conversion Rate by Channel",
    "Customer Engagement Score",
  ],
  support: [
    "First Response Time",
    "Average Resolution Time",
    "Customer Satisfaction Score (CSAT)",
    "Ticket Volume",
    "Ticket Backlog",
    "Resolution Rate",
    "Escalation Rate",
    "Self-Service Rate",
    "Agent Utilization",
    "Net Promoter Score (NPS)",
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
