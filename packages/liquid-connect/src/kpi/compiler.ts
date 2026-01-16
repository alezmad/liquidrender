/**
 * KPI Formula Compiler v2.0
 *
 * Compiles all KPI semantic definitions to dialect-specific SQL.
 */

import type { BaseEmitter, DialectTraits } from '../emitters/base';
import type {
  KPISemanticDefinition,
  SimpleKPIDefinition,
  RatioKPIDefinition,
  DerivedKPIDefinition,
  FilteredAggregationKPIDefinition,
  WindowKPIDefinition,
  CaseKPIDefinition,
  CompositeKPIDefinition,
  MovingAverageKPIDefinition,
  RankingKPIDefinition,
  ConditionalKPIDefinition,
  AggregationComponent,
  FilterCondition,
  CompoundFilter,
  KPIFilter,
  DateRangePreset,
  ComparisonPeriod,
} from './types';
import {
  isSimpleKPI,
  isRatioKPI,
  isDerivedKPI,
  isFilteredKPI,
  isWindowKPI,
  isCaseKPI,
  isCompositeKPI,
  isMovingAverageKPI,
  isRankingKPI,
  isConditionalKPI,
} from './types';

export interface CompileKPIOptions {
  schema?: string;
  quoteIdentifiers?: boolean;
  metricExpressions?: Record<string, string>;
  includeComparison?: boolean;
}

export interface CompileKPIResult {
  expression: string;
  sql: string;
  sourceTable: string;
  joinedTables?: string[];
  success: boolean;
  error?: string;
  columns?: string[];
}

export function compileKPIFormula(
  definition: KPISemanticDefinition,
  emitter: BaseEmitter,
  options: CompileKPIOptions = {}
): CompileKPIResult {
  const traits = emitter.getTraits();
  // Use options.schema if provided, otherwise fall back to emitter's defaultSchema
  const schema = options.schema ?? emitter.getDefaultSchema();
  const { quoteIdentifiers = true } = options;

  try {
    let expression: string;
    let sql: string;
    let joinedTables: string[] | undefined;
    let columns: string[] = ['value'];

    if (isSimpleKPI(definition)) {
      expression = compileSimpleKPI(definition, traits);
    } else if (isRatioKPI(definition)) {
      expression = compileRatioKPI(definition, traits);
    } else if (isDerivedKPI(definition)) {
      expression = compileDerivedKPI(definition, options.metricExpressions || {});
    } else if (isFilteredKPI(definition)) {
      expression = compileFilteredKPI(definition, traits, schema, quoteIdentifiers);
    } else if (isWindowKPI(definition)) {
      const result = compileWindowKPI(definition, traits);
      expression = result.expression;
      columns = result.columns;
    } else if (isCaseKPI(definition)) {
      expression = compileCaseKPI(definition, traits);
    } else if (isCompositeKPI(definition)) {
      const result = compileCompositeKPI(definition, traits, schema, quoteIdentifiers);
      return {
        expression: result.expression,
        sql: result.sql,
        sourceTable: definition.entity,
        joinedTables: result.joinedTables,
        success: true,
        columns: result.columns,
      };
    } else if (isMovingAverageKPI(definition)) {
      const result = compileMovingAverageKPI(definition, traits);
      expression = result.expression;
      columns = result.columns;
    } else if (isRankingKPI(definition)) {
      const result = compileRankingKPI(definition, traits);
      expression = result.expression;
      columns = result.columns;
    } else if (isConditionalKPI(definition)) {
      expression = compileConditionalKPI(definition, traits);
    } else {
      return {
        expression: '',
        sql: '',
        sourceTable: '',
        success: false,
        error: `Unknown KPI type: ${(definition as any).type}`,
      };
    }

    // Apply nullFallback wrapper if specified
    if (definition.nullFallback !== undefined) {
      const fallbackValue = typeof definition.nullFallback === 'string'
        ? `'${definition.nullFallback}'`
        : definition.nullFallback;
      expression = `COALESCE(${expression}, ${fallbackValue})`;
    }

    const sourceTable = definition.entity;
    const tableName = formatTableName(sourceTable, schema, traits, quoteIdentifiers);

    // Build where clause with filters and date range
    let whereConditions: string[] = [];
    const filterClause = buildWhereClause(definition.filters, traits, quoteIdentifiers);
    if (filterClause) {
      whereConditions.push(filterClause);
    }

    // Add date range filter if specified
    if (definition.dateRange && definition.timeField) {
      const dateRangeCondition = buildDateRangeCondition(
        definition.timeField,
        definition.dateRange,
        traits,
        quoteIdentifiers
      );
      if (dateRangeCondition) {
        whereConditions.push(dateRangeCondition);
      }
    }

    const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : null;

    sql = buildFullQuery(expression, tableName, whereClause, columns);

    // Handle period comparison if specified
    if (definition.comparison && definition.timeField) {
      sql = buildComparisonQuery(
        expression,
        tableName,
        whereClause,
        definition.timeField,
        definition.comparison,
        traits,
        columns
      );
    }

    return {
      expression,
      sql,
      sourceTable,
      success: true,
      columns,
    };
  } catch (error) {
    return {
      expression: '',
      sql: '',
      sourceTable: definition.entity || '',
      success: false,
      error: error instanceof Error ? error.message : 'Compilation failed',
    };
  }
}

