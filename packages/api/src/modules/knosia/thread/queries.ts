import { and, desc, eq, count } from "@turbostarter/db";
import {
  knosiaThread,
  knosiaThreadMessage,
  knosiaThreadSnapshot,
  knosiaWorkspace,
  knosiaUserPreference,
  knosiaConnection,
  knosiaWorkspaceConnection,
  knosiaVocabularyItem,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import {
  createQueryEngine,
  compile,
  emit,
  type CompiledVocabulary,
} from "@repo/liquid-connect";
import { PostgresAdapter } from "@repo/liquid-connect/uvb";

import { buildSemanticLayer } from "../shared/semantic";

import type {
  ThreadQueryInput,
  ThreadResponse,
  GetThreadInput,
  GetThreadsInput,
  GetThreadMessagesInput,
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
): ThreadResponse {
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
): ThreadResponse {
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
 * Process a natural language query using LiquidConnect Query Engine.
 *
 * Pipeline:
 * 1. Load workspace vocabulary (cached CompiledVocabulary)
 * 2. Get user aliases from preferences
 * 3. Query Engine: NL → DSL
 * 4. Compiler: DSL → SQL (via SemanticLayer)
 * 5. Execute SQL via PostgresAdapter
 * 6. Return visualization response
 */
export const processQuery = async (
  input: ThreadQueryInput & { userId: string },
): Promise<{ thread: typeof knosiaThread.$inferSelect; response: ThreadResponse }> => {
  const queryId = crypto.randomUUID();

  // Create or get existing thread
  let existingThreadId = input.context?.previousQueryId;
  let thread: typeof knosiaThread.$inferSelect | undefined;

  if (existingThreadId) {
    // Get existing thread
    const existing = await db
      .select()
      .from(knosiaThread)
      .where(
        and(
          eq(knosiaThread.id, existingThreadId),
          eq(knosiaThread.userId, input.userId),
        ),
      )
      .limit(1);
    thread = existing[0];
  }

  if (!thread) {
    // Create new thread
    const result = await db
      .insert(knosiaThread)
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
    thread = result[0]!;
  }

  // Store user message
  await db.insert(knosiaThreadMessage).values({
    threadId: thread.id,
    role: "user",
    content: input.query,
  });

  // Try real Query Engine processing
  const response = await processWithQueryEngine(
    queryId,
    input.query,
    input.workspaceId,
    input.userId,
  );

  // Store assistant message
  await db.insert(knosiaThreadMessage).values({
    threadId: thread.id,
    role: "assistant",
    content: response.type === "visualization"
      ? response.visualization?.title ?? "Visualization generated"
      : response.type === "clarification"
      ? response.clarification?.question ?? "Clarification needed"
      : response.type === "error"
      ? response.error?.message ?? "Error occurred"
      : "Response generated",
    intent: response.type,
    visualization: response.visualization as typeof knosiaThreadMessage.$inferInsert.visualization,
    grounding: response.visualization?.grounding?.path?.map(p => p.vocabularyItemId),
    sqlGenerated: response.visualization?.sql,
  });

  // Update thread title if this is the first query
  if (!input.context?.previousQueryId) {
    await db
      .update(knosiaThread)
      .set({ title: input.query.slice(0, 100) })
      .where(eq(knosiaThread.id, thread.id));
  }

  return { thread, response };
};

/**
 * Process query using LiquidConnect Query Engine
 */
async function processWithQueryEngine(
  queryId: string,
  query: string,
  workspaceId: string,
  userId: string,
): Promise<ThreadResponse> {
  try {
    // 1. Load workspace with compiled vocabulary
    const workspace = await db.query.knosiaWorkspace.findFirst({
      where: eq(knosiaWorkspace.id, workspaceId),
    });

    if (!workspace?.compiledVocabulary) {
      return {
        queryId,
        type: "error",
        error: {
          code: "NO_VOCABULARY",
          message: "No vocabulary configured. Please run schema analysis first.",
          recoverable: true,
        },
        suggestions: ["Run schema analysis", "Connect a database"],
        appliedFilters: [],
      };
    }

    // Deserialize compiled vocabulary (Date stored as string)
    const compiledVocab = workspace.compiledVocabulary as unknown as CompiledVocabulary & {
      compiledAt: string;
    };
    const vocabulary: CompiledVocabulary = {
      ...compiledVocab,
      compiledAt: new Date(compiledVocab.compiledAt),
    };

    // 2. Get user aliases
    const prefs = await db.query.knosiaUserPreference.findFirst({
      where: and(
        eq(knosiaUserPreference.userId, userId),
        eq(knosiaUserPreference.workspaceId, workspaceId),
      ),
    });

    const userAliases = (prefs?.aliases ?? {}) as Record<string, string>;

    // 3. Create Query Engine and process NL → DSL
    const engine = createQueryEngine(vocabulary);
    const nlResult = engine.queryWithAliases(query, userAliases);

    if (!nlResult.success) {
      // Return clarification if Query Engine couldn't parse
      // QueryResult doesn't have suggestions, use error message to create options
      const errorSuggestions = nlResult.error
        ? [`Clarify: ${nlResult.error}`]
        : ["Try rephrasing your question"];

      return {
        queryId,
        type: "clarification",
        clarification: {
          question: nlResult.error ?? "I couldn't understand that query.",
          options: errorSuggestions.map((s, i) => ({
            id: `sug-${i}`,
            label: s,
            description: "Try this instead",
          })),
          rememberChoice: false,
        },
        suggestions: errorSuggestions,
        appliedFilters: [],
      };
    }

    // 4. Get vocabulary items for semantic layer
    const vocabItems = await db.query.knosiaVocabularyItem.findMany({
      where: eq(knosiaVocabularyItem.workspaceId, workspaceId),
    });

    // 5. Get connection for this workspace
    const wsConnection = await db.query.knosiaWorkspaceConnection.findFirst({
      where: eq(knosiaWorkspaceConnection.workspaceId, workspaceId),
    });

    if (!wsConnection) {
      return {
        queryId,
        type: "error",
        error: {
          code: "NO_CONNECTION",
          message: "No database connection configured for this workspace.",
          recoverable: true,
        },
        suggestions: ["Connect a database"],
        appliedFilters: [],
      };
    }

    const connection = await db.query.knosiaConnection.findFirst({
      where: eq(knosiaConnection.id, wsConnection.connectionId),
    });

    if (!connection) {
      return {
        queryId,
        type: "error",
        error: {
          code: "CONNECTION_NOT_FOUND",
          message: "Database connection not found.",
          recoverable: false,
        },
        suggestions: [],
        appliedFilters: [],
      };
    }

    // 6. Build semantic layer
    const semanticLayer = buildSemanticLayer({
      workspace,
      vocabularyItems: vocabItems,
      connection,
    });

    // 7. Compile DSL → SQL
    const lcOutput = nlResult.lcOutput!;
    let flow: ReturnType<typeof compile>;
    try {
      flow = compile(lcOutput, semanticLayer);
    } catch (compileError) {
      return {
        queryId,
        type: "error",
        error: {
          code: "COMPILE_ERROR",
          message: `Failed to compile query: ${compileError instanceof Error ? compileError.message : "Unknown error"}`,
          recoverable: true,
        },
        suggestions: ["Try rephrasing your question"],
        appliedFilters: [],
      };
    }

    // 8. Emit SQL for postgres
    const sqlResult = emit(flow, "postgres");

    // 9. Execute SQL
    let credentials: { username: string; password: string };
    try {
      credentials = JSON.parse(connection.credentials ?? "{}") as { username: string; password: string };
    } catch {
      return {
        queryId,
        type: "error",
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Failed to parse connection credentials.",
          recoverable: false,
        },
        suggestions: [],
        appliedFilters: [],
      };
    }

    const adapter = new PostgresAdapter({
      host: connection.host,
      port: connection.port ?? 5432,
      database: connection.database,
      user: credentials.username,
      password: credentials.password,
      ssl: connection.sslEnabled ?? true,
    });

    await adapter.connect();
    let data: unknown[];
    try {
      data = await adapter.query(sqlResult.sql, sqlResult.params);
    } finally {
      await adapter.disconnect();
    }

    // 10. Infer visualization type
    const vizType = inferVisualizationType(nlResult, data);

    return {
      queryId,
      type: "visualization",
      visualization: {
        type: vizType,
        title: `Results for: ${query.slice(0, 50)}${query.length > 50 ? "..." : ""}`,
        data,
        sql: sqlResult.sql,
        grounding: {
          path: nlResult.trace?.resolutions?.map((resolution) => ({
            id: resolution.resolved,
            label: resolution.term,
            vocabularyItemId: resolution.resolved,
          })) ?? [],
          interactive: true,
        },
      },
      suggestions: generateFollowUpSuggestions(nlResult),
      appliedFilters: [],
    };
  } catch (error) {
    console.error("Query Engine error:", error);
    // Fall back to mock response
    return generateMockVisualizationResponse(queryId, query);
  }
}

/**
 * Infer the best visualization type from query and data
 */
function inferVisualizationType(
  nlResult: { lcOutput?: string },
  data: unknown[],
): "bar" | "line" | "table" | "kpi" | "pie" {
  const lcOutput = nlResult.lcOutput ?? "";

  // KPI: single metric without dimensions
  if (data.length === 1 && !lcOutput.includes("#")) {
    return "kpi";
  }

  // Line: has time dimension
  if (lcOutput.includes("~")) {
    return "line";
  }

  // Pie: small number of categories
  if (data.length <= 6 && lcOutput.includes("#")) {
    return "pie";
  }

  // Table: many rows
  if (data.length > 10) {
    return "table";
  }

  // Default: bar chart
  return "bar";
}

/**
 * Generate follow-up suggestions based on query result
 */
function generateFollowUpSuggestions(
  nlResult: { lcOutput?: string },
): string[] {
  const suggestions: string[] = [];
  const lcOutput = nlResult.lcOutput ?? "";

  // Suggest adding dimensions if none
  if (!lcOutput.includes("#")) {
    suggestions.push("Break this down by region");
    suggestions.push("Show by category");
  }

  // Suggest time comparison if no time filter
  if (!lcOutput.includes("~")) {
    suggestions.push("Show trend over time");
    suggestions.push("Compare to last month");
  }

  // Suggest drill-down
  suggestions.push("Show top 10 contributors");

  return suggestions.slice(0, 4);
}

/**
 * Handle clarification response from user.
 */
export const processClarification = async (
  input: ClarifyInput & { userId: string; workspaceId: string },
): Promise<ThreadResponse> => {
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
 * Get a thread by ID.
 */
export const getThread = async (input: GetThreadInput) => {
  const result = await db
    .select()
    .from(knosiaThread)
    .where(
      and(
        eq(knosiaThread.id, input.id),
        eq(knosiaThread.userId, input.userId),
        eq(knosiaThread.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
};

/**
 * Get threads for a user in a workspace.
 */
export const getThreads = async (input: GetThreadsInput) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    eq(knosiaThread.userId, input.userId),
    eq(knosiaThread.workspaceId, input.workspaceId),
    input.status ? eq(knosiaThread.status, input.status) : undefined,
  );

  const data = await db
    .select()
    .from(knosiaThread)
    .where(where)
    .orderBy(desc(knosiaThread.updatedAt))
    .limit(input.perPage)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(knosiaThread)
    .where(where)
    .then((res) => res[0]?.count ?? 0);

  return { data, total };
};

/**
 * Get messages for a thread.
 */
export const getThreadMessages = async (input: GetThreadMessagesInput) => {
  // First verify user has access to this thread
  const thread = await db
    .select()
    .from(knosiaThread)
    .where(
      and(
        eq(knosiaThread.id, input.threadId),
        eq(knosiaThread.userId, input.userId),
      ),
    )
    .limit(1);

  if (!thread[0]) {
    return null;
  }

  const messages = await db
    .select()
    .from(knosiaThreadMessage)
    .where(eq(knosiaThreadMessage.threadId, input.threadId))
    .orderBy(knosiaThreadMessage.createdAt)
    .limit(input.limit)
    .offset(input.offset);

  return messages;
};

/**
 * Archive a thread.
 */
export const archiveThread = async (input: GetThreadInput) => {
  const result = await db
    .update(knosiaThread)
    .set({ status: "archived" })
    .where(
      and(
        eq(knosiaThread.id, input.id),
        eq(knosiaThread.userId, input.userId),
        eq(knosiaThread.workspaceId, input.workspaceId),
      ),
    )
    .returning();

  return result[0] ?? null;
};

/**
 * Delete a thread and its messages.
 */
export const deleteThread = async (input: GetThreadInput) => {
  const result = await db
    .delete(knosiaThread)
    .where(
      and(
        eq(knosiaThread.id, input.id),
        eq(knosiaThread.userId, input.userId),
        eq(knosiaThread.workspaceId, input.workspaceId),
      ),
    )
    .returning();

  return result[0] ?? null;
};

/**
 * Get snapshots for a thread.
 * User must own the thread to view its snapshots.
 */
export const getThreadSnapshots = async (threadId: string, userId: string) => {
  // Verify user owns the thread
  const thread = await db
    .select()
    .from(knosiaThread)
    .where(and(eq(knosiaThread.id, threadId), eq(knosiaThread.userId, userId)))
    .limit(1);

  if (!thread[0]) {
    return null;
  }

  const snapshots = await db
    .select()
    .from(knosiaThreadSnapshot)
    .where(eq(knosiaThreadSnapshot.threadId, threadId))
    .orderBy(desc(knosiaThreadSnapshot.createdAt));

  return snapshots;
};
