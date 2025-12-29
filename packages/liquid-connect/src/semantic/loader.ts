// Semantic Layer - Loader
// Loads and validates semantic layer YAML definitions

import type { SemanticLayer } from './types';

/**
 * Loader options
 */
export interface LoaderOptions {
  /** Base directory for resolving relative paths */
  basePath?: string;

  /** Whether to validate after loading */
  validate?: boolean;

  /** Custom schema validator */
  validator?: (layer: unknown) => ValidationResult;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

/**
 * Load semantic layer from YAML string
 */
export function loadFromYAML(yaml: string, options?: LoaderOptions): SemanticLayer {
  // Note: Requires a YAML parser like js-yaml
  // This is a placeholder that expects pre-parsed object
  throw new Error('YAML parsing not implemented. Use loadFromObject() with pre-parsed YAML.');
}

/**
 * Load semantic layer from parsed object
 */
export function loadFromObject(obj: unknown, options?: LoaderOptions): SemanticLayer {
  const layer = obj as SemanticLayer;

  if (options?.validate !== false) {
    const validation = validateSemanticLayer(layer);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.path}: ${e.message}`).join('; ');
      throw new Error(`Invalid semantic layer: ${errorMessages}`);
    }
  }

  return layer;
}

/**
 * Validate semantic layer structure
 */
export function validateSemanticLayer(layer: SemanticLayer): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Version check
  if (!layer.version) {
    errors.push({
      path: 'version',
      message: 'Version is required',
      code: 'E_MISSING_VERSION',
    });
  }

  // Name check
  if (!layer.name) {
    errors.push({
      path: 'name',
      message: 'Name is required',
      code: 'E_MISSING_NAME',
    });
  }

  // Sources check
  if (!layer.sources || Object.keys(layer.sources).length === 0) {
    errors.push({
      path: 'sources',
      message: 'At least one source is required',
      code: 'E_NO_SOURCES',
    });
  } else {
    validateSources(layer.sources, errors, warnings);
  }

  // Entities check
  if (!layer.entities || Object.keys(layer.entities).length === 0) {
    warnings.push({
      path: 'entities',
      message: 'No entities defined',
      code: 'W_NO_ENTITIES',
    });
  } else {
    validateEntities(layer.entities, layer.sources, errors, warnings);
  }

  // Metrics check
  if (!layer.metrics || Object.keys(layer.metrics).length === 0) {
    warnings.push({
      path: 'metrics',
      message: 'No metrics defined',
      code: 'W_NO_METRICS',
    });
  } else {
    validateMetrics(layer.metrics, layer.entities, errors, warnings);
  }

  // Dimensions check
  if (layer.dimensions) {
    validateDimensions(layer.dimensions, layer.entities, errors, warnings);
  }

  // Relationships check
  if (layer.relationships) {
    validateRelationships(layer.relationships, layer.entities, errors, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateSources(
  sources: SemanticLayer['sources'],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  for (const [name, source] of Object.entries(sources)) {
    if (!source.type) {
      errors.push({
        path: `sources.${name}.type`,
        message: 'Source type is required',
        code: 'E_MISSING_SOURCE_TYPE',
      });
    }

    if (source.type === 'table' || source.type === 'view') {
      if (!source.table) {
        errors.push({
          path: `sources.${name}.table`,
          message: 'Table name is required for table/view sources',
          code: 'E_MISSING_TABLE',
        });
      }
    }

    if (source.type === 'subquery') {
      if (!source.sql) {
        errors.push({
          path: `sources.${name}.sql`,
          message: 'SQL is required for subquery sources',
          code: 'E_MISSING_SQL',
        });
      }
    }
  }
}

function validateEntities(
  entities: SemanticLayer['entities'],
  sources: SemanticLayer['sources'],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  for (const [name, entity] of Object.entries(entities)) {
    if (!entity.source) {
      errors.push({
        path: `entities.${name}.source`,
        message: 'Source reference is required',
        code: 'E_MISSING_ENTITY_SOURCE',
      });
    } else if (!sources[entity.source]) {
      errors.push({
        path: `entities.${name}.source`,
        message: `Unknown source: ${entity.source}`,
        code: 'E_UNKNOWN_SOURCE',
      });
    }

    if (!entity.primaryKey) {
      errors.push({
        path: `entities.${name}.primaryKey`,
        message: 'Primary key is required',
        code: 'E_MISSING_PRIMARY_KEY',
      });
    }

    if (!entity.fields || Object.keys(entity.fields).length === 0) {
      warnings.push({
        path: `entities.${name}.fields`,
        message: 'No fields defined',
        code: 'W_NO_FIELDS',
      });
    }
  }
}

function validateMetrics(
  metrics: SemanticLayer['metrics'],
  entities: SemanticLayer['entities'],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  for (const [name, metric] of Object.entries(metrics)) {
    if (!metric.type) {
      errors.push({
        path: `metrics.${name}.type`,
        message: 'Metric type is required',
        code: 'E_MISSING_METRIC_TYPE',
      });
    }

    if (!metric.expression) {
      errors.push({
        path: `metrics.${name}.expression`,
        message: 'Expression is required',
        code: 'E_MISSING_EXPRESSION',
      });
    }

    if (!metric.entity) {
      errors.push({
        path: `metrics.${name}.entity`,
        message: 'Entity reference is required',
        code: 'E_MISSING_METRIC_ENTITY',
      });
    } else if (!entities[metric.entity]) {
      errors.push({
        path: `metrics.${name}.entity`,
        message: `Unknown entity: ${metric.entity}`,
        code: 'E_UNKNOWN_ENTITY',
      });
    }

    if (metric.type === 'simple' && !metric.aggregation) {
      errors.push({
        path: `metrics.${name}.aggregation`,
        message: 'Aggregation is required for simple metrics',
        code: 'E_MISSING_AGGREGATION',
      });
    }

    if (metric.type === 'derived' && (!metric.dependencies || metric.dependencies.length === 0)) {
      warnings.push({
        path: `metrics.${name}.dependencies`,
        message: 'Derived metrics should declare dependencies',
        code: 'W_NO_DEPENDENCIES',
      });
    }
  }
}

function validateDimensions(
  dimensions: SemanticLayer['dimensions'],
  entities: SemanticLayer['entities'],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  for (const [name, dimension] of Object.entries(dimensions)) {
    if (!dimension.entity) {
      errors.push({
        path: `dimensions.${name}.entity`,
        message: 'Entity reference is required',
        code: 'E_MISSING_DIMENSION_ENTITY',
      });
    } else if (!entities[dimension.entity]) {
      errors.push({
        path: `dimensions.${name}.entity`,
        message: `Unknown entity: ${dimension.entity}`,
        code: 'E_UNKNOWN_ENTITY',
      });
    }

    if (!dimension.expression) {
      errors.push({
        path: `dimensions.${name}.expression`,
        message: 'Expression is required',
        code: 'E_MISSING_EXPRESSION',
      });
    }

    if (!dimension.type) {
      errors.push({
        path: `dimensions.${name}.type`,
        message: 'Type is required',
        code: 'E_MISSING_TYPE',
      });
    }
  }
}

function validateRelationships(
  relationships: SemanticLayer['relationships'],
  entities: SemanticLayer['entities'],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!relationships) return;
  for (let i = 0; i < relationships.length; i++) {
    const rel = relationships[i];

    if (!rel.name) {
      errors.push({
        path: `relationships[${i}].name`,
        message: 'Relationship name is required',
        code: 'E_MISSING_REL_NAME',
      });
    }

    if (!rel.from) {
      errors.push({
        path: `relationships[${i}].from`,
        message: 'From entity is required',
        code: 'E_MISSING_FROM',
      });
    } else if (!entities[rel.from]) {
      errors.push({
        path: `relationships[${i}].from`,
        message: `Unknown entity: ${rel.from}`,
        code: 'E_UNKNOWN_ENTITY',
      });
    }

    if (!rel.to) {
      errors.push({
        path: `relationships[${i}].to`,
        message: 'To entity is required',
        code: 'E_MISSING_TO',
      });
    } else if (!entities[rel.to]) {
      errors.push({
        path: `relationships[${i}].to`,
        message: `Unknown entity: ${rel.to}`,
        code: 'E_UNKNOWN_ENTITY',
      });
    }

    if (!rel.join) {
      errors.push({
        path: `relationships[${i}].join`,
        message: 'Join condition is required',
        code: 'E_MISSING_JOIN',
      });
    }
  }
}

/**
 * Merge multiple semantic layers
 */
export function mergeLayers(base: SemanticLayer, ...overlays: SemanticLayer[]): SemanticLayer {
  let result = { ...base };

  for (const overlay of overlays) {
    result = {
      ...result,
      sources: { ...result.sources, ...overlay.sources },
      entities: { ...result.entities, ...overlay.entities },
      metrics: { ...result.metrics, ...overlay.metrics },
      dimensions: { ...result.dimensions, ...overlay.dimensions },
      filters: { ...result.filters, ...overlay.filters },
      relationships: [...(result.relationships ?? []), ...(overlay.relationships ?? [])],
    };
  }

  return result;
}
