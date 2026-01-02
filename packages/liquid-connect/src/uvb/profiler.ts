/**
 * Data Profiling Engine
 *
 * Core profiling logic that orchestrates the three-tier profiling strategy:
 * - Tier 1: Database statistics (instant)
 * - Tier 2: Adaptive sampling (fast)
 * - Tier 3: Detailed profiling (selective)
 *
 * Performance targets:
 * - 40 tables (Knosia DB): < 2 minutes
 * - 22 tables (Pagila): < 1 minute
 * - 150 tables: < 6 minutes
 */

import type {
  ExtractedSchema,
  ProfiledSchema,
  ProfileOptions,
  ProfileResult,
  TableProfile,
  ColumnProfile,
  Table,
  Column,
  NumericProfile,
  TemporalProfile,
  CategoricalProfile,
  TextProfile,
} from './models';
import type { DuckDBUniversalAdapter } from './duckdb-adapter';
import {
  buildTableStatisticsQuery,
  buildColumnStatisticsQuery,
  buildSampleProfilingQuery,
  buildFreshnessQuery,
  buildCardinalityQuery,
  determineAdaptiveSampleRate,
} from './profiler-queries';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OPTIONS: Required<ProfileOptions> = {
  maxSampleRows: 100_000,
  minSampleRate: 0.01,
  enableTier1: true,
  enableTier2: true,
  enableTier3: false,
  maxConcurrentTables: 5,
  includePatterns: [],
  excludePatterns: [],
  timeoutPerTable: 30_000,
  totalTimeout: 300_000,
};

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Profile a database schema with actual data analysis
 *
 * Three-tier approach:
 * 1. Database statistics (instant, all tables)
 * 2. Smart sampling (fast, adaptive rates)
 * 3. Detailed profiling (selective, expensive)
 *
 * @param adapter - DuckDB adapter with PostgreSQL scanner
 * @param schema - Extracted schema from database
 * @param options - Profiling configuration
 * @returns Profiling result with enriched schema and statistics
 */
export async function profileSchema(
  adapter: DuckDBUniversalAdapter,
  schema: ExtractedSchema,
  options?: ProfileOptions
): Promise<ProfileResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  const warnings: Array<{ table: string; message: string }> = [];
  const tableProfiles: Record<string, TableProfile> = {};
  const columnProfiles: Record<string, Record<string, ColumnProfile>> = {};

  let tier1Duration = 0;
  let tier2Duration = 0;
  let tier3Duration = 0;
  let tablesProfiled = 0;
  let tablesSkipped = 0;

  // Filter tables based on include/exclude patterns
  const tablesToProfile = filterTables(schema.tables, opts);

  console.log(`Profiling ${tablesToProfile.length} tables...`);

  // Profile tables with concurrency control
  const results = await profileTablesInParallel(
    adapter,
    tablesToProfile,
    opts,
    (progress) => {
      console.log(
        `Progress: ${progress.completed}/${progress.total} tables (${Math.round(progress.percentage)}%)`
      );
    }
  );

  // Aggregate results
  for (const result of results) {
    if (result.success) {
      tableProfiles[result.tableName] = result.tableProfile;
      columnProfiles[result.tableName] = result.columnProfiles;
      tier1Duration += result.tier1Duration;
      tier2Duration += result.tier2Duration;
      tier3Duration += result.tier3Duration;
      tablesProfiled++;
    } else {
      warnings.push({
        table: result.tableName,
        message: result.error || 'Unknown error',
      });
      tablesSkipped++;
    }
  }

  const totalDuration = Date.now() - startTime;

  const profiledSchema: ProfiledSchema = {
    ...schema,
    tableProfiles,
    columnProfiles,
    profiledAt: new Date().toISOString(),
    profilingDuration: totalDuration,
    samplingStrategy: opts.enableTier2 ? 'adaptive' : 'statistics-only',
  };

  return {
    schema: profiledSchema,
    stats: {
      tablesProfiled,
      tablesSkipped,
      totalDuration,
      tier1Duration,
      tier2Duration,
      tier3Duration,
    },
    warnings,
  };
}

// =============================================================================
// Table Profiling
// =============================================================================

interface TableProfilingResult {
  success: boolean;
  tableName: string;
  tableProfile: TableProfile;
  columnProfiles: Record<string, ColumnProfile>;
  tier1Duration: number;
  tier2Duration: number;
  tier3Duration: number;
  error?: string;
}

/**
 * Profile a single table (all tiers)
 */
