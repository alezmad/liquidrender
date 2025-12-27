#!/usr/bin/env node
/**
 * CLI Interface for Cognitive Context
 *
 * Provides commands for managing cognitive context:
 * - init: Initialize cognitive.config.yaml
 * - extract: Extract entities from source code
 * - validate: Validate context completeness
 * - drift: Check for context drift
 * - sync: Sync context to enabled tools
 * - watch: Watch for changes and auto-sync
 * - status: Show current context status
 * - hook: Manage git pre-commit hook
 */

import { Command } from 'commander';
import { resolve, relative, join } from 'node:path';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';

// Core modules
import { initConfig, loadConfig, loadConfigOrDefault, ConfigNotFoundError } from './config.js';
import { extractEntitiesFromDir, type ExtractOptions } from './extractor.js';
import { validateCapabilitiesFile, formatValidationResult, hasValidationIssues } from './validator.js';
import { detectDrift, formatDriftSummary, hasChanges as hasDriftChanges } from './drift.js';
import { syncAll, loadKnowledge, getSupportedTools } from './sync.js';
import { createWatcher } from './watcher.js';
import { countTokens, formatTokenCount } from './tokens.js';
import { installHook, uninstallHook, runPreCommitCheck, formatPreCommitOutput } from './hooks/pre-commit.js';
import type { KnowledgeGraph, ExtractedEntity } from './types.js';

// ============================================
// Constants
// ============================================

const VERSION = '0.1.0';
const COGNITIVE_DIR = '.cognitive';
const KNOWLEDGE_FILE = 'knowledge.json';
const CAPABILITIES_FILE = 'capabilities.yaml';

// ANSI color codes (inline to avoid external dependency)
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// ============================================
// Output Helpers
// ============================================

function c(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function success(message: string): void {
  console.log(`${c('green', '✓')} ${message}`);
}

function error(message: string): void {
  console.error(`${c('red', '✗')} ${message}`);
}

function warn(message: string): void {
  console.warn(`${c('yellow', '!')} ${message}`);
}

function info(message: string): void {
  console.log(`${c('blue', 'i')} ${message}`);
}

function heading(title: string): void {
  console.log(`\n${c('bold', title)}`);
  console.log(c('dim', '─'.repeat(title.length)));
}

function bullet(text: string, indent: number = 0): void {
  console.log(`${'  '.repeat(indent)}${c('dim', '•')} ${text}`);
}

// ============================================
// Helper Functions
// ============================================

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadSavedGraph(projectRoot: string): Promise<KnowledgeGraph | null> {
  try {
    const graphPath = join(projectRoot, COGNITIVE_DIR, KNOWLEDGE_FILE);
    const content = await readFile(graphPath, 'utf-8');
    return JSON.parse(content) as KnowledgeGraph;
  } catch {
    return null;
  }
}

async function saveGraph(projectRoot: string, graph: KnowledgeGraph): Promise<void> {
  const cognitiveDir = join(projectRoot, COGNITIVE_DIR);
  await mkdir(cognitiveDir, { recursive: true });
  const graphPath = join(cognitiveDir, KNOWLEDGE_FILE);
  await writeFile(graphPath, JSON.stringify(graph, null, 2), 'utf-8');
}

function buildKnowledgeGraph(
  entities: ExtractedEntity[],
  projectRoot: string,
  commit: string = 'unknown'
): KnowledgeGraph {
  const entitiesMap: Record<string, ExtractedEntity> = {};

  for (const entity of entities) {
    // Use path as key for uniqueness
    entitiesMap[entity.path] = entity;
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      fromCommit: commit,
      totalEntities: entities.length,
      projectRoot,
      version: VERSION,
    },
    entities: entitiesMap,
    relationships: [], // Build relationships from imports
  };
}

