/**
 * LLM-based Query Suggestion Generator
 *
 * Generates starter questions based on detected business type and vocabulary.
 * Reduces time-to-first-value by giving users concrete examples.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// Input types
export interface VocabularyContext {
  businessType: string;
  entities: string[]; // e.g., ["orders", "customers", "products"]
  metrics: Array<{ name: string; description?: string }>; // e.g., [{ name: "revenue", description: "Total revenue" }]
  dimensions: Array<{ name: string; description?: string }>; // e.g., [{ name: "country", description: "Customer country" }]
  timeFields: Array<{ name: string; table: string }>; // e.g., [{ name: "created_at", table: "orders" }]
}

// Response schema
const querySuggestionSchema = z.object({
  question: z.string().describe("Natural language question a user might ask"),
  category: z.enum(["trend", "breakdown", "comparison", "top_n", "kpi", "cohort"])
    .describe("Type of analysis"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"])
    .describe("Complexity level for this question"),
  expectedInsight: z.string().describe("What the user would learn from this question"),
  requiredData: z.array(z.string()).describe("Which tables/metrics are needed"),
});

const suggestionsSchema = z.object({
  starterQuestions: z.array(querySuggestionSchema).min(5).max(10)
    .describe("5-10 starter questions ordered by usefulness"),
  kpiQuestions: z.array(querySuggestionSchema).max(3)
    .describe("Top 3 KPI questions for this business type"),
  trendQuestions: z.array(querySuggestionSchema).max(3)
    .describe("Top 3 trend analysis questions"),
  breakdownQuestions: z.array(querySuggestionSchema).max(3)
    .describe("Top 3 breakdown/segmentation questions"),
});

export type QuerySuggestion = z.infer<typeof querySuggestionSchema>;
export type QuerySuggestions = z.infer<typeof suggestionsSchema>;

/**
 * Generate query suggestions using Claude
 */
export async function generateQuerySuggestions(
  context: VocabularyContext,
  options: {
    model?: "haiku" | "sonnet";
    maxTokens?: number;
    userRole?: string; // e.g., "CEO", "Product Manager", "Analyst"
  } = {}
): Promise<QuerySuggestions> {
  const { model = "haiku", maxTokens = 2000, userRole = "General" } = options;

  const prompt = `Generate starter questions for a ${context.businessType} database.

**User Role:** ${userRole}

**Available Data:**
- **Entities:** ${context.entities.join(", ")}
- **Metrics:** ${context.metrics.map(m => `${m.name} (${m.description || ""})`).join(", ")}
- **Dimensions:** ${context.dimensions.map(d => `${d.name} (${d.description || ""})`).join(", ")}
- **Time Fields:** ${context.timeFields.map(t => `${t.table}.${t.name}`).join(", ")}

**Instructions:**
1. Generate natural language questions a ${userRole} would ask
2. Focus on actionable insights, not just data exploration
3. Categorize by analysis type (trend, breakdown, comparison, top_n, kpi, cohort)
4. Include beginner, intermediate, and advanced questions
5. Ensure questions are answerable with available data
6. Prioritize high-value questions that drive decisions

**Question Categories:**
- **KPI**: Key metrics to track (e.g., "What's our monthly recurring revenue?")
- **Trend**: Time-based analysis (e.g., "How has revenue changed over the last 6 months?")
- **Breakdown**: Segmentation (e.g., "What's our revenue by country?")
- **Comparison**: A vs B (e.g., "How does Q4 2023 compare to Q4 2024?")
- **Top N**: Rankings (e.g., "Who are our top 10 customers by spend?")
- **Cohort**: User groups (e.g., "What's the retention rate for users who signed up in Jan 2024?")

**Examples for ${context.businessType}:**`;

  // Add business-type specific examples
  const examples = getBusinessTypeExamples(context.businessType);
  const examplesText = examples.map(ex => `- ${ex.question} [${ex.category}]`).join("\n");

  const fullPrompt = `${prompt}\n${examplesText}\n\nGenerate similar high-quality questions tailored to the available data.`;

  try {
    const result = await generateObject({
      model: anthropic(model === "haiku" ? "claude-3-5-haiku-20241022" : "claude-3-5-sonnet-20241022"),
      schema: suggestionsSchema,
      prompt: fullPrompt,
    });

    return result.object;
  } catch (error) {
    throw new Error(
      `LLM query suggestion failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get business-type specific example questions
 */
function getBusinessTypeExamples(businessType: string): Array<{ question: string; category: string }> {
  const examples: Record<string, Array<{ question: string; category: string }>> = {
    "E-Commerce": [
      { question: "What's our revenue trend over the last 6 months?", category: "trend" },
      { question: "Which products have the highest sales volume?", category: "top_n" },
      { question: "What's our average order value by customer segment?", category: "breakdown" },
      { question: "How many customers made repeat purchases?", category: "kpi" },
      { question: "What's our conversion rate from cart to purchase?", category: "kpi" },
    ],
    "SaaS": [
      { question: "What's our monthly recurring revenue (MRR)?", category: "kpi" },
      { question: "How has churn rate changed month-over-month?", category: "trend" },
      { question: "What's the average revenue per user by plan type?", category: "breakdown" },
      { question: "Which features are most used by paying customers?", category: "breakdown" },
      { question: "What's our customer lifetime value (LTV)?", category: "kpi" },
    ],
    "CRM": [
      { question: "How many leads were generated this month?", category: "kpi" },
      { question: "What's our lead-to-customer conversion rate?", category: "kpi" },
      { question: "Which sales reps have the highest close rates?", category: "top_n" },
      { question: "What's the average deal size by industry?", category: "breakdown" },
      { question: "How has pipeline value changed over time?", category: "trend" },
    ],
    "Marketplace": [
      { question: "How many active buyers vs sellers do we have?", category: "kpi" },
      { question: "What's the average transaction value?", category: "kpi" },
      { question: "Which categories have the most listings?", category: "breakdown" },
      { question: "What's our take rate (commission percentage)?", category: "kpi" },
      { question: "How has GMV (gross merchandise value) trended?", category: "trend" },
    ],
  };

  return examples[businessType] ?? [
    { question: "What are our key metrics?", category: "kpi" },
    { question: "How have our main metrics changed over time?", category: "trend" },
    { question: "What are the top 10 items by volume?", category: "top_n" },
  ];
}

/**
 * Generate role-specific questions (convenience wrapper)
 */
export async function generateRoleSpecificQuestions(
  context: VocabularyContext,
  role: "CEO" | "Product Manager" | "Analyst" | "Sales" | "Marketing",
  options: {
    model?: "haiku" | "sonnet";
  } = {}
): Promise<QuerySuggestion[]> {
  const result = await generateQuerySuggestions(context, {
    ...options,
    userRole: role,
  });

  // Return filtered questions based on role
  switch (role) {
    case "CEO":
      return result.kpiQuestions;
    case "Product Manager":
      return [...result.trendQuestions, ...result.breakdownQuestions];
    case "Analyst":
      return result.starterQuestions;
    case "Sales":
      return result.starterQuestions.filter(q =>
        q.question.toLowerCase().includes("customer") ||
        q.question.toLowerCase().includes("revenue") ||
        q.question.toLowerCase().includes("deal")
      );
    case "Marketing":
      return result.starterQuestions.filter(q =>
        q.question.toLowerCase().includes("campaign") ||
        q.question.toLowerCase().includes("conversion") ||
        q.question.toLowerCase().includes("acquisition")
      );
    default:
      return result.starterQuestions;
  }
}
