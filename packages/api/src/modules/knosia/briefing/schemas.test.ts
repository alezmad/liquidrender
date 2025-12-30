import { describe, expect, it } from "vitest";
import { z } from "zod";

import { getBriefingSchema } from "./schemas";
import type {
  Alert,
  AlertSeverity,
  BriefingResponse,
  ChangeDirection,
  Factor,
  Insight,
  InsightCorrelation,
  KPI,
  KPIChange,
  KPIStatus,
  SuggestedAction,
} from "./schemas";

// ============================================================================
// getBriefingSchema TESTS
// ============================================================================

describe("getBriefingSchema", () => {
  describe("valid inputs", () => {
    it("should accept empty object (all fields optional)", () => {
      const input = {};
      const result = getBriefingSchema.parse(input);
      expect(result).toEqual({});
    });

    it("should accept valid connectionId only", () => {
      const input = { connectionId: "connabc123def456" };
      const result = getBriefingSchema.parse(input);
      expect(result).toEqual(input);
    });

    it("should accept valid date only", () => {
      const input = { date: "2024-12-29" };
      const result = getBriefingSchema.parse(input);
      expect(result).toEqual(input);
    });

    it("should accept both connectionId and date", () => {
      const input = {
        connectionId: "connabc123def456",
        date: "2024-12-29",
      };
      const result = getBriefingSchema.parse(input);
      expect(result).toEqual(input);
    });

    it("should accept various valid alphanumeric formats", () => {
      const validIds = [
        "connabc123def456",
        "conn123456789012",
        "abc123XYZ789",
        "ConnectionID01",
      ];

      validIds.forEach((id) => {
        const input = { connectionId: id };
        const result = getBriefingSchema.parse(input);
        expect(result.connectionId).toBe(id);
      });
    });

    it("should accept various valid date formats", () => {
      const validDates = [
        "2024-01-01",
        "2024-12-31",
        "2000-06-15",
        "2099-12-31",
      ];

      validDates.forEach((date) => {
        const input = { date };
        const result = getBriefingSchema.parse(input);
        expect(result.date).toBe(date);
      });
    });
  });

  describe("invalid inputs", () => {
    it("should reject invalid alphanumeric format (contains special characters)", () => {
      const invalidInputs = [
        { connectionId: "not-a-valid-id" }, // contains hyphens
        { connectionId: "idwithspecial!" }, // contains special chars
        { connectionId: "id with spaces" }, // contains spaces
        { connectionId: "" }, // empty string
      ];

      invalidInputs.forEach((input) => {
        expect(() => getBriefingSchema.parse(input)).toThrow(z.ZodError);
      });
    });

    it("should reject invalid date format", () => {
      const invalidInputs = [
        { date: "2024/12/29" }, // wrong separator
        { date: "29-12-2024" }, // wrong order
        { date: "2024-1-1" }, // missing leading zeros
        { date: "not-a-date" },
        { date: "" },
        { date: "2024-13-01" }, // invalid month
        { date: "2024-12-32" }, // invalid day
      ];

      invalidInputs.forEach((input) => {
        expect(() => getBriefingSchema.parse(input)).toThrow(z.ZodError);
      });
    });

    it("should reject non-string connectionId", () => {
      const invalidInputs = [
        { connectionId: 12345 },
        { connectionId: null },
        { connectionId: {} },
        { connectionId: [] },
      ];

      invalidInputs.forEach((input) => {
        expect(() => getBriefingSchema.parse(input)).toThrow(z.ZodError);
      });
    });

    it("should reject non-string date", () => {
      const invalidInputs = [
        { date: 20241229 },
        { date: null },
        { date: new Date() },
        { date: {} },
      ];

      invalidInputs.forEach((input) => {
        expect(() => getBriefingSchema.parse(input)).toThrow(z.ZodError);
      });
    });
  });

  describe("type inference", () => {
    it("should infer correct types from schema", () => {
      const input = {
        connectionId: "connabc123def456",
        date: "2024-12-29",
      };
      const result = getBriefingSchema.parse(input);

      // TypeScript compile-time check: result should have optional string fields
      const _connectionId: string | undefined = result.connectionId;
      const _date: string | undefined = result.date;

      expect(typeof result.connectionId).toBe("string");
      expect(typeof result.date).toBe("string");
    });
  });
});

// ============================================================================
// RESPONSE TYPE STRUCTURE TESTS (Type Guards)
// ============================================================================

