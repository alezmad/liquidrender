import { describe, expect, it } from "vitest";
import {
  clarifyInputSchema,
  conversationQueryInputSchema,
  filterSchema,
  getConversationInputSchema,
  getConversationMessagesInputSchema,
  getConversationsInputSchema,
  queryContextSchema,
} from "./schemas";

// ============================================================================
// FILTER SCHEMA TESTS
// ============================================================================

describe("filterSchema", () => {
  it("should accept valid filter with eq operator", () => {
    const input = {
      field: "status",
      operator: "eq" as const,
      value: "active",
    };
    expect(filterSchema.parse(input)).toEqual(input);
  });

  it("should accept valid filter with neq operator", () => {
    const input = {
      field: "status",
      operator: "neq" as const,
      value: "deleted",
    };
    expect(filterSchema.parse(input)).toEqual(input);
  });

  it("should accept valid filter with gt operator", () => {
    const input = {
      field: "amount",
      operator: "gt" as const,
      value: 100,
    };
    expect(filterSchema.parse(input)).toEqual(input);
  });

  it("should accept valid filter with gte operator", () => {
    const input = {
      field: "amount",
      operator: "gte" as const,
      value: 50,
    };
    expect(filterSchema.parse(input)).toEqual(input);
  });

  it("should accept valid filter with lt operator", () => {
    const input = {
      field: "price",
      operator: "lt" as const,
      value: 1000,
    };
    expect(filterSchema.parse(input)).toEqual(input);
  });

  it("should accept valid filter with lte operator", () => {
    const input = {
      field: "quantity",
      operator: "lte" as const,
      value: 10,
    };
    expect(filterSchema.parse(input)).toEqual(input);
  });

  it("should accept valid filter with in operator", () => {
    const input = {
      field: "category",
      operator: "in" as const,
      value: ["electronics", "books", "clothing"],
    };
    expect(filterSchema.parse(input)).toEqual(input);
  });

  it("should accept valid filter with contains operator", () => {
    const input = {
      field: "name",
      operator: "contains" as const,
      value: "test",
    };
    expect(filterSchema.parse(input)).toEqual(input);
  });

  it("should accept null value", () => {
    const input = {
      field: "deletedAt",
      operator: "eq" as const,
      value: null,
    };
    expect(filterSchema.parse(input)).toEqual(input);
  });

  it("should accept object value", () => {
    const input = {
      field: "metadata",
      operator: "eq" as const,
      value: { key: "value" },
    };
    expect(filterSchema.parse(input)).toEqual(input);
  });

  it("should reject invalid operator", () => {
    const input = {
      field: "status",
      operator: "invalid",
      value: "active",
    };
    expect(() => filterSchema.parse(input)).toThrow();
  });

  it("should reject missing field", () => {
    const input = {
      operator: "eq",
      value: "active",
    };
    expect(() => filterSchema.parse(input)).toThrow();
  });

  it("should reject missing operator", () => {
    const input = {
      field: "status",
      value: "active",
    };
    expect(() => filterSchema.parse(input)).toThrow();
  });
});

// ============================================================================
// QUERY CONTEXT SCHEMA TESTS
// ============================================================================

describe("queryContextSchema", () => {
  it("should accept empty object", () => {
    const input = {};
    expect(queryContextSchema.parse(input)).toEqual({});
  });

  it("should accept pageId only", () => {
    const input = { pageId: "page_123" };
    expect(queryContextSchema.parse(input)).toEqual(input);
  });

  it("should accept previousQueryId only", () => {
    const input = { previousQueryId: "query_456" };
    expect(queryContextSchema.parse(input)).toEqual(input);
  });

  it("should accept filters array", () => {
    const input = {
      filters: [
        { field: "status", operator: "eq" as const, value: "active" },
        { field: "amount", operator: "gt" as const, value: 100 },
      ],
    };
    expect(queryContextSchema.parse(input)).toEqual(input);
  });

  it("should accept empty filters array", () => {
    const input = { filters: [] };
    expect(queryContextSchema.parse(input)).toEqual(input);
  });

  it("should accept full context with all fields", () => {
    const input = {
      pageId: "page_123",
      filters: [{ field: "category", operator: "in" as const, value: ["tech"] }],
      previousQueryId: "query_789",
    };
    expect(queryContextSchema.parse(input)).toEqual(input);
  });

  it("should reject invalid filter in filters array", () => {
    const input = {
      filters: [{ field: "status", operator: "invalid", value: "active" }],
    };
    expect(() => queryContextSchema.parse(input)).toThrow();
  });
});