async function getGitCommit(projectRoot: string): Promise<string> {
  try {
    const { execSync } = await import('node:child_process');
    const commit = execSync('git rev-parse --short HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();
    return commit;
  } catch {
    return 'unknown';
  }
}

// ============================================
// Command Implementations
// ============================================

async function cmdInit(_options: { config?: string; verbose?: boolean }): Promise<void> {
  const projectRoot = process.cwd();

  try {
    // Check if config already exists
    try {
      await loadConfig(projectRoot);
      error('Configuration already exists. Remove existing config to reinitialize.');
      process.exit(1);
    } catch (e) {
      if (!(e instanceof ConfigNotFoundError)) {
        throw e;
      }
    }

    const configPath = await initConfig(projectRoot);
    success(`Created ${c('cyan', relative(projectRoot, configPath))}`);

    // Create .cognitive directory
    const cognitiveDir = join(projectRoot, COGNITIVE_DIR);
    await mkdir(cognitiveDir, { recursive: true });
    success(`Created ${c('cyan', COGNITIVE_DIR + '/')} directory`);

    info('Next steps:');
    bullet('Run `cognitive extract` to scan your codebase');
    bullet('Run `cognitive sync` to generate tool-specific files');

  } catch (err) {
    error(`Failed to initialize: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function cmdExtract(options: { config?: string; verbose?: boolean }): Promise<void> {
  const projectRoot = process.cwd();

  try {
    const config = await loadConfigOrDefault(projectRoot);

    heading('Extracting entities');

    const extractOptions: ExtractOptions = {
      include: config.includePatterns,
      exclude: config.excludePatterns,
    };

    let allEntities: ExtractedEntity[] = [];

    for (const dir of config.sourceDirs) {
      const sourceDir = resolve(projectRoot, dir);
      if (!(await fileExists(sourceDir))) {
        if (options.verbose) {
          warn(`Skipping non-existent directory: ${dir}`);
        }
        continue;
      }

      const entities = await extractEntitiesFromDir(sourceDir, extractOptions);
      if (options.verbose) {
        info(`${dir}: Found ${entities.length} entities`);
      }
      allEntities = allEntities.concat(entities);
    }

    if (allEntities.length === 0) {
      warn('No entities found. Check your sourceDirs and patterns in config.');
      return;
    }

    // Build and save knowledge graph
    const commit = await getGitCommit(projectRoot);
    const graph = buildKnowledgeGraph(allEntities, projectRoot, commit);
    await saveGraph(projectRoot, graph);

    // Summary by type
    const byType = new Map<string, number>();
    for (const entity of allEntities) {
      byType.set(entity.type, (byType.get(entity.type) || 0) + 1);
    }

    success(`Extracted ${c('bold', String(allEntities.length))} entities`);

    for (const [type, count] of byType) {
      bullet(`${type}: ${count}`, 1);
    }

    info(`Knowledge graph saved to ${c('cyan', COGNITIVE_DIR + '/' + KNOWLEDGE_FILE)}`);

  } catch (err) {
    error(`Extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function cmdValidate(_options: { config?: string; verbose?: boolean }): Promise<void> {
  const projectRoot = process.cwd();

  try {
    const savedGraph = await loadSavedGraph(projectRoot);

    if (!savedGraph) {
      warn('No knowledge graph found. Run `cognitive extract` first.');
      process.exit(1);
    }

    heading('Validating context completeness');

    const capabilitiesPath = join(projectRoot, COGNITIVE_DIR, CAPABILITIES_FILE);

    if (!(await fileExists(capabilitiesPath))) {
      warn(`No ${CAPABILITIES_FILE} found. Create one to validate against.`);
      info('Tip: Define your project capabilities in .cognitive/capabilities.yaml');
      return;
    }

    const result = await validateCapabilitiesFile(capabilitiesPath, savedGraph);

    console.log('');
    console.log(formatValidationResult(result));

    if (hasValidationIssues(result)) {
      process.exit(1);
    }

    success('Validation passed!');

  } catch (err) {
    error(`Validation failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function cmdDrift(_options: { config?: string; verbose?: boolean }): Promise<void> {
  const projectRoot = process.cwd();

  try {
    const config = await loadConfigOrDefault(projectRoot);
    const savedGraph = await loadSavedGraph(projectRoot);

    if (!savedGraph) {
      info('No previous knowledge graph found. Run `cognitive extract` to create one.');
      return;
    }

    heading('Checking for drift');

    // Re-extract current state
    const extractOptions: ExtractOptions = {
      include: config.includePatterns,
      exclude: config.excludePatterns,
    };

    let currentEntities: ExtractedEntity[] = [];

    for (const dir of config.sourceDirs) {
      const sourceDir = resolve(projectRoot, dir);
      if (await fileExists(sourceDir)) {
        const entities = await extractEntitiesFromDir(sourceDir, extractOptions);
        currentEntities = currentEntities.concat(entities);
      }
    }

    const commit = await getGitCommit(projectRoot);
    const currentGraph = buildKnowledgeGraph(currentEntities, projectRoot, commit);

    const report = detectDrift(currentGraph, savedGraph);

    console.log('');
    console.log(formatDriftSummary(report));

    if (hasDriftChanges(report)) {
      warn('Drift detected! Consider running `cognitive extract && cognitive sync`');
      process.exit(1);
    }

    success('No significant drift detected.');

  } catch (err) {
    error(`Drift check failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function cmdSync(options: { config?: string; verbose?: boolean; dryRun?: boolean }): Promise<void> {
  const projectRoot = process.cwd();

  try {
    const config = await loadConfigOrDefault(projectRoot);

    heading('Syncing to tools');

    const enabledTools = config.tools.filter((t) => t.enabled);

    if (enabledTools.length === 0) {
      warn('No tools enabled. Enable tools in your cognitive.config.yaml');
      info(`Supported tools: ${getSupportedTools().join(', ')}`);
      return;
    }

    info(`Enabled tools: ${enabledTools.map((t) => t.name).join(', ')}`);

    if (options.dryRun) {
      info(c('yellow', 'Dry run mode - no files will be written'));
    }

    const toolConfigs = config.tools.map((t) => ({
      name: t.name,
      enabled: t.enabled,
      outputPath: t.outputPath ?? '',
    }));

    const report = await syncAll(projectRoot, toolConfigs, {
      dryRun: options.dryRun,
      verbose: options.verbose,
    });

    console.log('');

    for (const result of report.results) {
      if (result.success) {
        if (result.filesWritten.length > 0 || result.filesDeleted.length > 0) {
          success(`${result.tool}: ${result.filesWritten.length} written, ${result.filesDeleted.length} deleted`);
          if (options.verbose) {
            for (const file of result.filesWritten) {
              bullet(c('green', '+') + ' ' + relative(projectRoot, file), 1);
            }
            for (const file of result.filesDeleted) {
              bullet(c('red', '-') + ' ' + relative(projectRoot, file), 1);
            }
          }
        } else {
          info(`${result.tool}: No changes needed`);
        }
      } else {
        error(`${result.tool}: ${result.error}`);
      }
    }

    console.log('');

    if (report.allSuccessful) {
      success(`Sync complete: ${report.totalFilesWritten} files written, ${report.totalFilesDeleted} deleted`);
    } else {
      warn('Sync completed with errors');
      process.exit(1);
    }

  } catch (err) {
    error(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function cmdWatch(options: { config?: string; verbose?: boolean }): Promise<void> {
  const projectRoot = process.cwd();

  try {
    const config = await loadConfigOrDefault(projectRoot);

    heading('Watch mode');

    const sourceDirs = config.sourceDirs.map((d) => resolve(projectRoot, d));

    info(`Watching: ${config.sourceDirs.join(', ')}`);
    info('Press Ctrl+C to stop');
    console.log('');

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingChanges = new Set<string>();

    const handleSync = async () => {
      if (pendingChanges.size === 0) return;

      const changes = Array.from(pendingChanges);
      pendingChanges.clear();

      info(`Changes detected: ${changes.length} file(s)`);

      // Re-extract and sync
      const extractOptions: ExtractOptions = {
        include: config.includePatterns,
        exclude: config.excludePatterns,
      };

      let allEntities: ExtractedEntity[] = [];
      for (const dir of sourceDirs) {
        if (await fileExists(dir)) {
          const entities = await extractEntitiesFromDir(dir, extractOptions);
          allEntities = allEntities.concat(entities);
        }
      }

      const commit = await getGitCommit(projectRoot);
      const graph = buildKnowledgeGraph(allEntities, projectRoot, commit);
      await saveGraph(projectRoot, graph);

      const toolConfigs = config.tools.map((t) => ({
        name: t.name,
        enabled: t.enabled,
        outputPath: t.outputPath ?? '',
      }));

      const report = await syncAll(projectRoot, toolConfigs, { verbose: options.verbose });

      if (report.allSuccessful && report.totalFilesWritten > 0) {
        success(`Synced ${report.totalFilesWritten} files`);
      }
    };

    const watcher = createWatcher(
      sourceDirs,
      {
        enabled: true,
        debounceMs: config.watch.debounceMs,
        ignorePaths: config.watch.ignorePaths,
      },
      {
        onFileChange: (event) => {
          pendingChanges.add(event.path);

          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          debounceTimer = setTimeout(() => {
            handleSync().catch((err) => {
              error(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
            });
          }, config.watch.debounceMs);
        },
        onError: (err) => {
          error(`Watch error: ${err.message}`);
        },
      }
    );

    watcher.start();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('');
      info('Stopping watch mode...');
      watcher.stop();
      process.exit(0);
    });

    // Keep the process running
    await new Promise(() => {});

  } catch (err) {
    error(`Watch failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function cmdStatus(_options: { config?: string; verbose?: boolean }): Promise<void> {
  const projectRoot = process.cwd();

  try {
    heading('Cognitive Context Status');

    // Check for config
    let hasConfig = false;
    try {
      await loadConfig(projectRoot);
      hasConfig = true;
      success('Configuration: Found');
    } catch (e) {
      if (e instanceof ConfigNotFoundError) {
        warn('Configuration: Not found (run `cognitive init`)');
      } else {
        throw e;
      }
    }

    // Check for knowledge graph
    const savedGraph = await loadSavedGraph(projectRoot);
    if (savedGraph) {
      success(`Knowledge graph: ${savedGraph.meta.totalEntities} entities`);
      bullet(`Generated: ${new Date(savedGraph.meta.generatedAt).toLocaleString()}`, 1);
      bullet(`Commit: ${savedGraph.meta.fromCommit}`, 1);
    } else {
      warn('Knowledge graph: Not found (run `cognitive extract`)');
    }

    // Check for .cognitive directory
    const cognitiveDir = join(projectRoot, COGNITIVE_DIR);
    if (await fileExists(cognitiveDir)) {
      success(`.cognitive/ directory: Found`);
    } else {
      warn(`.cognitive/ directory: Not found`);
    }

    // Check for knowledge files
    const knowledge = await loadKnowledge(projectRoot);

    console.log('');
    info('Knowledge files:');

    if (knowledge.summary) {
      const tokens = countTokens(knowledge.summary);
      bullet(`SUMMARY.md: ${formatTokenCount(tokens)} tokens`, 1);
    } else {
      bullet(c('dim', 'SUMMARY.md: Not found'), 1);
    }

    if (Object.keys(knowledge.capabilities).length > 0) {
      bullet(`capabilities.yaml: ${Object.keys(knowledge.capabilities).length} top-level keys`, 1);
    } else {
      bullet(c('dim', 'capabilities.yaml: Not found'), 1);
    }

    if (knowledge.wisdom.size > 0) {
      bullet(`Wisdom files: ${knowledge.wisdom.size}`, 1);
    }

    if (knowledge.commands.size > 0) {
      bullet(`Commands: ${knowledge.commands.size}`, 1);
    }

    // Show enabled tools
    if (hasConfig) {
      const config = await loadConfigOrDefault(projectRoot);
      const enabledTools = config.tools.filter((t) => t.enabled).map((t) => t.name);

      console.log('');
      info(`Enabled tools: ${enabledTools.length > 0 ? enabledTools.join(', ') : 'None'}`);
    }

    console.log('');

  } catch (err) {
    error(`Status check failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function cmdHook(action: string, _options: { config?: string; verbose?: boolean }): Promise<void> {
  const projectRoot = process.cwd();

  try {
    switch (action) {
      case 'install':
        await installHook(projectRoot);
        success('Pre-commit hook installed');
        info('Hook will run `cognitive pre-commit` before each commit');
        break;

      case 'uninstall':
        await uninstallHook(projectRoot);
        success('Pre-commit hook uninstalled');
        break;

      default:
        error(`Unknown action: ${action}. Use 'install' or 'uninstall'`);
        process.exit(1);
    }
  } catch (err) {
    error(`Hook ${action} failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function cmdPreCommit(options: { config?: string; verbose?: boolean; block?: boolean }): Promise<void> {
  const projectRoot = process.cwd();

  try {
    const result = await runPreCommitCheck(projectRoot, {
      blockOnStale: options.block,
      verbose: options.verbose,
    });

    console.log(formatPreCommitOutput(result));

    if (!result.passed) {
      process.exit(1);
    }
  } catch (err) {
    error(`Pre-commit check failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// ============================================
// Program Factory
// ============================================

export function createProgram(): Command {
  const program = new Command();

  program
    .name('cognitive')
    .description('Cognitive Context System - AI coding assistant context management')
    .version(VERSION)
    .option('-c, --config <path>', 'Path to config file')
    .option('-v, --verbose', 'Enable verbose output');

  program
    .command('init')
    .description('Initialize cognitive.config.yaml in project')
    .action(async () => {
      const opts = program.opts();
      await cmdInit(opts);
    });

  program
    .command('extract')
    .description('Extract entities from source code')
    .action(async () => {
      const opts = program.opts();
      await cmdExtract(opts);
    });

  program
    .command('validate')
    .description('Validate context completeness')
    .action(async () => {
      const opts = program.opts();
      await cmdValidate(opts);
    });

  program
    .command('drift')
    .description('Check for context drift')
    .action(async () => {
      const opts = program.opts();
      await cmdDrift(opts);
    });

  program
    .command('sync')
    .description('Sync context to enabled tools')
    .option('-n, --dry-run', 'Show what would be done without making changes')
    .action(async (cmdOpts) => {
      const opts = { ...program.opts(), ...cmdOpts };
      await cmdSync(opts);
    });

  program
    .command('watch')
    .description('Watch for changes and auto-sync')
    .action(async () => {
      const opts = program.opts();
      await cmdWatch(opts);
    });

  program
    .command('status')
    .description('Show current context status')
    .action(async () => {
      const opts = program.opts();
      await cmdStatus(opts);
    });

  program
    .command('hook <action>')
    .description('Manage git pre-commit hook (install/uninstall)')
    .action(async (action) => {
      const opts = program.opts();
      await cmdHook(action, opts);
    });

  // Hidden command for pre-commit hook
  program
    .command('pre-commit', { hidden: true })
    .description('Run pre-commit validation (used by git hook)')
    .option('-b, --block', 'Block commit if context is stale')
    .action(async (cmdOpts) => {
      const opts = { ...program.opts(), ...cmdOpts };
      await cmdPreCommit(opts);
    });

  return program;
}

// ============================================
// Main Entry Point
// ============================================

export async function run(): Promise<void> {
  const program = createProgram();
  await program.parseAsync(process.argv);
}

// Note: Direct execution is handled by bin/cognitive.js
// This module exports run() and createProgram() for programmatic use
