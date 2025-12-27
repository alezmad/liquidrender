/**
 * Drift Detector
 *
 * Detects changes between the current codebase state and a saved knowledge graph.
 * Used to determine when cognitive context needs to be regenerated or synced.
 */

import type {
  KnowledgeGraph,
  DriftReport,
  StalenessLevel,
  ExtractedEntity,
} from './types.js';

// ============================================
// Constants
// ============================================

/** Threshold for fresh classification (percentage of entities changed) */
const FRESH_CHANGE_THRESHOLD = 0.05; // 5%

/** Threshold for stale classification (percentage of entities changed) */
const STALE_CHANGE_THRESHOLD = 0.20; // 20%

/** Hours threshold for fresh classification */
const FRESH_HOURS_THRESHOLD = 24;

/** Days threshold for stale classification */
const STALE_DAYS_THRESHOLD = 7;

// ============================================
// Types
// ============================================

export interface DriftDetectOptions {
  /**
   * Custom threshold for fresh classification (0-1)
   * @default 0.05 (5%)
   */
  freshThreshold?: number;

  /**
   * Custom threshold for stale classification (0-1)
   * @default 0.20 (20%)
   */
  staleThreshold?: number;

  /**
   * Custom hours threshold for fresh time-based classification
   * @default 24
   */
  freshHoursThreshold?: number;

  /**
   * Custom days threshold for stale time-based classification
   * @default 7
   */
  staleDaysThreshold?: number;
}

type EntityChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

// ============================================
// Helper Functions
// ============================================

/**
 * Compare two entities and determine the type of change
 *
 * @param currentEntity - Entity from current graph (null if removed)
 * @param savedEntity - Entity from saved graph (null if added)
 * @returns The type of change detected
 */
function compareEntities(
  currentEntity: ExtractedEntity | null,
  savedEntity: ExtractedEntity | null
): EntityChangeType {
  // Entity was added (exists in current but not in saved)
  if (currentEntity && !savedEntity) {
    return 'added';
  }

  // Entity was removed (exists in saved but not in current)
  if (!currentEntity && savedEntity) {
    return 'removed';
  }

  // Both exist - compare by hash
  if (currentEntity && savedEntity) {
    if (currentEntity.hash !== savedEntity.hash) {
      return 'modified';
    }
    return 'unchanged';
  }

  // Both null - shouldn't happen but handle gracefully
  return 'unchanged';
}

/**
 * Parse a date from various formats (ISO string or Date object)
 *
 * @param dateValue - Date value to parse
 * @returns Parsed Date object
 */
function parseDate(dateValue: string | Date): Date {
  if (dateValue instanceof Date) {
    return dateValue;
  }
  return new Date(dateValue);
}

/**
 * Calculate hours between two dates
 *
 * @param from - Start date
 * @param to - End date
 * @returns Number of hours between dates
 */
