// Resolver - Main Resolver Class
// Transforms AST to LiquidFlow IR using semantic layer

import type {
  QueryNode,
  MetricNode,
  EntityNode,
  DimensionNode,
  OrderByNode,
  CompareNode,
  LimitNode,
} from '../compiler/ast';
import type {
  LiquidFlow,
  ResolvedMetric,
  ResolvedEntity,
  ResolvedDimension,
  ResolvedTime,
  ResolvedOrderBy,
  ResolvedCompare,
  ResolvedSource,
  ResolvedJoin,
  ResolvedFilter,
} from '../liquidflow/types';
import type { SemanticRegistry } from '../semantic/registry';
import type {
  MetricDefinition,
  EntityDefinition,
  DimensionDefinition,
  RelationshipDefinition,
} from '../semantic/types';
import type {
  ResolverContext,
  ResolverOptions,
  ResolverResult,
  ResolverError,
  ResolverWarning,
  SourceTracker,
  JoinRequirement,
} from './types';
import { createDefaultContext } from './types';
import { resolveTime, getComparisonPeriod } from './time';
import { resolveFilter, combineFilters } from './filter';
import { LIQUIDFLOW_VERSION } from '../liquidflow';

/**
 * Resolver - Transforms AST to LiquidFlow IR
 */
export class Resolver {
  private registry: SemanticRegistry;
  private context: ResolverContext;
  private options: Required<ResolverOptions>;
  private errors: ResolverError[] = [];
  private warnings: ResolverWarning[] = [];
  private sourceTracker: SourceTracker = {
    sources: new Set(),
    joins: [],
  };

  constructor(registry: SemanticRegistry, options?: ResolverOptions) {
    this.registry = registry;
    this.context = createDefaultContext(options?.context);
    this.options = {
      context: this.context,
      strict: options?.strict ?? false,
      maxJoinDepth: options?.maxJoinDepth ?? 5,
      includeMetadata: options?.includeMetadata ?? true,
    };
  }

  /**
   * Resolve AST to LiquidFlow IR
   */
  resolve(ast: QueryNode): ResolverResult {
    // Reset state
    this.errors = [];
    this.warnings = [];
    this.sourceTracker = { sources: new Set(), joins: [] };

    try {
      const flow = this.resolveQuery(ast);

      // Check for errors
      if (this.errors.length > 0) {
        return {
          success: false,
          errors: this.errors,
          warnings: this.warnings,
        };
      }

      // Check strict mode warnings
      if (this.options.strict && this.warnings.length > 0) {
        return {
          success: false,
          errors: this.warnings.map(w => ({
            code: w.code as ResolverError['code'],
            message: w.message,
            span: w.span,
          })),
          warnings: [],
        };
      }

      return {
        success: true,
        flow,
        errors: [],
        warnings: this.warnings,
      };
    } catch (err) {
      return {
        success: false,
        errors: [{
          code: 'E201',
          message: err instanceof Error ? err.message : 'Unknown resolver error',
        }],
        warnings: this.warnings,
      };
    }
  }

