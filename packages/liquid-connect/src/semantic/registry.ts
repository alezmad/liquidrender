// Semantic Layer - Registry
// Central registry for resolving semantic references

import type {
  SemanticLayer,
  MetricDefinition,
  EntityDefinition,
  DimensionDefinition,
  FilterDefinition,
  SourceDefinition,
  RelationshipDefinition,
  ResolvedReference,
  ResolutionResult,
  ResolutionError,
} from './types';

/**
 * Registry for semantic layer lookups
 * Provides fast resolution of @metric, .entity, #dimension, ?filter references
 */
export class SemanticRegistry {
  private layer: SemanticLayer;
  private metricIndex: Map<string, MetricDefinition>;
  private entityIndex: Map<string, EntityDefinition>;
  private dimensionIndex: Map<string, DimensionDefinition>;
  private filterIndex: Map<string, FilterDefinition>;
  private sourceIndex: Map<string, SourceDefinition>;
  private relationshipIndex: Map<string, RelationshipDefinition[]>;

  constructor(layer: SemanticLayer) {
    this.layer = layer;
    this.metricIndex = new Map(Object.entries(layer.metrics ?? {}));
    this.entityIndex = new Map(Object.entries(layer.entities ?? {}));
    this.dimensionIndex = new Map(Object.entries(layer.dimensions ?? {}));
    this.filterIndex = new Map(Object.entries(layer.filters ?? {}));
    this.sourceIndex = new Map(Object.entries(layer.sources ?? {}));

    // Index relationships by entity
    this.relationshipIndex = new Map();
    for (const rel of layer.relationships ?? []) {
      const fromRels = this.relationshipIndex.get(rel.from) ?? [];
      fromRels.push(rel);
      this.relationshipIndex.set(rel.from, fromRels);

      const toRels = this.relationshipIndex.get(rel.to) ?? [];
      toRels.push(rel);
      this.relationshipIndex.set(rel.to, toRels);
    }
  }

  /**
   * Get the underlying semantic layer
   */
  getLayer(): SemanticLayer {
    return this.layer;
  }

  // ===========================================================================
  // METRIC RESOLUTION
  // ===========================================================================

  /**
   * Resolve a metric reference (@metric)
   */
  resolveMetric(name: string): ResolutionResult<MetricDefinition> {
    const metric = this.metricIndex.get(name);

    if (!metric) {
      return {
        success: false,
        error: this.createNotFoundError('metric', name, [...this.metricIndex.keys()]),
      };
    }

    return { success: true, value: metric };
  }

