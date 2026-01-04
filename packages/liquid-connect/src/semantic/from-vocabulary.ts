/**
 * Generate Semantic Layer from Vocabulary
 *
 * Transforms ResolvedVocabulary + ExtractedSchema into SemanticLayer for query execution.
 */

import type { ExtractedSchema } from '../uvb/models';
import type {
  SemanticLayer,
  SourceDefinition,
  EntityDefinition,
  MetricDefinition,
  DimensionDefinition,
  RelationshipDefinition,
  FieldDefinition
} from './types';
import { validateSemanticLayer } from './loader';
import type { FieldType, AggregationType } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Resolved vocabulary item from Knosia API
 * (Mirrored from packages/api/src/modules/knosia/vocabulary/resolution.ts)
 */
export interface ResolvedVocabularyItem {
  id: string;
  slug: string;
  canonicalName: string;
  abbreviation: string | null;
  type: "metric" | "dimension" | "entity" | "event";
  category: string | null;
  scope: "org" | "workspace" | "private";
  definition: {
    descriptionHuman?: string;
    formulaHuman?: string;
    formulaSql?: string;
    sourceTables?: string[];
  } | null;
  suggestedForRoles: string[] | null;
  isFavorite: boolean;
  recentlyUsedAt: string | null;
  useCount: number;
}

/**
 * Resolved vocabulary for a user in a workspace
 * (Mirrored from packages/api/src/modules/knosia/vocabulary/resolution.ts)
 */
export interface ResolvedVocabulary {
  items: ResolvedVocabularyItem[];
  bySlug: Map<string, ResolvedVocabularyItem>;
  favorites: string[];
  recentlyUsed: { slug: string; lastUsedAt: string; useCount: number }[];
  synonyms: Record<string, string>;
}

export interface GenerateSemanticLayerOptions {
  /** Include deprecated vocabulary items */
  includeDeprecated?: boolean;

  /** Include draft/pending vocabulary items */
  includeDrafts?: boolean;

