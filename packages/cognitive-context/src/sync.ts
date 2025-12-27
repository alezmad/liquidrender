/**
 * Multi-tool Sync Engine
 *
 * Synchronizes cognitive knowledge (.cognitive/) to tool-specific formats:
 * - Cursor: .cursor/rules/*.mdc
 * - Claude Code: CLAUDE.md + .claude/commands/
 * - Continue: .continue/config.json
 * - Aider: .aider.conf.yml
 * - Copilot: .github/copilot-instructions.md
 * - Windsurf: .windsurfrules
 */

import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { ToolConfig, SyncResult, SyncReport } from './types.js';
import type { CognitiveConfigOutput } from './config.schema.js';

// ============================================
// Types
// ============================================

/**
 * Options for the sync operation
 */
export interface SyncOptions {
  /** If true, don't write files - just report what would happen */
  dryRun?: boolean;
  /** If true, overwrite existing files even if unchanged */
  force?: boolean;
  /** If true, enable verbose logging */
  verbose?: boolean;
}

/**
 * Knowledge data extracted from .cognitive/ directory
 */
export interface KnowledgeData {
  /** Content from SUMMARY.md */
  summary: string;
  /** Parsed capabilities.yaml content */
  capabilities: Record<string, unknown>;
  /** Parsed rules.yaml content */
  rules: Record<string, unknown>;
  /** Map of wisdom file name to content (from cache/answers/*.md) */
  wisdom: Map<string, string>;
  /** Map of command name to content (from commands/*.md) */
  commands: Map<string, string>;
  /** Content from ORIENTATION.md if exists */
  orientation?: string;
  /** Project name extracted from config or package.json */
  projectName: string;
}

/**
 * Tool adapter interface - each supported tool implements this
 */
interface ToolAdapter {
  /** Tool identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Sync knowledge to tool-specific format */
  sync(
    projectRoot: string,
    config: ToolConfig,
    knowledge: KnowledgeData,
    options: SyncOptions
  ): Promise<SyncResult>;
}

// ============================================
// Constants
// ============================================

const COGNITIVE_DIR = '.cognitive';
const SUMMARY_FILE = 'SUMMARY.md';
const CAPABILITIES_FILE = 'capabilities.yaml';
const RULES_FILE = 'rules.yaml';
const WISDOM_DIR = 'cache/answers';
const COMMANDS_DIR = 'commands';
const ORIENTATION_FILE = 'ORIENTATION.md';

// Default output paths for each tool
const DEFAULT_OUTPUT_PATHS: Record<string, string> = {
  cursor: '.cursor/rules',
  claude: '.', // CLAUDE.md at root, commands in .claude/commands
  continue: '.continue',
  aider: '.', // .aider.conf.yml at root
  copilot: '.github',
  windsurf: '.', // .windsurfrules at root
};

// ============================================
// Utility Functions
// ============================================

/**
 * Read file content, returning empty string if not found
 */
async function readFileOrEmpty(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Parse YAML file, returning empty object if not found or invalid
 */
async function parseYamlFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const parsed = parseYaml(content);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Ensure directory exists, creating it if necessary
 */
async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Write file with directory creation
 */
async function writeFileWithDir(filePath: string, content: string): Promise<void> {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Read all markdown files from a directory
 */
async function readMarkdownFiles(dirPath: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = join(dirPath, entry.name);
        const content = await readFile(filePath, 'utf-8');
        const name = basename(entry.name, '.md');
        result.set(name, content);
      }
    }
  } catch {
    // Directory doesn't exist - return empty map
  }

  return result;
}

/**
 * List files in a directory
 */
async function listFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Extract first heading from markdown content
 */
function extractFirstHeading(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

/**
 * Extract project name from package.json or fallback
 */
async function getProjectName(projectRoot: string): Promise<string> {
  try {
    const pkgPath = join(projectRoot, 'package.json');
    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content) as { name?: string };
    if (pkg.name) {
      return pkg.name;
    }
  } catch {
    // Ignore errors
  }

  // Fallback to directory name
  return basename(projectRoot);
}

// ============================================
// Knowledge Loader
// ============================================

/**
 * Load knowledge data from .cognitive/ directory
 */
