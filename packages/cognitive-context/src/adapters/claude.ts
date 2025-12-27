/**
 * Claude Code Adapter
 *
 * Standalone interface for Claude Code-specific operations.
 * Generates CLAUDE.md and syncs commands to .claude/commands/.
 */

import { writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { loadKnowledge, type KnowledgeData, type SyncOptions } from '../sync.js';
import type { SyncResult } from '../types.js';

// ============================================
// Types
// ============================================

/** Options for generating CLAUDE.md content */
export interface ClaudeMdOptions {
  includeCapabilities?: boolean;
  includeRules?: boolean;
  includeWisdom?: boolean;
  headerContent?: string;
  footerContent?: string;
}

/** Structure of generated CLAUDE.md */
export interface ClaudeMdStructure {
  projectName: string;
  mainContent: string;
  capabilities?: string;
  rules?: string;
  wisdomRefs?: Array<{ name: string; heading: string }>;
}

/** Options for syncing commands */
export interface SyncCommandsOptions extends SyncOptions {
  deleteStale?: boolean;
}

// ============================================
// Utilities
// ============================================

function extractFirstHeading(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

// ============================================
// CLAUDE.md Generation
// ============================================

/** Generate CLAUDE.md content from knowledge data */
export function generateClaudeMd(
  knowledge: KnowledgeData,
  options: ClaudeMdOptions = {}
): string {
  const {
    includeCapabilities = true,
    includeRules = true,
    includeWisdom = true,
    headerContent,
    footerContent,
  } = options;

  const sections: string[] = [];

  if (headerContent) sections.push(headerContent, '');
  sections.push(`# ${knowledge.projectName}`, '');
  if (knowledge.orientation || knowledge.summary) {
    sections.push(knowledge.orientation || knowledge.summary, '');
  }

  if (includeCapabilities && Object.keys(knowledge.capabilities).length > 0) {
    sections.push('## Capabilities', '', '```yaml', stringifyYaml(knowledge.capabilities).trim(), '```', '');
  }

  if (includeRules && Object.keys(knowledge.rules).length > 0) {
    sections.push('## Rules', '', '```yaml', stringifyYaml(knowledge.rules).trim(), '```', '');
  }

  if (includeWisdom && knowledge.wisdom.size > 0) {
    sections.push('## Wisdom', '', 'Cached patterns and answers:', '');
    for (const [name, content] of knowledge.wisdom) {
      sections.push(`- **${name}**: ${extractFirstHeading(content)}`);
    }
    sections.push('');
  }

  if (footerContent) sections.push(footerContent, '');
  return sections.join('\n');
}

// ============================================
// Commands Sync
// ============================================

/** Sync commands to .claude/commands/ directory */
export async function syncCommands(
  projectRoot: string,
  commands: Map<string, string>,
  options: SyncCommandsOptions = {}
): Promise<SyncResult> {
  const commandsDir = join(projectRoot, '.claude', 'commands');
  const filesWritten: string[] = [];
  const filesDeleted: string[] = [];

  try {
    if (!options.dryRun) await ensureDir(commandsDir);
    const currentCommands = new Set<string>();

    for (const [name, content] of commands) {
      const fileName = `${name}.md`;
      currentCommands.add(fileName);
      const commandPath = join(commandsDir, fileName);
      if (!options.dryRun) {
        await ensureDir(dirname(commandPath));
        await writeFile(commandPath, content, 'utf-8');
      }
      filesWritten.push(commandPath);
    }

    if (options.deleteStale !== false) {
      try {
        const entries = await readdir(commandsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.md') && !currentCommands.has(entry.name)) {
            const filePath = join(commandsDir, entry.name);
            if (!options.dryRun) await rm(filePath);
            filesDeleted.push(filePath);
          }
        }
      } catch { /* Directory doesn't exist */ }
    }

    return { tool: 'claude', filesWritten, filesDeleted, success: true };
  } catch (error) {
    return { tool: 'claude', filesWritten, filesDeleted, success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================
// Full Sync
// ============================================

/** Full sync to Claude Code format (CLAUDE.md + .claude/commands/) */
export async function syncToClaudeCode(
  projectRoot: string,
  options: SyncOptions & ClaudeMdOptions = {}
): Promise<SyncResult> {
  const filesWritten: string[] = [];
  const filesDeleted: string[] = [];

  try {
    const knowledge = await loadKnowledge(projectRoot);

    if (knowledge.summary || knowledge.orientation) {
      const claudeMdPath = join(projectRoot, 'CLAUDE.md');
      if (!options.dryRun) await writeFile(claudeMdPath, generateClaudeMd(knowledge, options), 'utf-8');
      filesWritten.push(claudeMdPath);
    }

    if (knowledge.commands.size > 0) {
      const result = await syncCommands(projectRoot, knowledge.commands, options);
      filesWritten.push(...result.filesWritten);
      filesDeleted.push(...result.filesDeleted);
      if (!result.success) return { tool: 'claude', filesWritten, filesDeleted, success: false, error: result.error };
    }

    return { tool: 'claude', filesWritten, filesDeleted, success: true };
  } catch (error) {
    return { tool: 'claude', filesWritten, filesDeleted, success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================
// Re-exports
// ============================================

export { loadKnowledge, type KnowledgeData, type SyncOptions } from '../sync.js';
export type { SyncResult } from '../types.js';