function compileSimpleKPI(def: SimpleKPIDefinition, traits: DialectTraits): string {
  return buildAggregation(def.aggregation, def.expression, traits);
}

function compileRatioKPI(def: RatioKPIDefinition, traits: DialectTraits): string {
  const numerator = buildAggregationComponent(def.numerator, traits);
  const denominator = buildAggregationComponent(def.denominator, traits);
  // Cast to float for proper decimal division (PostgreSQL: 5/2=2, but 5.0/2=2.5)
  const castExpr = traits.castToFloat || '::float';
  let expression = `(${numerator}${castExpr} / NULLIF(${denominator}, 0))`;
  if (def.multiplier && def.multiplier !== 1) {
    expression = `${expression} * ${def.multiplier}`;
  }
  return expression;
}

function compileDerivedKPI(
  def: DerivedKPIDefinition,
  metricExpressions: Record<string, string>
): string {
  let expression = def.expression;
  for (const dep of def.dependencies) {
    const metricSql = metricExpressions[dep];
    if (!metricSql) {
      throw new Error(`Missing expression for referenced metric: @${dep}`);
    }
    expression = expression.replace(new RegExp(`@${dep}\\b`, 'g'), `(${metricSql})`);
  }
  // Check for unresolved metric references (including hyphens in slugs)
  const unresolvedMatch = expression.match(/@([\w-]+)/);
  if (unresolvedMatch) {
    throw new Error(`Unresolved metric reference: @${unresolvedMatch[1]}`);
  }
  return expression;
}

function compileFilteredKPI(
  def: FilteredAggregationKPIDefinition,
  traits: DialectTraits,
  schema: string | undefined,
  quoteIdentifiers: boolean
): string {
  const { aggregation, expression, subquery, entity, percentOf } = def;
  const quote = quoteIdentifiers ? traits.identifierQuote : '';
  const groupByColumns = Array.isArray(subquery.groupBy)
    ? subquery.groupBy.join(', ')
    : subquery.groupBy;
  const subqueryEntity = subquery.subqueryEntity || entity;
  const tableName = schema
    ? `${quote}${schema}${quote}.${quote}${subqueryEntity}${quote}`
    : `${quote}${subqueryEntity}${quote}`;

  // Build the subquery that identifies matching records
  const subquerySQL = `SELECT ${groupByColumns} FROM ${tableName} GROUP BY ${groupByColumns} HAVING ${subquery.having}`;

  // Generate CASE WHEN expression to conditionally include values
  // e.g., COUNT(DISTINCT customer_id) where customer has multiple orders becomes:
  // COUNT(DISTINCT CASE WHEN customer_id IN (subquery) THEN customer_id END)
  const caseExpr = `CASE WHEN ${expression} IN (${subquerySQL}) THEN ${expression} END`;
  const filteredAgg = buildAggregation(aggregation, caseExpr, traits);

  // If percentOf is specified, calculate as percentage of total
  // e.g., (filtered_count / total_count) * 100
  if (percentOf) {
    const totalAgg = buildAggregation(aggregation, percentOf, traits);
    const castExpr = traits.castToFloat || '::float';
    return `(${filteredAgg}${castExpr} / NULLIF(${totalAgg}, 0)) * 100`;
  }

  return filteredAgg;
}

