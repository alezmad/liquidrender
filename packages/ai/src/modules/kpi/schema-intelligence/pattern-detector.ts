/**
 * Schema Pattern Detector
 *
 * Detects business patterns from database schema that guide KPI generation.
 * This is Stage 1 of the KPI Pipeline V2 - deterministic code analysis
 * that runs BEFORE the LLM generates KPIs.
 *
 * Key Insight: The LLM fails on filtered KPIs because it lacks explicit
 * relationship context. Pattern detection provides that context.
 */

// ============================================================================
// Types
// ============================================================================

export type PatternType =
  | 'DEADLINE_COMPARISON'      // shipped_date vs required_date
  | 'VARIANCE_ANALYSIS'        // actual_amount vs budget_amount
  | 'LIFECYCLE_FLOW'           // status: pending → processing → complete
  | 'PERIOD_COMPARISON'        // current_period vs previous_period
  | 'HIERARCHY'                // category → subcategory → product
  | 'RATIO_PAIR'               // numerator/denominator columns
  | 'CUMULATIVE'               // running totals
  | 'TIME_SERIES';             // temporal aggregations (monthly/daily trends)

export interface ColumnReference {
  table: string;
  column: string;
  role: string;  // e.g., 'actual', 'deadline', 'numerator'
}

export interface KPITemplate {
  name: string;
  description: string;
  template: {
    type: 'filtered' | 'ratio' | 'simple';
    aggregation: string;
    expression: string;
    subquery?: {
      groupBy: string;
      having: string;
    };
    percentOf?: string;
    entity: string;
  };
}

export interface DetectedPattern {
  type: PatternType;
  confidence: number;
  columns: ColumnReference[];
  suggestedKPI?: KPITemplate;
  reasoning: string;
}

export interface TableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
    referencedTable?: string;
  }>;
  primaryKey?: string;
}

