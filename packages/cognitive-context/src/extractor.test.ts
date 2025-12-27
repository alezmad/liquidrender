/**
 * Tests for the AST-based Entity Extractor
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { extractEntitiesFromFile, extractEntitiesFromDir } from './extractor.js';

const TEST_DIR = join(process.cwd(), '.test-fixtures');

// Test fixtures
const fixtures = {
  reactComponent: `
import React from 'react';

export interface ButtonProps {
  /** Button label text */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

export default Button;
`,

  customHook: `
import { useState, useEffect } from 'react';

export interface UseCounterOptions {
  initialValue?: number;
  step?: number;
}

export function useCounter(options: UseCounterOptions = {}) {
  const { initialValue = 0, step = 1 } = options;
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount(c => c + step);
  const decrement = () => setCount(c => c - step);
  const reset = () => setCount(initialValue);

  return { count, increment, decrement, reset };
}
`,

  utilityModule: `
/**
 * String utility functions
 */

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const DEFAULT_SEPARATOR = '-';
`,

  zodSchema: `
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });
`,

  typesFile: `
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestConfig {
  method: RequestMethod;
  headers?: Record<string, string>;
  body?: unknown;
}
`,

  moduleWithImports: `
import { join, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Config } from './types.js';
import defaultConfig from '../config.js';

export async function loadConfig(path: string): Promise<Config> {
  const fullPath = resolve(process.cwd(), path);
  const content = await readFile(fullPath, 'utf-8');
  return { ...defaultConfig, ...JSON.parse(content) };
}
`,

  defaultExportArrow: `
import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
}

const Card = ({ title, children }: CardProps) => (
  <div className="card">
    <h2>{title}</h2>
    {children}
  </div>
);

export default Card;
`,

  classComponent: `
import React, { Component } from 'react';

interface CounterState {
  count: number;
}

export class Counter extends Component<{}, CounterState> {
  state = { count: 0 };

