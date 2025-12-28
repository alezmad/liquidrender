// LiquidConnect Introspector
// ============================================================================
// Automatic schema introspection and column profiling
// ============================================================================

import type {
  DataSource,
  DataAsset,
  DataColumn,
  Relationship,
  ColumnRole,
  ColumnStats,
  SourceType,
} from './types';

/**
 * Configuration for introspection
 */
export interface IntrospectionConfig {
  /** Maximum rows to sample for profiling */
  sampleSize?: number;
  /** Whether to compute detailed statistics */
  computeStats?: boolean;
  /** Whether to infer relationships */
  inferRelationships?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Result of introspection
 */
export interface IntrospectionResult {
  assets: DataAsset[];
  columns: DataColumn[];
  relationships: Relationship[];
  duration: number;
  errors?: Array<{ asset: string; error: string }>;
}

/**
 * Abstract introspector interface
 * Each data source type implements this
 */
export interface Introspector {
  /** The source type this introspector handles */
  readonly sourceType: SourceType;

  /** Test the connection */
  testConnection(source: DataSource): Promise<boolean>;

  /** Discover all assets in the source */
  discoverAssets(source: DataSource): Promise<DataAsset[]>;

  /** Get columns for an asset */
  getColumns(source: DataSource, asset: DataAsset): Promise<DataColumn[]>;

  /** Sample data from an asset */
  sampleData(
    source: DataSource,
    asset: DataAsset,
    limit: number
  ): Promise<Record<string, unknown>[]>;
}

// ============================================================================
// Column Role Classification
// ============================================================================

/**
 * Patterns for classifying column roles
 */
const ROLE_PATTERNS: Record<ColumnRole, RegExp[]> = {
  identifier: [
    /^id$/i,
    /_id$/i,
    /^uuid$/i,
    /^guid$/i,
    /^pk$/i,
    /^key$/i,
  ],
  foreign_key: [
    /_id$/i,
    /_fk$/i,
    /^fk_/i,
    /^ref_/i,
  ],
  metric: [
    /amount/i,
    /total/i,
    /sum/i,
    /count/i,
    /price/i,
    /cost/i,
    /revenue/i,
    /profit/i,
    /quantity/i,
    /qty/i,
    /rate/i,
    /score/i,
    /value/i,
    /balance/i,
  ],
  temporal: [
    /date/i,
    /time/i,
    /created/i,
    /updated/i,
    /modified/i,
    /timestamp/i,
    /_at$/i,
    /_on$/i,
  ],
  dimension: [
    /status/i,
    /state/i,
    /type/i,
    /category/i,
    /region/i,
    /country/i,
    /city/i,
    /name$/i,
    /code$/i,
    /level/i,
    /tier/i,
  ],
  contact: [
    /email/i,
    /phone/i,
    /address/i,
    /zip/i,
    /postal/i,
  ],
  geospatial: [
    /lat/i,
    /lng/i,
    /lon/i,
    /latitude/i,
    /longitude/i,
    /coord/i,
    /geo/i,
  ],
  text: [
    /description/i,
    /comment/i,
    /note/i,
    /body/i,
    /content/i,
    /message/i,
    /bio/i,
  ],
  boolean: [
    /^is_/i,
    /^has_/i,
    /^can_/i,
    /^should_/i,
    /^enabled/i,
    /^active/i,
    /^visible/i,
    /^deleted/i,
  ],
  json: [],
  unknown: [],
};

/**
 * Classify a column's role based on name and data type
 */
export function classifyColumnRole(
  name: string,
  dataType: string,
  samples: unknown[],
  isPrimaryKey: boolean
): { role: ColumnRole; confidence: number } {
  // Primary keys are always identifiers
  if (isPrimaryKey) {
    return { role: 'identifier', confidence: 1.0 };
  }

  // JSON columns
  if (dataType === 'json' || dataType === 'jsonb') {
    return { role: 'json', confidence: 0.95 };
  }

  // Boolean columns
  if (dataType === 'boolean') {
    return { role: 'boolean', confidence: 0.95 };
  }

  // Date/time columns by type
  if (['date', 'datetime', 'timestamp', 'timestamptz'].includes(dataType.toLowerCase())) {
    return { role: 'temporal', confidence: 0.9 };
  }

  // Check name patterns
  for (const [role, patterns] of Object.entries(ROLE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(name)) {
        return {
          role: role as ColumnRole,
          confidence: 0.8,
        };
      }
    }
  }

