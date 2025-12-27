/**
 * Configuration schema and validation using Zod
 *
 * Defines the structure of cognitive.config.yaml
 */

import { z } from 'zod';

// ============================================
// Tool Configuration Schema
// ============================================

export const toolNameSchema = z.enum([
  'cursor',
  'claude',
  'continue',
  'aider',
  'copilot',
  'windsurf',
]);

export const toolConfigSchema = z.object({
  name: toolNameSchema,
  enabled: z.boolean().default(true),
  outputPath: z.string().optional(),
});

// ============================================
// Token Budget Schema
// ============================================

export const tokenBudgetSchema = z.object({
  /** Maximum tokens for SUMMARY.md (default: 300) */
  summary: z.number().min(100).max(1000).default(300),
  /** Maximum tokens for capabilities.yaml (default: 2000) */
  capabilities: z.number().min(500).max(10000).default(2000),
  /** Maximum tokens per wisdom file (default: 1500) */
  wisdomPerFile: z.number().min(200).max(5000).default(1500),
  /** Total budget across all context files (default: 20000) */
  total: z.number().min(5000).max(100000).default(20000),
});

// ============================================
// Watch Configuration Schema
// ============================================

export const watchConfigSchema = z.object({
  enabled: z.boolean().default(false),
  debounceMs: z.number().min(100).max(5000).default(500),
  ignorePaths: z.array(z.string()).default([
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
  ]),
});

// ============================================
// Main Configuration Schema
// ============================================

export const cognitiveConfigSchema = z.object({
  /** Schema version for migrations */
  version: z.literal('1.0').default('1.0'),

  /** Project root (auto-detected if not specified) */
  projectRoot: z.string().optional(),

  /** Source directories to scan for entities */
  sourceDirs: z.array(z.string()).default([
    'src',
    'app',
    'lib',
    'packages/*/src',
  ]),

  /** Glob patterns for files to include */
  includePatterns: z.array(z.string()).default([
    '**/*.ts',
    '**/*.tsx',
    '**/*.js',
    '**/*.jsx',
  ]),

  /** Glob patterns for files to exclude */
  excludePatterns: z.array(z.string()).default([
    '**/*.test.*',
    '**/*.spec.*',
    '**/*.stories.*',
    '**/__tests__/**',
    '**/__mocks__/**',
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
  ]),

  /** Token budgets for various context files */
  tokenBudget: tokenBudgetSchema.default({}),

  /** Tools to sync context to */
  tools: z.array(toolConfigSchema).default([
    { name: 'cursor', enabled: true },
    { name: 'claude', enabled: true },
  ]),

  /** Watch mode configuration */
  watch: watchConfigSchema.default({}),

  /** Output directory for generated context (default: .cognitive) */
  outputDir: z.string().default('.cognitive'),

  /** Whether to auto-commit context changes */
  autoCommit: z.boolean().default(false),

  /** CI mode - stricter validation, non-zero exit on issues */
  ci: z.boolean().default(false),
});

// ============================================
// Type Exports
// ============================================

export type ToolName = z.infer<typeof toolNameSchema>;
export type ToolConfigInput = z.input<typeof toolConfigSchema>;
export type TokenBudgetInput = z.input<typeof tokenBudgetSchema>;
export type WatchConfigInput = z.input<typeof watchConfigSchema>;
export type CognitiveConfigInput = z.input<typeof cognitiveConfigSchema>;
export type CognitiveConfigOutput = z.output<typeof cognitiveConfigSchema>;

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_CONFIG: CognitiveConfigOutput = cognitiveConfigSchema.parse({});

// ============================================
// Config File Templates
// ============================================

export const CONFIG_FILE_TEMPLATE = `# Cognitive Context Configuration
# https://github.com/your-org/cognitive-context

version: "1.0"

# Directories to scan for entities
sourceDirs:
  - src
  - app
  - lib

# File patterns to include
includePatterns:
  - "**/*.ts"
  - "**/*.tsx"

# Patterns to exclude
excludePatterns:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/node_modules/**"

# Token budgets (prevents context overflow)
tokenBudget:
  summary: 300        # SUMMARY.md max tokens
  capabilities: 2000  # capabilities.yaml max tokens
  wisdomPerFile: 1500 # Per wisdom file
  total: 20000        # Total context budget

# Tools to sync context to
tools:
  - name: cursor
    enabled: true
  - name: claude
    enabled: true

# Watch mode (auto-update on file changes)
watch:
  enabled: false
  debounceMs: 500
`;

// ============================================
// Validation Helpers
// ============================================

export function validateConfig(input: unknown): CognitiveConfigOutput {
  return cognitiveConfigSchema.parse(input);
}

export function validateConfigSafe(input: unknown): {
  success: boolean;
  data?: CognitiveConfigOutput;
  error?: z.ZodError;
} {
  const result = cognitiveConfigSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
