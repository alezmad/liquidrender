import type { GetBriefingInput, BriefingResponse } from "./schemas";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a personalized greeting based on time of day
 */
function getTimeBasedGreeting(userName?: string): string {
  const hour = new Date().getHours();
  const name = userName ? `, ${userName.split(" ")[0]}` : "";

  if (hour < 12) {
    return `Good morning${name}`;
  } else if (hour < 17) {
    return `Good afternoon${name}`;
  } else {
    return `Good evening${name}`;
  }
}

/**
 * Format a date as ISO date string (YYYY-MM-DD)
 */
function formatISODate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

/**
 * Generate a unique ID for mock data
 */
function generateMockId(prefix: string, index: number): string {
  return `${prefix}-${index.toString().padStart(3, "0")}`;
}

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

/**
 * Generate mock KPIs for a briefing
 * In production, this would:
 * - Fetch user's role template to get primary KPI preferences
 * - Query vocabulary items marked as primary for the role
 * - Execute actual data queries against connected database
 * - Calculate period-over-period changes
 */
function generateMockKPIs(): BriefingResponse["kpis"] {
  return [
    {
      id: generateMockId("kpi", 1),
      label: "Monthly Recurring Revenue",
      value: "$1.24M",
      rawValue: 1240000,
      change: {
        value: "+8.3%",
        direction: "up",
        comparison: "vs last month",
        tooltip: "Increased from $1.14M to $1.24M compared to November",
      },
      status: "normal",
      vocabularyItemId: "vocab-mrr-001",
    },
    {
      id: generateMockId("kpi", 2),
      label: "Active Users",
      value: "15,234",
      rawValue: 15234,
      change: {
        value: "+12.1%",
        direction: "up",
        comparison: "vs last month",
        tooltip: "Increased from 13,589 to 15,234 compared to November",
      },
      status: "normal",
      vocabularyItemId: "vocab-dau-001",
    },
    {
      id: generateMockId("kpi", 3),
      label: "Churn Rate",
      value: "2.8%",
      rawValue: 0.028,
      change: {
        value: "+0.4%",
        direction: "up",
        comparison: "vs last month",
        tooltip: "Increased from 2.4% to 2.8% compared to November",
      },
      status: "warning",
      vocabularyItemId: "vocab-churn-001",
    },
    {
      id: generateMockId("kpi", 4),
      label: "Net Revenue Retention",
      value: "118%",
      rawValue: 1.18,
      change: {
        value: "-2%",
        direction: "down",
        comparison: "vs last month",
        tooltip: "Decreased from 120% to 118% compared to November",
      },
      status: "normal",
      vocabularyItemId: "vocab-nrr-001",
    },
  ];
}

/**
 * Generate mock alerts for a briefing
 * In production, this would:
 * - Run anomaly detection on recent data
 * - Compare against user-defined thresholds
 * - Prioritize based on user's role and preferences
 */
function generateMockAlerts(): BriefingResponse["alerts"] {
  return [
    {
      id: generateMockId("alert", 1),
      severity: "warning",
      title: "Churn rate trending upward",
      description:
        "Churn rate has increased for 3 consecutive weeks, now at 2.8% (up from 2.4% baseline).",
      factors: [
        {
          text: "Enterprise segment showing 40% of churn increase",
          grounding: ["vocab-churn-001", "vocab-segment-enterprise"],
        },
        {
          text: "Most churned accounts had low feature adoption (<30%)",
          grounding: ["vocab-feature-adoption", "vocab-churn-001"],
        },
      ],
      actions: [
        {
          label: "Analyze churned accounts",
          query: "Show me details of accounts that churned this month",
        },
        {
          label: "Compare by segment",
          query: "Break down churn rate by customer segment",
        },
      ],
    },
    {
      id: generateMockId("alert", 2),
      severity: "critical",
      title: "API error rate spike detected",
      description:
        "API error rate jumped to 4.2% at 3:15 AM, affecting checkout flow.",
      factors: [
        {
          text: "Payment gateway timeout errors increased 300%",
          grounding: ["vocab-api-errors", "vocab-payment-gateway"],
        },
        {
          text: "Estimated revenue impact: $12,000",
          grounding: ["vocab-revenue", "vocab-api-errors"],
        },
      ],
      actions: [
        {
          label: "View error details",
          query: "Show me API errors from the last 6 hours",
        },
        {
          label: "Check revenue impact",
          query: "What was the revenue impact of the API errors?",
        },
      ],
    },
  ];
}