export interface ProfilingData {
  tables: Map<string, {
    rowCount?: number;
    columns: Map<string, {
      distinctCount?: number;
      nullPercentage?: number;
      topValues?: Array<{ value: unknown; percentage: number }>;
    }>;
  }>;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Detect all business patterns from schema + profiling data
 */
export function detectPatterns(
  tables: TableSchema[],
  profiling?: ProfilingData
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  for (const table of tables) {
    // Date comparison patterns (most important for filtered KPIs)
    patterns.push(...detectDateComparisonPatterns(table));

    // Amount variance patterns
    patterns.push(...detectVariancePatterns(table));

    // Time-series patterns (for temporal aggregations)
    patterns.push(...detectTimeSeriesPatterns(table));

    // Status lifecycle patterns (requires profiling data)
    if (profiling) {
      patterns.push(...detectLifecyclePatterns(table, profiling));
    }
  }

  // Sort by confidence (highest first)
  return patterns.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================================
// Pattern Detection: Deadline Comparison
// ============================================================================

/**
 * Detect deadline comparison patterns in a table.
 *
 * These patterns enable "On-Time Rate" KPIs:
 * - shipped_date vs required_date → On-Time Delivery Rate
 * - completed_date vs due_date → On-Time Completion Rate
 * - actual_date vs expected_date → On-Time Rate
 *
 * The key insight: When we see two date columns where one represents
 * "when something was supposed to happen" and another represents
 * "when it actually happened", we can generate a filtered KPI that
 * calculates the percentage where actual <= expected.
 */
export function detectDateComparisonPatterns(table: TableSchema): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Find all date/timestamp columns
  const dateColumns = table.columns.filter(c =>
    c.type.toLowerCase().includes('date') ||
    c.type.toLowerCase().includes('timestamp')
  );

  if (dateColumns.length < 2) {
    return patterns;
  }

  // Patterns for "deadline" dates (when something was supposed to happen)
  const deadlinePatterns = [
    /required/i,
    /due/i,
    /expected/i,
    /deadline/i,
    /target/i,
    /scheduled/i,
    /planned/i,
    /promise/i,
  ];

  // Patterns for "actual" dates (when something actually happened)
  const actualPatterns = [
    /shipped/i,
    /actual/i,
    /completed/i,
    /done/i,
    /delivered/i,
    /fulfilled/i,
    /finished/i,
    /processed/i,
  ];

  // Find deadline column
  const deadlineCol = dateColumns.find(c =>
    deadlinePatterns.some(p => p.test(c.name))
  );

  // Find actual column
  const actualCol = dateColumns.find(c =>
    actualPatterns.some(p => p.test(c.name))
  );

  if (deadlineCol && actualCol) {
    // Determine the primary key or ID field for grouping
    const pkField = table.primaryKey ||
      table.columns.find(c => c.isPrimaryKey)?.name ||
      table.columns.find(c => /_id$/i.test(c.name) && !c.isForeignKey)?.name ||
      `${table.name}_id`;

    // Create a meaningful KPI name based on the actual column
    let kpiName = 'On-Time Rate';
    let kpiDescription = `Percentage where ${actualCol.name} occurs on or before ${deadlineCol.name}`;

    if (/shipped|deliver/i.test(actualCol.name)) {
      kpiName = 'On-Time Delivery Rate';
      kpiDescription = `Percentage of ${table.name} delivered on or before ${deadlineCol.name}`;
    } else if (/completed|finished|done/i.test(actualCol.name)) {
      kpiName = 'On-Time Completion Rate';
      kpiDescription = `Percentage of ${table.name} completed on or before ${deadlineCol.name}`;
    }

    patterns.push({
      type: 'DEADLINE_COMPARISON',
      confidence: 0.9,
      columns: [
        { table: table.name, column: actualCol.name, role: 'actual' },
        { table: table.name, column: deadlineCol.name, role: 'deadline' },
      ],
      suggestedKPI: {
        name: kpiName,
        description: kpiDescription,
        template: {
          type: 'filtered',
          aggregation: 'COUNT_DISTINCT',
          expression: pkField,
          subquery: {
            groupBy: pkField,
            having: `${actualCol.name} <= ${deadlineCol.name}`,
          },
          percentOf: pkField,
          entity: table.name,
        },
      },
      reasoning: `Found date pair: "${actualCol.name}" (actual) and "${deadlineCol.name}" (deadline) in table "${table.name}". This enables an on-time rate KPI using the condition: ${actualCol.name} <= ${deadlineCol.name}`,
    });
  }

  return patterns;
}

// ============================================================================
// Pattern Detection: Variance Analysis
// ============================================================================

/**
 * Detect variance/comparison patterns for actual vs budget analysis.
 *
 * Examples:
 * - actual_cost vs budgeted_cost → Budget Variance
 * - actual_revenue vs forecast_revenue → Forecast Accuracy
 * - current_value vs target_value → Target Attainment
 */
export function detectVariancePatterns(table: TableSchema): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Find numeric columns
  const numericColumns = table.columns.filter(c =>
    c.type.toLowerCase().match(/int|float|decimal|numeric|money|double|real/)
  );

  if (numericColumns.length < 2) {
    return patterns;
  }

  // Patterns for "actual" values
  const actualValuePatterns = [
    /^actual/i,
    /actual_/i,
    /_actual$/i,
    /^real/i,
    /^current/i,
  ];

  // Patterns for "expected/planned" values
  const expectedValuePatterns = [
    /budget/i,
    /forecast/i,
    /target/i,
    /planned/i,
    /expected/i,
    /estimated/i,
  ];

  // Find actual value column
  const actualCol = numericColumns.find(c =>
    actualValuePatterns.some(p => p.test(c.name))
  );

  // Find expected value column
  const expectedCol = numericColumns.find(c =>
    expectedValuePatterns.some(p => p.test(c.name))
  );

  if (actualCol && expectedCol) {
    patterns.push({
      type: 'VARIANCE_ANALYSIS',
      confidence: 0.85,
      columns: [
        { table: table.name, column: actualCol.name, role: 'actual' },
        { table: table.name, column: expectedCol.name, role: 'expected' },
      ],
      suggestedKPI: {
        name: 'Budget Variance',
        description: `Percentage difference between ${actualCol.name} and ${expectedCol.name}`,
        template: {
          type: 'ratio',
          aggregation: 'SUM',
          expression: `(${actualCol.name} - ${expectedCol.name}) / NULLIF(${expectedCol.name}, 0)`,
          entity: table.name,
        },
      },
      reasoning: `Found numeric pair: "${actualCol.name}" (actual) and "${expectedCol.name}" (expected) in table "${table.name}". This enables variance analysis KPIs.`,
    });
  }

