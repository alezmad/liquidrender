/**
 * Core type definitions for the Cognitive Context System
 *
 * This file defines all shared types used across the system.
 */

// ============================================
// Entity Extraction Types
// ============================================

export type EntityType =
  | 'component'
  | 'hook'
  | 'utility'
  | 'type'
  | 'interface'
  | 'schema'
  | 'endpoint'
  | 'module';

export interface ExtractedExport {
  name: string;
  kind: 'function' | 'class' | 'const' | 'type' | 'interface' | 'enum';
  isDefault: boolean;
  line: number;
}

export interface ExtractedImport {
  source: string;
  specifiers: string[];
  isRelative: boolean;
}

export interface ExtractedEntity {
  /** Entity name (primary export) */
  name: string;
  /** File path relative to project root */
  path: string;
  /** Entity type classification */
  type: EntityType;
  /** All exports from the file */
  exports: ExtractedExport[];
  /** All imports (for dependency tracking) */
  imports: ExtractedImport[];
  /** Props interface (for components) */
  props?: PropDefinition[];
  /** Last modified timestamp */
  modifiedAt: Date;
  /** File hash for change detection */
  hash: string;
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

// ============================================
// Knowledge Graph Types
// ============================================

export interface KnowledgeGraph {
  meta: KnowledgeMeta;
  entities: Record<string, ExtractedEntity>;
  relationships: EntityRelationship[];
}

export interface KnowledgeMeta {
  generatedAt: string;
  fromCommit: string;
  totalEntities: number;
  projectRoot: string;
  version: string;
}

export interface EntityRelationship {
  from: string;
  to: string;
  type: 'imports' | 'extends' | 'implements' | 'uses';
}

// ============================================
// Validation Types
// ============================================

export interface ValidationResult {
  /** Overall completeness score (0-100) */
  score: number;
  /** Entities in code but not documented */
  missing: string[];
  /** Entities documented but not in code */
  stale: string[];
  /** Warnings (non-blocking) */
  warnings: ValidationWarning[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** Validation timestamp */
  validatedAt: Date;
}

export interface ValidationWarning {
  type: 'low-confidence' | 'outdated' | 'incomplete';
  entity: string;
  message: string;
}

// ============================================
// Drift Detection Types
// ============================================

export type StalenessLevel = 'fresh' | 'stale' | 'critical';

export interface DriftReport {
  /** Number of files changed since last sync */
  filesChanged: number;
  /** New entities detected */
  entitiesAdded: string[];
  /** Entities removed from code */
  entitiesRemoved: string[];
  /** Entities modified */
  entitiesModified: string[];
  /** Last sync timestamp */
  lastSync: Date;
  /** Staleness classification */
  staleness: StalenessLevel;
  /** Recommended action */
  recommendation: 'none' | 'sync' | 'regenerate';
}

// ============================================
// Token Budgeting Types
// ============================================

export interface TokenBudget {
  /** Maximum tokens for SUMMARY.md */
  summary: number;
  /** Maximum tokens for capabilities.yaml */
  capabilities: number;
  /** Maximum tokens per wisdom file */
  wisdomPerFile: number;
  /** Total budget across all files */
  total: number;
}

export interface TokenReport {
  file: string;
  tokens: number;
  budget: number;
  overBudget: boolean;
  percentage: number;
}

// ============================================
// Configuration Types
// ============================================

export interface CognitiveConfig {
  /** Project root directory */
  projectRoot: string;
  /** Source directories to scan */
  sourceDirs: string[];
  /** File patterns to include */
  includePatterns: string[];
  /** Patterns to exclude */
  excludePatterns: string[];
  /** Token budgets */
  tokenBudget: TokenBudget;
  /** Target tools to sync */
  tools: ToolConfig[];
  /** Watch mode settings */
  watch: WatchConfig;
}

export interface ToolConfig {
  name: 'cursor' | 'claude' | 'continue' | 'aider' | 'copilot' | 'windsurf';
  enabled: boolean;
  outputPath: string;
}

export interface WatchConfig {
  enabled: boolean;
  debounceMs: number;
  ignorePaths: string[];
}

// ============================================
// Sync Types
// ============================================

export interface SyncResult {
  tool: string;
  filesWritten: string[];
  filesDeleted: string[];
  success: boolean;
  error?: string;
}

export interface SyncReport {
  timestamp: Date;
  results: SyncResult[];
  totalFilesWritten: number;
  totalFilesDeleted: number;
  allSuccessful: boolean;
}

// ============================================
// CLI Types
// ============================================

export interface CLIContext {
  config: CognitiveConfig;
  projectRoot: string;
  verbose: boolean;
}

export type CLICommand =
  | 'init'
  | 'extract'
  | 'validate'
  | 'sync'
  | 'watch'
  | 'drift'
  | 'status';

// ============================================
// Event Types (for watcher)
// ============================================

export type FileEventType = 'add' | 'change' | 'unlink';

export interface FileEvent {
  type: FileEventType;
  path: string;
  timestamp: Date;
}

export interface WatcherCallbacks {
  onFileChange?: (event: FileEvent) => void;
  onEntityChange?: (entity: ExtractedEntity, changeType: 'added' | 'modified' | 'removed') => void;
  onError?: (error: Error) => void;
}
