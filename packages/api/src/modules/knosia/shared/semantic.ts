/**
 * Semantic Layer Builder
 *
 * Builds SemanticLayer from Knosia workspace vocabulary for LC Compiler (DSL → SQL)
 */

import type {
  SemanticLayer,
  SourceDefinition,
  EntityDefinition,
  MetricDefinition,
  DimensionDefinition,
  FilterDefinition,
  RelationshipDefinition,
  FieldDefinition,
} from "@repo/liquid-connect";

import type {
  SelectKnosiaVocabularyItem,
  SelectKnosiaWorkspace,
  SelectKnosiaConnection,
} from "@turbostarter/db/schema";

// =============================================================================
// Types
// =============================================================================

interface VocabDefinition {
  descriptionHuman?: string;
  formulaHuman?: string;
  formulaSql?: string;
  sourceTables?: string[];
  sourceColumn?: string;
  caveats?: string[];
  exampleValues?: { low?: string; typical?: string; high?: string };
}

interface JoinsToEntry {
  target: string;
  via: string;
  type: "many_to_one" | "one_to_many" | "many_to_many";
}

interface BuildSemanticLayerInput {
  workspace: SelectKnosiaWorkspace;
  vocabularyItems: SelectKnosiaVocabularyItem[];
  connection?: SelectKnosiaConnection;
}

// =============================================================================
// Main Builder Function
// =============================================================================

/**
 * Build a SemanticLayer from Knosia workspace and vocabulary items
 *
 * Generated on-the-fly because it needs fresh schema data
 */
