import { and, desc, eq, count } from "@turbostarter/db";
import {
  knosiaConversation,
  knosiaConversationMessage,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type {
  ConversationQueryInput,
  ConversationResponse,
  GetConversationInput,
  GetConversationsInput,
  GetConversationMessagesInput,
  ClarifyInput,
} from "./schemas";

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

/**
 * Generate a mock visualization response for demo purposes.
 * Real implementation will integrate with Query Engine.
 */
function generateMockVisualizationResponse(
  queryId: string,
  query: string,
): ConversationResponse {
  // Detect query intent from keywords
  const queryLower = query.toLowerCase();
  const isComparison = queryLower.includes("compare") || queryLower.includes("vs");
  const isTrend = queryLower.includes("trend") || queryLower.includes("over time");
  const isKpi = queryLower.includes("total") || queryLower.includes("count") || queryLower.includes("average");

  // Choose visualization type based on query
  let vizType: "bar" | "line" | "table" | "kpi" | "pie" = "bar";
  if (isTrend) vizType = "line";
  else if (isKpi) vizType = "kpi";
  else if (isComparison) vizType = "bar";

  return {
    queryId,
    type: "visualization",
    visualization: {
      type: vizType,
      title: `Results for: ${query.slice(0, 50)}${query.length > 50 ? "..." : ""}`,
      data: generateMockChartData(vizType),
      grounding: {
        path: [
          {
            id: "entity-1",
            label: "Orders",
            vocabularyItemId: "vocab-orders",
          },
          {
            id: "metric-1",
            label: "Total Revenue",
            vocabularyItemId: "vocab-revenue",
          },
        ],
        interactive: true,
      },
    },
    suggestions: [
      "Break this down by region",
      "Compare to last quarter",
      "Show top 10 contributors",
      "What's driving this trend?",
    ],
    appliedFilters: [],
  };
}

/**
 * Generate mock chart data based on visualization type.
 */
function generateMockChartData(type: "bar" | "line" | "table" | "kpi" | "pie"): unknown {
  switch (type) {
    case "kpi":
      return {
        value: 1234567,
        previousValue: 1156789,
        change: 6.7,
        changeDirection: "up",
        format: "currency",
      };
    case "line":
      return {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Revenue",
            data: [65000, 72000, 68000, 85000, 92000, 98000],
          },
        ],
      };
    case "bar":
      return {
        labels: ["Product A", "Product B", "Product C", "Product D"],
        datasets: [
          {
            label: "Sales",
            data: [12000, 19000, 8000, 15000],
          },
        ],
      };
    case "pie":
      return {
        labels: ["North", "South", "East", "West"],
        data: [30, 25, 25, 20],
      };
    case "table":
      return {
        columns: ["Product", "Revenue", "Units", "Growth"],
        rows: [
          ["Product A", "$12,000", "120", "+5%"],
          ["Product B", "$19,000", "190", "+12%"],
          ["Product C", "$8,000", "80", "-3%"],
        ],
      };
    default:
      return {};
  }
}

/**
 * Generate a mock clarification response when query is ambiguous.
 */