function compileWindowKPI(
  def: WindowKPIDefinition,
  traits: DialectTraits
): { expression: string; columns: string[] } {
  const { aggregation, expression, window, outputExpression } = def;

  if (!traits.supportsWindowFunctions) {
    throw new Error('Dialect does not support window functions');
  }

  const partitionClause = window.partitionBy.length > 0
    ? `PARTITION BY ${window.partitionBy.join(', ')}`
    : '';
  const orderClause = `ORDER BY ${window.orderBy.map(o => `${o.field} ${o.direction.toUpperCase()}`).join(', ')}`;

  let frameClause = '';
  switch (window.frame) {
    case 'ROWS_UNBOUNDED_PRECEDING':
    case 'ROWS_BETWEEN_UNBOUNDED_AND_CURRENT':
      frameClause = 'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW';
      break;
    case 'ROWS_N_PRECEDING':
      if (!window.frameSize) throw new Error('ROWS_N_PRECEDING requires frameSize');
      frameClause = `ROWS BETWEEN ${window.frameSize} PRECEDING AND CURRENT ROW`;
      break;
    case 'RANGE_UNBOUNDED_PRECEDING':
      frameClause = 'RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW';
      break;
    case 'RANGE_INTERVAL_PRECEDING':
      if (!window.frameInterval) throw new Error('RANGE_INTERVAL_PRECEDING requires frameInterval');
      frameClause = `RANGE BETWEEN INTERVAL '${window.frameInterval}' PRECEDING AND CURRENT ROW`;
      break;
  }

  const windowSpec = [partitionClause, orderClause, frameClause].filter(Boolean).join(' ');
  const mainAgg = buildAggregation(aggregation, expression, traits);
  const windowExpr = `${mainAgg} OVER (${windowSpec})`;

  const columns: string[] = ['value'];
  let lagExpr: string | null = null;
  let leadExpr: string | null = null;

  if (window.lag) {
    const lagDefault = window.lag.default !== undefined ? `, ${window.lag.default}` : '';
    lagExpr = `LAG(${mainAgg}, ${window.lag.offset}${lagDefault}) OVER (${windowSpec})`;
    columns.push('lag_value');
  }

  if (window.lead) {
    const leadDefault = window.lead.default !== undefined ? `, ${window.lead.default}` : '';
    leadExpr = `LEAD(${mainAgg}, ${window.lead.offset}${leadDefault}) OVER (${windowSpec})`;
    columns.push('lead_value');
  }

  let finalExpression: string;
  if (outputExpression && (lagExpr || leadExpr)) {
    finalExpression = outputExpression
      .replace(/\bcurrent\b/g, `(${windowExpr})`)
      .replace(/\blag\b/g, lagExpr ? `(${lagExpr})` : 'NULL')
      .replace(/\blead\b/g, leadExpr ? `(${leadExpr})` : 'NULL');
  } else {
    finalExpression = windowExpr;
  }

  return { expression: finalExpression, columns };
}

function compileCaseKPI(def: CaseKPIDefinition, traits: DialectTraits): string {
  const caseParts: string[] = [];
  for (const c of def.cases) {
    if ('when' in c) {
      caseParts.push(`WHEN ${c.when} THEN ${c.then}`);
    } else if ('else' in c) {
      caseParts.push(`ELSE ${c.else}`);
    }
  }
  const caseExpr = `CASE ${caseParts.join(' ')} END`;
  return buildAggregation(def.aggregation, caseExpr, traits);
}