describe("Response Type Structures", () => {
  describe("ChangeDirection type", () => {
    it("should only allow valid directions", () => {
      const validDirections: ChangeDirection[] = ["up", "down", "flat"];
      validDirections.forEach((dir) => {
        expect(["up", "down", "flat"]).toContain(dir);
      });
    });
  });

  describe("KPIStatus type", () => {
    it("should only allow valid statuses", () => {
      const validStatuses: KPIStatus[] = ["normal", "warning", "critical"];
      validStatuses.forEach((status) => {
        expect(["normal", "warning", "critical"]).toContain(status);
      });
    });
  });

  describe("AlertSeverity type", () => {
    it("should only allow valid severities", () => {
      const validSeverities: AlertSeverity[] = ["warning", "critical"];
      validSeverities.forEach((severity) => {
        expect(["warning", "critical"]).toContain(severity);
      });
    });
  });

  describe("KPIChange interface", () => {
    it("should accept valid KPIChange structure", () => {
      const validChange: KPIChange = {
        value: "+12.5%",
        direction: "up",
        comparison: "vs last week",
        tooltip: "Increased by 12.5% compared to last week",
      };

      expect(validChange.value).toBe("+12.5%");
      expect(validChange.direction).toBe("up");
      expect(validChange.comparison).toBe("vs last week");
      expect(validChange.tooltip).toBeDefined();
    });

    it("should accept negative change values", () => {
      const negativeChange: KPIChange = {
        value: "-$5,000",
        direction: "down",
        comparison: "MoM",
        tooltip: "Decreased by $5,000 month over month",
      };

      expect(negativeChange.direction).toBe("down");
      expect(negativeChange.value).toBe("-$5,000");
    });
  });

  describe("KPI interface", () => {
    it("should accept valid KPI with all fields", () => {
      const validKPI: KPI = {
        id: "kpi-revenue",
        label: "Total Revenue",
        value: "$1.2M",
        rawValue: 1200000,
        vocabularyItemId: "vocab-revenue-001",
        change: {
          value: "+15%",
          direction: "up",
          comparison: "vs last month",
          tooltip: "Revenue increased 15% compared to previous month",
        },
        status: "normal",
      };

      expect(validKPI.id).toBe("kpi-revenue");
      expect(validKPI.label).toBe("Total Revenue");
      expect(validKPI.rawValue).toBe(1200000);
      expect(validKPI.change?.direction).toBe("up");
      expect(validKPI.status).toBe("normal");
    });

    it("should accept KPI without optional fields", () => {
      const minimalKPI: KPI = {
        id: "kpi-users",
        label: "Active Users",
        value: "15,234",
        rawValue: 15234,
        vocabularyItemId: "vocab-users-001",
      };

      expect(minimalKPI.change).toBeUndefined();
      expect(minimalKPI.status).toBeUndefined();
    });
  });

  describe("Factor interface", () => {
    it("should accept valid Factor structure", () => {
      const validFactor: Factor = {
        text: "Sales volume increased by 20%",
        grounding: ["vocab-sales-001", "vocab-volume-002"],
      };

      expect(validFactor.text).toBeDefined();
      expect(validFactor.grounding).toHaveLength(2);
    });

    it("should accept Factor with empty grounding", () => {
      const factorNoGrounding: Factor = {
        text: "Market conditions improved",
        grounding: [],
      };

      expect(factorNoGrounding.grounding).toHaveLength(0);
    });
  });

  describe("SuggestedAction interface", () => {
    it("should accept valid SuggestedAction structure", () => {
      const validAction: SuggestedAction = {
        label: "View Details",
        query: "Show me the revenue breakdown by region",
      };

      expect(validAction.label).toBe("View Details");
      expect(validAction.query).toBeDefined();
    });
  });

  describe("Alert interface", () => {
    it("should accept valid Alert with all fields", () => {
      const validAlert: Alert = {
        id: "alert-001",
        severity: "critical",
        title: "Revenue Target at Risk",
        description:
          "Current trajectory suggests Q4 revenue target may not be met",
        factors: [
          {
            text: "Sales pipeline down 15%",
            grounding: ["vocab-pipeline-001"],
          },
          {
            text: "Customer churn increased",
            grounding: ["vocab-churn-001", "vocab-retention-002"],
          },
        ],
        actions: [
          {
            label: "View Pipeline",
            query: "Show me the current sales pipeline status",
          },
          {
            label: "Churn Analysis",
            query: "Analyze customer churn trends this quarter",
          },
        ],
      };

      expect(validAlert.severity).toBe("critical");
      expect(validAlert.factors).toHaveLength(2);
      expect(validAlert.actions).toHaveLength(2);
    });

    it("should accept Alert with warning severity", () => {
      const warningAlert: Alert = {
        id: "alert-002",
        severity: "warning",
        title: "Inventory Running Low",
        description: "Some products approaching reorder point",
        factors: [],
        actions: [],
      };

      expect(warningAlert.severity).toBe("warning");
    });
  });

  describe("InsightCorrelation interface", () => {
    it("should accept valid InsightCorrelation structure", () => {
      const validCorrelation: InsightCorrelation = {
        factor: "Marketing spend",
        impact: "Positive correlation with lead generation",
        confidence: 0.85,
      };

      expect(validCorrelation.confidence).toBeGreaterThanOrEqual(0);
      expect(validCorrelation.confidence).toBeLessThanOrEqual(1);
    });

    it("should accept confidence at boundary values", () => {
      const zeroConfidence: InsightCorrelation = {
        factor: "Weather",
        impact: "No measurable impact",
        confidence: 0,
      };

      const fullConfidence: InsightCorrelation = {
        factor: "Price",
        impact: "Direct inverse relationship with demand",
        confidence: 1,
      };

      expect(zeroConfidence.confidence).toBe(0);
      expect(fullConfidence.confidence).toBe(1);
    });
  });

  describe("Insight interface", () => {
    it("should accept valid Insight with correlation", () => {
      const validInsight: Insight = {
        id: "insight-001",
        title: "Marketing ROI Opportunity",
        description:
          "Analysis suggests increasing digital ad spend could yield 2x returns",
        correlation: {
          factor: "Digital ad spend",
          impact: "Strong positive correlation with lead conversion",
          confidence: 0.78,
        },
        actions: [
          {
            label: "View Analysis",
            query: "Show me the marketing ROI analysis",
          },
        ],
      };

      expect(validInsight.correlation).toBeDefined();
      expect(validInsight.correlation?.confidence).toBe(0.78);
    });

    it("should accept Insight without correlation", () => {
      const insightNoCorrelation: Insight = {
        id: "insight-002",
        title: "Seasonal Pattern Detected",
        description: "Sales typically increase 30% during Q4",
        actions: [],
      };

      expect(insightNoCorrelation.correlation).toBeUndefined();
    });
  });

  describe("BriefingResponse interface", () => {
    it("should accept valid complete BriefingResponse", () => {
      const validResponse: BriefingResponse = {
        greeting: "Good morning, Alex!",
        dataThrough: "2024-12-28",
        kpis: [
          {
            id: "kpi-1",
            label: "Revenue",
            value: "$1.2M",
            rawValue: 1200000,
            vocabularyItemId: "vocab-001",
            status: "normal",
          },
        ],
        alerts: [
          {
            id: "alert-1",
            severity: "warning",
            title: "Budget Alert",
            description: "Approaching budget limit",
            factors: [],
            actions: [],
          },
        ],
        insights: [
          {
            id: "insight-1",
            title: "Growth Opportunity",
            description: "Expansion potential identified",
            actions: [],
          },
        ],
        suggestedQuestions: [
          "What are the top performing products?",
          "How is our customer retention?",
        ],
      };

      expect(validResponse.greeting).toBe("Good morning, Alex!");
      expect(validResponse.dataThrough).toBe("2024-12-28");
      expect(validResponse.kpis).toHaveLength(1);
      expect(validResponse.alerts).toHaveLength(1);
      expect(validResponse.insights).toHaveLength(1);
      expect(validResponse.suggestedQuestions).toHaveLength(2);
    });

    it("should accept BriefingResponse with empty arrays", () => {
      const minimalResponse: BriefingResponse = {
        greeting: "Hello!",
        dataThrough: "2024-12-29",
        kpis: [],
        alerts: [],
        insights: [],
        suggestedQuestions: [],
      };

      expect(minimalResponse.kpis).toHaveLength(0);
      expect(minimalResponse.alerts).toHaveLength(0);
      expect(minimalResponse.insights).toHaveLength(0);
      expect(minimalResponse.suggestedQuestions).toHaveLength(0);
    });

    it("should accept various greeting formats", () => {
      const greetings = [
        "Good morning, Alex!",
        "Good afternoon!",
        "Good evening, Team!",
        "Welcome back!",
        "Hello!",
      ];

      greetings.forEach((greeting) => {
        const response: BriefingResponse = {
          greeting,
          dataThrough: "2024-12-29",
          kpis: [],
          alerts: [],
          insights: [],
          suggestedQuestions: [],
        };
        expect(response.greeting).toBe(greeting);
      });
    });
  });
});