function generateMockClarificationResponse(
  queryId: string,
  query: string,
): ConversationResponse {
  return {
    queryId,
    type: "clarification",
    clarification: {
      question: `I found multiple interpretations for "${query.slice(0, 30)}...". Which did you mean?`,
      options: [
        {
          id: "opt-1",
          label: "Total Revenue",
          description: "Sum of all order amounts",
          preview: "$1.2M",
        },
        {
          id: "opt-2",
          label: "Net Revenue",
          description: "Total minus refunds and discounts",
          preview: "$1.1M",
        },
        {
          id: "opt-3",
          label: "Recognized Revenue",
          description: "Revenue recognized per accounting rules",
          preview: "$980K",
        },
      ],
      rememberChoice: true,
    },
    suggestions: [],
    appliedFilters: [],
  };
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Process a natural language query.
 * Currently returns mock data - will integrate with Query Engine.
 */
export const processQuery = async (
  input: ConversationQueryInput & { userId: string },
): Promise<{ conversation: typeof knosiaConversation.$inferSelect; response: ConversationResponse }> => {
  const queryId = crypto.randomUUID();

  // Create or get existing conversation
  let conversationId = input.context?.previousQueryId;
  let conversation: typeof knosiaConversation.$inferSelect | undefined;

  if (conversationId) {
    // Get existing conversation
    const existing = await db
      .select()
      .from(knosiaConversation)
      .where(
        and(
          eq(knosiaConversation.id, conversationId),
          eq(knosiaConversation.userId, input.userId),
        ),
      )
      .limit(1);
    conversation = existing[0];
  }

  if (!conversation) {
    // Create new conversation
    const result = await db
      .insert(knosiaConversation)
      .values({
        userId: input.userId,
        workspaceId: input.workspaceId,
        title: input.query.slice(0, 100),
        context: input.context ? {
          filters: input.context.filters,
        } : undefined,
        status: "active",
      })
      .returning();
    conversation = result[0]!;
  }

  // Store user message
  await db.insert(knosiaConversationMessage).values({
    conversationId: conversation.id,
    role: "user",
    content: input.query,
  });

  // Generate response (mock for now)
  // In the future, this will call the Query Engine
  const shouldClarify = input.query.toLowerCase().includes("revenue") &&
                         !input.query.toLowerCase().includes("total") &&
                         !input.query.toLowerCase().includes("net");

  const response = shouldClarify
    ? generateMockClarificationResponse(queryId, input.query)
    : generateMockVisualizationResponse(queryId, input.query);

  // Store assistant message
  await db.insert(knosiaConversationMessage).values({
    conversationId: conversation.id,
    role: "assistant",
    content: response.type === "visualization"
      ? response.visualization?.title ?? "Visualization generated"
      : response.type === "clarification"
      ? response.clarification?.question ?? "Clarification needed"
      : "Response generated",
    intent: response.type,
    visualization: response.visualization as typeof knosiaConversationMessage.$inferInsert.visualization,
    grounding: response.visualization?.grounding.path.map(p => p.vocabularyItemId),
  });

  // Update conversation title if this is the first query
  if (!input.context?.previousQueryId) {
    await db
      .update(knosiaConversation)
      .set({ title: input.query.slice(0, 100) })
      .where(eq(knosiaConversation.id, conversation.id));
  }

  return { conversation, response };
};

/**
 * Handle clarification response from user.
 */
export const processClarification = async (
  input: ClarifyInput & { userId: string; workspaceId: string },
): Promise<ConversationResponse> => {
  const queryId = crypto.randomUUID();

  // In a real implementation, this would:
  // 1. Look up the original query context
  // 2. Apply the selected interpretation
  // 3. Execute the query with Query Engine
  // 4. Optionally store the preference if remember=true

  // For now, return a mock visualization response
  return {
    queryId,
    type: "visualization",
    visualization: {
      type: "kpi",
      title: "Revenue Summary",
      data: {
        value: 1234567,
        previousValue: 1156789,
        change: 6.7,
        changeDirection: "up",
        format: "currency",
      },
      grounding: {
        path: [
          {
            id: "entity-1",
            label: "Orders",
            vocabularyItemId: "vocab-orders",
          },
          {
            id: "metric-1",
            label: input.selectedOptionId === "opt-1" ? "Total Revenue" :
                   input.selectedOptionId === "opt-2" ? "Net Revenue" : "Recognized Revenue",
            vocabularyItemId: `vocab-${input.selectedOptionId}`,
          },
        ],
        interactive: true,
      },
    },
    suggestions: [
      "Break this down by region",
      "Compare to last quarter",
      "Show monthly trend",
    ],
    appliedFilters: [],
  };
};

/**
 * Get a conversation by ID.
 */
export const getConversation = async (input: GetConversationInput) => {
  const result = await db
    .select()
    .from(knosiaConversation)
    .where(
      and(
        eq(knosiaConversation.id, input.id),
        eq(knosiaConversation.userId, input.userId),
        eq(knosiaConversation.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
};

/**
 * Get conversations for a user in a workspace.
 */
export const getConversations = async (input: GetConversationsInput) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    eq(knosiaConversation.userId, input.userId),
    eq(knosiaConversation.workspaceId, input.workspaceId),
    input.status ? eq(knosiaConversation.status, input.status) : undefined,
  );

  const data = await db
    .select()
    .from(knosiaConversation)
    .where(where)
    .orderBy(desc(knosiaConversation.updatedAt))
    .limit(input.perPage)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(knosiaConversation)
    .where(where)
    .then((res) => res[0]?.count ?? 0);

  return { data, total };
};

/**
 * Get messages for a conversation.
 */
export const getConversationMessages = async (input: GetConversationMessagesInput) => {
  // First verify user has access to this conversation
  const conversation = await db
    .select()
    .from(knosiaConversation)
    .where(
      and(
        eq(knosiaConversation.id, input.conversationId),
        eq(knosiaConversation.userId, input.userId),
      ),
    )
    .limit(1);

  if (!conversation[0]) {
    return null;
  }

  const messages = await db
    .select()
    .from(knosiaConversationMessage)
    .where(eq(knosiaConversationMessage.conversationId, input.conversationId))
    .orderBy(knosiaConversationMessage.createdAt)
    .limit(input.limit)
    .offset(input.offset);

  return messages;
};

/**
 * Archive a conversation.
 */
export const archiveConversation = async (input: GetConversationInput) => {
  const result = await db
    .update(knosiaConversation)
    .set({ status: "archived" })
    .where(
      and(
        eq(knosiaConversation.id, input.id),
        eq(knosiaConversation.userId, input.userId),
        eq(knosiaConversation.workspaceId, input.workspaceId),
      ),
    )
    .returning();

  return result[0] ?? null;
};

/**
 * Delete a conversation and its messages.
 */
export const deleteConversation = async (input: GetConversationInput) => {
  const result = await db
    .delete(knosiaConversation)
    .where(
      and(
        eq(knosiaConversation.id, input.id),
        eq(knosiaConversation.userId, input.userId),
        eq(knosiaConversation.workspaceId, input.workspaceId),
      ),
    )
    .returning();

  return result[0] ?? null;
};