function hoursBetween(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Calculate days between two dates
 *
 * @param from - Start date
 * @param to - End date
 * @returns Number of days between dates
 */
function daysBetween(from: Date, to: Date): number {
  return hoursBetween(from, to) / 24;
}

/**
 * Classify staleness based on change percentage and time elapsed
 *
 * @param changePercentage - Percentage of entities that changed (0-1)
 * @param lastSync - Last sync timestamp
 * @param now - Current timestamp
 * @param options - Custom thresholds
 * @returns Staleness classification
 */
function classifyStaleness(
  changePercentage: number,
  lastSync: Date,
  now: Date,
  options: DriftDetectOptions = {}
): StalenessLevel {
  const freshThreshold = options.freshThreshold ?? FRESH_CHANGE_THRESHOLD;
  const staleThreshold = options.staleThreshold ?? STALE_CHANGE_THRESHOLD;
  const freshHours = options.freshHoursThreshold ?? FRESH_HOURS_THRESHOLD;
  const staleDays = options.staleDaysThreshold ?? STALE_DAYS_THRESHOLD;

  const hoursSinceSync = hoursBetween(lastSync, now);
  const daysSinceSync = daysBetween(lastSync, now);

  // Critical: >20% changed OR >7 days since sync
  if (changePercentage > staleThreshold || daysSinceSync > staleDays) {
    return 'critical';
  }

  // Stale: 5-20% changed OR 1-7 days since sync
  if (changePercentage > freshThreshold || hoursSinceSync > freshHours) {
    return 'stale';
  }

  // Fresh: <5% changed AND within 24 hours
  return 'fresh';
}

/**
 * Determine the recommended action based on staleness and changes
 *
 * @param staleness - Staleness classification
 * @param hasChanges - Whether any changes were detected
 * @returns Recommended action
 */
function determineRecommendation(
  staleness: StalenessLevel,
  hasChanges: boolean
): 'none' | 'sync' | 'regenerate' {
  // No changes and fresh - no action needed
  if (!hasChanges && staleness === 'fresh') {
    return 'none';
  }

  // Critical staleness - full regeneration recommended
  if (staleness === 'critical') {
    return 'regenerate';
  }

  // Stale with changes - sync recommended
  if (staleness === 'stale' || hasChanges) {
    return 'sync';
  }

  return 'none';
}

/**
 * Create an entity lookup map from a knowledge graph
 *
 * @param graph - Knowledge graph to process
 * @returns Map of entity key to entity
 */
function createEntityMap(
  graph: KnowledgeGraph | null
): Map<string, ExtractedEntity> {
  const map = new Map<string, ExtractedEntity>();

  if (!graph || !graph.entities) {
    return map;
  }

  // Entities are stored as Record<string, ExtractedEntity>
  for (const [key, entity] of Object.entries(graph.entities)) {
    if (entity) {
      map.set(key, entity);
    }
  }

  return map;
}

/**
 * Get unique file paths from entities
 *
 * @param entities - Set of entity keys
 * @param entityMap - Map of entity key to entity
 * @returns Set of unique file paths
 */
function getUniquePaths(
  entities: Set<string>,
  entityMap: Map<string, ExtractedEntity>
): Set<string> {
  const paths = new Set<string>();

  for (const key of entities) {
    const entity = entityMap.get(key);
    if (entity?.path) {
      paths.add(entity.path);
    }
  }

  return paths;
}

// ============================================
// Main Exports
// ============================================

/**
 * Detect drift between current codebase state and saved knowledge graph
 *
 * Compares entities by hash to identify additions, removals, and modifications.
 * Classifies staleness based on change percentage and time elapsed since last sync.
 *
 * @param currentGraph - Knowledge graph representing current codebase state
 * @param savedGraph - Knowledge graph from last sync (null for first run)
 * @param options - Custom detection thresholds
 * @returns Drift report with changes and recommendations
 *
 * @example
 * ```typescript
 * const current = await buildKnowledgeGraph('./src');
 * const saved = await loadSavedGraph('.cognitive/knowledge.json');
 * const drift = detectDrift(current, saved);
 *
 * if (drift.recommendation === 'regenerate') {
 *   console.log('Major changes detected, regenerating context...');
 * }
 * ```
 */
export function detectDrift(
  currentGraph: KnowledgeGraph | null,
  savedGraph: KnowledgeGraph | null,
  options: DriftDetectOptions = {}
): DriftReport {
  const now = new Date();

  // Handle first run (no saved graph) - treat as fresh
  if (!savedGraph) {
    const currentMap = createEntityMap(currentGraph);
    const entityKeys = Array.from(currentMap.keys());

    return {
      filesChanged: 0,
      entitiesAdded: entityKeys,
      entitiesRemoved: [],
      entitiesModified: [],
      lastSync: now,
      staleness: 'fresh',
      recommendation: entityKeys.length > 0 ? 'sync' : 'none',
    };
  }

  // Handle empty current graph (project cleared)
  if (!currentGraph) {
    const savedMap = createEntityMap(savedGraph);
    const entityKeys = Array.from(savedMap.keys());

    return {
      filesChanged: entityKeys.length > 0 ? savedMap.size : 0,
      entitiesAdded: [],
      entitiesRemoved: entityKeys,
      entitiesModified: [],
      lastSync: parseDate(savedGraph.meta.generatedAt),
      staleness: entityKeys.length > 0 ? 'critical' : 'fresh',
      recommendation: entityKeys.length > 0 ? 'regenerate' : 'none',
    };
  }

  // Create lookup maps for efficient comparison
  const currentMap = createEntityMap(currentGraph);
  const savedMap = createEntityMap(savedGraph);

  // Collect all unique entity keys
  const allKeys = new Set<string>([...currentMap.keys(), ...savedMap.keys()]);

  // Track changes
  const entitiesAdded: string[] = [];
  const entitiesRemoved: string[] = [];
  const entitiesModified: string[] = [];
  const changedEntities = new Set<string>();

  // Compare each entity
  for (const key of allKeys) {
    const currentEntity = currentMap.get(key) ?? null;
    const savedEntity = savedMap.get(key) ?? null;

    const changeType = compareEntities(currentEntity, savedEntity);

    switch (changeType) {
      case 'added':
        entitiesAdded.push(key);
        changedEntities.add(key);
        break;
      case 'removed':
        entitiesRemoved.push(key);
        changedEntities.add(key);
        break;
      case 'modified':
        entitiesModified.push(key);
        changedEntities.add(key);
        break;
      // 'unchanged' - no action needed
    }
  }

  // Calculate unique files changed
  const currentChangedPaths = getUniquePaths(changedEntities, currentMap);
  const savedChangedPaths = getUniquePaths(changedEntities, savedMap);
  const allChangedPaths = new Set([...currentChangedPaths, ...savedChangedPaths]);
  const filesChanged = allChangedPaths.size;

  // Calculate change percentage (based on total entities across both graphs)
  const totalEntities = Math.max(allKeys.size, 1); // Avoid division by zero
  const changePercentage = changedEntities.size / totalEntities;

  // Determine last sync time
  const lastSync = parseDate(savedGraph.meta.generatedAt);

  // Classify staleness
  const staleness = classifyStaleness(changePercentage, lastSync, now, options);

  // Determine recommendation
  const hasChanges = changedEntities.size > 0;
  const recommendation = determineRecommendation(staleness, hasChanges);

  return {
    filesChanged,
    entitiesAdded,
    entitiesRemoved,
    entitiesModified,
    lastSync,
    staleness,
    recommendation,
  };
}

/**
 * Check if a drift report indicates staleness requiring action
 *
 * @param report - Drift report to check
 * @returns True if the report indicates stale or critical staleness
 *
 * @example
 * ```typescript
 * const drift = detectDrift(current, saved);
 * if (isStale(drift)) {
 *   console.log('Context needs updating');
 * }
 * ```
 */
export function isStale(report: DriftReport): boolean {
  return report.staleness !== 'fresh';
}

/**
 * Check if a drift report indicates critical staleness
 *
 * @param report - Drift report to check
 * @returns True if the report indicates critical staleness
 */
export function isCritical(report: DriftReport): boolean {
  return report.staleness === 'critical';
}

/**
 * Check if any changes were detected
 *
 * @param report - Drift report to check
 * @returns True if any entities were added, removed, or modified
 */
export function hasChanges(report: DriftReport): boolean {
  return (
    report.entitiesAdded.length > 0 ||
    report.entitiesRemoved.length > 0 ||
    report.entitiesModified.length > 0
  );
}

/**
 * Get total number of changed entities
 *
 * @param report - Drift report to check
 * @returns Total count of added, removed, and modified entities
 */
export function getTotalChanges(report: DriftReport): number {
  return (
    report.entitiesAdded.length +
    report.entitiesRemoved.length +
    report.entitiesModified.length
  );
}

/**
 * Format a drift report as a human-readable summary
 *
 * @param report - Drift report to format
 * @returns Formatted summary string
 *
 * @example
 * ```typescript
 * const drift = detectDrift(current, saved);
 * console.log(formatDriftSummary(drift));
 * // Output:
 * // Drift Report
 * // ------------
 * // Status: stale
 * // Files changed: 5
 * // Entities added: 2
 * // Entities removed: 1
 * // Entities modified: 3
 * // Last sync: 2024-01-15T10:30:00.000Z
 * // Recommendation: sync
 * ```
 */
export function formatDriftSummary(report: DriftReport): string {
  const lines: string[] = [
    'Drift Report',
    '------------',
    `Status: ${report.staleness}`,
    `Files changed: ${report.filesChanged}`,
    `Entities added: ${report.entitiesAdded.length}`,
    `Entities removed: ${report.entitiesRemoved.length}`,
    `Entities modified: ${report.entitiesModified.length}`,
    `Last sync: ${report.lastSync.toISOString()}`,
    `Recommendation: ${report.recommendation}`,
  ];

  // Add details for non-empty changes
  if (report.entitiesAdded.length > 0 && report.entitiesAdded.length <= 10) {
    lines.push('', 'Added:');
    for (const entity of report.entitiesAdded) {
      lines.push(`  + ${entity}`);
    }
  } else if (report.entitiesAdded.length > 10) {
    lines.push('', `Added: ${report.entitiesAdded.length} entities (showing first 10)`);
    for (const entity of report.entitiesAdded.slice(0, 10)) {
      lines.push(`  + ${entity}`);
    }
    lines.push(`  ... and ${report.entitiesAdded.length - 10} more`);
  }

  if (report.entitiesRemoved.length > 0 && report.entitiesRemoved.length <= 10) {
    lines.push('', 'Removed:');
    for (const entity of report.entitiesRemoved) {
      lines.push(`  - ${entity}`);
    }
  } else if (report.entitiesRemoved.length > 10) {
    lines.push('', `Removed: ${report.entitiesRemoved.length} entities (showing first 10)`);
    for (const entity of report.entitiesRemoved.slice(0, 10)) {
      lines.push(`  - ${entity}`);
    }
    lines.push(`  ... and ${report.entitiesRemoved.length - 10} more`);
  }

  if (report.entitiesModified.length > 0 && report.entitiesModified.length <= 10) {
    lines.push('', 'Modified:');
    for (const entity of report.entitiesModified) {
      lines.push(`  ~ ${entity}`);
    }
  } else if (report.entitiesModified.length > 10) {
    lines.push('', `Modified: ${report.entitiesModified.length} entities (showing first 10)`);
    for (const entity of report.entitiesModified.slice(0, 10)) {
      lines.push(`  ~ ${entity}`);
    }
    lines.push(`  ... and ${report.entitiesModified.length - 10} more`);
  }

  return lines.join('\n');
}

/**
 * Format a drift report as JSON-serializable object
 *
 * @param report - Drift report to format
 * @returns JSON-serializable drift report
 */
export function formatDriftJSON(report: DriftReport): Record<string, unknown> {
  return {
    staleness: report.staleness,
    recommendation: report.recommendation,
    filesChanged: report.filesChanged,
    changes: {
      added: report.entitiesAdded.length,
      removed: report.entitiesRemoved.length,
      modified: report.entitiesModified.length,
      total: getTotalChanges(report),
    },
    entities: {
      added: report.entitiesAdded,
      removed: report.entitiesRemoved,
      modified: report.entitiesModified,
    },
    lastSync: report.lastSync.toISOString(),
  };
}

/**
 * Create an empty drift report (for error cases or initialization)
 *
 * @returns Empty drift report with fresh status
 */
export function createEmptyDriftReport(): DriftReport {
  return {
    filesChanged: 0,
    entitiesAdded: [],
    entitiesRemoved: [],
    entitiesModified: [],
    lastSync: new Date(),
    staleness: 'fresh',
    recommendation: 'none',
  };
}
