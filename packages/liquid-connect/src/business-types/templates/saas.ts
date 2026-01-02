/**
 * SaaS Business Type Template
 *
 * Defines KPIs and dashboard layout for Software-as-a-Service businesses.
 */

import type {
  BusinessTypeTemplate,
  KPIDefinition,
  DashboardSection,
  EntityExpectation,
} from "../types";

// Primary KPIs
const mrrKPI: KPIDefinition = {
  id: "saas_mrr",
  name: "Monthly Recurring Revenue",
  slug: "mrr",
  type: "metric",
  aggregation: "SUM",
  format: "currency",
  direction: "higher_is_better",
  formula: {
    template: "SUM({amount_column}) WHERE {status_column} = 'active'",
    requiredMappings: [
      {
        slot: "amount_column",
        hint: "subscription amount/price/mrr column",
        patterns: [/\bmrr\b/i, /\bamount\b/i, /\bprice\b/i, /\bvalue\b/i],
      },
      {
        slot: "status_column",
        hint: "subscription status column",
        patterns: [/\bstatus\b/i, /\bstate\b/i, /\bactive\b/i],
      },
    ],
  },
  suggestedForRoles: ["executive", "finance", "sales"],
};

const churnRateKPI: KPIDefinition = {
  id: "saas_churn_rate",
  name: "Churn Rate",
  slug: "churn_rate",
  type: "metric",
  aggregation: "AVG",
  format: "percentage",
  direction: "lower_is_better",
  formula: {
    template:
      "COUNT({customer_id_column}) WHERE {churned_column} IS NOT NULL / COUNT(DISTINCT {customer_id_column}) * 100",
    requiredMappings: [
      {
        slot: "customer_id_column",
        hint: "customer/user ID column",
        patterns: [
          /\bcustomer_id\b/i,
          /\buser_id\b/i,
          /\btenant_id\b/i,
          /\baccount_id\b/i,
        ],
      },
      {
        slot: "churned_column",
        hint: "churn date/status column",
        patterns: [
          /\bchurn/i,
          /\bcancelled/i,
          /\bended/i,
          /\bterminated/i,
        ],
      },
    ],
  },
  suggestedForRoles: ["executive", "product", "sales"],
};

const customerCountKPI: KPIDefinition = {
  id: "saas_customer_count",
  name: "Active Customers",
  slug: "customer_count",
  type: "metric",
  aggregation: "COUNT_DISTINCT",
  format: "number",
  direction: "higher_is_better",
  formula: {
    template:
      "COUNT(DISTINCT {customer_id_column}) WHERE {status_column} = 'active'",
    requiredMappings: [
      {
        slot: "customer_id_column",
        hint: "customer/user ID column",
        patterns: [
          /\bcustomer_id\b/i,
          /\buser_id\b/i,
          /\btenant_id\b/i,
          /\baccount_id\b/i,
        ],
      },
      {
        slot: "status_column",
        hint: "subscription status column",
        patterns: [/\bstatus\b/i, /\bstate\b/i, /\bactive\b/i],
      },
    ],
  },
  suggestedForRoles: ["executive", "sales"],
};

const arpuKPI: KPIDefinition = {
  id: "saas_arpu",
  name: "Average Revenue Per User",
  slug: "arpu",
  type: "metric",
  aggregation: "AVG",
  format: "currency",
  direction: "higher_is_better",
  formula: {
    template:
      "SUM({amount_column}) / COUNT(DISTINCT {customer_id_column})",
    requiredMappings: [
      {
        slot: "amount_column",
        hint: "subscription amount/price column",
        patterns: [/\bmrr\b/i, /\bamount\b/i, /\bprice\b/i, /\bvalue\b/i],
      },
      {
        slot: "customer_id_column",
        hint: "customer/user ID column",
        patterns: [
          /\bcustomer_id\b/i,
          /\buser_id\b/i,
          /\btenant_id\b/i,
          /\baccount_id\b/i,
        ],
      },
    ],
  },
  suggestedForRoles: ["executive", "finance", "product"],
};

// Secondary KPIs
const arrKPI: KPIDefinition = {
  id: "saas_arr",
  name: "Annual Recurring Revenue",
  slug: "arr",
  type: "metric",
  aggregation: "SUM",
  format: "currency",
  direction: "higher_is_better",
  formula: {
    template: "SUM({amount_column}) * 12 WHERE {status_column} = 'active'",
    requiredMappings: [
      {
        slot: "amount_column",
        hint: "subscription amount/price/mrr column",
        patterns: [/\bmrr\b/i, /\bamount\b/i, /\bprice\b/i, /\bvalue\b/i],
      },
      {
        slot: "status_column",
        hint: "subscription status column",
        patterns: [/\bstatus\b/i, /\bstate\b/i, /\bactive\b/i],
      },
    ],
  },
  suggestedForRoles: ["executive", "finance"],
};

