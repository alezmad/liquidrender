/**
 * Tests for configuration loader
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  findConfigFile,
  loadConfig,
  initConfig,
  loadConfigOrDefault,
  ConfigNotFoundError,
  ConfigParseError,
  ConfigValidationError,
} from './config.js';
import { DEFAULT_CONFIG } from './config.schema.js';

// ============================================
// Test Fixtures
// ============================================

const VALID_CONFIG = `
version: "1.0"
sourceDirs:
  - src
  - lib
includePatterns:
  - "**/*.ts"
tokenBudget:
  summary: 400
  total: 25000
tools:
  - name: cursor
    enabled: true
`;

const MINIMAL_CONFIG = `
version: "1.0"
`;

const INVALID_YAML = `
version: "1.0"
sourceDirs:
  - src
  invalid yaml here
    - missing colon
`;

const INVALID_CONFIG = `
version: "2.0"
tokenBudget:
  summary: 50
`;

// ============================================
// Test Helpers
// ============================================

async function createTempDir(): Promise<string> {
  const tempDir = join(tmpdir(), `cognitive-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

async function createNestedDirs(base: string, ...paths: string[]): Promise<string> {
  const fullPath = join(base, ...paths);
  await mkdir(fullPath, { recursive: true });
  return fullPath;
}

// ============================================
// Tests
// ============================================

describe('findConfigFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should find cognitive.config.yaml in current directory', async () => {
    const configPath = join(tempDir, 'cognitive.config.yaml');
    await writeFile(configPath, VALID_CONFIG);

    const result = await findConfigFile(tempDir);
    expect(result).toBe(configPath);
  });

  it('should find cognitive.config.yml as fallback', async () => {
    const configPath = join(tempDir, 'cognitive.config.yml');
    await writeFile(configPath, VALID_CONFIG);

    const result = await findConfigFile(tempDir);
    expect(result).toBe(configPath);
  });

  it('should find .cognitive/config.yaml as fallback', async () => {
    const cognitiveDir = join(tempDir, '.cognitive');
    await mkdir(cognitiveDir);
    const configPath = join(cognitiveDir, 'config.yaml');
    await writeFile(configPath, VALID_CONFIG);

    const result = await findConfigFile(tempDir);
    expect(result).toBe(configPath);
  });

  it('should prefer cognitive.config.yaml over alternatives', async () => {
    const yamlPath = join(tempDir, 'cognitive.config.yaml');
    const ymlPath = join(tempDir, 'cognitive.config.yml');
    await writeFile(yamlPath, VALID_CONFIG);
    await writeFile(ymlPath, VALID_CONFIG);

    const result = await findConfigFile(tempDir);
    expect(result).toBe(yamlPath);
  });

  it('should walk up directory tree to find config', async () => {
    const nestedDir = await createNestedDirs(tempDir, 'a', 'b', 'c');
    const configPath = join(tempDir, 'cognitive.config.yaml');
    await writeFile(configPath, VALID_CONFIG);

    const result = await findConfigFile(nestedDir);
    expect(result).toBe(configPath);
  });

  it('should return null when no config exists', async () => {
    const result = await findConfigFile(tempDir);
    expect(result).toBeNull();
  });
});

describe('loadConfig', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should load and validate a valid config', async () => {
    const configPath = join(tempDir, 'cognitive.config.yaml');
    await writeFile(configPath, VALID_CONFIG);

    const config = await loadConfig(tempDir);

    expect(config.version).toBe('1.0');
    expect(config.sourceDirs).toEqual(['src', 'lib']);
    expect(config.includePatterns).toEqual(['**/*.ts']);
    expect(config.tokenBudget.summary).toBe(400);
    expect(config.tokenBudget.total).toBe(25000);
    expect(config.projectRoot).toBe(tempDir);
  });

  it('should apply defaults for missing fields', async () => {
    const configPath = join(tempDir, 'cognitive.config.yaml');
    await writeFile(configPath, MINIMAL_CONFIG);

    const config = await loadConfig(tempDir);

    expect(config.version).toBe('1.0');
    expect(config.sourceDirs).toEqual(DEFAULT_CONFIG.sourceDirs);
    expect(config.includePatterns).toEqual(DEFAULT_CONFIG.includePatterns);
    expect(config.excludePatterns).toEqual(DEFAULT_CONFIG.excludePatterns);
    expect(config.tokenBudget).toEqual(DEFAULT_CONFIG.tokenBudget);
    expect(config.outputDir).toBe('.cognitive');
  });

  it('should throw ConfigNotFoundError when no config exists', async () => {
    await expect(loadConfig(tempDir)).rejects.toThrow(ConfigNotFoundError);
  });

  it('should throw ConfigParseError for invalid YAML', async () => {
    const configPath = join(tempDir, 'cognitive.config.yaml');
    await writeFile(configPath, INVALID_YAML);

    await expect(loadConfig(tempDir)).rejects.toThrow(ConfigParseError);
  });

  it('should throw ConfigValidationError for invalid config values', async () => {
    const configPath = join(tempDir, 'cognitive.config.yaml');
    await writeFile(configPath, INVALID_CONFIG);

    await expect(loadConfig(tempDir)).rejects.toThrow(ConfigValidationError);
  });

  it('should handle empty config file', async () => {
    const configPath = join(tempDir, 'cognitive.config.yaml');
    await writeFile(configPath, '');

    const config = await loadConfig(tempDir);
    // Should apply all defaults
    expect(config.version).toBe('1.0');
    expect(config.sourceDirs).toEqual(DEFAULT_CONFIG.sourceDirs);
  });

  it('should resolve relative projectRoot to absolute path', async () => {
    const configPath = join(tempDir, 'cognitive.config.yaml');
    await writeFile(configPath, `
version: "1.0"
projectRoot: "./subdir"
`);
    await mkdir(join(tempDir, 'subdir'));

    const config = await loadConfig(tempDir);
    expect(config.projectRoot).toBe(join(tempDir, 'subdir'));
  });
});

describe('initConfig', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should create a default config file', async () => {
    const configPath = await initConfig(tempDir);

    expect(configPath).toBe(join(tempDir, 'cognitive.config.yaml'));

    // Should be loadable
    const config = await loadConfig(tempDir);
    expect(config.version).toBe('1.0');
  });

  it('should throw if config already exists', async () => {
    await writeFile(join(tempDir, 'cognitive.config.yaml'), VALID_CONFIG);

    await expect(initConfig(tempDir)).rejects.toThrow('already exists');
  });

  it('should throw if directory does not exist', async () => {
    const nonExistent = join(tempDir, 'nonexistent');

    await expect(initConfig(nonExistent)).rejects.toThrow('does not exist');
  });
});

describe('loadConfigOrDefault', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should load config when it exists', async () => {
    const configPath = join(tempDir, 'cognitive.config.yaml');
    await writeFile(configPath, VALID_CONFIG);

    const config = await loadConfigOrDefault(tempDir);
    expect(config.tokenBudget.summary).toBe(400);
  });

  it('should return defaults when no config exists', async () => {
    const config = await loadConfigOrDefault(tempDir);

    expect(config.version).toBe(DEFAULT_CONFIG.version);
    expect(config.sourceDirs).toEqual(DEFAULT_CONFIG.sourceDirs);
    expect(config.projectRoot).toBe(tempDir);
  });

  it('should still throw for parse errors', async () => {
    const configPath = join(tempDir, 'cognitive.config.yaml');
    await writeFile(configPath, INVALID_YAML);

    await expect(loadConfigOrDefault(tempDir)).rejects.toThrow(ConfigParseError);
  });
});
