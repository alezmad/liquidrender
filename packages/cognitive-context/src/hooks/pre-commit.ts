/**
 * Pre-commit Hook for Cognitive Context
 *
 * Validates cognitive context before commits to ensure documentation stays in sync.
 */

import { readFile, writeFile, chmod, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { detectDrift, isStale, isCritical } from '../drift.js';
import { syncAll } from '../sync.js';
import { loadConfigOrDefault } from '../config.js';
import type { KnowledgeGraph, DriftReport } from '../types.js';

// ============================================
// Types
// ============================================

export interface PreCommitOptions {
  blockOnStale?: boolean;  // Block commit if context is stale
  autoSync?: boolean;      // Auto-sync if drift detected
  verbose?: boolean;
}

export interface PreCommitResult {
  passed: boolean;
  driftDetected: boolean;
  filesChanged: number;
  message: string;
  recommendation: string;
}

// ============================================
// Constants
// ============================================

const HOOK_SCRIPT = `#!/bin/sh
# Cognitive Context Pre-commit Hook
npx cognitive pre-commit
exit $?
`;

const COGNITIVE_DIR = '.cognitive';
const KNOWLEDGE_FILE = 'knowledge.json';

// ============================================
// Helpers
// ============================================

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function loadSavedGraph(projectRoot: string): Promise<KnowledgeGraph | null> {
  try {
    const content = await readFile(join(projectRoot, COGNITIVE_DIR, KNOWLEDGE_FILE), 'utf-8');
    return JSON.parse(content) as KnowledgeGraph;
  } catch { return null; }
}

function buildRecommendation(report: DriftReport): string {
  if (report.recommendation === 'regenerate') return 'Run `cognitive extract && cognitive sync`';
  if (report.recommendation === 'sync') return 'Run `cognitive sync` to update tool files';
  return 'No action needed';
}

function buildMessage(report: DriftReport, verbose: boolean): string {
  if (report.staleness === 'fresh' && report.recommendation === 'none') {
    return 'Cognitive context is up to date.';
  }
  const changes = report.entitiesAdded.length + report.entitiesRemoved.length + report.entitiesModified.length;
  const lines = [
    `Cognitive context drift detected:`,
    `  Status: ${report.staleness}`,
    `  Files changed: ${report.filesChanged}`,
    `  Entity changes: ${changes}`,
  ];
  if (verbose) {
    if (report.entitiesAdded.length) lines.push(`  Added: ${report.entitiesAdded.length}`);
    if (report.entitiesRemoved.length) lines.push(`  Removed: ${report.entitiesRemoved.length}`);
    if (report.entitiesModified.length) lines.push(`  Modified: ${report.entitiesModified.length}`);
  }
  return lines.join('\n');
}

// ============================================
// Main Exports
// ============================================

/**
 * Run pre-commit validation check
 */
export async function runPreCommitCheck(
  projectRoot: string,
  options: PreCommitOptions = {}
): Promise<PreCommitResult> {
  const { blockOnStale = false, autoSync = false, verbose = false } = options;

  const savedGraph = await loadSavedGraph(projectRoot);
  if (!savedGraph) {
    return {
      passed: true,
      driftDetected: false,
      filesChanged: 0,
      message: 'No cognitive context found. Run `cognitive extract` to initialize.',
      recommendation: 'Run `cognitive extract && cognitive sync` to set up context',
    };
  }

  const report = detectDrift(savedGraph, savedGraph);
  const driftDetected = isStale(report);
  const criticallyStale = isCritical(report);

  if (autoSync && driftDetected) {
    try {
      const config = await loadConfigOrDefault(projectRoot);
      const toolConfigs = config.tools.map((t) => ({
        name: t.name, enabled: t.enabled, outputPath: t.outputPath ?? '',
      }));
      await syncAll(projectRoot, toolConfigs, { verbose });
    } catch { /* continue with warning */ }
  }

  return {
    passed: !blockOnStale || !driftDetected || (blockOnStale && !criticallyStale),
    driftDetected,
    filesChanged: report.filesChanged,
    message: buildMessage(report, verbose),
    recommendation: buildRecommendation(report),
  };
}

/**
 * Format pre-commit result for console output
 */
export function formatPreCommitOutput(result: PreCommitResult): string {
  const icon = result.passed ? '[OK]' : '[BLOCKED]';
  const lines = [`${icon} Cognitive Context Pre-commit Check`, '', result.message];
  if (result.driftDetected) lines.push('', `Recommendation: ${result.recommendation}`);
  if (!result.passed) {
    lines.push('', 'Commit blocked due to critically stale context.');
    lines.push('Update context or use --no-verify to skip.');
  }
  return lines.join('\n');
}

/**
 * Install the pre-commit hook into .git/hooks
 */
export async function installHook(projectRoot: string): Promise<void> {
  const hookPath = join(projectRoot, '.git', 'hooks', 'pre-commit');

  if (!(await fileExists(join(projectRoot, '.git')))) {
    throw new Error('Not a git repository: .git directory not found');
  }
  if (await fileExists(hookPath)) {
    const content = await readFile(hookPath, 'utf-8');
    if (content.includes('cognitive')) throw new Error('Cognitive hook already installed');
    throw new Error('Pre-commit hook exists. Remove it or add cognitive check manually.');
  }

  await writeFile(hookPath, HOOK_SCRIPT, 'utf-8');
  await chmod(hookPath, 0o755);
}

/**
 * Uninstall the pre-commit hook from .git/hooks
 */
export async function uninstallHook(projectRoot: string): Promise<void> {
  const hookPath = join(projectRoot, '.git', 'hooks', 'pre-commit');
  if (!(await fileExists(hookPath))) return;

  const content = await readFile(hookPath, 'utf-8');
  if (!content.includes('cognitive')) {
    throw new Error('Pre-commit hook was not installed by cognitive-context');
  }
  await rm(hookPath);
}
