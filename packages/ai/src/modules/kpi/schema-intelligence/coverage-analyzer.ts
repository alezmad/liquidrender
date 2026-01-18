/**
 * KPI Coverage Analyzer
 *
 * Ensures comprehensive business intelligence coverage by:
 * 1. Defining what KPIs are REQUIRED for each entity type
 * 2. Detecting gaps in coverage
 * 3. Generating coverage requirements for the LLM prompt
 */

import type { SchemaAnalysis, DetectedEntity, DetectedMetric, DetectedDimension, DetectedTimeField } from "./entity-detector";

// ============================================================================
// Types
// ============================================================================

export interface CoverageRequirement {
  category: "volume" | "value" | "dimension" | "time" | "customer" | "pattern" | "ratio";
  name: string;
  description: string;
  priority: "required" | "recommended" | "optional";
  // Hint for generation
  hint: {
    aggregation?: string;
    expression?: string;
    groupBy?: string;
    tables?: string[];
    having?: string;
  };
}

export interface CoverageAnalysis {
  requirements: CoverageRequirement[];
  // Summary stats
  totalRequired: number;
  totalRecommended: number;
}

// ============================================================================
// Main Entry Point
// ============================================================================

export function analyzeCoverage(schema: SchemaAnalysis): CoverageAnalysis {
  const requirements: CoverageRequirement[] = [];

  // 1. Transaction volume & value KPIs (REQUIRED for every transaction table)
  requirements.push(...generateTransactionKPIs(schema));

  // 2. Dimension breakdown KPIs (REQUIRED for each significant dimension)
  requirements.push(...generateDimensionBreakdownKPIs(schema));

  // 3. Customer-related KPIs (REQUIRED if customer entity exists)
  requirements.push(...generateCustomerKPIs(schema));

  // 4. Time-series KPIs (REQUIRED if time fields exist)
  requirements.push(...generateTimeSeriesKPIs(schema));

  // 5. Pattern-based KPIs (from detected patterns like deadline comparison)
  // Note: These come from pattern-detector.ts, not here

  // 6. Ratio/derived KPIs
  requirements.push(...generateRatioKPIs(schema));

  return {
    requirements,
    totalRequired: requirements.filter(r => r.priority === "required").length,
    totalRecommended: requirements.filter(r => r.priority === "recommended").length,
  };
}

// ============================================================================
// Transaction KPIs
// ============================================================================

function generateTransactionKPIs(schema: SchemaAnalysis): CoverageRequirement[] {
  const requirements: CoverageRequirement[] = [];
  const transactions = schema.entities.filter(e => e.type === "transaction");

  for (const table of transactions) {
    // Find the primary metric for this table
    const metrics = schema.metrics.filter(m => m.table === table.name);
    const revenueMetric = metrics.find(m => m.type === "currency" && m.expression);
    const primaryMetric = revenueMetric || metrics.find(m => m.type === "currency") || metrics[0];

    // Total count
    requirements.push({
      category: "volume",
      name: `Total ${toTitleCase(table.name)}`,
      description: `Count of all ${table.name}`,
      priority: "required",
      hint: {
        aggregation: "COUNT_DISTINCT",
        expression: table.primaryKey || `${table.name}_id`,
        tables: [table.name],
      },
    });

    // Total value (if metric exists)
    if (primaryMetric) {
      requirements.push({
        category: "value",
        name: primaryMetric.suggestedName === "Revenue"
          ? "Gross Revenue"
          : `Total ${primaryMetric.suggestedName}`,
        description: `Sum of ${primaryMetric.expression || primaryMetric.column} from ${table.name}`,
        priority: "required",
        hint: {
          aggregation: "SUM",
          expression: primaryMetric.expression || primaryMetric.column,
          tables: [table.name],
        },
      });

      // Average value
      requirements.push({
        category: "value",
        name: `Average ${toTitleCase(table.name)} Value`,
        description: `Average ${primaryMetric.suggestedName} per ${table.name}`,
        priority: "required",
        hint: {
          aggregation: "AVG",
          expression: primaryMetric.expression || primaryMetric.column,
          tables: [table.name],
        },
      });
    }
  }

  return requirements;
}

