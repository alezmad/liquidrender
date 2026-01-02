/**
 * E-commerce Business Type Template
 *
 * Defines KPIs and dashboard layout for E-commerce businesses.
 */

import type {
  BusinessTypeTemplate,
  KPIDefinition,
  DashboardSection,
  EntityExpectation,
} from "../types";

// Primary KPIs
const gmvKPI: KPIDefinition = {
  id: "ecommerce_gmv",
  name: "Gross Merchandise Value",
  slug: "gmv",
  type: "metric",
  aggregation: "SUM",
  format: "currency",
  direction: "higher_is_better",
  formula: {
    template: "SUM({order_total_column})",
    requiredMappings: [
      {
        slot: "order_total_column",
        hint: "order total/amount column",
        patterns: [
          /\btotal\b/i,
          /\bamount\b/i,
          /\bvalue\b/i,
          /\bprice\b/i,
          /\bgmv\b/i,
        ],
      },
    ],
  },
  suggestedForRoles: ["executive", "finance", "sales"],
};

const orderCountKPI: KPIDefinition = {
  id: "ecommerce_order_count",
  name: "Order Count",
  slug: "order_count",
  type: "metric",
  aggregation: "COUNT_DISTINCT",
  format: "number",
  direction: "higher_is_better",
  formula: {
    template: "COUNT(DISTINCT {order_id_column})",
    requiredMappings: [
      {
        slot: "order_id_column",
        hint: "order ID column",
        patterns: [/\border_id\b/i, /\bid\b/i, /\border_number\b/i],
      },
    ],
  },
  suggestedForRoles: ["executive", "sales", "support"],
};

const aovKPI: KPIDefinition = {
  id: "ecommerce_aov",
  name: "Average Order Value",
  slug: "aov",
  type: "metric",
  aggregation: "AVG",
  format: "currency",
  direction: "higher_is_better",
  formula: {
    template: "SUM({order_total_column}) / COUNT(DISTINCT {order_id_column})",
    requiredMappings: [
      {
        slot: "order_total_column",
        hint: "order total/amount column",
        patterns: [
          /\btotal\b/i,
          /\bamount\b/i,
          /\bvalue\b/i,
          /\bprice\b/i,
        ],
      },
      {
        slot: "order_id_column",
        hint: "order ID column",
        patterns: [/\border_id\b/i, /\bid\b/i, /\border_number\b/i],
      },
    ],
  },
  suggestedForRoles: ["executive", "marketing", "product"],
};

const conversionRateKPI: KPIDefinition = {
  id: "ecommerce_conversion_rate",
  name: "Conversion Rate",
  slug: "conversion_rate",
  type: "metric",
  aggregation: "AVG",
  format: "percentage",
  direction: "higher_is_better",
  formula: {
    template:
      "COUNT(DISTINCT {order_id_column}) / COUNT(DISTINCT {session_id_column}) * 100",
    requiredMappings: [
      {
        slot: "order_id_column",
        hint: "order ID column",
        patterns: [/\border_id\b/i, /\bid\b/i, /\border_number\b/i],
      },
      {
        slot: "session_id_column",
        hint: "session/visit ID column",
        patterns: [
          /\bsession_id\b/i,
          /\bvisit_id\b/i,
          /\bvisitor_id\b/i,
        ],
      },
    ],
  },
  suggestedForRoles: ["marketing", "product", "executive"],
};

// Secondary KPIs
const cartAbandonmentKPI: KPIDefinition = {
  id: "ecommerce_cart_abandonment",
  name: "Cart Abandonment Rate",
  slug: "cart_abandonment",
  type: "metric",
  aggregation: "AVG",
  format: "percentage",
  direction: "lower_is_better",
  formula: {
    template:
      "(COUNT(DISTINCT {cart_id_column}) - COUNT(DISTINCT {order_id_column})) / COUNT(DISTINCT {cart_id_column}) * 100",
    requiredMappings: [
      {
        slot: "cart_id_column",
        hint: "cart/basket ID column",
        patterns: [/\bcart_id\b/i, /\bbasket_id\b/i],
      },
      {
        slot: "order_id_column",
        hint: "order ID column",
        patterns: [/\border_id\b/i, /\bid\b/i, /\border_number\b/i],
      },
    ],
  },
  suggestedForRoles: ["marketing", "product"],
};