  return patterns;
}

// ============================================================================
// Pattern Detection: Lifecycle Flow
// ============================================================================

/**
 * Detect status lifecycle patterns for conversion/completion rates.
 *
 * Examples:
 * - status: 'pending' → 'processing' → 'completed' → Completion Rate
 * - order_status: 'placed' → 'shipped' → 'delivered' → Delivery Rate
 */
export function detectLifecyclePatterns(
  table: TableSchema,
  profiling: ProfilingData
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Find status-like columns (low cardinality string columns)
  const statusColumns = table.columns.filter(c =>
    c.type.toLowerCase().match(/varchar|text|char|string/) &&
    /status|state|stage|phase/i.test(c.name)
  );

  const tableProfile = profiling.tables.get(table.name);
  if (!tableProfile) {
    return patterns;
  }

  for (const statusCol of statusColumns) {
    const colProfile = tableProfile.columns.get(statusCol.name);
    if (!colProfile?.topValues || colProfile.topValues.length < 2) {
      continue;
    }

    // Check if values look like a lifecycle
    const values = colProfile.topValues.map(v => String(v.value).toLowerCase());
    const lifecycleKeywords = [
      'pending', 'processing', 'completed', 'done', 'cancelled', 'failed',
      'new', 'open', 'closed', 'shipped', 'delivered', 'active', 'inactive',
      'draft', 'published', 'archived', 'approved', 'rejected',
    ];

    const matchingKeywords = values.filter(v =>
      lifecycleKeywords.some(kw => v.includes(kw))
    );

    if (matchingKeywords.length >= 2) {
      // Find a "success" state
      const successStates = values.filter(v =>
        /completed|done|delivered|shipped|approved|closed|active/i.test(v)
      );

      if (successStates.length > 0) {
        const successState = successStates[0];
        const pkField = table.primaryKey ||
          table.columns.find(c => c.isPrimaryKey)?.name ||
          table.columns.find(c => /_id$/i.test(c.name) && !c.isForeignKey)?.name ||
          `${table.name}_id`;

        patterns.push({
          type: 'LIFECYCLE_FLOW',
          confidence: 0.75,
          columns: [
            { table: table.name, column: statusCol.name, role: 'status' },
          ],
          suggestedKPI: {
            name: 'Completion Rate',
            description: `Percentage of ${table.name} that reached "${successState}" status`,
            template: {
              type: 'filtered',
              aggregation: 'COUNT_DISTINCT',
              expression: pkField,
              subquery: {
                groupBy: pkField,
                having: `${statusCol.name} = '${successState}'`,
              },
              percentOf: pkField,
              entity: table.name,
            },
          },
          reasoning: `Found lifecycle status column "${statusCol.name}" with values: ${values.slice(0, 5).join(', ')}. The success state "${successState}" enables completion rate KPIs.`,
        });
      }
    }
  }

  return patterns;
}

// ============================================================================
// Pattern Detection: Time-Series
// ============================================================================

/**
 * Detect time-series patterns for temporal aggregations.
 *
 * These patterns enable trend KPIs that need GROUP BY temporal logic:
 * - Monthly Revenue Trend → GROUP BY DATE_TRUNC('month', order_date)
 * - Daily Active Users → GROUP BY DATE_TRUNC('day', activity_date)
 * - Weekly Sales → GROUP BY DATE_TRUNC('week', sale_date)
 *
 * Key insight: Transaction tables with date columns are natural candidates
 * for time-series KPIs. Without explicit temporal grouping, monthly trends
 * will equal total aggregations.
 */
