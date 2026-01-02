/**
 * Template Mapper Integration Tests
 *
 * Test mapper with actual Group B templates.
 */

import { describe, it, expect } from "vitest";
import { mapToTemplate } from "../mapper";
import { getTemplate } from "../templates";
import type { DetectedVocabulary } from "../../uvb/models";

describe("mapToTemplate integration", () => {
  it("should map SaaS template with subscription data", () => {
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
        {
          id: "m2",
          name: "active_subscriptions",
          table: "subscriptions",
          column: "customer_id",
          dataType: "uuid",
          aggregation: "COUNT_DISTINCT",
          certainty: 90,
        },
        {
          id: "m3",
          name: "churned_customers",
          table: "subscriptions",
          column: "churned_at",
          dataType: "timestamp",
          aggregation: "COUNT",
          certainty: 85,
        },
      ],
      dimensions: [
        {
          id: "d1",
          name: "subscription_status",
          table: "subscriptions",
          column: "status",
          dataType: "varchar",
          certainty: 90,
        },
      ],
      timeFields: [],
      filters: [],
      relationships: [],
    };

    const template = getTemplate("saas");
    const result = mapToTemplate(vocabulary, template);

    // Should have mapped at least some KPIs
    expect(result.mappedKPIs.length).toBeGreaterThan(0);

    // MRR requires both amount and status columns
    // Since mapper only searches metrics (not dimensions), MRR will be partial
    const mrr = result.mappedKPIs.find((k) => k.kpi.slug === "mrr");
    expect(mrr).toBeDefined();
    expect(mrr?.status).toBe("partial"); // Only amount mapped, not status
    expect(mrr?.canExecute).toBe(false); // Cannot execute partial

    // Should have some mapped KPIs
    expect(result.mappedKPIs.length).toBeGreaterThan(0);
  });

  it("should map ecommerce template with order data", () => {
    const vocabulary: DetectedVocabulary = {
      entities: [],
      metrics: [
        {
          id: "m1",
          name: "order_total",
          table: "orders",
          column: "total_amount",
          dataType: "decimal",
          aggregation: "SUM",
          certainty: 95,
        },
        {
          id: "m2",
          name: "order_count",
          table: "orders",
          column: "order_id",
          dataType: "uuid",
          aggregation: "COUNT",
          certainty: 90,
        },
      ],
      dimensions: [],
      timeFields: [],
      filters: [],
      relationships: [],
    };

    const template = getTemplate("ecommerce");
    const result = mapToTemplate(vocabulary, template);

    expect(result.mappedKPIs.length).toBeGreaterThan(0);

    // Should have found GMV or Order Count
    const hasGmvOrOrders =
      result.mappedKPIs.some((k) => k.kpi.slug === "gmv") ||
      result.mappedKPIs.some((k) => k.kpi.slug === "order_count");

    expect(hasGmvOrOrders).toBe(true);
  });

  it("should fallback to generic template", () => {
    const vocabulary: DetectedVocabulary = {
      entities: [],
      metrics: [
        {
          id: "m1",
          name: "total_records",
          table: "data",
          column: "id",
          dataType: "integer",
          aggregation: "COUNT",
          certainty: 95,
        },
      ],
      dimensions: [],
      timeFields: [],
      filters: [],
      relationships: [],
    };

    const template = getTemplate("custom");
    const result = mapToTemplate(vocabulary, template);

    // Generic template should be minimal
    expect(template.id).toBe("custom");
    expect(result.businessType).toBe("custom");
  });

  it("should handle marketplace type with generic fallback", () => {
    const template = getTemplate("marketplace");

    // Should fallback to generic for V2+ types
    expect(template.id).toBe("custom");
  });
});