  // Infer from data type and samples
  if (['integer', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real'].includes(dataType.toLowerCase())) {
    // Check if it looks like a foreign key (integers with low cardinality)
    const uniqueValues = new Set(samples.filter(s => s !== null));
    if (uniqueValues.size < samples.length * 0.1 && name.endsWith('_id')) {
      return { role: 'foreign_key', confidence: 0.7 };
    }
    // Otherwise it's likely a metric
    return { role: 'metric', confidence: 0.6 };
  }

  // String columns - check cardinality
  if (['varchar', 'text', 'char', 'string'].includes(dataType.toLowerCase())) {
    const uniqueValues = new Set(samples.filter(s => s !== null));
    const uniqueRatio = uniqueValues.size / samples.length;

    // High cardinality = likely text
    if (uniqueRatio > 0.8) {
      const avgLength = samples
        .filter((s): s is string => typeof s === 'string')
        .reduce((sum, s) => sum + s.length, 0) / samples.length;

      if (avgLength > 50) {
        return { role: 'text', confidence: 0.6 };
      }
    }

    // Low cardinality = likely dimension
    if (uniqueRatio < 0.1) {
      return { role: 'dimension', confidence: 0.7 };
    }

    // Medium cardinality - check for identifier patterns
    if (uniqueRatio > 0.9) {
      return { role: 'identifier', confidence: 0.5 };
    }

    return { role: 'dimension', confidence: 0.5 };
  }

  return { role: 'unknown', confidence: 0.0 };
}

// ============================================================================
// Column Profiler
// ============================================================================

/**
 * Compute statistics for a column
 */
export function profileColumn(
  name: string,
  dataType: string,
  samples: unknown[]
): ColumnStats {
  const validSamples = samples.filter(s => s !== null && s !== undefined);
  const nullCount = samples.length - validSamples.length;

  const stats: ColumnStats = {
    distinctCount: new Set(validSamples.map(v => String(v))).size,
    nullRate: samples.length > 0 ? nullCount / samples.length : 0,
  };

  // Numeric stats
  if (['number', 'integer', 'float', 'decimal', 'bigint', 'numeric', 'real', 'double'].includes(dataType.toLowerCase())) {
    const numbers = validSamples.filter((s): s is number => typeof s === 'number');
    if (numbers.length > 0) {
      stats.min = Math.min(...numbers);
      stats.max = Math.max(...numbers);
      stats.mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;

      // Median
      const sorted = [...numbers].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      stats.median = sorted.length % 2 !== 0
        ? sorted[mid]!
        : (sorted[mid - 1]! + sorted[mid]!) / 2;
    }
  }

  // String stats
  if (['varchar', 'text', 'char', 'string'].includes(dataType.toLowerCase())) {
    const strings = validSamples.filter((s): s is string => typeof s === 'string');
    if (strings.length > 0) {
      stats.avgLength = strings.reduce((sum, s) => sum + s.length, 0) / strings.length;
    }
  }

  // Temporal stats
  if (['date', 'datetime', 'timestamp', 'timestamptz'].includes(dataType.toLowerCase())) {
    const dates = validSamples
      .map(s => new Date(s as string | number))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length > 0) {
      stats.minDate = dates[0]!.toISOString();
      stats.maxDate = dates[dates.length - 1]!.toISOString();
    }
  }

  // Top values
  const valueCounts = new Map<string, number>();
  for (const value of validSamples) {
    const key = String(value);
    valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
  }

  stats.topValues = [...valueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, count]) => ({
      value: tryParseValue(value, dataType),
      count,
    }));

  return stats;
}

