/**
 * LLM-based Onboarding Coach
 *
 * Interactive Q&A during analysis to help users understand their data.
 * Provides context-aware answers about schema, vocabulary, and data quality.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ExtractedSchema } from "@repo/liquid-connect/uvb";

// Context types
export interface OnboardingContext {
  schema: ExtractedSchema;
  businessType: string;
  detectedVocabulary?: {
    metrics: Array<{ name: string; description?: string }>;
    dimensions: Array<{ name: string; description?: string }>;
    entities: Array<{ name: string }>;
  };
  profilingResults?: {
    tables: Array<{
      name: string;
      rowCount: number;
      qualityScore?: number;
    }>;
  };
  analysisProgress?: {
    currentStep: number;
    totalSteps: number;
    completedSteps: string[];
  };
}

// Conversation history
export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

/**
 * Answer user questions during onboarding
 */
export async function answerOnboardingQuestion(
  question: string,
  context: OnboardingContext,
  conversationHistory: Message[] = [],
  options: {
    model?: "haiku" | "sonnet";
    maxTokens?: number;
  } = {}
): Promise<string> {
  const { model = "sonnet", maxTokens = 1000 } = options;

  // Build context summary
  const contextSummary = buildContextSummary(context);

  // Build conversation history
  const historyText = conversationHistory
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = `You are Knosia, an expert data scientist helping a user understand their ${context.businessType} database during onboarding.

**Database Context:**
${contextSummary}

${historyText ? `**Conversation History:**\n${historyText}\n` : ""}
**User Question:** ${question}

**Instructions:**
1. Answer in a friendly, concise manner (2-3 sentences max)
2. Reference specific tables/columns from their schema
3. Explain business implications, not just technical details
4. Suggest next steps or follow-up actions when relevant
5. If the question is about data quality, explain what metrics mean
6. If the question is about relationships, explain how tables connect
7. Use the user's business type context in your answer

**Example Answers:**
- Q: "What's the difference between orders and order_items?"
  A: "The **orders** table contains one record per customer order (like an invoice), while **order_items** lists individual products within each order. They're connected via order_id - one order can have many items. This is a common e-commerce pattern."

- Q: "Why is customer_lifetime_value marked as low quality?"
  A: "Looking at your data, customer_lifetime_value has 67% null values, meaning it's only calculated for about a third of your customers. This is common for newer customers who haven't had time to accumulate value yet. Consider filtering to customers with >90 days tenure for more reliable analysis."

- Q: "What metrics should I track for a SaaS business?"
  A: "Based on your schema, I recommend tracking: (1) Monthly Recurring Revenue (MRR) from subscriptions, (2) Customer Churn Rate from cancellations, and (3) Average Revenue Per User (ARPU). I've detected all the necessary tables to calculate these metrics."

Keep answers focused and actionable.`;

  try {
    const result = await generateText({
      model: anthropic(model === "haiku" ? "claude-3-5-haiku-20241022" : "claude-3-5-sonnet-20241022"),
      prompt,
    });

    return result.text;
  } catch (error) {
    throw new Error(
      `Onboarding coach failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Build a concise context summary for the LLM
 */
function buildContextSummary(context: OnboardingContext): string {
  const parts: string[] = [];

  // Schema info
  parts.push(`**Schema:** ${context.schema.database} (${context.schema.tables.length} tables)`);

  // Business type
  parts.push(`**Business Type:** ${context.businessType}`);

  // Tables
  const tableNames = context.schema.tables.map(t => t.name).slice(0, 10).join(", ");
  parts.push(`**Tables:** ${tableNames}${context.schema.tables.length > 10 ? ", ..." : ""}`);

  // Vocabulary
  if (context.detectedVocabulary) {
    const metricsCount = context.detectedVocabulary.metrics.length;
    const dimensionsCount = context.detectedVocabulary.dimensions.length;
    parts.push(`**Vocabulary:** ${metricsCount} metrics, ${dimensionsCount} dimensions detected`);

    // Show a few examples
    const sampleMetrics = context.detectedVocabulary.metrics
      .slice(0, 3)
      .map(m => m.name)
      .join(", ");
    if (sampleMetrics) {
      parts.push(`**Sample Metrics:** ${sampleMetrics}`);
    }
  }

  // Profiling
  if (context.profilingResults) {
    const totalRows = context.profilingResults.tables.reduce((sum, t) => sum + t.rowCount, 0);
    parts.push(`**Data Volume:** ${totalRows.toLocaleString()} total rows`);

    const avgQuality = context.profilingResults.tables
      .filter(t => t.qualityScore !== undefined)
      .reduce((sum, t) => sum + (t.qualityScore ?? 0), 0) /
      context.profilingResults.tables.filter(t => t.qualityScore !== undefined).length;

    if (!isNaN(avgQuality)) {
      parts.push(`**Data Quality:** ${(avgQuality * 100).toFixed(0)}% average`);
    }
  }

  // Analysis progress
  if (context.analysisProgress) {
    parts.push(
      `**Progress:** Step ${context.analysisProgress.currentStep} of ${context.analysisProgress.totalSteps}`
    );
  }

  return parts.join("\n");
}

/**
 * Generate proactive insights (suggestions without user asking)
 */
export async function generateProactiveInsight(
  context: OnboardingContext,
  options: {
    model?: "haiku" | "sonnet";
    maxTokens?: number;
  } = {}
): Promise<string> {
  const { model = "haiku", maxTokens = 500 } = options;

  const contextSummary = buildContextSummary(context);

  const prompt = `You are Knosia, analyzing a ${context.businessType} database.

**Database Context:**
${contextSummary}

Generate ONE proactive insight (1-2 sentences) that would be helpful for the user to know during onboarding.

**Focus on:**
1. Interesting patterns you notice in the schema
2. Recommended metrics for their business type
3. Data quality observations worth mentioning
4. Suggested first questions to explore

**Examples:**
- "I noticed you have both 'orders' and 'subscriptions' tables - you can track one-time purchases and recurring revenue separately."
- "Your customer table has 87% null values in last_login - consider adding an 'active_users' filter to focus on engaged users."
- "With your product and order data, you can easily calculate metrics like Average Order Value and Top Selling Products."

Keep it brief and actionable.`;

  try {
    const result = await generateText({
      model: anthropic(model === "haiku" ? "claude-3-5-haiku-20241022" : "claude-3-5-sonnet-20241022"),
      prompt,
    });

    return result.text;
  } catch (error) {
    throw new Error(
      `Proactive insight generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Suggest follow-up questions based on conversation
 */
export async function suggestFollowUpQuestions(
  conversationHistory: Message[],
  context: OnboardingContext,
  options: {
    model?: "haiku" | "sonnet";
  } = {}
): Promise<string[]> {
  const { model = "haiku" } = options;

  const historyText = conversationHistory
    .slice(-5) // Last 5 messages
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = `Based on this conversation, suggest 3 natural follow-up questions the user might ask:

${historyText}

Return ONLY the 3 questions, one per line, without numbering or explanation.`;

  try {
    const result = await generateText({
      model: anthropic(model === "haiku" ? "claude-3-5-haiku-20241022" : "claude-3-5-sonnet-20241022"),
      prompt,
    });

    return result.text
      .split("\n")
      .filter(q => q.trim().length > 0)
      .slice(0, 3);
  } catch (error) {
    // Fallback to generic questions
    return [
      "What metrics should I track?",
      "How can I improve data quality?",
      "What should I analyze first?",
    ];
  }
}