export async function loadKnowledge(projectRoot: string): Promise<KnowledgeData> {
  const cognitiveDir = join(projectRoot, COGNITIVE_DIR);

  // Load all components in parallel
  const [summary, capabilities, rules, wisdom, commands, orientation, projectName] =
    await Promise.all([
      readFileOrEmpty(join(cognitiveDir, SUMMARY_FILE)),
      parseYamlFile(join(cognitiveDir, CAPABILITIES_FILE)),
      parseYamlFile(join(cognitiveDir, RULES_FILE)),
      readMarkdownFiles(join(cognitiveDir, WISDOM_DIR)),
      readMarkdownFiles(join(cognitiveDir, COMMANDS_DIR)),
      readFileOrEmpty(join(cognitiveDir, ORIENTATION_FILE)),
      getProjectName(projectRoot),
    ]);

  return {
    summary: summary.trim(),
    capabilities,
    rules,
    wisdom,
    commands,
    orientation: orientation.trim() || undefined,
    projectName,
  };
}

// ============================================
// Cursor Adapter
// ============================================

/**
 * Generate Cursor .mdc frontmatter
 */
function generateMdcFrontmatter(
  description: string,
  alwaysApply: boolean = false
): string {
  const lines = ['---', `description: ${description}`];
  if (alwaysApply) {
    lines.push('alwaysApply: true');
  }
  lines.push('---', '');
  return lines.join('\n');
}

