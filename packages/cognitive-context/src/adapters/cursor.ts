/**
 * Cursor Adapter Module
 *
 * Provides a standalone interface for Cursor-specific operations.
 * Generates and manages .mdc files in .cursor/rules/.
 */

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  loadKnowledge,
  syncToTool,
  type SyncOptions,
  type KnowledgeData,
} from '../sync.js';
import type { SyncResult, ToolConfig } from '../types.js';

// ============================================
// Types
// ============================================

/**
 * Options for generating an MDC file
 */
export interface MdcFileOptions {
  /** Description for the frontmatter */
  description: string;
  /** If true, rule always applies to all files */
  alwaysApply?: boolean;
  /** Glob patterns for files this rule applies to (optional) */
  globs?: string[];
}

/**
 * Structure of a generated MDC file
 */
export interface MdcFile {
  /** File name (without path) */
  name: string;
  /** Full MDC content including frontmatter */
  content: string;
  /** Parsed frontmatter */
  frontmatter: MdcFrontmatter;
}

/**
 * MDC frontmatter structure
 */
export interface MdcFrontmatter {
  description: string;
  alwaysApply?: boolean;
  globs?: string[];
}

/**
 * Validation result for rules directory
 */
export interface RulesValidation {
  /** Whether the rules directory exists */
  exists: boolean;
  /** List of .mdc files found */
  files: string[];
  /** List of issues found */
  issues: ValidationIssue[];
  /** Overall validity */
  valid: boolean;
}

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  file: string;
  type: 'missing-frontmatter' | 'invalid-frontmatter' | 'empty-content';
  message: string;
}

// ============================================
// Constants
// ============================================

const DEFAULT_RULES_PATH = '.cursor/rules';

// ============================================
// MDC File Generation
// ============================================

/**
 * Generate MDC frontmatter string
 */
function formatMdcFrontmatter(options: MdcFileOptions): string {
  const lines = ['---', `description: ${options.description}`];

  if (options.alwaysApply) {
    lines.push('alwaysApply: true');
  }

  if (options.globs && options.globs.length > 0) {
    lines.push('globs:');
    for (const glob of options.globs) {
      lines.push(`  - ${glob}`);
    }
  }

  lines.push('---', '');
  return lines.join('\n');
}

/**
 * Generate a single .mdc file content
 *
 * @param name - File name (without .mdc extension)
 * @param content - Markdown content (without frontmatter)
 * @param options - MDC file options
 * @returns Complete MDC file structure
 */
export function generateMdcFile(
  name: string,
  content: string,
  options: MdcFileOptions
): MdcFile {
  const frontmatter = formatMdcFrontmatter(options);
  const fullContent = frontmatter + content;

  return {
    name: name.endsWith('.mdc') ? name : `${name}.mdc`,
    content: fullContent,
    frontmatter: {
      description: options.description,
      alwaysApply: options.alwaysApply,
      globs: options.globs,
    },
  };
}

// ============================================
// Sync Operations
// ============================================

/**
 * Sync cognitive knowledge to .cursor/rules
 *
 * @param projectRoot - Project root directory
 * @param options - Sync options
 * @returns Sync result
 */
export async function syncToRules(
  projectRoot: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const knowledge = await loadKnowledge(projectRoot);

  const toolConfig: ToolConfig = {
    name: 'cursor',
    enabled: true,
    outputPath: DEFAULT_RULES_PATH,
  };

  return syncToTool('cursor', projectRoot, toolConfig, knowledge, options);
}

/**
 * Sync with pre-loaded knowledge data
 *
 * @param projectRoot - Project root directory
 * @param knowledge - Pre-loaded knowledge data
 * @param options - Sync options
 * @returns Sync result
 */
export async function syncToRulesWithKnowledge(
  projectRoot: string,
  knowledge: KnowledgeData,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const toolConfig: ToolConfig = {
    name: 'cursor',
    enabled: true,
    outputPath: DEFAULT_RULES_PATH,
  };

  return syncToTool('cursor', projectRoot, toolConfig, knowledge, options);
}

// ============================================
// Validation
// ============================================

/**
 * Validate the .cursor/rules directory
 *
 * Checks for:
 * - Directory existence
 * - Valid .mdc files with proper frontmatter
 * - Non-empty content
 *
 * @param projectRoot - Project root directory
 * @returns Validation result
 */
export async function validateRules(
  projectRoot: string
): Promise<RulesValidation> {
  const rulesDir = join(projectRoot, DEFAULT_RULES_PATH);
  const issues: ValidationIssue[] = [];
  const files: string[] = [];

  // Check if directory exists
  try {
    const stats = await stat(rulesDir);
    if (!stats.isDirectory()) {
      return {
        exists: false,
        files: [],
        issues: [
          {
            file: rulesDir,
            type: 'missing-frontmatter',
            message: 'Rules path exists but is not a directory',
          },
        ],
        valid: false,
      };
    }
  } catch {
    return {
      exists: false,
      files: [],
      issues: [],
      valid: true, // Not existing is valid (just means no rules yet)
    };
  }

  // List .mdc files
  try {
    const entries = await readdir(rulesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.mdc')) {
        files.push(entry.name);

        // Read and validate file
        const filePath = join(rulesDir, entry.name);
        const { readFile } = await import('node:fs/promises');
        const content = await readFile(filePath, 'utf-8');

        // Check for frontmatter
        if (!content.startsWith('---')) {
          issues.push({
            file: entry.name,
            type: 'missing-frontmatter',
            message: 'File does not start with YAML frontmatter (---)',
          });
          continue;
        }

        // Check for closing frontmatter
        const secondDash = content.indexOf('---', 3);
        if (secondDash === -1) {
          issues.push({
            file: entry.name,
            type: 'invalid-frontmatter',
            message: 'Frontmatter is not properly closed',
          });
          continue;
        }

        // Check for content after frontmatter
        const bodyContent = content.slice(secondDash + 3).trim();
        if (!bodyContent) {
          issues.push({
            file: entry.name,
            type: 'empty-content',
            message: 'File has no content after frontmatter',
          });
        }
      }
    }
  } catch (error) {
    issues.push({
      file: rulesDir,
      type: 'invalid-frontmatter',
      message: `Failed to read rules directory: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return {
    exists: true,
    files,
    issues,
    valid: issues.length === 0,
  };
}

// ============================================
// Re-exports
// ============================================

// Re-export sync types for convenience
export type { SyncOptions, KnowledgeData } from '../sync.js';
export type { SyncResult, ToolConfig } from '../types.js';