/**
 * Generate mock insights for a briefing
 * In production, this would:
 * - Run correlation analysis on recent data
 * - Apply ML models for pattern detection
 * - Filter based on user's interests and role
 */
function generateMockInsights(): BriefingResponse["insights"] {
  return [
    {
      id: generateMockId("insight", 1),
      title: "Mobile conversions outperforming desktop",
      description:
        "Mobile conversion rate reached 4.8% this week, 23% higher than desktop (3.9%). This is a reversal from Q3 patterns.",
      correlation: {
        factor: "New mobile checkout flow",
        impact: "Conversion rate increased 18% after mobile checkout redesign",
        confidence: 0.87,
      },
      actions: [
        {
          label: "Deep dive on mobile",
          query: "Show me mobile conversion trends by source",
        },
        {
          label: "Compare checkout flows",
          query: "Compare mobile vs desktop checkout completion rates",
        },
      ],
    },
    {
      id: generateMockId("insight", 2),
      title: "Support ticket volume decreasing",
      description:
        "Support tickets down 15% week-over-week while user base grew 3%. Self-service adoption appears to be working.",
      actions: [
        {
          label: "Explore self-service",
          query: "Which help articles are most viewed?",
        },
        {
          label: "Ticket breakdown",
          query: "What are the top ticket categories this week?",
        },
      ],
    },
  ];
}

/**
 * Generate suggested follow-up questions
 * In production, this would be personalized based on:
 * - User's question history patterns
 * - Role-specific question templates
 * - Current data context and alerts
 */
function generateSuggestedQuestions(): string[] {
  return [
    "What's driving the increase in churn rate?",
    "How does our MRR compare to the same period last year?",
    "Which customer segments have the highest growth?",
    "What's our current runway based on burn rate?",
    "Show me the top 10 accounts by revenue expansion this month",
  ];
}

// ============================================================================
// MAIN QUERY FUNCTIONS
// ============================================================================

/**
 * Get the daily briefing for a user
 *
 * @param userId - The authenticated user's ID
 * @param workspaceId - The workspace context
 * @param input - Optional filters (connectionId, date)
 * @returns Complete briefing response
 *
 * TODO: Real implementation needs:
 * - Fetch user's role template from knosiaRoleTemplate via knosiaWorkspaceMembership
 * - Get vocabulary items marked as primary KPIs for the role
 * - Execute actual data queries against the connected database
 * - Run anomaly detection for alerts
 * - Apply ML insights generation
 * - Cache briefing for performance (regenerate on data refresh)
 */
export async function getBriefing(
  userId: string,
  workspaceId: string,
  input: GetBriefingInput = {},
): Promise<BriefingResponse> {
  // For now, return mock data
  // In production, we would:
  // 1. Look up user's workspace membership and role
  // 2. Get role's briefingConfig for preferences
  // 3. Query actual data based on connectionId or default connection
  // 4. Generate personalized content

  const _connectionId = input.connectionId;
  const _date = input.date ? new Date(input.date) : new Date();

  // Mock user name lookup (would come from user profile)
  const mockUserName = "User";

  return {
    greeting: getTimeBasedGreeting(mockUserName),
    dataThrough: formatISODate(new Date()),
    kpis: generateMockKPIs(),
    alerts: generateMockAlerts(),
    insights: generateMockInsights(),
    suggestedQuestions: generateSuggestedQuestions(),
  };
}