  /**
   * Check if a metric exists
   */
  hasMetric(name: string): boolean {
    return this.metricIndex.has(name);
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return [...this.metricIndex.keys()];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, MetricDefinition> {
    return new Map(this.metricIndex);
  }

  // ===========================================================================
  // ENTITY RESOLUTION
  // ===========================================================================

  /**
   * Resolve an entity reference (.entity)
   */
  resolveEntity(name: string): ResolutionResult<EntityDefinition> {
    const entity = this.entityIndex.get(name);

    if (!entity) {
      return {
        success: false,
        error: this.createNotFoundError('entity', name, [...this.entityIndex.keys()]),
      };
    }

    return { success: true, value: entity };
  }

  /**
   * Check if an entity exists
   */
  hasEntity(name: string): boolean {
    return this.entityIndex.has(name);
  }

  /**
   * Get all entity names
   */
  getEntityNames(): string[] {
    return [...this.entityIndex.keys()];
  }

  /**
   * Get all entities
   */
  getAllEntities(): Map<string, EntityDefinition> {
    return new Map(this.entityIndex);
  }

  // ===========================================================================
  // DIMENSION RESOLUTION
  // ===========================================================================

  /**
   * Resolve a dimension reference (#dimension)
   */
  resolveDimension(name: string): ResolutionResult<DimensionDefinition> {
    const dimension = this.dimensionIndex.get(name);

    if (!dimension) {
      return {
        success: false,
        error: this.createNotFoundError('dimension', name, [...this.dimensionIndex.keys()]),
      };
    }

    return { success: true, value: dimension };
  }

  /**
   * Check if a dimension exists
   */
  hasDimension(name: string): boolean {
    return this.dimensionIndex.has(name);
  }

  /**
   * Get all dimension names
   */
  getDimensionNames(): string[] {
    return [...this.dimensionIndex.keys()];
  }

  /**
   * Get all dimensions
   */
  getAllDimensions(): Map<string, DimensionDefinition> {
    return new Map(this.dimensionIndex);
  }

  // ===========================================================================
  // FILTER RESOLUTION
  // ===========================================================================

  /**
   * Resolve a filter reference (?filter)
   */
  resolveFilter(name: string): ResolutionResult<FilterDefinition> {
    const filter = this.filterIndex.get(name);

    if (!filter) {
      return {
        success: false,
        error: this.createNotFoundError('filter', name, [...this.filterIndex.keys()]),
      };
    }

    return { success: true, value: filter };
  }

  /**
   * Check if a filter exists
   */
  hasFilter(name: string): boolean {
    return this.filterIndex.has(name);
  }

  /**
   * Get all filter names
   */
  getFilterNames(): string[] {
    return [...this.filterIndex.keys()];
  }

  // ===========================================================================
  // SOURCE RESOLUTION
  // ===========================================================================

  /**
   * Resolve a source by name
   */
  resolveSource(name: string): ResolutionResult<SourceDefinition> {
    const source = this.sourceIndex.get(name);

    if (!source) {
      return {
        success: false,
        error: this.createNotFoundError('source', name, [...this.sourceIndex.keys()]),
      };
    }

    return { success: true, value: source };
  }

  /**
   * Get source for an entity
   */
  getSourceForEntity(entityName: string): ResolutionResult<SourceDefinition> {
    const entityResult = this.resolveEntity(entityName);
    if (!entityResult.success) {
      return { success: false, error: entityResult.error };
    }

    return this.resolveSource(entityResult.value!.source);
  }

  // ===========================================================================
  // RELATIONSHIP RESOLUTION
  // ===========================================================================

  /**
   * Get relationships for an entity
   */
  getRelationshipsForEntity(entityName: string): RelationshipDefinition[] {
    return this.relationshipIndex.get(entityName) ?? [];
  }

  /**
   * Find relationship between two entities
   */
  findRelationship(fromEntity: string, toEntity: string): RelationshipDefinition | undefined {
    const rels = this.getRelationshipsForEntity(fromEntity);
    return rels.find(r =>
      (r.from === fromEntity && r.to === toEntity) ||
      (r.to === fromEntity && r.from === toEntity)
    );
  }

  /**
   * Get join path between two entities
   */
  getJoinPath(fromEntity: string, toEntity: string): RelationshipDefinition[] {
    // Simple direct relationship check
    const direct = this.findRelationship(fromEntity, toEntity);
    if (direct) {
      return [direct];
    }

    // BFS for multi-hop paths
    const visited = new Set<string>();
    const queue: Array<{ entity: string; path: RelationshipDefinition[] }> = [
      { entity: fromEntity, path: [] }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.entity)) {
        continue;
      }
      visited.add(current.entity);

      const relationships = this.getRelationshipsForEntity(current.entity);
      for (const rel of relationships) {
        const nextEntity = rel.from === current.entity ? rel.to : rel.from;
        const newPath = [...current.path, rel];

        if (nextEntity === toEntity) {
          return newPath;
        }

        if (!visited.has(nextEntity)) {
          queue.push({ entity: nextEntity, path: newPath });
        }
      }
    }

