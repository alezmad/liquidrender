/**
 * Configuration loader for cognitive-context
 *
 * Handles finding, loading, and validating cognitive.config.yaml files.
 */

import { readFile, writeFile, access, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  validateConfig,
  DEFAULT_CONFIG,
  CONFIG_FILE_TEMPLATE,
  type CognitiveConfigOutput,
} from './config.schema.js';

// ============================================
// Constants
// ============================================

/** Config file names to search for, in priority order */
const CONFIG_FILE_NAMES = [
  'cognitive.config.yaml',
  'cognitive.config.yml',
  '.cognitive/config.yaml',
] as const;

// ============================================
// Error Classes
// ============================================

export class ConfigNotFoundError extends Error {
  constructor(searchPath: string) {
    super(
      `No cognitive config file found. Searched from: ${searchPath}\n` +
        `Create one with: cognitive init\n` +
        `Or create manually: cognitive.config.yaml`
    );
    this.name = 'ConfigNotFoundError';
  }
}

export class ConfigParseError extends Error {
  constructor(filePath: string, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to parse config file: ${filePath}\n${message}`, { cause });
    this.name = 'ConfigParseError';
  }
}

export class ConfigValidationError extends Error {
  constructor(filePath: string, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`Invalid config in: ${filePath}\n${message}`, { cause });
    this.name = 'ConfigValidationError';
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a directory
 */
async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get the filesystem root for the current platform
 */
function getFilesystemRoot(): string {
  return process.platform === 'win32' ? dirname(process.cwd()).split('\\')[0] + '\\' : '/';
}

// ============================================
// Main Functions
// ============================================

/**
 * Find a cognitive config file by walking up the directory tree.
 *
 * Search order in each directory:
 * 1. cognitive.config.yaml
 * 2. cognitive.config.yml
 * 3. .cognitive/config.yaml
 *
 * @param startDir - Directory to start searching from
 * @returns Absolute path to config file, or null if not found
 */
export async function findConfigFile(startDir: string): Promise<string | null> {
  let currentDir = resolve(startDir);
  const root = getFilesystemRoot();

  while (true) {
    // Check each possible config file name
    for (const fileName of CONFIG_FILE_NAMES) {
      const configPath = join(currentDir, fileName);
      if (await fileExists(configPath)) {
        return configPath;
      }
    }

    // Check if we've reached the filesystem root
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir || currentDir === root) {
      return null;
    }

    currentDir = parentDir;
  }
}

/**
 * Load and validate a cognitive config file.
 *
 * @param projectRoot - Optional project root directory. If not provided,
 *                      searches up from current directory.
 * @returns Validated and merged configuration
 * @throws ConfigNotFoundError if no config file is found
 * @throws ConfigParseError if YAML parsing fails
 * @throws ConfigValidationError if config validation fails
 */
export async function loadConfig(projectRoot?: string): Promise<CognitiveConfigOutput> {
  const searchDir = projectRoot ?? process.cwd();
  const resolvedSearchDir = resolve(searchDir);

  // Find the config file
  const configPath = await findConfigFile(resolvedSearchDir);
  if (!configPath) {
    throw new ConfigNotFoundError(resolvedSearchDir);
  }

  // Read and parse the config file
  let rawContent: string;
  try {
    rawContent = await readFile(configPath, 'utf-8');
  } catch (error) {
    throw new ConfigParseError(configPath, error);
  }

  // Parse YAML
  let parsed: unknown;
  try {
    parsed = parseYaml(rawContent);
  } catch (error) {
    throw new ConfigParseError(configPath, error);
  }

  // Handle empty config file (parsed as null) and ensure object type
  const parsedConfig: Record<string, unknown> =
    parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};

  // Merge with defaults and validate
  const configDir = dirname(configPath);
  const mergedInput = {
    ...parsedConfig,
    // Set projectRoot to the directory containing the config file if not specified
    projectRoot:
      parsedConfig.projectRoot !== undefined
        ? resolve(configDir, String(parsedConfig.projectRoot))
        : configDir,
  };

  try {
    const validated = validateConfig(mergedInput);
    return validated;
  } catch (error) {
    throw new ConfigValidationError(configPath, error);
  }
}

/**
 * Initialize a new cognitive config file in the specified directory.
 *
 * @param projectRoot - Directory where to create the config file
 * @returns Absolute path to the created config file
 * @throws Error if the file already exists or cannot be written
 */
export async function initConfig(projectRoot: string): Promise<string> {
  const resolvedRoot = resolve(projectRoot);

  // Verify the directory exists
  if (!(await isDirectory(resolvedRoot))) {
    throw new Error(`Directory does not exist: ${resolvedRoot}`);
  }

  // Check if config already exists
  for (const fileName of CONFIG_FILE_NAMES) {
    const configPath = join(resolvedRoot, fileName);
    if (await fileExists(configPath)) {
      throw new Error(`Config file already exists: ${configPath}`);
    }
  }

  // Create the default config file
  const configPath = join(resolvedRoot, CONFIG_FILE_NAMES[0]);
  await writeFile(configPath, CONFIG_FILE_TEMPLATE, 'utf-8');

  return configPath;
}

/**
 * Load config with defaults if no config file exists.
 * Unlike loadConfig, this does not throw if no config is found.
 *
 * @param projectRoot - Optional project root directory
 * @returns Configuration (loaded or default)
 */
export async function loadConfigOrDefault(projectRoot?: string): Promise<CognitiveConfigOutput> {
  try {
    return await loadConfig(projectRoot);
  } catch (error) {
    if (error instanceof ConfigNotFoundError) {
      // Return defaults with projectRoot set
      const resolvedRoot = resolve(projectRoot ?? process.cwd());
      return {
        ...DEFAULT_CONFIG,
        projectRoot: resolvedRoot,
      };
    }
    throw error;
  }
}