// ============================================================================
// EDGE CASES AND INTEGRATION TESTS
// ============================================================================

describe("Edge Cases", () => {
  describe("getBriefingSchema edge cases", () => {
    it("should strip unknown properties", () => {
      const input = {
        connectionId: "connabc123def456",
        unknownField: "should be stripped",
        anotherUnknown: 123,
      };

      const result = getBriefingSchema.parse(input);

      expect(result).toEqual({
        connectionId: "connabc123def456",
      });
      expect((result as Record<string, unknown>).unknownField).toBeUndefined();
    });

    it("should handle undefined values for optional fields", () => {
      const input = {
        connectionId: undefined,
        date: undefined,
      };

      const result = getBriefingSchema.parse(input);

      // Zod treats undefined as missing for optional fields
      expect(result.connectionId).toBeUndefined();
      expect(result.date).toBeUndefined();
    });
  });

  describe("Complex nested structures", () => {
    it("should handle KPI with all nested structures", () => {
      const complexKPI: KPI = {
        id: "kpi-complex",
        label: "Complex KPI",
        value: "$999,999.99",
        rawValue: 999999.99,
        vocabularyItemId: "vocab-complex-001",
        change: {
          value: "+0.01%",
          direction: "up",
          comparison: "vs previous second",
          tooltip: "Minimal but positive change",
        },
        status: "warning",
      };

      expect(complexKPI.change?.value).toBe("+0.01%");
      expect(complexKPI.status).toBe("warning");
    });

    it("should handle Alert with multiple factors and actions", () => {
      const complexAlert: Alert = {
        id: "alert-complex",
        severity: "critical",
        title: "Multi-Factor Alert",
        description: "Alert with many contributing factors",
        factors: Array.from({ length: 10 }, (_, i) => ({
          text: `Factor ${i + 1}`,
          grounding: [`vocab-${i}-a`, `vocab-${i}-b`, `vocab-${i}-c`],
        })),
        actions: Array.from({ length: 5 }, (_, i) => ({
          label: `Action ${i + 1}`,
          query: `Execute action ${i + 1} query`,
        })),
      };

      expect(complexAlert.factors).toHaveLength(10);
      expect(complexAlert.actions).toHaveLength(5);
      expect(complexAlert.factors[0]?.grounding).toHaveLength(3);
    });
  });

  describe("Numeric edge cases in types", () => {
    it("should handle zero rawValue in KPI", () => {
      const zeroKPI: KPI = {
        id: "kpi-zero",
        label: "Zero Value",
        value: "$0",
        rawValue: 0,
        vocabularyItemId: "vocab-zero",
      };

      expect(zeroKPI.rawValue).toBe(0);
    });

    it("should handle negative rawValue in KPI", () => {
      const negativeKPI: KPI = {
        id: "kpi-negative",
        label: "Negative Value",
        value: "-$500",
        rawValue: -500,
        vocabularyItemId: "vocab-negative",
      };

      expect(negativeKPI.rawValue).toBe(-500);
    });

    it("should handle very large rawValue in KPI", () => {
      const largeKPI: KPI = {
        id: "kpi-large",
        label: "Large Value",
        value: "$1B",
        rawValue: 1000000000,
        vocabularyItemId: "vocab-large",
      };

      expect(largeKPI.rawValue).toBe(1000000000);
    });

    it("should handle decimal confidence values", () => {
      const decimalCorrelation: InsightCorrelation = {
        factor: "Test",
        impact: "Test impact",
        confidence: 0.123456789,
      };

      expect(decimalCorrelation.confidence).toBeCloseTo(0.123456789);
    });
  });

  describe("String edge cases", () => {
    it("should handle empty strings in grounding array", () => {
      const factorWithEmptyGrounding: Factor = {
        text: "Some factor",
        grounding: ["", "vocab-1", ""],
      };

      expect(factorWithEmptyGrounding.grounding).toContain("");
    });

    it("should handle unicode characters in text fields", () => {
      const unicodeAlert: Alert = {
        id: "alert-unicode",
        severity: "warning",
        title: "Alert with emojis and unicode",
        description: "This contains unicode characters",
        factors: [
          {
            text: "Factor with special chars: < > & \" '",
            grounding: [],
          },
        ],
        actions: [
          {
            label: "Action with unicode",
            query: "Query with special characters",
          },
        ],
      };

      expect(unicodeAlert.title).toContain("unicode");
    });
  });
});