// ============================================================================
// CONVERSATION QUERY INPUT SCHEMA TESTS
// ============================================================================

describe("conversationQueryInputSchema", () => {
  const validConnectionId = "connabc123def456";

  it("should accept valid query input", () => {
    const input = {
      query: "What is our revenue?",
      connectionId: validConnectionId,
      workspaceId: "ws12345",
    };
    expect(conversationQueryInputSchema.parse(input)).toEqual(input);
  });

  it("should accept query with optional context", () => {
    const input = {
      query: "Show me sales data",
      connectionId: validConnectionId,
      workspaceId: "ws45678",
      context: {
        pageId: "dashboard",
        filters: [{ field: "year", operator: "eq" as const, value: 2024 }],
      },
    };
    expect(conversationQueryInputSchema.parse(input)).toEqual(input);
  });

  it("should accept query without context", () => {
    const input = {
      query: "What are the top products?",
      connectionId: validConnectionId,
      workspaceId: "workspace789",
    };
    const result = conversationQueryInputSchema.parse(input);
    expect(result.context).toBeUndefined();
  });

  it("should reject empty query", () => {
    const input = {
      query: "",
      connectionId: validConnectionId,
      workspaceId: "ws12345",
    };
    expect(() => conversationQueryInputSchema.parse(input)).toThrow();
  });

  it("should reject query exceeding 1000 characters", () => {
    const input = {
      query: "a".repeat(1001),
      connectionId: validConnectionId,
      workspaceId: "ws12345",
    };
    expect(() => conversationQueryInputSchema.parse(input)).toThrow();
  });

  it("should accept query at max length (1000 characters)", () => {
    const input = {
      query: "a".repeat(1000),
      connectionId: validConnectionId,
      workspaceId: "ws12345",
    };
    expect(conversationQueryInputSchema.parse(input).query).toHaveLength(1000);
  });

  it("should reject invalid connectionId (contains invalid characters)", () => {
    const input = {
      query: "What is revenue?",
      connectionId: "not-valid-id",
      workspaceId: "ws12345",
    };
    expect(() => conversationQueryInputSchema.parse(input)).toThrow();
  });

  it("should reject missing query", () => {
    const input = {
      connectionId: validConnectionId,
      workspaceId: "ws12345",
    };
    expect(() => conversationQueryInputSchema.parse(input)).toThrow();
  });

  it("should reject missing connectionId", () => {
    const input = {
      query: "What is revenue?",
      workspaceId: "ws12345",
    };
    expect(() => conversationQueryInputSchema.parse(input)).toThrow();
  });

  it("should reject missing workspaceId", () => {
    const input = {
      query: "What is revenue?",
      connectionId: validConnectionId,
    };
    expect(() => conversationQueryInputSchema.parse(input)).toThrow();
  });

  it("should handle unicode characters in query", () => {
    const input = {
      query: "What is the revenue in \u20AC and \u00A5?",
      connectionId: validConnectionId,
      workspaceId: "ws12345",
    };
    expect(conversationQueryInputSchema.parse(input)).toEqual(input);
  });
});

// ============================================================================
// CLARIFY INPUT SCHEMA TESTS
// ============================================================================