  /**
   * Resolve root query node
   */
  private resolveQuery(ast: QueryNode): LiquidFlow {
    const flow: Partial<LiquidFlow> = {
      version: LIQUIDFLOW_VERSION,
      type: ast.type,
    };

    if (ast.type === 'metric') {
      flow.metrics = this.resolveMetrics(ast.metrics ?? []);
      flow.dimensions = this.resolveDimensions(ast.dimensions ?? []);
    } else if (ast.type === 'entity') {
      if (ast.entity) {
        flow.entity = this.resolveEntity(ast.entity);
      } else {
        this.addError('E202', 'Entity reference required for entity queries');
      }
    }

    // Resolve filters
    if (ast.filter) {
      const filterResult = resolveFilter(ast.filter, this.registry, this.context, this.sourceTracker);
      if (filterResult.error) {
        this.errors.push(filterResult.error);
      } else if (filterResult.filter) {
        flow.filters = [filterResult.filter];
      }
    }

    // Resolve time
    if (ast.time) {
      const timeField = this.determineTimeField(flow);
      if (timeField) {
        const timeResult = resolveTime(ast.time, timeField, this.context);
        if (timeResult.error) {
          this.errors.push(timeResult.error);
        } else if (timeResult.range) {
          flow.time = {
            field: timeResult.range.field,
            start: timeResult.range.start,
            end: timeResult.range.end,
            expression: timeResult.range.expression,
          };
        }
      } else {
        this.addError('E404', 'No time field found for time constraint');
      }
    }

    // Resolve order by
    if (ast.orderBy) {
      flow.orderBy = this.resolveOrderBy(ast.orderBy, flow);
    }

    // Resolve limit
    if (ast.limit) {
      flow.limit = this.resolveLimit(ast.limit);
    }

    // Resolve comparison
    if (ast.compare && flow.time) {
      flow.compare = this.resolveCompare(ast.compare, flow.time);
    }

    // Build sources and joins
    const { sources, joins } = this.buildSourcesAndJoins();
    flow.sources = sources;
    flow.joins = joins;

    // Add metadata
    if (this.options.includeMetadata) {
      flow.metadata = {
        compiledAt: new Date().toISOString(),
        compilerVersion: LIQUIDFLOW_VERSION,
        semanticVersion: this.registry.getLayer().version,
      };
    }

    return flow as LiquidFlow;
  }

  /**
   * Resolve metric references
   */
  private resolveMetrics(nodes: MetricNode[]): ResolvedMetric[] {
    const metrics: ResolvedMetric[] = [];
    const resolvedNames = new Set<string>();

    for (const node of nodes) {
      this.resolveMetricRecursive(node.name, metrics, resolvedNames);
    }

    return metrics;
  }

  /**
   * Recursively resolve a metric and its dependencies
   */
  private resolveMetricRecursive(
    name: string,
    metrics: ResolvedMetric[],
    resolvedNames: Set<string>
  ): void {
    // Skip if already resolved
    if (resolvedNames.has(name)) return;
    resolvedNames.add(name);

    const result = this.registry.resolveMetric(name);

    if (!result.success) {
      this.addError('E201', `Unknown metric: @${name}`, name, result.error?.suggestions);
      return;
    }

    const def = result.value!;
    this.sourceTracker.sources.add(def.entity);

    // Set primary source from first metric's entity
    if (!this.sourceTracker.primary) {
      this.sourceTracker.primary = def.entity;
    }

    // For derived metrics, resolve referenced metrics first
    if (def.type === 'derived') {
      const refs = def.expression.match(/@(\w+)/g) ?? [];
      for (const ref of refs) {
        const refName = ref.slice(1); // Remove @ prefix
        this.resolveMetricRecursive(refName, metrics, resolvedNames);
      }
    }

    metrics.push({
      ref: name,
      alias: def.label ?? name,
      aggregation: def.aggregation ?? 'SUM',
      expression: def.expression,
      sourceEntity: def.entity,
      timeField: def.timeField,
      derived: def.type === 'derived',
    });
  }

  /**
   * Resolve entity reference
   */
  private resolveEntity(node: EntityNode): ResolvedEntity {
    const result = this.registry.resolveEntity(node.name);

    if (!result.success) {
      this.addError('E202', `Unknown entity: .${node.name}`, node.name, result.error?.suggestions);
      return {
        ref: node.name,
        table: '',
        fields: [],
      };
    }

    const def = result.value!;
    this.sourceTracker.sources.add(node.name);
    this.sourceTracker.primary = node.name;

    // Get source for table info
    const sourceResult = this.registry.resolveSource(def.source);
    const source = sourceResult.value;

    return {
      ref: node.name,
      table: source?.table ?? def.source,
      schema: source?.schema,
      fields: Object.entries(def.fields).map(([name, field]) => ({
        name,
        alias: field.label ?? name,
        column: field.column,
        type: field.type,
      })),
    };
  }

