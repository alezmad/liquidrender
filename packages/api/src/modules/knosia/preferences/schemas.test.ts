import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  getPreferencesInputSchema,
  updatePreferencesInputSchema,
  updatePreferencesSchema,
} from "./schemas";

// ============================================================================
// getPreferencesInputSchema Tests
// ============================================================================

describe("getPreferencesInputSchema", () => {
  it("should accept valid input with userId and workspaceId", () => {
    const input = { userId: "user_123", workspaceId: "workspace_456" };
    expect(getPreferencesInputSchema.parse(input)).toEqual(input);
  });

  it("should reject missing userId", () => {
    const input = { workspaceId: "workspace_456" };
    expect(() => getPreferencesInputSchema.parse(input)).toThrow(ZodError);
  });

  it("should reject missing workspaceId", () => {
    const input = { userId: "user_123" };
    expect(() => getPreferencesInputSchema.parse(input)).toThrow(ZodError);
  });

  it("should reject empty object", () => {
    expect(() => getPreferencesInputSchema.parse({})).toThrow(ZodError);
  });

  it("should reject non-string userId", () => {
    const input = { userId: 123, workspaceId: "workspace_456" };
    expect(() => getPreferencesInputSchema.parse(input)).toThrow(ZodError);
  });

  it("should reject non-string workspaceId", () => {
    const input = { userId: "user_123", workspaceId: 456 };
    expect(() => getPreferencesInputSchema.parse(input)).toThrow(ZodError);
  });

  it("should accept any string format for userId", () => {
    const input = { userId: "any-format-works", workspaceId: "ws" };
    expect(getPreferencesInputSchema.parse(input)).toEqual(input);
  });
});

// ============================================================================
// updatePreferencesSchema Tests (Partial Updates)
// ============================================================================

