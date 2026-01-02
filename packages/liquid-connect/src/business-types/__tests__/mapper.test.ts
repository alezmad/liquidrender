/**
 * Template Mapper Tests
 *
 * Verify slot mapping logic and formula generation.
 */

import { describe, it, expect } from "vitest";
import { mapToTemplate } from "../mapper";
import type { BusinessTypeTemplate, KPIDefinition } from "../types";
import type { DetectedVocabulary, DetectedMetric } from "../../uvb/models";

describe("mapToTemplate", () => {
  it("should map all slots with exact matches", () => {
    const vocabulary: DetectedVocabulary = {
      entities: [],
      metrics: [
        {
          id: "m1",
          name: "mrr",
          table: "subscriptions",
          column: "monthly_recurring_revenue",
          dataType: "decimal",
          aggregation: "SUM",
          certainty: 95,
        },
        {
          id: "m2",
          name: "active_customers",
          table: "customers",
          column: "customer_count",
          dataType: "integer",
          aggregation: "COUNT",
          certainty: 90,
        },
      ],
      dimensions: [],
      timeFields: [],
      filters: [],
      relationships: [],
    };

    const template: BusinessTypeTemplate = {
      id: "saas",
      name: "SaaS Template",
      description: "Test template",
      kpis: {
        primary: [
          {
            id: "mrr",
            name: "Monthly Recurring Revenue",
            slug: "mrr",
            type: "metric",
            aggregation: "SUM",
            format: "currency",
            direction: "higher_is_better",
            formula: {
              template: "SUM({mrr_column})",
              requiredMappings: [
                {
                  slot: "mrr_column",
                  hint: "subscription amount/price column",
                  patterns: [/mrr/i, /monthly.*revenue/i, /recurring/i],
                },
              ],
            },
          },
        ],
        secondary: [],
      },
      entities: [],
      dashboard: {
        layout: "executive",
        sections: [],
      },
      questions: [],
    };

    const result = mapToTemplate(vocabulary, template);

    expect(result.mappedKPIs).toHaveLength(1);
    expect(result.unmappedKPIs).toHaveLength(0);
    expect(result.coverage).toBe(100);

    const mrr = result.mappedKPIs[0];
    expect(mrr.status).toBe("complete");
    expect(mrr.canExecute).toBe(true);
    expect(mrr.generatedFormula).toBe(
      "SUM(subscriptions.monthly_recurring_revenue)",
    );
    expect(mrr.mappings[0].mappedTo).toBe(
      "subscriptions.monthly_recurring_revenue",
    );
    expect(mrr.mappings[0].confidence).toBeGreaterThan(70);
  });

  it("should mark KPI as partial when some slots unmapped", () => {
    const vocabulary: DetectedVocabulary = {
      entities: [],
      metrics: [
        {
          id: "m1",
          name: "mrr",
          table: "subscriptions",
          column: "amount",
          dataType: "decimal",
          aggregation: "SUM",
          certainty: 95,
        },
      ],
      dimensions: [],
      timeFields: [],
      filters: [],
      relationships: [],
    };

    const template: BusinessTypeTemplate = {
      id: "saas",
      name: "SaaS Template",
      description: "Test template",
      kpis: {
        primary: [
          {
            id: "arpu",
            name: "ARPU",
            slug: "arpu",
            type: "metric",
            aggregation: "AVG",
            format: "currency",
            direction: "higher_is_better",
            formula: {
              template: "{mrr} / {customer_count}",
              requiredMappings: [
                {
                  slot: "mrr",
                  hint: "monthly recurring revenue",
                  patterns: [/mrr/i, /recurring/i],
                },
                {
                  slot: "customer_count",
                  hint: "active customer count",
                  patterns: [/customer.*count/i, /active.*customers/i],
                },
              ],
            },
          },
        ],
        secondary: [],
      },
      entities: [],
      dashboard: {
        layout: "executive",
        sections: [],
      },
      questions: [],
    };

    const result = mapToTemplate(vocabulary, template);

    expect(result.mappedKPIs).toHaveLength(1);
    expect(result.coverage).toBe(0); // 0% complete (partial doesn't count)

    const arpu = result.mappedKPIs[0];
    expect(arpu.status).toBe("partial");
    expect(arpu.canExecute).toBe(false);
    expect(arpu.mappings[0].mappedTo).toBeDefined(); // MRR mapped
    expect(arpu.mappings[1].mappedTo).toBeUndefined(); // Customer count not mapped
  });

  it("should mark KPI as unmapped when no slots match", () => {
    const vocabulary: DetectedVocabulary = {
      entities: [],
      metrics: [
        {
          id: "m1",
          name: "total_sales",
          table: "orders",
          column: "amount",
          dataType: "decimal",
          aggregation: "SUM",
          certainty: 95,
        },
      ],
      dimensions: [],
      timeFields: [],
      filters: [],
      relationships: [],
    };

    const template: BusinessTypeTemplate = {
      id: "saas",
      name: "SaaS Template",
      description: "Test template",
      kpis: {
        primary: [
          {
            id: "mrr",
            name: "MRR",
            slug: "mrr",
            type: "metric",
            aggregation: "SUM",
            format: "currency",
            direction: "higher_is_better",
            formula: {
              template: "SUM({mrr_column})",
              requiredMappings: [
                {
                  slot: "mrr_column",
                  hint: "monthly recurring revenue",
                  patterns: [/mrr/i, /recurring/i],
                },
              ],
            },
          },
        ],
        secondary: [],
      },
      entities: [],
      dashboard: {
        layout: "executive",
        sections: [],
      },
      questions: [],
    };

    const result = mapToTemplate(vocabulary, template);

    expect(result.unmappedKPIs).toHaveLength(1);
    expect(result.coverage).toBe(0);
  });

  it("should handle column and name pattern matching", () => {
    const vocabulary: DetectedVocabulary = {
      entities: [],
      metrics: [
        {
          id: "m1",
          name: "subscription_amount",
          table: "subscriptions",
          column: "mrr",
          dataType: "decimal",
          aggregation: "SUM",
          certainty: 95,
        },
      ],
      dimensions: [],
      timeFields: [],
      filters: [],
      relationships: [],
    };

    const template: BusinessTypeTemplate = {
      id: "saas",
      name: "SaaS Template",
      description: "Test template",
      kpis: {
        primary: [
          {
            id: "mrr",
            name: "MRR",
            slug: "mrr",
            type: "metric",
            aggregation: "SUM",
            format: "currency",
            direction: "higher_is_better",
            formula: {
              template: "SUM({mrr_column})",
              requiredMappings: [
                {
                  slot: "mrr_column",
                  hint: "monthly recurring revenue",
                  patterns: [/mrr/i],
                },
              ],
            },
          },
        ],
        secondary: [],
      },
      entities: [],
      dashboard: {
        layout: "executive",
        sections: [],
      },
      questions: [],
    };

    const result = mapToTemplate(vocabulary, template);

    expect(result.mappedKPIs).toHaveLength(1);
    expect(result.mappedKPIs[0].status).toBe("complete");
    expect(result.mappedKPIs[0].mappings[0].confidence).toBeGreaterThan(60);
  });

  it("should boost confidence for aggregation compatibility", () => {
    const vocabulary: DetectedVocabulary = {
      entities: [],
      metrics: [
        {
          id: "m1",
          name: "revenue",
          table: "orders",
          column: "total",
          dataType: "decimal",
          aggregation: "SUM",
          certainty: 95,
        },
      ],
      dimensions: [],
      timeFields: [],
      filters: [],
      relationships: [],
    };

    const template: BusinessTypeTemplate = {
      id: "ecommerce",
      name: "E-commerce Template",
      description: "Test template",
      kpis: {
        primary: [
          {
            id: "gmv",
            name: "GMV",
            slug: "gmv",
            type: "metric",
            aggregation: "SUM",
            format: "currency",
            direction: "higher_is_better",
            formula: {
              template: "SUM({order_total})",
              requiredMappings: [
                {
                  slot: "order_total",
                  hint: "sum of order total column",
                  patterns: [/total/i, /revenue/i],
                },
              ],
            },
          },
        ],
        secondary: [],
      },
      entities: [],
      dashboard: {
        layout: "executive",
        sections: [],
      },
      questions: [],
    };

    const result = mapToTemplate(vocabulary, template);

    expect(result.mappedKPIs).toHaveLength(1);
    expect(result.mappedKPIs[0].status).toBe("complete");
    // Should get boost for matching aggregation
    expect(result.mappedKPIs[0].mappings[0].confidence).toBeGreaterThanOrEqual(80);
  });
});