// ============================================================================
// Dimension Breakdown KPIs
// ============================================================================

function generateDimensionBreakdownKPIs(schema: SchemaAnalysis): CoverageRequirement[] {
  const requirements: CoverageRequirement[] = [];

  // Find primary transaction table and its metric
  const primaryTable = schema.entities.find(e => e.name === schema.primaryTransactionTable);
  if (!primaryTable) return requirements;

  const metrics = schema.metrics.filter(m => m.table === primaryTable.name);
  const revenueMetric = metrics.find(m => m.type === "currency" && m.expression);
  const primaryMetric = revenueMetric || metrics.find(m => m.type === "currency");

  if (!primaryMetric) return requirements;

  // Get dimensions related to the transaction table
  const transactionDimensions = schema.dimensions.filter(d =>
    d.table === primaryTable.name ||
    primaryTable.foreignKeys.some(fk => fk.referencesTable === d.referencedTable)
  );

  // Also check for dimensions on related entity tables
  const relatedTables = primaryTable.foreignKeys.map(fk => fk.referencesTable);
  const relatedDimensions = schema.dimensions.filter(d =>
    relatedTables.includes(d.table) && d.cardinality < 50
  );

  const allDimensions = [...transactionDimensions, ...relatedDimensions];

  // Prioritize important dimensions
  const importantPatterns = /categor|country|region|type|status|genre|department/i;

  for (const dim of allDimensions) {
    const isImportant = importantPatterns.test(dim.column) || importantPatterns.test(dim.referencedTable || "");
    const needsJoin = dim.table !== primaryTable.name;

    requirements.push({
      category: "dimension",
      name: `${primaryMetric.suggestedName} by ${dim.suggestedName}`,
      description: `Breakdown of ${primaryMetric.suggestedName} across ${dim.suggestedName} (${dim.cardinality} values)`,
      priority: isImportant ? "required" : "recommended",
      hint: {
        aggregation: "SUM",
        expression: primaryMetric.expression || primaryMetric.column,
        groupBy: needsJoin ? `${dim.referencedTable || dim.table}.${dim.column}` : dim.column,
        tables: needsJoin
          ? [primaryTable.name, dim.referencedTable || dim.table]
          : [primaryTable.name],
      },
    });
  }

  return requirements;
}

// ============================================================================
// Customer KPIs
// ============================================================================

function generateCustomerKPIs(schema: SchemaAnalysis): CoverageRequirement[] {
  const requirements: CoverageRequirement[] = [];

  // Check if customer entity exists
  const customerEntity = schema.entities.find(e =>
    /customer|client|user|member/i.test(e.name) && e.type === "entity"
  );

  if (!customerEntity) return requirements;

  // Find transaction table that references customers
  const primaryTable = schema.entities.find(e => e.name === schema.primaryTransactionTable);
  if (!primaryTable) return requirements;

  const customerFK = primaryTable.foreignKeys.find(fk =>
    /customer|client|user|member/i.test(fk.referencesTable)
  );

  if (!customerFK) return requirements;

  // Unique customers
  requirements.push({
    category: "customer",
    name: "Unique Customers",
    description: "Count of distinct customers",
    priority: "required",
    hint: {
      aggregation: "COUNT_DISTINCT",
      expression: customerFK.column,
      tables: [primaryTable.name],
    },
  });

  // Repeat purchase rate
  requirements.push({
    category: "customer",
    name: "Repeat Purchase Rate",
    description: "Percentage of customers with more than one purchase",
    priority: "required",
    hint: {
      aggregation: "COUNT_DISTINCT",
      expression: customerFK.column,
      having: `COUNT(DISTINCT ${primaryTable.primaryKey || primaryTable.name + '_id'}) > 1`,
      tables: [primaryTable.name],
    },
  });

  // Revenue per customer
  const metrics = schema.metrics.filter(m => m.table === primaryTable.name);
  const revenueMetric = metrics.find(m => m.type === "currency" && m.expression);
  if (revenueMetric) {
    requirements.push({
      category: "customer",
      name: "Average Revenue per Customer",
      description: "Total revenue divided by unique customers",
      priority: "recommended",
      hint: {
        aggregation: "SUM",
        expression: revenueMetric.expression || revenueMetric.column,
        tables: [primaryTable.name],
      },
    });
  }

  return requirements;
}