  /**
   * Resolve dimension references
   */
  private resolveDimensions(nodes: DimensionNode[]): ResolvedDimension[] {
    const dimensions: ResolvedDimension[] = [];

    for (const node of nodes) {
      const result = this.registry.resolveDimension(node.name);

      if (!result.success) {
        this.addError('E203', `Unknown dimension: #${node.name}`, node.name, result.error?.suggestions);
        continue;
      }

      const def = result.value!;

      // Track source and potential join requirement
      if (!this.sourceTracker.sources.has(def.entity)) {
        this.sourceTracker.sources.add(def.entity);
        this.sourceTracker.joins.push({
          from: this.sourceTracker.primary ?? '',
          to: def.entity,
          reason: 'dimension',
          reference: `#${node.name}`,
        });
      }

      dimensions.push({
        ref: node.name,
        alias: def.label ?? node.name,
        expression: def.expression,
        sourceEntity: def.entity,
        type: def.type,
      });
    }

    return dimensions;
  }

  /**
   * Resolve order by clauses
   */
  private resolveOrderBy(nodes: OrderByNode[], flow: Partial<LiquidFlow>): ResolvedOrderBy[] {
    return nodes.map(node => {
      const target = node.target;
      let expression: string;
      let type: 'metric' | 'dimension' | 'field';

      if (target.kind === 'Metric') {
        const metric = flow.metrics?.find(m => m.ref === target.name);
        expression = metric?.alias ?? target.name;
        type = 'metric';
      } else if (target.kind === 'Dimension') {
        const dim = flow.dimensions?.find(d => d.ref === target.name);
        expression = dim?.alias ?? target.name;
        type = 'dimension';
      } else {
        // FieldRef
        expression = target.name;
        type = 'field';
      }

      return {
        expression,
        direction: node.direction,
        type,
      };
    });
  }

  /**
   * Resolve limit
   */
  private resolveLimit(node: LimitNode): number {
    if (typeof node.value === 'number') {
      return node.value;
    }

    // Parameter reference
    const paramValue = this.context.parameters[node.value.name];
    if (typeof paramValue === 'number') {
      return paramValue;
    }

    this.addError('E501', `Invalid limit parameter: ${node.value.name}`);
    return 100; // Default
  }

  /**
   * Resolve comparison period
   */
  private resolveCompare(node: CompareNode, basePeriod: ResolvedTime): ResolvedCompare | undefined {
    const compareResult = getComparisonPeriod(
      {
        start: basePeriod.start,
        end: basePeriod.end,
        field: basePeriod.field,
        expression: basePeriod.expression,
      },
      node.period,
      this.context
    );

    if (compareResult.error) {
      this.errors.push(compareResult.error);
      return undefined;
    }

    return {
      basePeriod: {
        start: basePeriod.start,
        end: basePeriod.end,
      },
      comparePeriod: {
        start: compareResult.range!.start,
        end: compareResult.range!.end,
      },
      computedColumns: ['delta', 'delta_percent'],
    };
  }

  /**
   * Determine the time field to use
   */
  private determineTimeField(flow: Partial<LiquidFlow>): string | undefined {
    // For metric queries, use first metric's time field
    if (flow.type === 'metric' && flow.metrics && flow.metrics.length > 0) {
      return flow.metrics[0].timeField;
    }

    // For entity queries, use entity's default time field
    if (flow.type === 'entity' && flow.entity) {
      const entityResult = this.registry.resolveEntity(flow.entity.ref);
      if (entityResult.success) {
        return entityResult.value!.defaultTimeField;
      }
    }

    return undefined;
  }