    return []; // No path found
  }

  // ===========================================================================
  // UNIFIED RESOLUTION
  // ===========================================================================

  /**
   * Resolve any reference by sigil
   */
  resolveReference(sigil: '@' | '.' | '#' | '?', name: string): ResolutionResult<ResolvedReference> {
    switch (sigil) {
      case '@': {
        const result = this.resolveMetric(name);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        const sourceResult = this.getSourceForEntity(result.value!.entity);
        return {
          success: true,
          value: {
            type: 'metric',
            name,
            definition: result.value!,
            source: sourceResult.value!,
            sourceAlias: result.value!.entity,
          },
        };
      }

      case '.': {
        const result = this.resolveEntity(name);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        const sourceResult = this.resolveSource(result.value!.source);
        return {
          success: true,
          value: {
            type: 'entity',
            name,
            definition: result.value!,
            source: sourceResult.value!,
            sourceAlias: name,
          },
        };
      }

      case '#': {
        const result = this.resolveDimension(name);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        const sourceResult = this.getSourceForEntity(result.value!.entity);
        return {
          success: true,
          value: {
            type: 'dimension',
            name,
            definition: result.value!,
            source: sourceResult.value!,
            sourceAlias: result.value!.entity,
          },
        };
      }

      case '?': {
        const result = this.resolveFilter(name);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        // Filters don't have a direct source association
        return {
          success: true,
          value: {
            type: 'filter',
            name,
            definition: result.value!,
            source: {} as SourceDefinition,
            sourceAlias: '',
          },
        };
      }

      default:
        return {
          success: false,
          error: {
            code: 'E_INVALID_SIGIL',
            message: `Invalid sigil: ${sigil}`,
            reference: `${sigil}${name}`,
          },
        };
    }
  }

  // ===========================================================================
  // SEARCH & AUTOCOMPLETE
  // ===========================================================================

  /**
   * Search for references matching a pattern
   */
  search(pattern: string, types?: Array<'metric' | 'entity' | 'dimension' | 'filter'>): string[] {
    const results: string[] = [];
    const lowerPattern = pattern.toLowerCase();
    const searchTypes = types ?? ['metric', 'entity', 'dimension', 'filter'];

    if (searchTypes.includes('metric')) {
      for (const name of this.metricIndex.keys()) {
        if (name.toLowerCase().includes(lowerPattern)) {
          results.push(`@${name}`);
        }
      }
    }

    if (searchTypes.includes('entity')) {
      for (const name of this.entityIndex.keys()) {
        if (name.toLowerCase().includes(lowerPattern)) {
          results.push(`.${name}`);
        }
      }
    }

    if (searchTypes.includes('dimension')) {
      for (const name of this.dimensionIndex.keys()) {
        if (name.toLowerCase().includes(lowerPattern)) {
          results.push(`#${name}`);
        }
      }
    }

    if (searchTypes.includes('filter')) {
      for (const name of this.filterIndex.keys()) {
        if (name.toLowerCase().includes(lowerPattern)) {
          results.push(`?${name}`);
        }
      }
    }

    return results;
  }

  /**
   * Get autocomplete suggestions for a partial reference
   */
  autocomplete(partial: string): string[] {
    if (partial.startsWith('@')) {
      return this.search(partial.slice(1), ['metric']);
    }
    if (partial.startsWith('.')) {
      return this.search(partial.slice(1), ['entity']);
    }
    if (partial.startsWith('#')) {
      return this.search(partial.slice(1), ['dimension']);
    }
    if (partial.startsWith('?')) {
      return this.search(partial.slice(1), ['filter']);
    }
    return this.search(partial);
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private createNotFoundError(
    type: string,
    name: string,
    available: string[]
  ): ResolutionError {
    // Find similar names for suggestions
    const suggestions = this.findSimilar(name, available, 3);

    return {
      code: `E_${type.toUpperCase()}_NOT_FOUND`,
      message: `Unknown ${type}: ${name}`,
      reference: name,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  private findSimilar(target: string, candidates: string[], maxResults: number): string[] {
    const scored = candidates
      .map(c => ({ name: c, score: this.levenshtein(target.toLowerCase(), c.toLowerCase()) }))
      .filter(s => s.score <= 3) // Only include reasonably similar names
      .sort((a, b) => a.score - b.score)
      .slice(0, maxResults);

    return scored.map(s => s.name);
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

/**
 * Create a registry from a semantic layer
 */
export function createRegistry(layer: SemanticLayer): SemanticRegistry {
  return new SemanticRegistry(layer);
}