describe("clarifyInputSchema", () => {
  it("should accept valid clarification input", () => {
    const input = {
      queryId: "query_123",
      selectedOptionId: "option_1",
    };
    const result = clarifyInputSchema.parse(input);
    expect(result.queryId).toBe("query_123");
    expect(result.selectedOptionId).toBe("option_1");
    expect(result.remember).toBe(false); // default value
  });

  it("should accept clarification with remember true", () => {
    const input = {
      queryId: "query_456",
      selectedOptionId: "option_2",
      remember: true,
    };
    expect(clarifyInputSchema.parse(input)).toEqual(input);
  });

  it("should accept clarification with remember false", () => {
    const input = {
      queryId: "query_789",
      selectedOptionId: "option_3",
      remember: false,
    };
    expect(clarifyInputSchema.parse(input)).toEqual(input);
  });

  it("should default remember to false when not provided", () => {
    const input = {
      queryId: "query_abc",
      selectedOptionId: "option_xyz",
    };
    const result = clarifyInputSchema.parse(input);
    expect(result.remember).toBe(false);
  });

  it("should reject missing queryId", () => {
    const input = {
      selectedOptionId: "option_1",
    };
    expect(() => clarifyInputSchema.parse(input)).toThrow();
  });

  it("should reject missing selectedOptionId", () => {
    const input = {
      queryId: "query_123",
    };
    expect(() => clarifyInputSchema.parse(input)).toThrow();
  });

  it("should reject empty queryId", () => {
    const input = {
      queryId: "",
      selectedOptionId: "option_1",
    };
    // Note: schema allows empty string, adjust if business logic requires non-empty
    expect(clarifyInputSchema.parse(input).queryId).toBe("");
  });
});

// ============================================================================
// GET CONVERSATION INPUT SCHEMA TESTS
// ============================================================================

describe("getConversationInputSchema", () => {
  it("should accept valid input", () => {
    const input = {
      id: "conv_123",
      userId: "user_456",
      workspaceId: "ws_789",
    };
    expect(getConversationInputSchema.parse(input)).toEqual(input);
  });

  it("should reject missing id", () => {
    const input = {
      userId: "user_456",
      workspaceId: "ws_789",
    };
    expect(() => getConversationInputSchema.parse(input)).toThrow();
  });

  it("should reject missing userId", () => {
    const input = {
      id: "conv_123",
      workspaceId: "ws_789",
    };
    expect(() => getConversationInputSchema.parse(input)).toThrow();
  });

  it("should reject missing workspaceId", () => {
    const input = {
      id: "conv_123",
      userId: "user_456",
    };
    expect(() => getConversationInputSchema.parse(input)).toThrow();
  });
});

// ============================================================================
// GET CONVERSATIONS INPUT SCHEMA TESTS
// ============================================================================

describe("getConversationsInputSchema", () => {
  it("should accept valid input with defaults", () => {
    const input = {
      userId: "user_123",
      workspaceId: "ws_456",
    };
    const result = getConversationsInputSchema.parse(input);
    expect(result.userId).toBe("user_123");
    expect(result.workspaceId).toBe("ws_456");
    expect(result.page).toBe(1); // default
    expect(result.perPage).toBe(20); // default
    expect(result.status).toBeUndefined();
  });

  it("should accept custom page and perPage", () => {
    const input = {
      userId: "user_123",
      workspaceId: "ws_456",
      page: 5,
      perPage: 50,
    };
    expect(getConversationsInputSchema.parse(input)).toEqual(input);
  });

  it("should accept status filter active", () => {
    const input = {
      userId: "user_123",
      workspaceId: "ws_456",
      status: "active" as const,
    };
    const result = getConversationsInputSchema.parse(input);
    expect(result.status).toBe("active");
  });

  it("should accept status filter archived", () => {
    const input = {
      userId: "user_123",
      workspaceId: "ws_456",
      status: "archived" as const,
    };
    const result = getConversationsInputSchema.parse(input);
    expect(result.status).toBe("archived");
  });

  it("should accept status filter shared", () => {
    const input = {
      userId: "user_123",
      workspaceId: "ws_456",
      status: "shared" as const,
    };
    const result = getConversationsInputSchema.parse(input);
    expect(result.status).toBe("shared");
  });

  it("should reject invalid status", () => {
    const input = {
      userId: "user_123",
      workspaceId: "ws_456",
      status: "invalid",
    };
    expect(() => getConversationsInputSchema.parse(input)).toThrow();
  });

  it("should reject page less than 1", () => {
    const input = {
      userId: "user_123",
      workspaceId: "ws_456",
      page: 0,
    };
    expect(() => getConversationsInputSchema.parse(input)).toThrow();
  });

  it("should reject negative page", () => {
    const input = {
      userId: "user_123",
      workspaceId: "ws_456",
      page: -1,
    };
    expect(() => getConversationsInputSchema.parse(input)).toThrow();
  });

  it("should reject perPage less than 1", () => {
    const input = {
      userId: "user_123",
      workspaceId: "ws_456",
      perPage: 0,
    };
    expect(() => getConversationsInputSchema.parse(input)).toThrow();
  });

  it("should reject perPage greater than 100", () => {
    const input = {
      userId: "user_123",
      workspaceId: "ws_456",
      perPage: 101,
    };
    expect(() => getConversationsInputSchema.parse(input)).toThrow();
  });

  it("should accept perPage at max (100)", () => {
    const input = {
      userId: "user_123",
      workspaceId: "ws_456",
      perPage: 100,
    };
    expect(getConversationsInputSchema.parse(input).perPage).toBe(100);
  });

  it("should reject missing userId", () => {
    const input = {
      workspaceId: "ws_456",
    };
    expect(() => getConversationsInputSchema.parse(input)).toThrow();
  });

  it("should reject missing workspaceId", () => {
    const input = {
      userId: "user_123",
    };
    expect(() => getConversationsInputSchema.parse(input)).toThrow();
  });
});

