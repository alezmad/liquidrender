/**
 * File Watcher Module
 *
 * Watches source directories for file changes and emits debounced events.
 * Uses chokidar for cross-platform file system watching.
 */

import chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';
import type { FileEventType, WatchConfig, WatcherCallbacks } from './types.js';

// ============================================
// Constants
// ============================================

const DEFAULT_DEBOUNCE_MS = 500;
const DEFAULT_IGNORE_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
];

// ============================================
// Watcher Interface
// ============================================

export interface Watcher {
  /** Start watching the configured directories */
  start(): void;
  /** Stop watching and clean up resources */
  stop(): void;
  /** Check if the watcher is currently running */
  isRunning(): boolean;
}

// ============================================
// Internal Types
// ============================================

interface PendingEvent {
  type: FileEventType;
  path: string;
  timestamp: Date;
}

// ============================================
// Factory Function
// ============================================

/**
 * Creates a file watcher that monitors source directories for changes.
 *
 * @param sourceDirs - Array of directories to watch
 * @param config - Watch configuration options
 * @param callbacks - Event callbacks
 * @returns A Watcher instance
 *
 * @example
 * ```ts
 * const watcher = createWatcher(
 *   ['./src', './lib'],
 *   { enabled: true, debounceMs: 300, ignorePaths: [] },
 *   {
 *     onFileChange: (event) => console.log('File changed:', event.path),
 *     onError: (error) => console.error('Watch error:', error),
 *   }
 * );
 *
 * watcher.start();
 * // ... later
 * watcher.stop();
 * ```
 */
export function createWatcher(
  sourceDirs: string[],
  config: WatchConfig,
  callbacks: WatcherCallbacks
): Watcher {
  let fsWatcher: FSWatcher | null = null;
  let running = false;
  let pendingEvents: Map<string, PendingEvent> = new Map();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const debounceMs = config.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const ignorePaths = [
    ...DEFAULT_IGNORE_PATHS,
    ...(config.ignorePaths ?? []),
  ];

  /**
   * Flushes all pending events, calling the onFileChange callback for each
   */
  function flushEvents(): void {
    if (pendingEvents.size === 0) return;

    const events = Array.from(pendingEvents.values());
    pendingEvents.clear();

    for (const event of events) {
      try {
        callbacks.onFileChange?.(event);
      } catch (error) {
        callbacks.onError?.(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * Schedules a debounced flush of events
   */
  function scheduleFlush(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      flushEvents();
    }, debounceMs);
  }

  /**
   * Handles a raw file system event from chokidar
   */
  function handleEvent(type: FileEventType, path: string): void {
    const event: PendingEvent = {
      type,
      path,
      timestamp: new Date(),
    };

    // Use path as key - later events for same path override earlier ones
    pendingEvents.set(path, event);
    scheduleFlush();
  }

  /**
   * Handles errors from chokidar
   */
  function handleError(error: Error): void {
    callbacks.onError?.(error);
  }

  return {
    start(): void {
      if (running) {
        return;
      }

      try {
        // Build ignore patterns from configured paths
        const ignorePatterns = ignorePaths.map((p) => `**/${p}/**`);

        fsWatcher = chokidar.watch(sourceDirs, {
          ignored: ignorePatterns,
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50,
          },
        });

        fsWatcher
          .on('add', (path) => handleEvent('add', path))
          .on('change', (path) => handleEvent('change', path))
          .on('unlink', (path) => handleEvent('unlink', path))
          .on('error', handleError);

        running = true;
      } catch (error) {
        callbacks.onError?.(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    },

    stop(): void {
      if (!running) {
        return;
      }

      // Clear any pending debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      // Flush any remaining events immediately
      flushEvents();

      // Close the watcher
      if (fsWatcher) {
        fsWatcher.close().catch((error) => {
          callbacks.onError?.(
            error instanceof Error ? error : new Error(String(error))
          );
        });
        fsWatcher = null;
      }

      running = false;
    },

    isRunning(): boolean {
      return running;
    },
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Creates a WatchConfig with sensible defaults
 */
export function createDefaultWatchConfig(
  overrides: Partial<WatchConfig> = {}
): WatchConfig {
  return {
    enabled: overrides.enabled ?? true,
    debounceMs: overrides.debounceMs ?? DEFAULT_DEBOUNCE_MS,
    ignorePaths: overrides.ignorePaths ?? [...DEFAULT_IGNORE_PATHS],
  };
}

/**
 * Merges user-provided ignore paths with defaults
 */
export function mergeIgnorePaths(userPaths: string[] = []): string[] {
  const combined = new Set([...DEFAULT_IGNORE_PATHS, ...userPaths]);
  return Array.from(combined);
}
