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