function compileMovingAverageKPI(
  def: MovingAverageKPIDefinition,
  traits: DialectTraits
): { expression: string; columns: string[] } {
  const { aggregation, expression, periods, periodUnit, partitionBy, orderBy, timeField } = def;

  if (!traits.supportsWindowFunctions) {
    throw new Error('Dialect does not support window functions required for moving average');
  }

  // Build the base aggregation
  const baseAgg = buildAggregation(aggregation, expression, traits);

  // Build partition clause
  const partitionClause = partitionBy?.length
    ? `PARTITION BY ${partitionBy.join(', ')}`
    : '';

  // Build order clause - use orderBy or timeField
  const orderField = orderBy || timeField;
  if (!orderField) {
    throw new Error('Moving average requires orderBy or timeField');
  }
  const orderClause = `ORDER BY ${orderField}`;

  // Build frame clause for N preceding rows/range
  const frameClause = `ROWS BETWEEN ${periods - 1} PRECEDING AND CURRENT ROW`;

  const windowSpec = [partitionClause, orderClause, frameClause].filter(Boolean).join(' ');
  const windowExpr = `${baseAgg} OVER (${windowSpec})`;

  return {
    expression: windowExpr,
    columns: ['value'],
  };
}

function compileRankingKPI(
  def: RankingKPIDefinition,
  traits: DialectTraits
): { expression: string; columns: string[] } {
  const { rankFunction, ntileBuckets, rankBy, rankDirection, partitionBy, topN } = def;

  if (!traits.supportsWindowFunctions) {
    throw new Error('Dialect does not support window functions required for ranking');
  }

  // Build partition clause
  const partitionClause = partitionBy?.length
    ? `PARTITION BY ${partitionBy.join(', ')}`
    : '';

  // Build order clause
  const orderClause = `ORDER BY ${rankBy} ${rankDirection.toUpperCase()}`;

  const windowSpec = [partitionClause, orderClause].filter(Boolean).join(' ');

  // Build ranking function
  let rankExpr: string;
  switch (rankFunction) {
    case 'RANK':
      rankExpr = `RANK() OVER (${windowSpec})`;
      break;
    case 'DENSE_RANK':
      rankExpr = `DENSE_RANK() OVER (${windowSpec})`;
      break;
    case 'ROW_NUMBER':
      rankExpr = `ROW_NUMBER() OVER (${windowSpec})`;
      break;
    case 'NTILE':
      if (!ntileBuckets) throw new Error('NTILE requires ntileBuckets');
      rankExpr = `NTILE(${ntileBuckets}) OVER (${windowSpec})`;
      break;
    default:
      throw new Error(`Unknown rank function: ${rankFunction}`);
  }

  // Note: topN filtering should be handled in the outer query
  // The expression just returns the rank value

  return {
    expression: rankExpr,
    columns: ['rank'],
  };
}

function compileConditionalKPI(
  def: ConditionalKPIDefinition,
  traits: DialectTraits
): string {
  const { aggregation, expression, condition } = def;

  // Build conditional expression using CASE WHEN
  const conditionalExpr = `CASE WHEN ${condition} THEN ${expression} END`;

  // Apply the aggregation
  return buildAggregation(aggregation, conditionalExpr, traits);
}

function compileCompositeKPI(
  def: CompositeKPIDefinition,
  traits: DialectTraits,
  schema: string | undefined,
  quoteIdentifiers: boolean
): { expression: string; sql: string; joinedTables: string[]; columns: string[] } {
  const { aggregation, expression, sources, groupBy } = def;
  const quote = quoteIdentifiers ? traits.identifierQuote : '';
  const aggExpr = buildAggregation(aggregation, expression, traits);

  const selectParts: string[] = [];
  const columns: string[] = [];

  if (groupBy?.length) {
    for (const col of groupBy) {
      selectParts.push(col);
      columns.push(col.includes('.') ? col.split('.')[1]! : col);
    }
  }

  selectParts.push(`${aggExpr} AS ${quote}value${quote}`);
  columns.push('value');

  const primarySource = sources[0]!;
  const primaryTable = schema
    ? `${quote}${schema}${quote}.${quote}${primarySource.table}${quote}`
    : `${quote}${primarySource.table}${quote}`;

  let fromClause = `${primaryTable} AS ${quote}${primarySource.alias}${quote}`;
  const joinedTables: string[] = [];

  for (let i = 1; i < sources.length; i++) {
    const source = sources[i]!;
    if (!source.join) continue;

    const joinTable = source.schema
      ? `${quote}${source.schema}${quote}.${quote}${source.table}${quote}`
      : schema
        ? `${quote}${schema}${quote}.${quote}${source.table}${quote}`
        : `${quote}${source.table}${quote}`;

    fromClause += `\n${source.join.type} JOIN ${joinTable} AS ${quote}${source.alias}${quote} ON ${source.join.on}`;
    joinedTables.push(source.table);
  }

  let sql = `SELECT ${selectParts.join(', ')}\nFROM ${fromClause}`;
  if (groupBy?.length) {
    sql += `\nGROUP BY ${groupBy.join(', ')}`;
  }

  return { expression: aggExpr, sql, joinedTables, columns };
}