async function profileTable(
  adapter: DuckDBUniversalAdapter,
  table: Table,
  options: Required<ProfileOptions>
): Promise<TableProfilingResult> {
  const tableName = table.name;
  let tier1Duration = 0;
  let tier2Duration = 0;
  let tier3Duration = 0;

  try {
    // Tier 1: Database statistics (always enabled)
    const tier1Start = Date.now();
    const stats = await executeTier1(adapter, table);
    tier1Duration = Date.now() - tier1Start;

    // Skip empty tables
    if (stats.rowCountEstimate === 0) {
      return {
        success: true,
        tableName,
        tableProfile: {
          tableName,
          rowCountEstimate: 0,
          tableSizeBytes: stats.tableSizeBytes,
          samplingRate: 0,
          emptyColumnCount: table.columns.length,
          sparseColumnCount: 0,
        },
        columnProfiles: {},
        tier1Duration,
        tier2Duration,
        tier3Duration,
      };
    }

    // Tier 2: Sample-based profiling
    let tier2Results: any = null;
    if (options.enableTier2) {
      const tier2Start = Date.now();
      tier2Results = await executeTier2(adapter, table, stats.rowCountEstimate, options);
      tier2Duration = Date.now() - tier2Start;
    }

    // Tier 3: Detailed profiling (selective)
    let tier3Results: any = null;
    if (options.enableTier3) {
      const tier3Start = Date.now();
      tier3Results = await executeTier3(adapter, table, options);
      tier3Duration = Date.now() - tier3Start;
    }

    // Merge results into TableProfile and ColumnProfiles
    const tableProfile = buildTableProfile(table, stats, tier2Results, tier3Results);
    const columnProfiles = buildColumnProfiles(table, stats, tier2Results, tier3Results);

    return {
      success: true,
      tableName,
      tableProfile,
      columnProfiles,
      tier1Duration,
      tier2Duration,
      tier3Duration,
    };
  } catch (error) {
    return {
      success: false,
      tableName,
      tableProfile: {} as TableProfile,
      columnProfiles: {},
      tier1Duration,
      tier2Duration,
      tier3Duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =============================================================================
// Tier Execution
// =============================================================================

async function executeTier1(
  adapter: DuckDBUniversalAdapter,
  table: Table
): Promise<{
  rowCountEstimate: number;
  tableSizeBytes: number;
  lastVacuum?: Date;
  lastAnalyze?: Date;
}> {
  const queryStr = buildTableStatisticsQuery(table.name, table.schema);
  const result = await adapter.query<any>(queryStr);

  if (!result || result.length === 0) {
    return {
      rowCountEstimate: 0,
      tableSizeBytes: 0,
    };
  }

  return {
    rowCountEstimate: result[0].row_count_estimate,
    tableSizeBytes: result[0].table_size_bytes,
    lastVacuum: result[0].last_vacuum ? new Date(result[0].last_vacuum) : undefined,
    lastAnalyze: result[0].last_analyze ? new Date(result[0].last_analyze) : undefined,
  };
}

async function executeTier2(
  adapter: DuckDBUniversalAdapter,
  table: Table,
  rowCount: number,
  options: Required<ProfileOptions>
): Promise<any> {
  const sampleRate = calculateSampleRate(rowCount);
  const queryStr = buildSampleProfilingQuery(table, sampleRate);

  const result = await adapter.query<any>(queryStr);
  return { sampleRate, results: result };
}

async function executeTier3(
  adapter: DuckDBUniversalAdapter,
  table: Table,
  options: Required<ProfileOptions>
): Promise<any> {
  // Tier 3 is selective - only for "interesting" tables
  // For now, return null (will be implemented later if needed)
  return null;
}

// =============================================================================
// Profile Building
// =============================================================================

function buildTableProfile(
  table: Table,
  tier1: any,
  tier2: any,
  tier3: any
): TableProfile {
  const profile: TableProfile = {
    tableName: table.name,
    rowCountEstimate: tier1.rowCountEstimate,
    tableSizeBytes: tier1.tableSizeBytes,
    lastVacuum: tier1.lastVacuum,
    lastAnalyze: tier1.lastAnalyze,
    samplingRate: tier2?.sampleRate || 0,
    emptyColumnCount: 0,
    sparseColumnCount: 0,
  };

  if (tier2) {
    // Calculate empty/sparse columns from tier 2 results
    const results = tier2.results || [];
    profile.emptyColumnCount = results.filter((r: any) => r.null_percentage === 100).length;
    profile.sparseColumnCount = results.filter((r: any) => r.null_percentage > 50 && r.null_percentage < 100).length;

    // Find latest data timestamp across all temporal columns
    const temporalResults = results.filter((r: any) => r.temporal_max);
    if (temporalResults.length > 0) {
      const timestamps = temporalResults.map((r: any) => new Date(r.temporal_max));
      profile.latestDataAt = new Date(Math.max(...timestamps.map((d: Date) => d.getTime())));

      const earliestTimestamps = temporalResults.map((r: any) => new Date(r.temporal_min));
      profile.earliestDataAt = new Date(Math.min(...earliestTimestamps.map((d: Date) => d.getTime())));

      if (profile.latestDataAt && profile.earliestDataAt) {
        profile.dataSpanDays = Math.floor(
          (profile.latestDataAt.getTime() - profile.earliestDataAt.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }
  }

  return profile;
}

function buildColumnProfiles(
  table: Table,
  tier1: any,
  tier2: any,
  tier3: any
): Record<string, ColumnProfile> {
  const profiles: Record<string, ColumnProfile> = {};

  if (!tier2 || !tier2.results) {
    return profiles;
  }

  for (const result of tier2.results) {
    const column = table.columns.find(c => c.name === result.column_name);
    if (!column) continue;

    const profile: ColumnProfile = {
      columnName: result.column_name,
      dataType: column.dataType,
      nullCount: result.null_count || 0,
      nullPercentage: result.null_percentage || 0,
    };

    // Add type-specific profiles
    if (result.column_type === 'numeric' && result.numeric_min !== null) {
      profile.numeric = {
        min: result.numeric_min,
        max: result.numeric_max,
        mean: result.numeric_avg,
        stdDev: result.numeric_stddev,
      };
    }

    if (result.column_type === 'temporal' && result.temporal_min) {
      const min = new Date(result.temporal_min);
      const max = new Date(result.temporal_max);
      profile.temporal = {
        min,
        max,
        spanDays: Math.floor((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)),
        hasTime: true, // Simplified for now
        uniqueDates: result.cardinality || 0,
      };
    }

    if (result.column_type === 'text' && result.text_min_length !== null) {
      profile.text = {
        minLength: result.text_min_length,
        maxLength: result.text_max_length,
        avgLength: result.text_avg_length,
      };
    }

    // Add categorical profile for low-cardinality columns
    if (result.cardinality && result.cardinality < 1000) {
      profile.categorical = {
        cardinality: result.cardinality,
        topValues: [], // Will be populated by tier 3
        isHighCardinality: result.cardinality > 1000,
        isLowCardinality: result.cardinality < 20,
        possiblyUnique: result.cardinality === tier1.rowCountEstimate,
      };
    }

    profiles[result.column_name] = profile;
  }

  return profiles;
}

// =============================================================================
// Parallel Processing
// =============================================================================

interface ProfilingProgress {
  completed: number;
  total: number;
  percentage: number;
}

/**
 * Profile multiple tables in parallel with concurrency control
 */
async function profileTablesInParallel(
  adapter: DuckDBUniversalAdapter,
  tables: Table[],
  options: Required<ProfileOptions>,
  onProgress?: (progress: ProfilingProgress) => void
): Promise<TableProfilingResult[]> {
  const results: TableProfilingResult[] = [];
  const queue = [...tables];
  const active = new Set<Promise<TableProfilingResult>>();

  let completed = 0;

  while (queue.length > 0 || active.size > 0) {
    // Fill up to maxConcurrent
    while (active.size < options.maxConcurrentTables && queue.length > 0) {
      const table = queue.shift()!;

      const promise = profileTable(adapter, table, options)
        .then((result) => {
          active.delete(promise);
          completed++;

          if (onProgress) {
            onProgress({
              completed,
              total: tables.length,
              percentage: (completed / tables.length) * 100,
            });
          }

          return result;
        })
        .catch((error) => {
          active.delete(promise);
          completed++;

          return {
            success: false,
            tableName: table.name,
            tableProfile: {} as TableProfile,
            columnProfiles: {},
            tier1Duration: 0,
            tier2Duration: 0,
            tier3Duration: 0,
            error: error instanceof Error ? error.message : String(error),
          };
        });

      active.add(promise);
    }

    // Wait for at least one to complete
    if (active.size > 0) {
      const result = await Promise.race(active);
      results.push(result);
    }
  }

  return results;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate adaptive sample rate based on table size
 */
export function calculateSampleRate(estimatedRows: number): number {
  if (estimatedRows === 0) return 0;
  if (estimatedRows < 10_000) return 1.0; // Full scan for small tables
  if (estimatedRows < 100_000) return 0.1; // 10% for medium tables
  if (estimatedRows < 1_000_000) return 0.01; // 1% for large tables
  return 0.001; // 0.1% for huge tables (1M+ rows)
}

/**
 * Filter tables based on include/exclude patterns
 */
function filterTables(
  tables: Table[],
  options: Required<ProfileOptions>
): Table[] {
  return tables.filter((table) => {
    // Check exclude patterns first
    if (options.excludePatterns.length > 0) {
      for (const pattern of options.excludePatterns) {
        if (new RegExp(pattern).test(table.name)) {
          return false;
        }
      }
    }

    // Check include patterns
    if (options.includePatterns.length > 0) {
      for (const pattern of options.includePatterns) {
        if (new RegExp(pattern).test(table.name)) {
          return true;
        }
      }
      return false; // Didn't match any include pattern
    }

    return true; // No patterns specified, include all
  });
}

/**
 * Select columns to profile (skip binary, very long text, etc.)
 */
export function selectColumnsToProfile(table: Table): Column[] {
  return table.columns.filter((column) => {
    const type = column.dataType.toLowerCase();

    // Skip binary/blob columns
    if (type.includes('bytea') || type.includes('blob')) {
      return false;
    }

    // Skip very long text if avg_width is available and > 1000
    if (type.includes('text') && column.charMaxLength && column.charMaxLength > 10_000) {
      return false;
    }

    // Include everything else
    return true;
  });
}