const customerLTVKPI: KPIDefinition = {
  id: "ecommerce_customer_ltv",
  name: "Customer Lifetime Value",
  slug: "customer_ltv",
  type: "metric",
  aggregation: "AVG",
  format: "currency",
  direction: "higher_is_better",
  formula: {
    template:
      "SUM({order_total_column}) / COUNT(DISTINCT {customer_id_column})",
    requiredMappings: [
      {
        slot: "order_total_column",
        hint: "order total/amount column",
        patterns: [
          /\btotal\b/i,
          /\bamount\b/i,
          /\bvalue\b/i,
          /\bprice\b/i,
        ],
      },
      {
        slot: "customer_id_column",
        hint: "customer/user ID column",
        patterns: [/\bcustomer_id\b/i, /\buser_id\b/i, /\baccount_id\b/i],
      },
    ],
  },
  suggestedForRoles: ["executive", "marketing", "finance"],
};

const itemsPerOrderKPI: KPIDefinition = {
  id: "ecommerce_items_per_order",
  name: "Items Per Order",
  slug: "items_per_order",
  type: "metric",
  aggregation: "AVG",
  format: "number",
  direction: "higher_is_better",
  formula: {
    template:
      "SUM({quantity_column}) / COUNT(DISTINCT {order_id_column})",
    requiredMappings: [
      {
        slot: "quantity_column",
        hint: "quantity/item count column",
        patterns: [/\bquantity\b/i, /\bqty\b/i, /\bcount\b/i, /\bitems\b/i],
      },
      {
        slot: "order_id_column",
        hint: "order ID column",
        patterns: [/\border_id\b/i, /\bid\b/i, /\border_number\b/i],
      },
    ],
  },
  suggestedForRoles: ["product", "marketing"],
};

// Entity expectations
const entities: EntityExpectation[] = [
  {
    name: "orders",
    required: true,
    patterns: [/^orders?$/i, /^transactions?$/i, /^purchases?$/i],
  },
  {
    name: "products",
    required: true,
    patterns: [/^products?$/i, /^items?$/i, /^catalog$/i],
  },
  {
    name: "customers",
    required: true,
    patterns: [/^customers?$/i, /^users?$/i, /^buyers?$/i],
  },
  {
    name: "carts",
    required: false,
    patterns: [/^carts?$/i, /^baskets?$/i, /^shopping_carts?$/i],
  },
  {
    name: "inventory",
    required: false,
    patterns: [/^inventory$/i, /^stock$/i],
  },
];

// Dashboard sections
const revenueSection: DashboardSection = {
  id: "ecommerce_revenue",
  name: "Revenue",
  kpis: ["ecommerce_gmv", "ecommerce_aov"],
  chart: {
    type: "line",
    metric: "ecommerce_gmv",
    timeGrain: "day",
    periods: 30,
  },
};

const ordersSection: DashboardSection = {
  id: "ecommerce_orders",
  name: "Orders",
  kpis: ["ecommerce_order_count", "ecommerce_conversion_rate"],
  chart: {
    type: "bar",
    metric: "ecommerce_order_count",
    timeGrain: "day",
    periods: 30,
  },
};

const productsSection: DashboardSection = {
  id: "ecommerce_products",
  name: "Products",
  kpis: ["ecommerce_items_per_order"],
};

// Template definition
export const ecommerceTemplate: BusinessTypeTemplate = {
  id: "ecommerce",
  name: "E-commerce",
  description:
    "Online retail business focused on product sales and customer transactions",
  kpis: {
    primary: [gmvKPI, orderCountKPI, aovKPI, conversionRateKPI],
    secondary: [cartAbandonmentKPI, customerLTVKPI, itemsPerOrderKPI],
  },
  entities,
  dashboard: {
    layout: "operational",
    sections: [revenueSection, ordersSection, productsSection],
  },
  questions: [
    "What's our total GMV?",
    "How many orders did we get today?",
    "What's our average order value?",
    "How is conversion rate trending?",
    "Show me cart abandonment rate",
    "What's our customer lifetime value?",
    "Which products are selling best?",
    "How many items per order on average?",
  ],
};