function buildAggregation(
  aggregationType: string,
  expression: string,
  traits: DialectTraits
): string {
  const funcs = traits.aggregateFunctions;

  switch (aggregationType) {
    case 'COUNT':
      return `${funcs.count}(${expression})`;
    case 'COUNT_DISTINCT':
      return funcs.countDistinct(expression);
    case 'SUM':
      return `${funcs.sum}(${expression})`;
    case 'AVG':
      return `${funcs.avg}(${expression})`;
    case 'MIN':
      return `${funcs.min}(${expression})`;
    case 'MAX':
      return `${funcs.max}(${expression})`;
    case 'MEDIAN':
      if (!funcs.median) throw new Error('Dialect does not support MEDIAN');
      return typeof funcs.median === 'function'
        ? funcs.median(expression)
        : `${funcs.median}(${expression})`;
    case 'PERCENTILE_25':
    case 'PERCENTILE_75':
    case 'PERCENTILE_90':
    case 'PERCENTILE_95':
    case 'PERCENTILE_99':
      if (!funcs.percentile) throw new Error('Dialect does not support PERCENTILE');
      const pValue = parseInt(aggregationType.split('_')[1]!) / 100;
      return funcs.percentile(expression, pValue);
    case 'STDDEV':
      if (!funcs.stddev) return `STDDEV(${expression})`;
      return `${funcs.stddev}(${expression})`;
    case 'VARIANCE':
      if (!funcs.variance) return `VARIANCE(${expression})`;
      return `${funcs.variance}(${expression})`;
    default:
      return `${aggregationType}(${expression})`;
  }
}

function buildAggregationComponent(
  component: AggregationComponent,
  traits: DialectTraits
): string {
  if (component.filterCondition) {
    // Use FILTER clause if supported (PostgreSQL, DuckDB), else CASE WHEN (MySQL)
    if (traits.supportsFilterClause) {
      const agg = buildAggregation(component.aggregation, component.expression, traits);
      return `${agg} FILTER (WHERE ${component.filterCondition})`;
    } else {
      // Fallback for MySQL: use CASE WHEN inside aggregation
      const filteredExpr = `CASE WHEN ${component.filterCondition} THEN ${component.expression} END`;
      return buildAggregation(component.aggregation, filteredExpr, traits);
    }
  }
  return buildAggregation(component.aggregation, component.expression, traits);
}

function buildWhereClause(
  filters: FilterCondition[] | undefined,
  traits: DialectTraits,
  quoteIdentifiers: boolean
): string | null {
  if (!filters || filters.length === 0) return null;
  const conditions = filters.map(f => buildFilterCondition(f, traits, quoteIdentifiers));
  return conditions.join(' AND ');
}

function buildFilterCondition(
  filter: FilterCondition,
  traits: DialectTraits,
  quoteIdentifiers: boolean
): string {
  if ('type' in filter && filter.type === 'compound') {
    const compound = filter as CompoundFilter;
    const subConditions = compound.conditions.map(c =>
      buildFilterCondition(c, traits, quoteIdentifiers)
    );
    return `(${subConditions.join(` ${compound.operator} `)})`;
  }

  const simple = filter as KPIFilter;
  const quote = quoteIdentifiers ? traits.identifierQuote : '';
  const stringQuote = traits.stringQuote;
  const field = `${quote}${simple.field}${quote}`;

  switch (simple.operator) {
    case 'IS NULL':
      return `${field} IS NULL`;
    case 'IS NOT NULL':
      return `${field} IS NOT NULL`;
    case 'IN':
    case 'NOT IN':
      if (!Array.isArray(simple.value)) throw new Error(`${simple.operator} requires array`);
      const values = simple.value
        .map(v => typeof v === 'string' ? `${stringQuote}${v}${stringQuote}` : v)
        .join(', ');
      return `${field} ${simple.operator} (${values})`;
    case 'BETWEEN':
      if (!Array.isArray(simple.value) || simple.value.length !== 2) {
        throw new Error('BETWEEN requires array of two values');
      }
      return `${field} BETWEEN ${simple.value[0]} AND ${simple.value[1]}`;
    default:
      const formattedValue = typeof simple.value === 'string'
        ? `${stringQuote}${simple.value}${stringQuote}`
        : simple.value;
      return `${field} ${simple.operator} ${formattedValue}`;
  }
}