  render() {
    return (
      <div>
        <span>{this.state.count}</span>
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>
          +
        </button>
      </div>
    );
  }
}
`,
};

describe('extractEntitiesFromFile', () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should extract React component with props', async () => {
    const filePath = join(TEST_DIR, 'Button.tsx');
    await writeFile(filePath, fixtures.reactComponent);

    const entity = await extractEntitiesFromFile(filePath);

    expect(entity).not.toBeNull();
    expect(entity!.name).toBe('Button');
    expect(entity!.type).toBe('component');
    expect(entity!.exports).toHaveLength(3); // ButtonProps, Button, default
    expect(entity!.hash).toMatch(/^[a-f0-9]{64}$/);

    // Check exports
    const buttonExport = entity!.exports.find(e => e.name === 'Button' && !e.isDefault);
    expect(buttonExport).toBeDefined();
    expect(buttonExport!.kind).toBe('function');

    const defaultExport = entity!.exports.find(e => e.isDefault);
    expect(defaultExport).toBeDefined();

    // Check props extraction
    expect(entity!.props).toBeDefined();
    expect(entity!.props).toHaveLength(3);

    const labelProp = entity!.props!.find(p => p.name === 'label');
    expect(labelProp).toBeDefined();
    expect(labelProp!.type).toBe('string');
    expect(labelProp!.required).toBe(true);

    const onClickProp = entity!.props!.find(p => p.name === 'onClick');
    expect(onClickProp).toBeDefined();
    expect(onClickProp!.required).toBe(false);
  });

  it('should detect custom hooks by naming convention', async () => {
    const filePath = join(TEST_DIR, 'useCounter.ts');
    await writeFile(filePath, fixtures.customHook);

    const entity = await extractEntitiesFromFile(filePath);

    expect(entity).not.toBeNull();
    expect(entity!.name).toBe('useCounter');
    expect(entity!.type).toBe('hook');
    expect(entity!.exports.some(e => e.name === 'UseCounterOptions')).toBe(true);
  });

  it('should extract utility functions', async () => {
    const filePath = join(TEST_DIR, 'strings.ts');
    await writeFile(filePath, fixtures.utilityModule);

    const entity = await extractEntitiesFromFile(filePath);

    expect(entity).not.toBeNull();
    expect(entity!.type).toBe('utility');
    expect(entity!.exports).toHaveLength(3);

    const names = entity!.exports.map(e => e.name);
    expect(names).toContain('capitalize');
    expect(names).toContain('slugify');
    expect(names).toContain('DEFAULT_SEPARATOR');
  });

  it('should detect Zod schemas', async () => {
    const filePath = join(TEST_DIR, 'user.schema.ts');
    await writeFile(filePath, fixtures.zodSchema);

    const entity = await extractEntitiesFromFile(filePath);

    expect(entity).not.toBeNull();
    expect(entity!.type).toBe('schema');
    expect(entity!.imports.some(i => i.source === 'zod')).toBe(true);
  });

  it('should detect type-only files', async () => {
    const filePath = join(TEST_DIR, 'api.types.ts');
    await writeFile(filePath, fixtures.typesFile);

    const entity = await extractEntitiesFromFile(filePath);

    expect(entity).not.toBeNull();
    expect(entity!.type).toBe('interface');
    expect(entity!.exports.every(e => e.kind === 'interface' || e.kind === 'type')).toBe(true);
  });

  it('should extract imports correctly', async () => {
    const filePath = join(TEST_DIR, 'config.loader.ts');
    await writeFile(filePath, fixtures.moduleWithImports);

    const entity = await extractEntitiesFromFile(filePath);

    expect(entity).not.toBeNull();
    expect(entity!.imports).toHaveLength(4);

    // Check node:path import
    const pathImport = entity!.imports.find(i => i.source === 'node:path');
    expect(pathImport).toBeDefined();
    expect(pathImport!.isRelative).toBe(false);
    expect(pathImport!.specifiers).toContain('join');
    expect(pathImport!.specifiers).toContain('resolve');

    // Check relative import
    const typesImport = entity!.imports.find(i => i.source === './types.js');
    expect(typesImport).toBeDefined();
    expect(typesImport!.isRelative).toBe(true);
  });

  it('should handle arrow function default exports', async () => {
    const filePath = join(TEST_DIR, 'Card.tsx');
    await writeFile(filePath, fixtures.defaultExportArrow);

    const entity = await extractEntitiesFromFile(filePath);

    expect(entity).not.toBeNull();
    expect(entity!.name).toBe('Card');
    expect(entity!.type).toBe('component');
  });

  it('should handle class components', async () => {
    const filePath = join(TEST_DIR, 'Counter.tsx');
    await writeFile(filePath, fixtures.classComponent);

    const entity = await extractEntitiesFromFile(filePath);

    expect(entity).not.toBeNull();
    expect(entity!.type).toBe('component');
    expect(entity!.exports.some(e => e.kind === 'class' && e.name === 'Counter')).toBe(true);
  });

  it('should return null for non-existent files', async () => {
    const entity = await extractEntitiesFromFile('/non/existent/file.ts');
    expect(entity).toBeNull();
  });

  it('should calculate consistent hashes', async () => {
    const filePath = join(TEST_DIR, 'hash-test.ts');
    await writeFile(filePath, fixtures.utilityModule);

    const entity1 = await extractEntitiesFromFile(filePath);
    const entity2 = await extractEntitiesFromFile(filePath);

    expect(entity1).not.toBeNull();
    expect(entity2).not.toBeNull();
    expect(entity1!.hash).toBe(entity2!.hash);
  });
});

describe('extractEntitiesFromDir', () => {
  const DIR_TEST_PATH = join(TEST_DIR, 'dir-test');

  beforeAll(async () => {
    await mkdir(DIR_TEST_PATH, { recursive: true });
    await mkdir(join(DIR_TEST_PATH, 'components'), { recursive: true });
    await mkdir(join(DIR_TEST_PATH, 'hooks'), { recursive: true });
    await mkdir(join(DIR_TEST_PATH, 'node_modules', 'some-package'), { recursive: true });

    // Create test files
    await writeFile(join(DIR_TEST_PATH, 'components', 'Button.tsx'), fixtures.reactComponent);
    await writeFile(join(DIR_TEST_PATH, 'hooks', 'useCounter.ts'), fixtures.customHook);
    await writeFile(join(DIR_TEST_PATH, 'utils.ts'), fixtures.utilityModule);
    await writeFile(join(DIR_TEST_PATH, 'Button.test.tsx'), '// test file');
    await writeFile(join(DIR_TEST_PATH, 'node_modules', 'some-package', 'index.ts'), 'export const x = 1;');
  });

  afterAll(async () => {
    await rm(DIR_TEST_PATH, { recursive: true, force: true });
  });

  it('should extract all entities from directory recursively', async () => {
    const entities = await extractEntitiesFromDir(DIR_TEST_PATH);

    expect(entities.length).toBeGreaterThanOrEqual(3);

    const names = entities.map(e => e.name);
    expect(names).toContain('Button');
    expect(names).toContain('useCounter');
  });

  it('should exclude node_modules by default', async () => {
    const entities = await extractEntitiesFromDir(DIR_TEST_PATH);

    // Should not include files from node_modules
    const nodeModuleEntity = entities.find(e => e.path.includes('node_modules'));
    expect(nodeModuleEntity).toBeUndefined();
  });

  it('should exclude test files by default', async () => {
    const entities = await extractEntitiesFromDir(DIR_TEST_PATH);

    // Should not include test files
    const testEntity = entities.find(e => e.path.includes('.test.'));
    expect(testEntity).toBeUndefined();
  });

  it('should store relative paths', async () => {
    const entities = await extractEntitiesFromDir(DIR_TEST_PATH);

    // All paths should be relative
    for (const entity of entities) {
      expect(entity.path.startsWith('/')).toBe(false);
      expect(entity.path.startsWith(DIR_TEST_PATH)).toBe(false);
    }
  });

  it('should respect custom include patterns', async () => {
    const entities = await extractEntitiesFromDir(DIR_TEST_PATH, {
      include: ['**/hooks/**/*.ts'],
      exclude: [],
    });

    expect(entities.length).toBe(1);
    expect(entities[0].name).toBe('useCounter');
  });
});