const trialConversionKPI: KPIDefinition = {
  id: "saas_trial_conversion",
  name: "Trial Conversion Rate",
  slug: "trial_conversion_rate",
  type: "metric",
  aggregation: "AVG",
  format: "percentage",
  direction: "higher_is_better",
  formula: {
    template:
      "COUNT({customer_id_column}) WHERE {converted_column} IS NOT NULL / COUNT({customer_id_column}) WHERE {trial_column} IS NOT NULL * 100",
    requiredMappings: [
      {
        slot: "customer_id_column",
        hint: "customer/user ID column",
        patterns: [
          /\bcustomer_id\b/i,
          /\buser_id\b/i,
          /\btenant_id\b/i,
          /\baccount_id\b/i,
        ],
      },
      {
        slot: "trial_column",
        hint: "trial start/status column",
        patterns: [/\btrial/i, /\btest/i, /\bfree/i],
      },
      {
        slot: "converted_column",
        hint: "conversion date/status column",
        patterns: [/\bconverted/i, /\bpaid/i, /\bupgraded/i],
      },
    ],
  },
  suggestedForRoles: ["sales", "product", "marketing"],
};

const nrrKPI: KPIDefinition = {
  id: "saas_nrr",
  name: "Net Revenue Retention",
  slug: "nrr",
  type: "metric",
  aggregation: "AVG",
  format: "percentage",
  direction: "higher_is_better",
  formula: {
    template:
      "({start_revenue} + {expansion_revenue} - {contraction_revenue} - {churn_revenue}) / {start_revenue} * 100",
    requiredMappings: [
      {
        slot: "start_revenue",
        hint: "revenue at period start",
        patterns: [/\bstart/i, /\bbeginning/i, /\bprevious/i],
      },
      {
        slot: "expansion_revenue",
        hint: "expansion/upsell revenue",
        patterns: [/\bexpansion/i, /\bupsell/i, /\bupgrade/i],
      },
      {
        slot: "contraction_revenue",
        hint: "contraction/downgrade revenue",
        patterns: [/\bcontraction/i, /\bdowngrade/i, /\breduction/i],
      },
      {
        slot: "churn_revenue",
        hint: "churned customer revenue",
        patterns: [/\bchurn/i, /\bcancelled/i, /\blost/i],
      },
    ],
  },
  suggestedForRoles: ["executive", "finance"],
};

// Entity expectations
const entities: EntityExpectation[] = [
  {
    name: "subscriptions",
    required: true,
    patterns: [/^subscriptions?$/i, /^plans?$/i, /^licenses?$/i],
  },
  {
    name: "customers",
    required: true,
    patterns: [
      /^customers?$/i,
      /^users?$/i,
      /^tenants?$/i,
      /^accounts?$/i,
    ],
  },
  {
    name: "billing",
    required: false,
    patterns: [/^billing$/i, /^invoices?$/i, /^payments?$/i],
  },
];

// Dashboard sections
const revenueSection: DashboardSection = {
  id: "saas_revenue",
  name: "Revenue",
  kpis: ["saas_mrr", "saas_arr"],
  chart: {
    type: "line",
    metric: "saas_mrr",
    timeGrain: "month",
    periods: 12,
  },
};

const customersSection: DashboardSection = {
  id: "saas_customers",
  name: "Customers",
  kpis: ["saas_customer_count", "saas_churn_rate"],
  chart: {
    type: "area",
    metric: "saas_customer_count",
    timeGrain: "month",
    periods: 12,
  },
};

const efficiencySection: DashboardSection = {
  id: "saas_efficiency",
  name: "Efficiency",
  kpis: ["saas_arpu", "saas_nrr"],
};

// Template definition
export const saasTemplate: BusinessTypeTemplate = {
  id: "saas",
  name: "Software as a Service (SaaS)",
  description:
    "Subscription-based software business with recurring revenue model",
  kpis: {
    primary: [mrrKPI, churnRateKPI, customerCountKPI, arpuKPI],
    secondary: [arrKPI, trialConversionKPI, nrrKPI],
  },
  entities,
  dashboard: {
    layout: "executive",
    sections: [revenueSection, customersSection, efficiencySection],
  },
  questions: [
    "What's our MRR?",
    "How is churn trending?",
    "Show me expansion revenue",
    "What's our ARR?",
    "How many active customers do we have?",
    "What's our trial conversion rate?",
    "Show me ARPU by plan type",
    "What's our net revenue retention?",
  ],
};
