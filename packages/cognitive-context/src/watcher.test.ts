/**
 * Watcher Module Tests
 *
 * Tests for the file watcher functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FileEvent, WatchConfig, WatcherCallbacks } from './types.js';
import {
  createWatcher,
  createDefaultWatchConfig,
  mergeIgnorePaths,
} from './watcher.js';

// ============================================
// Mock chokidar
// ============================================

// Create mock event emitter functionality
type EventHandler = (path: string) => void;
type ErrorHandler = (error: Error) => void;

interface MockWatcher {
  on: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  _handlers: {
    add: EventHandler[];
    change: EventHandler[];
    unlink: EventHandler[];
    error: ErrorHandler[];
  };
  _emit: (event: string, data: string | Error) => void;
}

let mockWatcherInstance: MockWatcher;

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => {
      mockWatcherInstance = {
        _handlers: {
          add: [],
          change: [],
          unlink: [],
          error: [],
        },
        on: vi.fn(function (this: MockWatcher, event: string, handler: EventHandler | ErrorHandler) {
          if (event in this._handlers) {
            (this._handlers as Record<string, (EventHandler | ErrorHandler)[]>)[event].push(handler);
          }
          return this;
        }),
        close: vi.fn(() => Promise.resolve()),
        _emit: function (event: string, data: string | Error) {
          const handlers = (this._handlers as Record<string, (EventHandler | ErrorHandler)[]>)[event];
          if (handlers) {
            handlers.forEach((h) => {
              if (event === 'error') {
                (h as ErrorHandler)(data as Error);
              } else {
                (h as EventHandler)(data as string);
              }
            });
          }
        },
      };
      return mockWatcherInstance;
    }),
  },
}));

// ============================================
// Test Utilities
// ============================================

function createMockCallbacks(): WatcherCallbacks & {
  events: FileEvent[];
  errors: Error[];
} {
  const events: FileEvent[] = [];
  const errors: Error[] = [];

  return {
    events,
    errors,
    onFileChange: vi.fn((event: FileEvent) => {
      events.push(event);
    }),
    onError: vi.fn((error: Error) => {
      errors.push(error);
    }),
  };
}

function createTestConfig(overrides: Partial<WatchConfig> = {}): WatchConfig {
  return {
    enabled: true,
    debounceMs: 50, // Use short debounce for tests
    ignorePaths: [],
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('createWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should create a watcher that starts and stops correctly', () => {
    const callbacks = createMockCallbacks();
    const config = createTestConfig();
    const watcher = createWatcher(['./src'], config, callbacks);

    expect(watcher.isRunning()).toBe(false);

    watcher.start();
    expect(watcher.isRunning()).toBe(true);

    watcher.stop();
    expect(watcher.isRunning()).toBe(false);
    expect(mockWatcherInstance.close).toHaveBeenCalled();
  });

  it('should debounce file change events', async () => {
    const callbacks = createMockCallbacks();
    const config = createTestConfig({ debounceMs: 100 });
    const watcher = createWatcher(['./src'], config, callbacks);

    watcher.start();

    // Emit multiple events in quick succession
    mockWatcherInstance._emit('change', '/src/file1.ts');
    mockWatcherInstance._emit('change', '/src/file2.ts');
    mockWatcherInstance._emit('change', '/src/file1.ts'); // Same file again

    // Events should not be processed yet
    expect(callbacks.events).toHaveLength(0);

    // Advance time past debounce threshold
    vi.advanceTimersByTime(150);

    // Now events should be processed (file1 should only appear once due to deduplication)
    expect(callbacks.events).toHaveLength(2);
    expect(callbacks.events.map((e) => e.path)).toContain('/src/file1.ts');
    expect(callbacks.events.map((e) => e.path)).toContain('/src/file2.ts');

    watcher.stop();
  });

  it('should emit correct event types for add, change, and unlink', async () => {
    const callbacks = createMockCallbacks();
    const config = createTestConfig({ debounceMs: 50 });
    const watcher = createWatcher(['./src'], config, callbacks);

    watcher.start();

    mockWatcherInstance._emit('add', '/src/new-file.ts');
    vi.advanceTimersByTime(100);

    mockWatcherInstance._emit('change', '/src/existing-file.ts');
    vi.advanceTimersByTime(100);

    mockWatcherInstance._emit('unlink', '/src/deleted-file.ts');
    vi.advanceTimersByTime(100);

    expect(callbacks.events).toHaveLength(3);
    expect(callbacks.events[0]).toMatchObject({
      type: 'add',
      path: '/src/new-file.ts',
    });
    expect(callbacks.events[1]).toMatchObject({
      type: 'change',
      path: '/src/existing-file.ts',
    });
    expect(callbacks.events[2]).toMatchObject({
      type: 'unlink',
      path: '/src/deleted-file.ts',
    });

    watcher.stop();
  });

  it('should call onError callback when chokidar emits an error', () => {
    const callbacks = createMockCallbacks();
    const config = createTestConfig();
    const watcher = createWatcher(['./src'], config, callbacks);

    watcher.start();

    const testError = new Error('Permission denied');
    mockWatcherInstance._emit('error', testError);

    expect(callbacks.errors).toHaveLength(1);
    expect(callbacks.errors[0].message).toBe('Permission denied');

    watcher.stop();
  });

  it('should not start again if already running', () => {
    const callbacks = createMockCallbacks();
    const config = createTestConfig();
    const watcher = createWatcher(['./src'], config, callbacks);

    watcher.start();
    watcher.start(); // Should be a no-op

    expect(watcher.isRunning()).toBe(true);

    watcher.stop();
  });

  it('should flush pending events when stopped', () => {
    const callbacks = createMockCallbacks();
    const config = createTestConfig({ debounceMs: 1000 });
    const watcher = createWatcher(['./src'], config, callbacks);

    watcher.start();

    mockWatcherInstance._emit('change', '/src/file.ts');

    // Events not flushed yet due to long debounce
    expect(callbacks.events).toHaveLength(0);

    // Stop should flush immediately
    watcher.stop();

    expect(callbacks.events).toHaveLength(1);
    expect(callbacks.events[0].path).toBe('/src/file.ts');
  });
});

describe('createDefaultWatchConfig', () => {
  it('should create config with default values', () => {
    const config = createDefaultWatchConfig();

    expect(config.enabled).toBe(true);
    expect(config.debounceMs).toBe(500);
    expect(config.ignorePaths).toContain('node_modules');
    expect(config.ignorePaths).toContain('.git');
  });

  it('should allow overriding default values', () => {
    const config = createDefaultWatchConfig({
      enabled: false,
      debounceMs: 1000,
    });

    expect(config.enabled).toBe(false);
    expect(config.debounceMs).toBe(1000);
  });
});

describe('mergeIgnorePaths', () => {
  it('should merge user paths with defaults', () => {
    const merged = mergeIgnorePaths(['.cache', 'tmp']);

    expect(merged).toContain('node_modules');
    expect(merged).toContain('.git');
    expect(merged).toContain('.cache');
    expect(merged).toContain('tmp');
  });

  it('should deduplicate paths', () => {
    const merged = mergeIgnorePaths(['node_modules', 'custom']);

    const nodeModulesCount = merged.filter((p) => p === 'node_modules').length;
    expect(nodeModulesCount).toBe(1);
  });

  it('should work with empty array', () => {
    const merged = mergeIgnorePaths([]);

    expect(merged).toContain('node_modules');
    expect(merged).toContain('.git');
    expect(merged.length).toBeGreaterThan(0);
  });
});