describe("updatePreferencesSchema", () => {
  describe("defaultConnectionId", () => {
    it("should accept valid UUID", () => {
      const input = { defaultConnectionId: "550e8400-e29b-41d4-a716-446655440000" };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should reject invalid UUID format", () => {
      const input = { defaultConnectionId: "not-a-uuid" };
      expect(() => updatePreferencesSchema.parse(input)).toThrow(ZodError);
    });

    it("should accept undefined (optional)", () => {
      const input = {};
      expect(updatePreferencesSchema.parse(input)).toEqual({});
    });
  });

  describe("role", () => {
    it("should accept any string for role", () => {
      const input = { role: "admin" };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept empty string for role", () => {
      const input = { role: "" };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });
  });

  describe("comparisonPeriod", () => {
    it("should accept 'WoW'", () => {
      const input = { comparisonPeriod: "WoW" as const };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept 'MoM'", () => {
      const input = { comparisonPeriod: "MoM" as const };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept 'YoY'", () => {
      const input = { comparisonPeriod: "YoY" as const };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should reject invalid comparison period", () => {
      const input = { comparisonPeriod: "daily" };
      expect(() => updatePreferencesSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe("briefingTime", () => {
    it("should accept valid time format HH:MM", () => {
      const input = { briefingTime: "09:00" };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept midnight time", () => {
      const input = { briefingTime: "00:00" };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept end of day time", () => {
      const input = { briefingTime: "23:59" };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should reject invalid time format without leading zero", () => {
      const input = { briefingTime: "9:00" };
      expect(() => updatePreferencesSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject invalid time format with seconds", () => {
      const input = { briefingTime: "09:00:00" };
      expect(() => updatePreferencesSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject invalid time format", () => {
      const input = { briefingTime: "invalid" };
      expect(() => updatePreferencesSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe("alertsEnabled", () => {
    it("should accept true", () => {
      const input = { alertsEnabled: true };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept false", () => {
      const input = { alertsEnabled: false };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should reject non-boolean", () => {
      const input = { alertsEnabled: "true" };
      expect(() => updatePreferencesSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe("favorites", () => {
    it("should accept empty favorites object", () => {
      const input = { favorites: {} };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept pinnedMetrics array", () => {
      const input = { favorites: { pinnedMetrics: ["metric1", "metric2"] } };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept pinnedDashboards array", () => {
      const input = { favorites: { pinnedDashboards: ["dash1", "dash2"] } };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept pinnedQueries array", () => {
      const input = { favorites: { pinnedQueries: ["query1"] } };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept pinnedFilters with field and value", () => {
      const input = {
        favorites: {
          pinnedFilters: [
            { field: "status", value: "active" },
            { field: "count", value: 42 },
          ],
        },
      };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept complete favorites object", () => {
      const input = {
        favorites: {
          pinnedMetrics: ["revenue", "users"],
          pinnedDashboards: ["main-dashboard"],
          pinnedQueries: ["top-customers"],
          pinnedFilters: [{ field: "region", value: "US" }],
        },
      };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should reject invalid pinnedMetrics type", () => {
      const input = { favorites: { pinnedMetrics: "not-an-array" } };
      expect(() => updatePreferencesSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject pinnedFilters without field", () => {
      const input = { favorites: { pinnedFilters: [{ value: "test" }] } };
      expect(() => updatePreferencesSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe("aliases", () => {
    it("should accept valid aliases record", () => {
      const input = { aliases: { revenue: "Total Revenue", users: "Active Users" } };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept empty aliases", () => {
      const input = { aliases: {} };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should reject non-string values in aliases", () => {
      const input = { aliases: { key: 123 } };
      expect(() => updatePreferencesSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe("notes", () => {
    it("should accept valid notes record", () => {
      const input = { notes: { metric1: "Important metric for Q4" } };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept empty notes", () => {
      const input = { notes: {} };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });
  });

  describe("hiddenItems", () => {
    it("should accept array of hidden item ids", () => {
      const input = { hiddenItems: ["item1", "item2", "item3"] };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept empty hiddenItems array", () => {
      const input = { hiddenItems: [] };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should reject non-string items in array", () => {
      const input = { hiddenItems: [1, 2, 3] };
      expect(() => updatePreferencesSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe("combined partial updates", () => {
    it("should accept multiple fields at once", () => {
      const input = {
        role: "analyst",
        comparisonPeriod: "MoM" as const,
        alertsEnabled: true,
        briefingTime: "08:30",
      };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });

    it("should accept all fields together", () => {
      const input = {
        defaultConnectionId: "550e8400-e29b-41d4-a716-446655440000",
        role: "manager",
        comparisonPeriod: "YoY" as const,
        briefingTime: "10:00",
        alertsEnabled: true,
        favorites: {
          pinnedMetrics: ["revenue"],
          pinnedDashboards: ["main"],
          pinnedQueries: [],
          pinnedFilters: [{ field: "status", value: "active" }],
        },
        aliases: { rev: "Revenue" },
        notes: { rev: "Primary KPI" },
        hiddenItems: ["deprecated-metric"],
      };
      expect(updatePreferencesSchema.parse(input)).toEqual(input);
    });
  });
});

// ============================================================================
// updatePreferencesInputSchema Tests
// ============================================================================

describe("updatePreferencesInputSchema", () => {
  it("should accept valid input with userId, workspaceId, and updates", () => {
    const input = {
      userId: "user_123",
      workspaceId: "workspace_456",
      updates: { alertsEnabled: true },
    };
    expect(updatePreferencesInputSchema.parse(input)).toEqual(input);
  });

  it("should accept empty updates object", () => {
    const input = {
      userId: "user_123",
      workspaceId: "workspace_456",
      updates: {},
    };
    expect(updatePreferencesInputSchema.parse(input)).toEqual(input);
  });

  it("should reject missing userId", () => {
    const input = {
      workspaceId: "workspace_456",
      updates: {},
    };
    expect(() => updatePreferencesInputSchema.parse(input)).toThrow(ZodError);
  });

  it("should reject missing workspaceId", () => {
    const input = {
      userId: "user_123",
      updates: {},
    };
    expect(() => updatePreferencesInputSchema.parse(input)).toThrow(ZodError);
  });

  it("should reject missing updates", () => {
    const input = {
      userId: "user_123",
      workspaceId: "workspace_456",
    };
    expect(() => updatePreferencesInputSchema.parse(input)).toThrow(ZodError);
  });

  it("should validate nested updates schema", () => {
    const input = {
      userId: "user_123",
      workspaceId: "workspace_456",
      updates: { comparisonPeriod: "invalid" },
    };
    expect(() => updatePreferencesInputSchema.parse(input)).toThrow(ZodError);
  });

  it("should accept complex updates", () => {
    const input = {
      userId: "user_abc",
      workspaceId: "ws_xyz",
      updates: {
        role: "executive",
        comparisonPeriod: "WoW" as const,
        favorites: {
          pinnedMetrics: ["kpi1", "kpi2"],
        },
      },
    };
    expect(updatePreferencesInputSchema.parse(input)).toEqual(input);
  });
});