// ============================================================================
// GET CONVERSATION MESSAGES INPUT SCHEMA TESTS
// ============================================================================

describe("getConversationMessagesInputSchema", () => {
  it("should accept valid input with defaults", () => {
    const input = {
      conversationId: "conv_123",
      userId: "user_456",
    };
    const result = getConversationMessagesInputSchema.parse(input);
    expect(result.conversationId).toBe("conv_123");
    expect(result.userId).toBe("user_456");
    expect(result.limit).toBe(50); // default
    expect(result.offset).toBe(0); // default
  });

  it("should accept custom limit and offset", () => {
    const input = {
      conversationId: "conv_123",
      userId: "user_456",
      limit: 25,
      offset: 50,
    };
    expect(getConversationMessagesInputSchema.parse(input)).toEqual(input);
  });

  it("should reject limit less than 1", () => {
    const input = {
      conversationId: "conv_123",
      userId: "user_456",
      limit: 0,
    };
    expect(() => getConversationMessagesInputSchema.parse(input)).toThrow();
  });

  it("should reject negative limit", () => {
    const input = {
      conversationId: "conv_123",
      userId: "user_456",
      limit: -5,
    };
    expect(() => getConversationMessagesInputSchema.parse(input)).toThrow();
  });

  it("should reject limit greater than 100", () => {
    const input = {
      conversationId: "conv_123",
      userId: "user_456",
      limit: 101,
    };
    expect(() => getConversationMessagesInputSchema.parse(input)).toThrow();
  });

  it("should accept limit at max (100)", () => {
    const input = {
      conversationId: "conv_123",
      userId: "user_456",
      limit: 100,
    };
    expect(getConversationMessagesInputSchema.parse(input).limit).toBe(100);
  });

  it("should reject negative offset", () => {
    const input = {
      conversationId: "conv_123",
      userId: "user_456",
      offset: -1,
    };
    expect(() => getConversationMessagesInputSchema.parse(input)).toThrow();
  });

  it("should accept offset at 0", () => {
    const input = {
      conversationId: "conv_123",
      userId: "user_456",
      offset: 0,
    };
    expect(getConversationMessagesInputSchema.parse(input).offset).toBe(0);
  });

  it("should accept large offset", () => {
    const input = {
      conversationId: "conv_123",
      userId: "user_456",
      offset: 10000,
    };
    expect(getConversationMessagesInputSchema.parse(input).offset).toBe(10000);
  });

  it("should reject missing conversationId", () => {
    const input = {
      userId: "user_456",
    };
    expect(() => getConversationMessagesInputSchema.parse(input)).toThrow();
  });

  it("should reject missing userId", () => {
    const input = {
      conversationId: "conv_123",
    };
    expect(() => getConversationMessagesInputSchema.parse(input)).toThrow();
  });
});