export function detectTimeSeriesPatterns(table: TableSchema): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Find all date/timestamp columns
  const dateColumns = table.columns.filter(c =>
    c.type.toLowerCase().includes('date') ||
    c.type.toLowerCase().includes('timestamp')
  );

  if (dateColumns.length === 0) {
    return patterns;
  }

  // Patterns for transaction/event timestamps
  const transactionDatePatterns = [
    /order.?date/i,
    /transaction.?date/i,
    /sale.?date/i,
    /invoice.?date/i,
    /rental.?date/i,
    /booking.?date/i,
    /created.?at/i,
    /event.?date/i,
    /activity.?date/i,
    /purchase.?date/i,
  ];

  // Find primary transaction date column
  const primaryDateCol = dateColumns.find(c =>
    transactionDatePatterns.some(p => p.test(c.name))
  );

  if (primaryDateCol) {
    // Detect table type (transaction tables are best for time-series)
    const isTransactionTable = /orders?|invoices?|transactions?|sales?|rentals?|bookings?|events?|activities?/i.test(table.name);

    if (isTransactionTable) {
      patterns.push({
        type: 'TIME_SERIES',
        confidence: 0.85,
        columns: [
          { table: table.name, column: primaryDateCol.name, role: 'timestamp' },
        ],
        suggestedKPI: {
          name: 'Monthly Revenue Trend',
          description: `Revenue aggregated by month from ${table.name}`,
          template: {
            type: 'simple',
            aggregation: 'SUM',
            expression: 'total_amount',
            entity: table.name,
          },
        },
        reasoning: `Found transaction date column "${primaryDateCol.name}" in table "${table.name}". This enables time-series KPIs with temporal grouping (monthly, weekly, daily trends). CRITICAL: When generating trend KPIs, they MUST include temporal GROUP BY logic, otherwise "Monthly Revenue" will equal "Total Revenue".`,
      });
    }
  }

  return patterns;
}

// ============================================================================
// Format Patterns for Prompt Injection
// ============================================================================

/**
 * Format detected patterns as markdown for injection into the LLM prompt.
 * This is the key output that tells the LLM exactly what patterns exist
 * and how to use them.
 */
export function formatPatternsForPrompt(patterns: DetectedPattern[]): string {
  if (patterns.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## DETECTED BUSINESS PATTERNS');
  lines.push('');
  lines.push('The following patterns have been automatically detected from your schema.');
  lines.push('Use these patterns to generate accurate filtered KPIs.');
  lines.push('');

  for (const pattern of patterns) {
    lines.push(`### Pattern: ${pattern.type}`);
    lines.push(`**Confidence:** ${(pattern.confidence * 100).toFixed(0)}%`);
    lines.push(`**Reasoning:** ${pattern.reasoning}`);
    lines.push('');

    if (pattern.suggestedKPI) {
      lines.push('**Suggested KPI:**');
      lines.push(`- Name: ${pattern.suggestedKPI.name}`);
      lines.push(`- Description: ${pattern.suggestedKPI.description}`);
      lines.push('- Definition:');
      lines.push('```json');
      lines.push(JSON.stringify(pattern.suggestedKPI.template, null, 2));
      lines.push('```');
      lines.push('');
    }

    // Add specific guidance based on pattern type
    if (pattern.type === 'DEADLINE_COMPARISON') {
      const actualCol = pattern.columns.find(c => c.role === 'actual')?.column;
      const deadlineCol = pattern.columns.find(c => c.role === 'deadline')?.column;
      lines.push('**CRITICAL:** When generating this KPI:');
      lines.push(`- Use HAVING clause: "${actualCol} <= ${deadlineCol}"`);
      lines.push('- NEVER use "HAVING COUNT(*) > 0" - this is meaningless');
      lines.push(`- The condition compares dates: actual (${actualCol}) vs deadline (${deadlineCol})`);
      lines.push('');
    }

    if (pattern.type === 'LIFECYCLE_FLOW') {
      lines.push('**CRITICAL:** When generating this KPI:');
      lines.push('- Use HAVING clause with the status value check');
      lines.push('- NEVER use "HAVING COUNT(*) > 0" - this is meaningless');
      lines.push('');
    }

    if (pattern.type === 'TIME_SERIES') {
      const dateCol = pattern.columns.find(c => c.role === 'timestamp')?.column;
      lines.push('**CRITICAL:** When generating time-series KPIs:');
      lines.push(`- KPIs with "Monthly", "Daily", "Weekly" in name MUST use temporal grouping`);
      lines.push(`- Add timeField: "${dateCol}" to enable GROUP BY temporal logic in the compiler`);
      lines.push(`- Without timeField, "Monthly Revenue Trend" will equal "Total Revenue" (no time grouping)`);
      lines.push('- The compiler will automatically add DATE_TRUNC/DATE_PART based on the KPI name');
      lines.push('');
    }
  }

  return lines.join('\n');
}