  /** Custom semantic layer name */
  name?: string;
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Generate a semantic layer from resolved vocabulary and extracted schema
 */
export function generateSemanticLayer(
  resolved: ResolvedVocabulary,
  schema: ExtractedSchema,
  options: GenerateSemanticLayerOptions = {}
): SemanticLayer {
  const {
    includeDeprecated = false,
    includeDrafts = false,
    name = `${schema.database}_semantic_layer`
  } = options;

  // Filter vocabulary items based on options
  const activeItems = resolved.items.filter((item: ResolvedVocabularyItem) => {
    // Always exclude deprecated unless explicitly included
    if (!includeDeprecated && item.definition?.descriptionHuman?.includes('[DEPRECATED]')) {
      return false;
    }

    // Always exclude drafts unless explicitly included
    if (!includeDrafts && item.definition?.descriptionHuman?.includes('[DRAFT]')) {
      return false;
    }

    return true;
  });

  // 1. Generate sources from schema tables
  const sources = generateSources(schema);

  // 2. Generate entities from vocabulary items where type="entity"
  const entities = generateEntities(activeItems, schema);

  // 3. Generate metrics from vocabulary items where type="metric"
  const metrics = generateMetrics(activeItems, resolved.synonyms);

  // 4. Generate dimensions from vocabulary items where type="dimension"
  const dimensions = generateDimensions(activeItems);

  // 5. Generate relationships from schema foreign keys
  const relationships = generateRelationships(schema);

  const layer: SemanticLayer = {
    version: '1.0',
    name,
    description: `Semantic layer for ${schema.database} (${schema.tables.length} tables, ${activeItems.length} vocabulary items)`,
    sources,
    entities,
    metrics,
    dimensions,
    relationships,
  };

  // 8. Validate and return
  const validation = validateSemanticLayer(layer);
  if (!validation.valid) {
    const errorMsg = validation.errors.map(e => `${e.path}: ${e.message}`).join('; ');
    throw new Error(`Generated semantic layer is invalid: ${errorMsg}`);
  }

  return layer;
}

// =============================================================================
// Source Generation
// =============================================================================

function generateSources(schema: ExtractedSchema): Record<string, SourceDefinition> {
  const sources: Record<string, SourceDefinition> = {};

  for (const table of schema.tables) {
    const sourceKey = table.name;

    sources[sourceKey] = {
      type: 'table',
      database: schema.database,
      schema: table.schema,
      table: table.name,
      description: `Source table: ${table.schema}.${table.name}`,
      primaryKey: table.primaryKeyColumns.length > 0 ? table.primaryKeyColumns : undefined,
    };
  }

  return sources;
}

// =============================================================================
// Entity Generation
// =============================================================================

function generateEntities(
  items: ResolvedVocabulary['items'],
  schema: ExtractedSchema
): Record<string, EntityDefinition> {
  const entities: Record<string, EntityDefinition> = {};

  // Helper to generate entity from table
  const generateEntityFromTable = (
    table: typeof schema.tables[0],
    label?: string,
    description?: string
  ): EntityDefinition => {
    const timeColumn = table.columns.find(col =>
      col.dataType.toLowerCase().includes('timestamp') ||
      col.dataType.toLowerCase().includes('date')
    );

    const fields: Record<string, FieldDefinition> = {};
    for (const column of table.columns) {
      fields[column.name] = {
        column: column.name,
        type: mapDataTypeToFieldType(column.dataType),
        description: column.isForeignKey
          ? `Foreign key to ${column.references?.table}.${column.references?.column}`
          : undefined,
        hidden: column.isPrimaryKey,
      };
    }

    const primaryKey = table.primaryKeyColumns[0] || table.columns[0]?.name || 'id';

    return {
      source: table.name,
      description,
      label: label || table.name,
      primaryKey,
      fields,
      defaultTimeField: timeColumn?.name,
    };
  };

  // 1. Generate entities from vocabulary items with type="entity"
  const entityItems = items.filter((item: ResolvedVocabularyItem) => item.type === 'entity');
  for (const item of entityItems) {
    const sourceTables = item.definition?.sourceTables;
    if (!sourceTables || sourceTables.length === 0) {
      continue;
    }

    const sourceTableName = sourceTables[0];
    const table = schema.tables.find(t => t.name === sourceTableName);
    if (!table) {
      continue;
    }

    entities[item.slug] = generateEntityFromTable(
      table,
      item.canonicalName,
      item.definition?.descriptionHuman
    );
  }

  // 2. Generate entities for ALL schema tables (ensures table references resolve)
  //    This is critical for reverse engineering - every table becomes an entity
  for (const table of schema.tables) {
    // Skip if already defined from vocabulary
    if (Object.values(entities).some(e => e.source === table.name)) {
      continue;
    }

    // Use table name as entity key
    entities[table.name] = generateEntityFromTable(table);
  }

  return entities;
}

// =============================================================================
// Metric Generation
// =============================================================================

function generateMetrics(
  items: ResolvedVocabulary['items'],
  synonyms: Record<string, string>
): Record<string, MetricDefinition> {
  const metrics: Record<string, MetricDefinition> = {};
  const metricItems = items.filter((item: ResolvedVocabularyItem) => item.type === 'metric');

  for (const item of metricItems) {
    const definition = item.definition;
    if (!definition?.formulaSql) {
      continue;
    }

    const sourceTables = definition.sourceTables;
    if (!sourceTables || sourceTables.length === 0) {
      continue;
    }

    // Extract aggregation from formula (simple heuristic)
    const aggregation = extractAggregation(definition.formulaSql);

    // Determine metric type based on scope
    const metricType = item.scope === 'private' ? 'derived' : 'simple';

    // Build metric definition
    const metricDef: MetricDefinition = {
      type: metricType,
      aggregation: aggregation || 'SUM',
      expression: definition.formulaSql,
      entity: sourceTables[0],
      description: definition.descriptionHuman,
      label: item.canonicalName,
    };

    // Detect time field from formula
    const timeFieldMatch = definition.formulaSql.match(/\b(created_at|updated_at|date|timestamp|time)\b/i);
    if (timeFieldMatch) {
      metricDef.timeField = timeFieldMatch[1];
    }

    // Store metric
    metrics[item.slug] = metricDef;

    // 6. Map user synonyms to metric aliases
    const userSynonyms = Object.entries(synonyms)
      .filter(([_, targetSlug]) => targetSlug === item.slug)
      .map(([synonym, _]) => synonym);

    // Add alias metrics for each synonym
    for (const synonym of userSynonyms) {
      const aliasKey = synonym.toLowerCase().replace(/\s+/g, '_');
      metrics[aliasKey] = {
        ...metricDef,
        label: synonym,
        description: `Alias for ${item.canonicalName}`,
      };
    }
  }

  return metrics;
}

// =============================================================================
// Dimension Generation
// =============================================================================

function generateDimensions(
  items: ResolvedVocabulary['items']
): Record<string, DimensionDefinition> {
  const dimensions: Record<string, DimensionDefinition> = {};
  const dimensionItems = items.filter((item: ResolvedVocabularyItem) => item.type === 'dimension');

  for (const item of dimensionItems) {
    const definition = item.definition;
    if (!definition) {
      continue;
    }

    const sourceTables = definition.sourceTables;
    if (!sourceTables || sourceTables.length === 0) {
      continue;
    }

    // Use sourceColumn from definition as expression
    const expression = definition.formulaSql || item.slug;

    // Detect if this is a time dimension
    const isTime = detectTimeField(expression);

    dimensions[item.slug] = {
      entity: sourceTables[0],
      expression,
      type: isTime ? 'timestamp' : 'string',
      description: definition.descriptionHuman,
      label: item.canonicalName,
      isTime,
      granularities: isTime
        ? ['day', 'week', 'month', 'quarter', 'year']
        : undefined,
    };
  }

  return dimensions;
}

// =============================================================================
// Relationship Generation
// =============================================================================

function generateRelationships(schema: ExtractedSchema): RelationshipDefinition[] {
  const relationships: RelationshipDefinition[] = [];

  for (const table of schema.tables) {
    for (const fk of table.foreignKeys) {
      relationships.push({
        name: `${table.name}_to_${fk.referencedTable}`,
        from: table.name,
        to: fk.referencedTable,
        type: 'many_to_one', // Default assumption
        join: {
          leftField: fk.column,
          rightField: fk.referencedColumn,
          joinType: 'LEFT',
        },
        description: `Foreign key from ${table.name}.${fk.column} to ${fk.referencedTable}.${fk.referencedColumn}`,
      });
    }
  }

  return relationships;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Map DuckDB data type to FieldType
 *
 * DuckDB normalizes all source database types, so we only need to handle
 * DuckDB's type system (much simpler than handling 4 different databases)
 */
function mapDataTypeToFieldType(dataType: string): FieldType {
  const normalized = dataType.toLowerCase();

  // Timestamp types
  if (normalized.includes('timestamp')) {
    return 'timestamp';
  }
  if (normalized.includes('date') && !normalized.includes('datetime')) {
    return 'date';
  }

  // Numeric types
  if (
    normalized.includes('int') ||
    normalized.includes('serial') ||
    normalized.includes('bigint') ||
    normalized.includes('smallint') ||
    normalized.includes('tinyint') ||
    normalized.includes('hugeint') ||
    normalized.includes('ubigint') ||
    normalized.includes('uinteger') ||
    normalized.includes('usmallint') ||
    normalized.includes('utinyint')
  ) {
    return 'integer';
  }
  if (
    normalized.includes('decimal') ||
    normalized.includes('numeric') ||
    normalized.includes('real') ||
    normalized.includes('double') ||
    normalized.includes('float')
  ) {
    return 'decimal';
  }

  // Boolean
  if (normalized.includes('bool')) {
    return 'boolean';
  }

  // JSON (DuckDB has native JSON type)
  if (normalized === 'json' || normalized === 'jsonb') {
    return 'json';
  }

  // UUID (DuckDB has native UUID type)
  if (normalized === 'uuid') {
    return 'string';
  }

  // Fallback to string
  return 'string';
}

/**
 * Extract aggregation type from SQL formula
 */
function extractAggregation(formula: string): AggregationType | null {
  const normalized = formula.toUpperCase();

  if (normalized.includes('SUM(')) return 'SUM';
  if (normalized.includes('AVG(')) return 'AVG';
  if (normalized.includes('COUNT(DISTINCT')) return 'COUNT_DISTINCT';
  if (normalized.includes('COUNT(')) return 'COUNT';
  if (normalized.includes('MIN(')) return 'MIN';
  if (normalized.includes('MAX(')) return 'MAX';

  return null;
}

/**
 * Detect if expression is a time field
 */
function detectTimeField(expression: string): boolean {
  const timePatterns = [
    /\bdate\b/i,
    /\btime\b/i,
    /\btimestamp\b/i,
    /\bcreated_at\b/i,
    /\bupdated_at\b/i,
    /\bfecha\b/i,
  ];

  return timePatterns.some(pattern => pattern.test(expression));
}