function formatTableName(
  table: string,
  schema: string | undefined,
  traits: DialectTraits,
  quoteIdentifiers: boolean
): string {
  const quote = quoteIdentifiers ? traits.identifierQuote : '';
  if (schema) {
    return `${quote}${schema}${quote}.${quote}${table}${quote}`;
  }
  return `${quote}${table}${quote}`;
}

function buildFullQuery(
  expression: string,
  tableName: string,
  whereClause: string | null,
  columns: string[]
): string {
  const selectExpr = columns.length === 1
    ? `${expression} AS value`
    : expression;

  let sql = `SELECT ${selectExpr} FROM ${tableName}`;

  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  return sql;
}

export function compileKPIExpression(
  definition: KPISemanticDefinition,
  emitter: BaseEmitter,
  options: CompileKPIOptions = {}
): string {
  const result = compileKPIFormula(definition, emitter, options);
  if (!result.success) {
    throw new Error(result.error || 'KPI compilation failed');
  }
  return result.expression;
}

export function compileMultipleKPIs(
  definitions: Array<{ slug: string; definition: KPISemanticDefinition }>,
  emitter: BaseEmitter,
  options: CompileKPIOptions = {}
): { sql: string; columns: string[] } {
  if (definitions.length === 0) {
    throw new Error('No KPI definitions provided');
  }

  const traits = emitter.getTraits();
  const { schema, quoteIdentifiers = true } = options;
  const quote = quoteIdentifiers ? traits.identifierQuote : '';

  const entities = new Set(definitions.map(d => d.definition.entity));
  if (entities.size > 1) {
    throw new Error(`Cannot combine KPIs from different tables: ${[...entities].join(', ')}`);
  }

  const entity = definitions[0]!.definition.entity;
  const tableName = formatTableName(entity, schema, traits, quoteIdentifiers);

  const columns: string[] = [];
  const selectParts: string[] = [];

  for (const { slug, definition } of definitions) {
    const expr = compileKPIExpression(definition, emitter, options);
    selectParts.push(`${expr} AS ${quote}${slug}${quote}`);
    columns.push(slug);
  }

  const sql = `SELECT ${selectParts.join(', ')} FROM ${tableName}`;

  return { sql, columns };
}

// ============================================================================
// Date Range Helpers
// ============================================================================