const cursorAdapter: ToolAdapter = {
  name: 'cursor',
  description: 'Cursor IDE (.cursor/rules/*.mdc)',

  async sync(projectRoot, config, knowledge, options): Promise<SyncResult> {
    const outputPath = config.outputPath || DEFAULT_OUTPUT_PATHS.cursor;
    const rulesDir = join(projectRoot, outputPath);
    const filesWritten: string[] = [];
    const filesDeleted: string[] = [];

    try {
      if (!options.dryRun) {
        await ensureDir(rulesDir);
      }

      // 1. Create orientation.mdc from summary or orientation
      if (knowledge.summary || knowledge.orientation) {
        const orientationContent =
          generateMdcFrontmatter(
            `${knowledge.projectName} - Cognitive orientation and project context`,
            true
          ) + (knowledge.orientation || knowledge.summary);

        const orientationPath = join(rulesDir, 'orientation.mdc');
        if (!options.dryRun) {
          await writeFileWithDir(orientationPath, orientationContent);
        }
        filesWritten.push(orientationPath);
      }

      // 2. Create capabilities.mdc from capabilities
      if (Object.keys(knowledge.capabilities).length > 0) {
        const capabilitiesContent =
          generateMdcFrontmatter(
            `${knowledge.projectName} - Available capabilities and patterns`
          ) +
          '# Capabilities\n\n```yaml\n' +
          stringifyYaml(knowledge.capabilities) +
          '```\n';

        const capabilitiesPath = join(rulesDir, 'capabilities.mdc');
        if (!options.dryRun) {
          await writeFileWithDir(capabilitiesPath, capabilitiesContent);
        }
        filesWritten.push(capabilitiesPath);
      }

      // 3. Create rules.mdc from rules
      if (Object.keys(knowledge.rules).length > 0) {
        const rulesContent =
          generateMdcFrontmatter(
            `${knowledge.projectName} - Project rules and constraints`,
            true
          ) +
          '# Rules\n\n```yaml\n' +
          stringifyYaml(knowledge.rules) +
          '```\n';

        const rulesPath = join(rulesDir, 'rules.mdc');
        if (!options.dryRun) {
          await writeFileWithDir(rulesPath, rulesContent);
        }
        filesWritten.push(rulesPath);
      }

      // 4. Create wisdom-*.mdc files
      const existingWisdomFiles = await listFiles(rulesDir);
      const currentWisdomFiles = new Set<string>();

      for (const [name, content] of knowledge.wisdom) {
        const heading = extractFirstHeading(content);
        const wisdomContent =
          generateMdcFrontmatter(`${heading} - cached patterns and answers`) +
          content;

        const fileName = `wisdom-${name}.mdc`;
        currentWisdomFiles.add(fileName);
        const wisdomPath = join(rulesDir, fileName);

        if (!options.dryRun) {
          await writeFileWithDir(wisdomPath, wisdomContent);
        }
        filesWritten.push(wisdomPath);
      }

      // 5. Delete stale wisdom files
      for (const file of existingWisdomFiles) {
        if (file.startsWith('wisdom-') && file.endsWith('.mdc')) {
          if (!currentWisdomFiles.has(file)) {
            const filePath = join(rulesDir, file);
            if (!options.dryRun) {
              await rm(filePath);
            }
            filesDeleted.push(filePath);
          }
        }
      }

      return {
        tool: 'cursor',
        filesWritten,
        filesDeleted,
        success: true,
      };
    } catch (error) {
      return {
        tool: 'cursor',
        filesWritten,
        filesDeleted,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ============================================
// Claude Code Adapter
// ============================================

const claudeAdapter: ToolAdapter = {
  name: 'claude',
  description: 'Claude Code (CLAUDE.md + .claude/commands/)',

  async sync(projectRoot, _config, knowledge, options): Promise<SyncResult> {
    const filesWritten: string[] = [];
    const filesDeleted: string[] = [];

    try {
      // 1. Create CLAUDE.md at project root
      if (knowledge.summary || knowledge.orientation) {
        const claudeMdContent = [
          `# ${knowledge.projectName}`,
          '',
          knowledge.orientation || knowledge.summary,
          '',
        ];

        // Add capabilities section
        if (Object.keys(knowledge.capabilities).length > 0) {
          claudeMdContent.push(
            '## Capabilities',
            '',
            '```yaml',
            stringifyYaml(knowledge.capabilities).trim(),
            '```',
            ''
          );
        }

        // Add rules section
        if (Object.keys(knowledge.rules).length > 0) {
          claudeMdContent.push(
            '## Rules',
            '',
            '```yaml',
            stringifyYaml(knowledge.rules).trim(),
            '```',
            ''
          );
        }

        // Add wisdom references
        if (knowledge.wisdom.size > 0) {
          claudeMdContent.push(
            '## Wisdom',
            '',
            'Cached patterns and answers:',
            ''
          );
          for (const [name, content] of knowledge.wisdom) {
            const heading = extractFirstHeading(content);
            claudeMdContent.push(`- **${name}**: ${heading}`);
          }
          claudeMdContent.push('');
        }

        const claudeMdPath = join(projectRoot, 'CLAUDE.md');
        if (!options.dryRun) {
          await writeFileWithDir(claudeMdPath, claudeMdContent.join('\n'));
        }
        filesWritten.push(claudeMdPath);
      }

      // 2. Create .claude/commands/ from commands
      const commandsDir = join(projectRoot, '.claude', 'commands');
      const existingCommands = await listFiles(commandsDir);
      const currentCommands = new Set<string>();

      for (const [name, content] of knowledge.commands) {
        const fileName = `${name}.md`;
        currentCommands.add(fileName);
        const commandPath = join(commandsDir, fileName);

        if (!options.dryRun) {
          await writeFileWithDir(commandPath, content);
        }
        filesWritten.push(commandPath);
      }

      // 3. Delete stale command files
      for (const file of existingCommands) {
        if (file.endsWith('.md') && !currentCommands.has(file)) {
          const filePath = join(commandsDir, file);
          if (!options.dryRun) {
            await rm(filePath);
          }
          filesDeleted.push(filePath);
        }
      }

      return {
        tool: 'claude',
        filesWritten,
        filesDeleted,
        success: true,
      };
    } catch (error) {
      return {
        tool: 'claude',
        filesWritten,
        filesDeleted,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ============================================
// Continue Adapter
// ============================================

interface ContinueConfig {
  systemMessage?: string;
  customCommands?: Array<{
    name: string;
    description: string;
    prompt: string;
  }>;
  docs?: Array<{
    name: string;
    startUrl: string;
  }>;
}

const continueAdapter: ToolAdapter = {
  name: 'continue',
  description: 'Continue (.continue/config.json)',

  async sync(projectRoot, config, knowledge, options): Promise<SyncResult> {
    const outputPath = config.outputPath || DEFAULT_OUTPUT_PATHS.continue;
    const continueDir = join(projectRoot, outputPath);
    const configPath = join(continueDir, 'config.json');
    const filesWritten: string[] = [];
    const filesDeleted: string[] = [];

    try {
      // Load existing config if present
      let existingConfig: ContinueConfig = {};
      try {
        const existing = await readFile(configPath, 'utf-8');
        existingConfig = JSON.parse(existing) as ContinueConfig;
      } catch {
        // No existing config
      }

      // Build new config
      const newConfig: ContinueConfig = {
        ...existingConfig,
      };

      // Set system message from summary/orientation
      if (knowledge.summary || knowledge.orientation) {
        const systemParts: string[] = [
          `You are helping with the ${knowledge.projectName} project.`,
          '',
          knowledge.orientation || knowledge.summary,
        ];

        // Add rules to system message
        if (Object.keys(knowledge.rules).length > 0) {
          systemParts.push(
            '',
            'Project Rules:',
            stringifyYaml(knowledge.rules).trim()
          );
        }

        newConfig.systemMessage = systemParts.join('\n');
      }

      // Convert commands to Continue custom commands
      if (knowledge.commands.size > 0) {
        newConfig.customCommands = [];
        for (const [name, content] of knowledge.commands) {
          const heading = extractFirstHeading(content);
          newConfig.customCommands.push({
            name,
            description: heading,
            prompt: content,
          });
        }
      }

      // Write config
      if (!options.dryRun) {
        await writeFileWithDir(configPath, JSON.stringify(newConfig, null, 2) + '\n');
      }
      filesWritten.push(configPath);

      return {
        tool: 'continue',
        filesWritten,
        filesDeleted,
        success: true,
      };
    } catch (error) {
      return {
        tool: 'continue',
        filesWritten,
        filesDeleted,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ============================================
// Aider Adapter
// ============================================

const aiderAdapter: ToolAdapter = {
  name: 'aider',
  description: 'Aider (.aider.conf.yml)',

  async sync(projectRoot, _config, knowledge, options): Promise<SyncResult> {
    const configPath = join(projectRoot, '.aider.conf.yml');
    const filesWritten: string[] = [];
    const filesDeleted: string[] = [];

    try {
      // Load existing config if present
      let existingConfig: Record<string, unknown> = {};
      try {
        existingConfig = await parseYamlFile(configPath);
      } catch {
        // No existing config
      }

      // Build system prompt from knowledge
      const systemParts: string[] = [];

      if (knowledge.orientation || knowledge.summary) {
        systemParts.push(
          `# ${knowledge.projectName}`,
          '',
          knowledge.orientation || knowledge.summary
        );
      }

      if (Object.keys(knowledge.rules).length > 0) {
        systemParts.push('', '## Rules', '', stringifyYaml(knowledge.rules).trim());
      }

      // Merge with existing config
      const newConfig: Record<string, unknown> = {
        ...existingConfig,
      };

      if (systemParts.length > 0) {
        // Aider uses 'read' for context files or we can add custom prompts
        // Using the convention of adding project context
        newConfig['system-prompt'] = systemParts.join('\n');
      }

      // Write config
      if (!options.dryRun) {
        const content = stringifyYaml(newConfig);
        await writeFileWithDir(configPath, content);
      }
      filesWritten.push(configPath);

      return {
        tool: 'aider',
        filesWritten,
        filesDeleted,
        success: true,
      };
    } catch (error) {
      return {
        tool: 'aider',
        filesWritten,
        filesDeleted,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ============================================
// Copilot Adapter
// ============================================

const copilotAdapter: ToolAdapter = {
  name: 'copilot',
  description: 'GitHub Copilot (.github/copilot-instructions.md)',

  async sync(projectRoot, config, knowledge, options): Promise<SyncResult> {
    const outputPath = config.outputPath || DEFAULT_OUTPUT_PATHS.copilot;
    const githubDir = join(projectRoot, outputPath);
    const instructionsPath = join(githubDir, 'copilot-instructions.md');
    const filesWritten: string[] = [];
    const filesDeleted: string[] = [];

    try {
      // Build instructions document
      const sections: string[] = [];

      sections.push(`# ${knowledge.projectName} - Copilot Instructions`, '');

      if (knowledge.orientation || knowledge.summary) {
        sections.push(
          '## Project Overview',
          '',
          knowledge.orientation || knowledge.summary,
          ''
        );
      }

      if (Object.keys(knowledge.capabilities).length > 0) {
        sections.push(
          '## Capabilities',
          '',
          '```yaml',
          stringifyYaml(knowledge.capabilities).trim(),
          '```',
          ''
        );
      }

      if (Object.keys(knowledge.rules).length > 0) {
        sections.push(
          '## Rules',
          '',
          'Follow these rules when generating code:',
          '',
          '```yaml',
          stringifyYaml(knowledge.rules).trim(),
          '```',
          ''
        );
      }

      // Add wisdom as reference sections
      if (knowledge.wisdom.size > 0) {
        sections.push('## Patterns and Best Practices', '');

        for (const [, content] of knowledge.wisdom) {
          const heading = extractFirstHeading(content);
          sections.push(`### ${heading}`, '', content, '');
        }
      }

      // Write instructions
      if (sections.length > 2) {
        // More than just header
        if (!options.dryRun) {
          await writeFileWithDir(instructionsPath, sections.join('\n'));
        }
        filesWritten.push(instructionsPath);
      }

      return {
        tool: 'copilot',
        filesWritten,
        filesDeleted,
        success: true,
      };
    } catch (error) {
      return {
        tool: 'copilot',
        filesWritten,
        filesDeleted,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ============================================
// Windsurf Adapter
// ============================================

const windsurfAdapter: ToolAdapter = {
  name: 'windsurf',
  description: 'Windsurf IDE (.windsurfrules)',

  async sync(projectRoot, _config, knowledge, options): Promise<SyncResult> {
    const rulesPath = join(projectRoot, '.windsurfrules');
    const filesWritten: string[] = [];
    const filesDeleted: string[] = [];

    try {
      // Build rules document (similar to Cursor but in single file)
      const sections: string[] = [];

      sections.push(`# ${knowledge.projectName}`, '');

      if (knowledge.orientation || knowledge.summary) {
        sections.push(
          '## Overview',
          '',
          knowledge.orientation || knowledge.summary,
          ''
        );
      }

      if (Object.keys(knowledge.capabilities).length > 0) {
        sections.push(
          '## Capabilities',
          '',
          '```yaml',
          stringifyYaml(knowledge.capabilities).trim(),
          '```',
          ''
        );
      }

      if (Object.keys(knowledge.rules).length > 0) {
        sections.push(
          '## Rules',
          '',
          '```yaml',
          stringifyYaml(knowledge.rules).trim(),
          '```',
          ''
        );
      }

      // Add wisdom sections
      if (knowledge.wisdom.size > 0) {
        sections.push('## Patterns', '');

        for (const [, content] of knowledge.wisdom) {
          const heading = extractFirstHeading(content);
          sections.push(`### ${heading}`, '', content, '');
        }
      }

      // Write rules
      if (sections.length > 2) {
        if (!options.dryRun) {
          await writeFileWithDir(rulesPath, sections.join('\n'));
        }
        filesWritten.push(rulesPath);
      }

      return {
        tool: 'windsurf',
        filesWritten,
        filesDeleted,
        success: true,
      };
    } catch (error) {
      return {
        tool: 'windsurf',
        filesWritten,
        filesDeleted,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ============================================
// Adapter Registry
// ============================================

const adapters: Map<string, ToolAdapter> = new Map([
  ['cursor', cursorAdapter],
  ['claude', claudeAdapter],
  ['continue', continueAdapter],
  ['aider', aiderAdapter],
  ['copilot', copilotAdapter],
  ['windsurf', windsurfAdapter],
]);

// ============================================
// Main Exports
// ============================================

/**
 * Get list of all supported tools
 */
export function getSupportedTools(): string[] {
  return Array.from(adapters.keys());
}

/**
 * Get tool adapter by name
 */
export function getToolAdapter(tool: string): ToolAdapter | undefined {
  return adapters.get(tool);
}

/**
 * Check if a tool is supported
 */
export function isToolSupported(tool: string): boolean {
  return adapters.has(tool);
}

/**
 * Sync knowledge to a single tool
 *
 * @param tool - Tool name to sync to
 * @param projectRoot - Project root directory
 * @param config - Tool configuration
 * @param knowledge - Knowledge data to sync
 * @param options - Sync options
 * @returns Sync result
 */
export async function syncToTool(
  tool: string,
  projectRoot: string,
  config: ToolConfig,
  knowledge: KnowledgeData,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const adapter = adapters.get(tool);

  if (!adapter) {
    return {
      tool,
      filesWritten: [],
      filesDeleted: [],
      success: false,
      error: `Unknown tool: ${tool}. Supported tools: ${getSupportedTools().join(', ')}`,
    };
  }

  if (!config.enabled) {
    return {
      tool,
      filesWritten: [],
      filesDeleted: [],
      success: true, // Not an error, just skipped
    };
  }

  return adapter.sync(projectRoot, config, knowledge, options);
}

/**
 * Sync knowledge to all configured tools
 *
 * @param config - Cognitive configuration
 * @param knowledge - Optional pre-loaded knowledge (will load if not provided)
 * @param options - Sync options
 * @returns Sync report with results for all tools
 */
export async function syncToTools(
  config: CognitiveConfigOutput,
  knowledge?: KnowledgeData,
  options: SyncOptions = {}
): Promise<SyncReport> {
  const projectRoot = config.projectRoot;

  if (!projectRoot) {
    return {
      timestamp: new Date(),
      results: [
        {
          tool: 'all',
          filesWritten: [],
          filesDeleted: [],
          success: false,
          error: 'projectRoot is required in configuration',
        },
      ],
      totalFilesWritten: 0,
      totalFilesDeleted: 0,
      allSuccessful: false,
    };
  }

  // Load knowledge if not provided
  const knowledgeData = knowledge ?? (await loadKnowledge(projectRoot));

  // Check if we have any knowledge to sync
  const hasKnowledge =
    knowledgeData.summary ||
    knowledgeData.orientation ||
    Object.keys(knowledgeData.capabilities).length > 0 ||
    Object.keys(knowledgeData.rules).length > 0 ||
    knowledgeData.wisdom.size > 0 ||
    knowledgeData.commands.size > 0;

  if (!hasKnowledge) {
    return {
      timestamp: new Date(),
      results: [],
      totalFilesWritten: 0,
      totalFilesDeleted: 0,
      allSuccessful: true,
    };
  }

  // Sync to each enabled tool
  const results: SyncResult[] = [];

  for (const toolConfig of config.tools) {
    // Cast to ToolConfig - schema output may have optional outputPath but we handle defaults in adapters
    const result = await syncToTool(
      toolConfig.name,
      projectRoot,
      {
        name: toolConfig.name,
        enabled: toolConfig.enabled,
        outputPath: toolConfig.outputPath ?? '',
      },
      knowledgeData,
      options
    );
    results.push(result);
  }

  // Calculate totals
  const totalFilesWritten = results.reduce(
    (sum, r) => sum + r.filesWritten.length,
    0
  );
  const totalFilesDeleted = results.reduce(
    (sum, r) => sum + r.filesDeleted.length,
    0
  );
  const allSuccessful = results.every((r) => r.success);

  return {
    timestamp: new Date(),
    results,
    totalFilesWritten,
    totalFilesDeleted,
    allSuccessful,
  };
}

/**
 * Sync all tools with automatic knowledge loading
 *
 * Convenience function that loads config and knowledge automatically.
 *
 * @param projectRoot - Project root directory
 * @param options - Sync options
 * @returns Sync report
 */
export async function syncAll(
  projectRoot: string,
  toolConfigs: ToolConfig[],
  options: SyncOptions = {}
): Promise<SyncReport> {
  const knowledge = await loadKnowledge(projectRoot);

  const results: SyncResult[] = [];

  for (const toolConfig of toolConfigs) {
    const result = await syncToTool(
      toolConfig.name,
      projectRoot,
      toolConfig,
      knowledge,
      options
    );
    results.push(result);
  }

  const totalFilesWritten = results.reduce(
    (sum, r) => sum + r.filesWritten.length,
    0
  );
  const totalFilesDeleted = results.reduce(
    (sum, r) => sum + r.filesDeleted.length,
    0
  );
  const allSuccessful = results.every((r) => r.success);

  return {
    timestamp: new Date(),
    results,
    totalFilesWritten,
    totalFilesDeleted,
    allSuccessful,
  };
}

/**
 * Generate a human-readable sync report
 */
export function formatSyncReport(report: SyncReport): string {
  const lines: string[] = [];

  lines.push(`Sync Report - ${report.timestamp.toISOString()}`);
  lines.push('='.repeat(50));
  lines.push('');

  for (const result of report.results) {
    const status = result.success ? 'OK' : 'FAILED';
    lines.push(`${result.tool}: ${status}`);

    if (result.filesWritten.length > 0) {
      lines.push(`  Written: ${result.filesWritten.length} files`);
      for (const file of result.filesWritten) {
        lines.push(`    - ${file}`);
      }
    }

    if (result.filesDeleted.length > 0) {
      lines.push(`  Deleted: ${result.filesDeleted.length} files`);
      for (const file of result.filesDeleted) {
        lines.push(`    - ${file}`);
      }
    }

    if (result.error) {
      lines.push(`  Error: ${result.error}`);
    }

    lines.push('');
  }

  lines.push('-'.repeat(50));
  lines.push(`Total files written: ${report.totalFilesWritten}`);
  lines.push(`Total files deleted: ${report.totalFilesDeleted}`);
  lines.push(`Status: ${report.allSuccessful ? 'SUCCESS' : 'PARTIAL FAILURE'}`);

  return lines.join('\n');
}
