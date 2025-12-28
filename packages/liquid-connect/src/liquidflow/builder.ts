// LiquidFlow - Builder
// Fluent API for constructing LiquidFlow IR

import type {
  LiquidFlow,
  ResolvedMetric,
  ResolvedEntity,
  ResolvedDimension,
  ResolvedFilter,
  ResolvedTime,
  ResolvedOrderBy,
  ResolvedCompare,
  ResolvedSource,
  ResolvedJoin,
} from './types';
import type { SortDirection, AggregationType, FieldType, FilterOperator } from '../types';

/**
 * Builder for LiquidFlow IR
 * Provides a fluent API for constructing queries programmatically
 */
export class LiquidFlowBuilder {
  private flow: Partial<LiquidFlow>;

  constructor() {
    this.flow = {
      version: '0.1.0',
      sources: [],
      joins: [],
    };
  }

  /**
   * Create a metric query
   */
  static metricQuery(): LiquidFlowBuilder {
    const builder = new LiquidFlowBuilder();
    builder.flow.type = 'metric';
    builder.flow.metrics = [];
    return builder;
  }

  /**
   * Create an entity query
   */
  static entityQuery(): LiquidFlowBuilder {
    const builder = new LiquidFlowBuilder();
    builder.flow.type = 'entity';
    return builder;
  }

  /**
   * Add a metric
   */
  metric(options: {
    ref: string;
    alias?: string;
    aggregation: AggregationType;
    expression: string;
    sourceEntity: string;
    timeField?: string;
    derived?: boolean;
  }): this {
    if (!this.flow.metrics) {
      this.flow.metrics = [];
    }

    this.flow.metrics.push({
      ref: options.ref,
      alias: options.alias ?? options.ref,
      aggregation: options.aggregation,
      expression: options.expression,
      sourceEntity: options.sourceEntity,
      timeField: options.timeField,
      derived: options.derived ?? false,
    });

    return this;
  }

  /**
   * Set entity for listing
   */
  entity(options: {
    ref: string;
    table: string;
    schema?: string;
    fields: Array<{
      name: string;
      alias?: string;
      column: string;
      type: FieldType;
    }>;
  }): this {
    this.flow.entity = {
      ref: options.ref,
      table: options.table,
      schema: options.schema,
      fields: options.fields.map(f => ({
        name: f.name,
        alias: f.alias ?? f.name,
        column: f.column,
        type: f.type,
      })),
    };

    return this;
  }

  /**
   * Add a dimension
   */
  dimension(options: {
    ref: string;
    alias?: string;
    expression: string;
    sourceEntity: string;
    type: FieldType;
  }): this {
    if (!this.flow.dimensions) {
      this.flow.dimensions = [];
    }

    this.flow.dimensions.push({
      ref: options.ref,
      alias: options.alias ?? options.ref,
      expression: options.expression,
      sourceEntity: options.sourceEntity,
      type: options.type,
    });

    return this;
  }

  /**
   * Add a filter predicate
   */
  filter(options: {
    field: string;
    operator: FilterOperator;
    value: unknown;
    namedFilter?: string;
  }): this {
    if (!this.flow.filters) {
      this.flow.filters = [];
    }

    this.flow.filters.push({
      type: 'predicate',
      field: options.field,
      operator: options.operator,
      value: options.value,
      namedFilter: options.namedFilter,
    });

    return this;
  }

  /**
   * Add a compound filter (AND/OR)
   */
  compoundFilter(
    booleanOp: 'AND' | 'OR',
    left: ResolvedFilter,
    right: ResolvedFilter
  ): this {
    if (!this.flow.filters) {
      this.flow.filters = [];
    }

    this.flow.filters.push({
      type: 'compound',
      booleanOp,
      left,
      right,
    });

    return this;
  }

  /**
   * Set time constraint
   */
  time(options: {
    field: string;
    start: string;
    end: string;
    expression: string;
  }): this {
    this.flow.time = {
      field: options.field,
      start: options.start,
      end: options.end,
      expression: options.expression,
    };

    return this;
  }

  /**
   * Add order by clause
   */
  orderBy(options: {
    expression: string;
    direction: SortDirection;
    type: 'metric' | 'dimension' | 'field';
  }): this {
    if (!this.flow.orderBy) {
      this.flow.orderBy = [];
    }

    this.flow.orderBy.push({
      expression: options.expression,
      direction: options.direction,
      type: options.type,
    });

    return this;
  }

  /**
   * Set limit
   */
  limit(value: number): this {
    this.flow.limit = value;
    return this;
  }

  /**
   * Set comparison
   */
  compare(options: {
    basePeriod: { start: string; end: string };
    comparePeriod: { start: string; end: string };
    computedColumns?: string[];
  }): this {
    this.flow.compare = {
      basePeriod: options.basePeriod,
      comparePeriod: options.comparePeriod,
      computedColumns: options.computedColumns ?? [],
    };

    return this;
  }

  /**
   * Add a source
   */
  source(options: {
    alias: string;
    table: string;
    schema?: string;
    database?: string;
  }): this {
    this.flow.sources!.push({
      alias: options.alias,
      table: options.table,
      schema: options.schema,
      database: options.database,
    });

    return this;
  }

  /**
   * Add a join
   */
  join(options: {
    type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
    leftAlias: string;
    rightAlias: string;
    rightTable: string;
    on: string;
  }): this {
    this.flow.joins!.push({
      type: options.type,
      leftAlias: options.leftAlias,
      rightAlias: options.rightAlias,
      rightTable: options.rightTable,
      on: options.on,
    });

    return this;
  }

  /**
   * Set metadata
   */
  metadata(options: {
    originalQuery?: string;
    semanticVersion?: string;
    complexity?: number;
  }): this {
    this.flow.metadata = {
      originalQuery: options.originalQuery,
      compiledAt: new Date().toISOString(),
      compilerVersion: '0.1.0',
      semanticVersion: options.semanticVersion,
      complexity: options.complexity,
    };

    return this;
  }

  /**
   * Build the final LiquidFlow
   */
  build(): LiquidFlow {
    // Validate required fields
    if (!this.flow.type) {
      throw new Error('Query type is required');
    }

    if (this.flow.type === 'metric' && (!this.flow.metrics || this.flow.metrics.length === 0)) {
      throw new Error('At least one metric is required for metric queries');
    }

    if (this.flow.type === 'entity' && !this.flow.entity) {
      throw new Error('Entity is required for entity queries');
    }

    return this.flow as LiquidFlow;
  }
}