/**
 * Try to parse a string value back to its original type
 */
function tryParseValue(value: string, dataType: string): unknown {
  if (['number', 'integer', 'float', 'decimal'].includes(dataType)) {
    const num = parseFloat(value);
    return isNaN(num) ? value : num;
  }
  if (dataType === 'boolean') {
    return value === 'true';
  }
  return value;
}

// ============================================================================
// Relationship Discovery
// ============================================================================

/**
 * Infer relationships between columns across assets
 */
export function inferRelationships(
  columns: DataColumn[],
  assets: DataAsset[]
): Relationship[] {
  const relationships: Relationship[] = [];
  const assetMap = new Map(assets.map(a => [a.id, a]));
  const columnsByAsset = new Map<string, DataColumn[]>();

  // Group columns by asset
  for (const col of columns) {
    const existing = columnsByAsset.get(col.assetId) || [];
    existing.push(col);
    columnsByAsset.set(col.assetId, existing);
  }

  // Find potential foreign keys
  for (const col of columns) {
    if (col.role !== 'foreign_key' && !col.name.endsWith('_id')) {
      continue;
    }

    // Extract table name from column name (e.g., customer_id → customer)
    const match = col.name.match(/^(.+?)_id$/i);
    if (!match) continue;

    const targetName = match[1]!.toLowerCase();

    // Find matching asset
    for (const [assetId, asset] of assetMap) {
      if (assetId === col.assetId) continue;

      const assetName = asset.name.toLowerCase();
      // Match singular/plural forms
      if (
        assetName === targetName ||
        assetName === targetName + 's' ||
        assetName + 's' === targetName ||
        assetName === targetName + 'es' ||
        assetName.replace(/_/g, '') === targetName.replace(/_/g, '')
      ) {
        // Find the primary key in target asset
        const targetColumns = columnsByAsset.get(assetId) || [];
        const targetPK = targetColumns.find(c => c.isPrimaryKey);

        if (targetPK) {
          relationships.push({
            id: `rel_${col.id}_${targetPK.id}`,
            fromColumnId: col.id,
            toColumnId: targetPK.id,
            type: 'many-to-one',
            source: 'inferred_name',
            confidence: 0.8,
          });
        }
      }
    }
  }

  return relationships;
}

// ============================================================================
// Introspection Orchestrator
// ============================================================================

/**
 * Run full introspection on a data source
 */
export async function introspect(
  source: DataSource,
  introspector: Introspector,
  config: IntrospectionConfig = {}
): Promise<IntrospectionResult> {
  const startTime = Date.now();
  const {
    sampleSize = 100,
    computeStats = true,
    inferRelationships: shouldInferRelationships = true,
  } = config;

  const errors: Array<{ asset: string; error: string }> = [];

  // Discover assets
  const assets = await introspector.discoverAssets(source);

  // Get columns for each asset
  const allColumns: DataColumn[] = [];

  for (const asset of assets) {
    try {
      const columns = await introspector.getColumns(source, asset);
      const samples = await introspector.sampleData(source, asset, sampleSize);

      // Enrich columns with profiling
      for (const col of columns) {
        // Extract samples for this column
        const columnSamples = samples.map(row => row[col.name]);
        col.samples = columnSamples.slice(0, 5);

        // Classify role
        const { role, confidence } = classifyColumnRole(
          col.name,
          col.sourceType,
          columnSamples,
          col.isPrimaryKey
        );
        col.role = role;
        col.roleConfidence = confidence;

        // Compute stats
        if (computeStats) {
          col.stats = profileColumn(col.name, col.sourceType, columnSamples);
        }
      }

      allColumns.push(...columns);
    } catch (error) {
      errors.push({
        asset: asset.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Infer relationships
  const relationships = shouldInferRelationships
    ? inferRelationships(allColumns, assets)
    : [];

  return {
    assets,
    columns: allColumns,
    relationships,
    duration: Date.now() - startTime,
    errors: errors.length > 0 ? errors : undefined,
  };
}