function buildDateRangeCondition(
  timeField: string,
  dateRange: DateRangePreset,
  traits: DialectTraits,
  quoteIdentifiers: boolean
): string {
  const quote = quoteIdentifiers ? traits.identifierQuote : '';
  const field = `${quote}${timeField}${quote}`;
  const currentDate = traits.dateFunctions.currentDate;
  const dateTrunc = traits.dateFunctions.dateTrunc;
  const dateAdd = traits.dateFunctions.dateAdd;

  switch (dateRange) {
    case 'today':
      return `${field} >= ${dateTrunc('day', currentDate)} AND ${field} < ${dateAdd(dateTrunc('day', currentDate), '1', 'day')}`;

    case 'yesterday':
      return `${field} >= ${dateAdd(dateTrunc('day', currentDate), '-1', 'day')} AND ${field} < ${dateTrunc('day', currentDate)}`;

    case 'last_7_days':
      return `${field} >= ${dateAdd(currentDate, '-7', 'day')} AND ${field} < ${currentDate}`;

    case 'last_14_days':
      return `${field} >= ${dateAdd(currentDate, '-14', 'day')} AND ${field} < ${currentDate}`;

    case 'last_30_days':
      return `${field} >= ${dateAdd(currentDate, '-30', 'day')} AND ${field} < ${currentDate}`;

    case 'last_90_days':
      return `${field} >= ${dateAdd(currentDate, '-90', 'day')} AND ${field} < ${currentDate}`;

    case 'last_365_days':
      return `${field} >= ${dateAdd(currentDate, '-365', 'day')} AND ${field} < ${currentDate}`;

    case 'this_week':
      return `${field} >= ${dateTrunc('week', currentDate)}`;

    case 'this_month':
      return `${field} >= ${dateTrunc('month', currentDate)}`;

    case 'this_quarter':
      return `${field} >= ${dateTrunc('quarter', currentDate)}`;

    case 'this_year':
      return `${field} >= ${dateTrunc('year', currentDate)}`;

    case 'last_week':
      return `${field} >= ${dateAdd(dateTrunc('week', currentDate), '-1', 'week')} AND ${field} < ${dateTrunc('week', currentDate)}`;

    case 'last_month':
      return `${field} >= ${dateAdd(dateTrunc('month', currentDate), '-1', 'month')} AND ${field} < ${dateTrunc('month', currentDate)}`;

    case 'last_quarter':
      return `${field} >= ${dateAdd(dateTrunc('quarter', currentDate), '-3', 'month')} AND ${field} < ${dateTrunc('quarter', currentDate)}`;

    case 'last_year':
      return `${field} >= ${dateAdd(dateTrunc('year', currentDate), '-1', 'year')} AND ${field} < ${dateTrunc('year', currentDate)}`;

    default:
      throw new Error(`Unknown date range preset: ${dateRange}`);
  }
}

// ============================================================================
// Period Comparison Helpers
// ============================================================================

function buildComparisonQuery(
  expression: string,
  tableName: string,
  whereClause: string | null,
  timeField: string,
  comparison: { period: ComparisonPeriod; offsetDays?: number },
  traits: DialectTraits,
  columns: string[]
): string {
  const dateAdd = traits.dateFunctions.dateAdd;
  const currentDate = traits.dateFunctions.currentDate;

  // Determine the offset based on comparison period
  let offsetExpr: string;
  switch (comparison.period) {
    case 'previous_period':
      // Use offsetDays if specified, otherwise default to 1 day
      const days = comparison.offsetDays || 1;
      offsetExpr = dateAdd(timeField, `-${days}`, 'day');
      break;
    case 'previous_week':
      offsetExpr = dateAdd(timeField, '-7', 'day');
      break;
    case 'previous_month':
      offsetExpr = dateAdd(timeField, '-1', 'month');
      break;
    case 'previous_quarter':
      offsetExpr = dateAdd(timeField, '-3', 'month');
      break;
    case 'previous_year':
      offsetExpr = dateAdd(timeField, '-1', 'year');
      break;
    case 'custom':
      if (!comparison.offsetDays) {
        throw new Error('Custom comparison period requires offsetDays');
      }
      offsetExpr = dateAdd(timeField, `-${comparison.offsetDays}`, 'day');
      break;
    default:
      throw new Error(`Unknown comparison period: ${comparison.period}`);
  }

  // Build CTE-based comparison query
  const selectExpr = columns.length === 1
    ? `${expression} AS value`
    : expression;

  // Generate comparison SQL using CTEs for current and previous period
  const sql = `
WITH current_period AS (
  SELECT ${selectExpr}
  FROM ${tableName}
  ${whereClause ? `WHERE ${whereClause}` : ''}
),
previous_period AS (
  SELECT ${selectExpr}
  FROM ${tableName}
  ${whereClause ? `WHERE ${whereClause.replace(new RegExp(timeField, 'g'), `(${offsetExpr})`)}` : ''}
)
SELECT
  c.value AS current_value,
  p.value AS previous_value,
  (c.value - p.value) AS delta,
  CASE WHEN p.value = 0 THEN NULL ELSE ((c.value - p.value)${traits.castToFloat} / p.value) * 100 END AS pct_change
FROM current_period c
CROSS JOIN previous_period p`.trim();

  return sql;
}