// ============================================================================
// Time Series KPIs
// ============================================================================

function generateTimeSeriesKPIs(schema: SchemaAnalysis): CoverageRequirement[] {
  const requirements: CoverageRequirement[] = [];

  const primaryTimeField = schema.timeFields.find(t => t.isPrimary);
  if (!primaryTimeField) return requirements;

  const primaryTable = schema.entities.find(e => e.name === schema.primaryTransactionTable);
  if (!primaryTable) return requirements;

  const metrics = schema.metrics.filter(m => m.table === primaryTable.name);
  const revenueMetric = metrics.find(m => m.type === "currency" && m.expression);
  const primaryMetric = revenueMetric || metrics.find(m => m.type === "currency");

  if (primaryMetric) {
    requirements.push({
      category: "time",
      name: `Monthly ${primaryMetric.suggestedName}`,
      description: `${primaryMetric.suggestedName} aggregated by month for trend analysis`,
      priority: "recommended",
      hint: {
        aggregation: "SUM",
        expression: primaryMetric.expression || primaryMetric.column,
        groupBy: `DATE_TRUNC('month', ${primaryTimeField.column})`,
        tables: [primaryTable.name],
      },
    });
  }

  return requirements;
}

// ============================================================================
// Ratio KPIs
// ============================================================================

function generateRatioKPIs(schema: SchemaAnalysis): CoverageRequirement[] {
  const requirements: CoverageRequirement[] = [];

  const primaryTable = schema.entities.find(e => e.name === schema.primaryTransactionTable);
  if (!primaryTable) return requirements;

  const metrics = schema.metrics.filter(m => m.table === primaryTable.name);

  // Look for discount rate opportunity
  const discountMetric = metrics.find(m => /discount/i.test(m.column));
  const revenueMetric = metrics.find(m => m.type === "currency" && m.expression);

  if (discountMetric && revenueMetric) {
    requirements.push({
      category: "ratio",
      name: "Discount Rate",
      description: "Percentage of revenue given as discount",
      priority: "recommended",
      hint: {
        expression: `SUM(${discountMetric.column} * ${revenueMetric.expression}) / SUM(${revenueMetric.expression})`,
        tables: [primaryTable.name],
      },
    });
  }

  return requirements;
}

// ============================================================================
// Format for Prompt
// ============================================================================

export function formatCoverageForPrompt(coverage: CoverageAnalysis): string {
  const lines: string[] = [];

  lines.push("## COVERAGE REQUIREMENTS");
  lines.push("");
  lines.push(`Generate KPIs to ensure COMPLETE business intelligence coverage.`);
  lines.push(`Required: ${coverage.totalRequired} | Recommended: ${coverage.totalRecommended}`);
  lines.push("");
  lines.push("**CRITICAL: Do NOT skip dimension breakdowns. Use JOINs when needed.**");
  lines.push("");

  // Group by category
  const categories = ["volume", "value", "dimension", "customer", "time", "ratio", "pattern"];

  for (const cat of categories) {
    const catRequirements = coverage.requirements.filter(r => r.category === cat);
    if (catRequirements.length === 0) continue;

    lines.push(`### ${cat.toUpperCase()} KPIs`);
    lines.push("");

    for (const req of catRequirements) {
      const priority = req.priority === "required" ? "🔴 REQUIRED" : "🟡 Recommended";
      lines.push(`- **${req.name}** (${priority})`);
      lines.push(`  ${req.description}`);
      if (req.hint.tables && req.hint.tables.length > 1) {
        lines.push(`  Tables: ${req.hint.tables.join(" + ")} (JOIN needed)`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ============================================================================
// Utilities
// ============================================================================

function toTitleCase(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}
