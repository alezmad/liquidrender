import { createHash } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// FILE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the initial LiquidCode specification
 */
export async function loadSpec(specPath: string): Promise<string> {
  return fs.readFile(specPath, "utf-8");
}

/**
 * Save synthesis state for resume capability
 */
export async function saveCheckpoint(
  outputDir: string,
  state: Record<string, unknown>
): Promise<void> {
  const checkpointPath = path.join(outputDir, "checkpoint.json");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(checkpointPath, JSON.stringify(state, null, 2));
}

/**
 * Load checkpoint if exists
 */
export async function loadCheckpoint(
  outputDir: string
): Promise<Record<string, unknown> | null> {
  const checkpointPath = path.join(outputDir, "checkpoint.json");
  try {
    const content = await fs.readFile(checkpointPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Save final compiler output
 */
export async function saveCompilerOutput(
  outputDir: string,
  modules: Record<string, { name: string; code: string; version: number }>
): Promise<void> {
  const compilerDir = path.join(outputDir, "compiler");
  await fs.mkdir(compilerDir, { recursive: true });

  for (const [name, module] of Object.entries(modules)) {
    const filePath = path.join(compilerDir, `${name}.ts`);
    await fs.writeFile(filePath, module.code);
  }

  // Write index file
  const indexContent = Object.keys(modules)
    .map((name) => `export * from "./${name}";`)
    .join("\n");
  await fs.writeFile(path.join(compilerDir, "index.ts"), indexContent);
}

/**
 * Save evolved specification
 */
export async function saveSpec(
  outputDir: string,
  spec: { version: number; content: string }
): Promise<void> {
  const specPath = path.join(outputDir, `LIQUID-SPEC-v${spec.version}.md`);
  await fs.writeFile(specPath, spec.content);
}

/**
 * Save test suite
 */
export async function saveTestSuite(
  outputDir: string,
  testSuite: Array<{
    id: string;
    liquidcode: string;
    expectedSchema: Record<string, unknown>;
  }>
): Promise<void> {
  const testPath = path.join(outputDir, "test-suite.json");
  await fs.writeFile(testPath, JSON.stringify(testSuite, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// HASH UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate SHA256 hash of content
 */
export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Simple string hash (for quick comparisons)
 */
export function quickHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// ─────────────────────────────────────────────────────────────────────────────
// PARALLELISM UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process items in parallel with concurrency limit
 */
export async function parallelMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = 10
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const promise = fn(items[i], i).then((result) => {
      results[i] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      const completedIndex = executing.findIndex((p) =>
        Promise.race([p, Promise.resolve("pending")]).then(
          (r) => r !== "pending"
        )
      );
      if (completedIndex >= 0) {
        executing.splice(completedIndex, 1);
      }
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Chunk array into batches
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process in parallel batches
 */
export async function batchProcess<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const batches = chunk(items, batchSize);
  const results: R[] = [];

  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// RETRY UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;

      if (attempt < maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(
  text: string,
  fallback: T
): T {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * Extract JSON from text that may contain markdown code blocks
 */
export function extractJson(text: string): string {
  // Try to extract from code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object/array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1];
  }

  return text;
}

/**
 * Deep equality check
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b) return false;

  if (a === null || b === null) return a === b;

  if (typeof a !== "object") return a === b;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGGING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m",  // gray
  info: "\x1b[36m",   // cyan
  warn: "\x1b[33m",   // yellow
  error: "\x1b[31m",  // red
};

const RESET = "\x1b[0m";

/**
 * Create a simple logger
 */
export function createLogger(prefix: string, level: LogLevel = "info") {
  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  const minLevel = levels.indexOf(level);

  const log = (logLevel: LogLevel, message: string, data?: unknown) => {
    if (levels.indexOf(logLevel) < minLevel) return;

    const timestamp = new Date().toISOString();
    const color = LOG_COLORS[logLevel];
    const levelStr = logLevel.toUpperCase().padEnd(5);

    console.log(
      `${color}[${timestamp}] [${prefix}] ${levelStr}${RESET} ${message}`,
      data !== undefined ? data : ""
    );
  };

  return {
    debug: (msg: string, data?: unknown) => log("debug", msg, data),
    info: (msg: string, data?: unknown) => log("info", msg, data),
    warn: (msg: string, data?: unknown) => log("warn", msg, data),
    error: (msg: string, data?: unknown) => log("error", msg, data),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// METRICS UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple metrics collector
 */
export class Metrics {
  private counters: Map<string, number> = new Map();
  private timers: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  increment(name: string, value: number = 1): void {
    this.counters.set(name, (this.counters.get(name) || 0) + value);
  }

  startTimer(name: string): void {
    this.startTimes.set(name, Date.now());
  }

  endTimer(name: string): number {
    const start = this.startTimes.get(name);
    if (!start) return 0;

    const elapsed = Date.now() - start;
    const times = this.timers.get(name) || [];
    times.push(elapsed);
    this.timers.set(name, times);
    this.startTimes.delete(name);

    return elapsed;
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  getTimerStats(name: string): { min: number; max: number; avg: number; count: number } {
    const times = this.timers.get(name) || [];
    if (times.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      count: times.length,
    };
  }

  getSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {
      counters: Object.fromEntries(this.counters),
      timers: {},
    };

    for (const [name] of this.timers) {
      (summary.timers as Record<string, unknown>)[name] = this.getTimerStats(name);
    }

    return summary;
  }
}