export function buildSemanticLayer(input: BuildSemanticLayerInput): SemanticLayer {
  const { workspace, vocabularyItems, connection } = input;

  // Group vocabulary items by source table
  const tableMap = groupBySourceTable(vocabularyItems);
  const tables = Object.keys(tableMap);

  // Build sources (one per unique table)
  const sources = buildSources(tables, connection);

  // Build entities (one per table that has items)
  const entities = buildEntities(tableMap);

  // Build metrics
  const metrics = buildMetrics(
    vocabularyItems.filter((i) => i.type === "metric")
  );

  // Build dimensions
  const dimensions = buildDimensions(
    vocabularyItems.filter((i) => i.type === "dimension")
  );

  // Build filters (from event type items)
  const filters = buildFilters(
    vocabularyItems.filter((i) => i.type === "event")
  );

  // Build relationships from joinsTo metadata
  const relationships = buildRelationships(vocabularyItems);

  return {
    version: "1.0",
    name: `knosia_${workspace.slug}`,
    description: workspace.description ?? undefined,
    sources,
    entities,
    metrics,
    dimensions,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    relationships: relationships.length > 0 ? relationships : undefined,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function groupBySourceTable(
  items: SelectKnosiaVocabularyItem[]
): Record<string, SelectKnosiaVocabularyItem[]> {
  const map: Record<string, SelectKnosiaVocabularyItem[]> = {};

  for (const item of items) {
    const def = item.definition as VocabDefinition | null;
    const table = def?.sourceTables?.[0] ?? "default";

    if (!map[table]) {
      map[table] = [];
    }
    map[table].push(item);
  }

  return map;
}

function buildSources(
  tables: string[],
  connection?: SelectKnosiaConnection
): Record<string, SourceDefinition> {
  const sources: Record<string, SourceDefinition> = {};

  for (const table of tables) {
    if (table === "default") continue;

    sources[table] = {
      type: "table",
      schema: connection?.schema ?? "public",
      table: table,
    };
  }

  // Ensure at least one source exists
  if (Object.keys(sources).length === 0) {
    sources["default"] = {
      type: "table",
      schema: connection?.schema ?? "public",
      table: "default",
    };
  }

  return sources;
}

function buildEntities(
  tableMap: Record<string, SelectKnosiaVocabularyItem[]>
): Record<string, EntityDefinition> {
  const entities: Record<string, EntityDefinition> = {};

  for (const [table, items] of Object.entries(tableMap)) {
    if (table === "default") continue;

    // Find primary time field for this table
    const timeItem = items.find((i) => i.isPrimaryTime);

    // Build fields from items
    const fields: Record<string, FieldDefinition> = {};
    for (const item of items) {
      const def = item.definition as VocabDefinition | null;
      fields[item.slug] = {
        column: def?.sourceColumn ?? item.slug,
        type: mapFieldType(item.type),
        description: def?.descriptionHuman,
        label: item.canonicalName,
      };
    }

    entities[table] = {
      source: table,
      description: `Entity from ${table} table`,
      primaryKey: "id", // Assume 'id' - can be overridden
      fields,
      defaultTimeField: timeItem?.slug,
    };
  }

  // Ensure at least one entity exists
  if (Object.keys(entities).length === 0) {
    entities["default"] = {
      source: "default",
      primaryKey: "id",
      fields: {},
    };
  }

  return entities;
}

function buildMetrics(
  items: SelectKnosiaVocabularyItem[]
): Record<string, MetricDefinition> {
  const metrics: Record<string, MetricDefinition> = {};

  for (const item of items) {
    const def = item.definition as VocabDefinition | null;
    const table = def?.sourceTables?.[0] ?? "default";
    const column = def?.sourceColumn ?? item.slug;

    // Use expression if it's a computed metric, otherwise column
    const expression = def?.formulaSql ?? column;

    metrics[item.slug] = {
      type: def?.formulaSql ? "derived" : "simple",
      aggregation: mapAggregation(item.aggregation),
      expression,
      entity: table,
      description: def?.descriptionHuman,
      label: item.canonicalName,
    };
  }

  return metrics;
}

function buildDimensions(
  items: SelectKnosiaVocabularyItem[]
): Record<string, DimensionDefinition> {
  const dimensions: Record<string, DimensionDefinition> = {};

  for (const item of items) {
    const def = item.definition as VocabDefinition | null;
    const table = def?.sourceTables?.[0] ?? "default";
    const column = def?.sourceColumn ?? item.slug;

    dimensions[item.slug] = {
      entity: table,
      expression: column,
      type: "string", // Default to string
      description: def?.descriptionHuman,
      label: item.canonicalName,
      cardinality: mapCardinality(item.cardinality),
    };
  }

  return dimensions;
}

function buildFilters(
  items: SelectKnosiaVocabularyItem[]
): Record<string, FilterDefinition> {
  const filters: Record<string, FilterDefinition> = {};

  for (const item of items) {
    const def = item.definition as VocabDefinition | null;
    const table = def?.sourceTables?.[0] ?? "default";
    const column = def?.sourceColumn ?? item.slug;

    filters[item.slug] = {
      description: def?.descriptionHuman,
      condition: {
        field: column,
        operator: "=",
        value: true,
        entity: table,
      },
    };
  }

  return filters;
}

function buildRelationships(
  items: SelectKnosiaVocabularyItem[]
): RelationshipDefinition[] {
  const relationships: RelationshipDefinition[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const joinsTo = item.joinsTo as JoinsToEntry[] | null;
    if (!joinsTo?.length) continue;

    const def = item.definition as VocabDefinition | null;
    const fromTable = def?.sourceTables?.[0] ?? "default";

    for (const join of joinsTo) {
      const key = `${fromTable}->${join.target}`;
      if (seen.has(key)) continue;
      seen.add(key);

      relationships.push({
        name: `${fromTable}_to_${join.target}`,
        from: fromTable,
        to: join.target,
        type: join.type,
        join: {
          leftField: join.via,
          rightField: "id", // Assume 'id' - can be overridden
          joinType: "LEFT",
        },
      });
    }
  }

  return relationships;
}

// =============================================================================
// Type Mappers
// =============================================================================

function mapFieldType(vocabType: string): "string" | "decimal" | "boolean" | "timestamp" {
  switch (vocabType) {
    case "metric":
      return "decimal";
    case "event":
      return "boolean";
    case "entity":
    case "dimension":
    default:
      return "string";
  }
}

function mapAggregation(
  agg: string | null
): "SUM" | "AVG" | "COUNT" | "MIN" | "MAX" | "COUNT_DISTINCT" {
  switch (agg) {
    case "SUM":
      return "SUM";
    case "AVG":
      return "AVG";
    case "COUNT":
      return "COUNT";
    case "MIN":
      return "MIN";
    case "MAX":
      return "MAX";
    default:
      return "SUM";
  }
}

function mapCardinality(
  cardinality: number | null
): "low" | "medium" | "high" | "unique" | undefined {
  if (cardinality === null || cardinality === undefined) return undefined;
  if (cardinality < 10) return "low";
  if (cardinality < 100) return "medium";
  if (cardinality < 10000) return "high";
  return "unique";
}