  /**
   * Build sources and joins from tracked requirements
   */
  private buildSourcesAndJoins(): { sources: ResolvedSource[]; joins: ResolvedJoin[] } {
    const sources: ResolvedSource[] = [];
    const joins: ResolvedJoin[] = [];
    const addedSources = new Set<string>();

    // Add primary source first
    if (this.sourceTracker.primary) {
      const source = this.addSource(this.sourceTracker.primary, addedSources, sources);
      if (source) addedSources.add(this.sourceTracker.primary);
    }

    // Process join requirements
    for (const req of this.sourceTracker.joins) {
      if (addedSources.has(req.to)) continue;

      // Find relationship
      const relationship = this.registry.findRelationship(req.from, req.to);

      if (relationship) {
        // Add target source
        this.addSource(req.to, addedSources, sources);
        addedSources.add(req.to);

        // Add join
        joins.push(this.buildJoin(relationship, req.from, req.to));
      } else {
        // Try to find path (multi-hop)
        const path = this.registry.getJoinPath(req.from, req.to);
        if (path.length > 0 && path.length <= this.options.maxJoinDepth) {
          let currentEntity = req.from;
          for (const rel of path) {
            // Determine which entity we're joining TO from the relationship
            const targetEntity = rel.from === currentEntity ? rel.to : rel.from;
            if (!addedSources.has(targetEntity)) {
              this.addSource(targetEntity, addedSources, sources);
              addedSources.add(targetEntity);
              joins.push(this.buildJoin(rel, currentEntity, targetEntity));
            }
            // Move to next entity in the path
            currentEntity = targetEntity;
          }
        } else {
          this.addWarning('W301', `No relationship path from ${req.from} to ${req.to}`);
        }
      }
    }

    // Add remaining sources (may be referenced directly)
    for (const entityName of this.sourceTracker.sources) {
      if (!addedSources.has(entityName)) {
        this.addSource(entityName, addedSources, sources);
      }
    }

    return { sources, joins };
  }

  /**
   * Add a source to the sources list
   */
  private addSource(
    entityName: string,
    addedSources: Set<string>,
    sources: ResolvedSource[]
  ): ResolvedSource | undefined {
    if (addedSources.has(entityName)) return undefined;

    const entityResult = this.registry.resolveEntity(entityName);
    if (!entityResult.success) return undefined;

    const entity = entityResult.value!;
    const sourceResult = this.registry.resolveSource(entity.source);
    const sourceDef = sourceResult.value;

    const source: ResolvedSource = {
      alias: entityName,
      table: sourceDef?.table ?? entity.source,
      schema: sourceDef?.schema,
      database: sourceDef?.database,
    };

    sources.push(source);
    return source;
  }

  /**
   * Build a join from a relationship
   */
  private buildJoin(
    relationship: RelationshipDefinition,
    fromEntity: string,
    toEntity: string
  ): ResolvedJoin {
    // Get the target entity's source for table name
    const toEntityResult = this.registry.resolveEntity(toEntity);
    const toEntityDef = toEntityResult.value;
    const toSourceResult = toEntityDef
      ? this.registry.resolveSource(toEntityDef.source)
      : undefined;

    return {
      type: relationship.join.joinType ?? 'LEFT',
      leftAlias: fromEntity,
      rightAlias: toEntity,
      rightTable: toSourceResult?.value?.table ?? toEntity,
      on: `${fromEntity}.${relationship.join.leftField} = ${toEntity}.${relationship.join.rightField}`,
    };
  }

  /**
   * Add an error
   */
  private addError(
    code: ResolverError['code'],
    message: string,
    reference?: string,
    suggestions?: string[]
  ): void {
    this.errors.push({ code, message, reference, suggestions });
  }

  /**
   * Add a warning
   */
  private addWarning(code: string, message: string): void {
    this.warnings.push({ code, message });
  }
}

/**
 * Create a resolver
 */
export function createResolver(
  registry: SemanticRegistry,
  options?: ResolverOptions
): Resolver {
  return new Resolver(registry, options);
}

/**
 * Resolve AST to LiquidFlow (convenience function)
 */
export function resolve(
  ast: QueryNode,
  registry: SemanticRegistry,
  options?: ResolverOptions
): ResolverResult {
  const resolver = createResolver(registry, options);
  return resolver.resolve(ast);
}
