// Binding Resolver - Bridge between LiquidCode DSL and data connectors
// ============================================================================

import type { LiquidSchema, Block, Binding } from '../compiler/ui-emitter';
import type { Connector, QueryOptions, SubscribeOptions, DataCallback, Unsubscribe } from './connector';
import type { CatalogRegistry, SchemaCatalog, CatalogBinding } from './catalog';

/**
 * Data context passed to LiquidUI for rendering
 */
export type DataContext = Record<string, unknown>;

/**
 * Permission checker interface
 */
export interface PermissionChecker {
  /**
   * Check if user can access specific bindings
   * @returns Array of allowed binding names
   */
  filter(bindings: string[], userId: string): Promise<string[]>;

  /**
   * Check if user can access a single binding
   */
  canAccess(binding: string, userId: string): Promise<boolean>;
}

/**
 * Simple cache interface
 */
export interface ResolverCache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

/**
 * Options for resolving bindings
 */
export interface ResolveOptions {
  /** User ID for permission checking */
  userId?: string;
  /** Skip permission checks */
  skipPermissions?: boolean;
  /** Force bypass cache */
  noCache?: boolean;
  /** Timeout for all queries in milliseconds */
  timeout?: number;
  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Result of binding resolution
 */
export interface ResolveResult {
  /** The resolved data context */
  data: DataContext;
  /** Bindings that were resolved successfully */
  resolved: string[];
  /** Bindings that failed to resolve */
  failed: Array<{ binding: string; error: string }>;
  /** Bindings denied by permissions */
  denied: string[];
  /** Resolution timing in milliseconds */
  timing: {
    total: number;
    byConnector: Record<string, number>;
  };
}

/**
 * Active subscription info
 */
interface ActiveSubscription {
  binding: string;
  connector: string;
  unsubscribe: Unsubscribe;
}

/**
 * Binding Resolver
 *
 * Extracts bindings from LiquidSchema, fetches data from appropriate
 * connectors, handles caching, and enforces permissions.
 */
export class BindingResolver {
  private catalog: CatalogRegistry;
  private cache?: ResolverCache;
  private permissions?: PermissionChecker;
  private defaultCacheTtl: number;
  private activeSubscriptions: Map<string, ActiveSubscription> = new Map();

  constructor(options: {
    catalog: CatalogRegistry;
    cache?: ResolverCache;
    permissions?: PermissionChecker;
    defaultCacheTtl?: number;
  }) {
    this.catalog = options.catalog;
    this.cache = options.cache;
    this.permissions = options.permissions;
    this.defaultCacheTtl = options.defaultCacheTtl ?? 30_000; // 30 seconds default
  }

  /**
   * Resolve all bindings in a LiquidSchema and return data context
   */
  async resolve(schema: LiquidSchema, options: ResolveOptions = {}): Promise<ResolveResult> {
    const startTime = Date.now();
    const timingByConnector: Record<string, number> = {};

    // 1. Extract all bindings from schema
    const bindings = this.extractBindings(schema);
    const uniqueBindings = [...new Set(bindings)];

    if (uniqueBindings.length === 0) {
      return {
        data: {},
        resolved: [],
        failed: [],
        denied: [],
        timing: { total: 0, byConnector: {} },
      };
    }

    // 2. Check permissions
    let allowed = uniqueBindings;
    let denied: string[] = [];

    if (this.permissions && !options.skipPermissions && options.userId) {
      allowed = await this.permissions.filter(uniqueBindings, options.userId);
      denied = uniqueBindings.filter((b) => !allowed.includes(b));
    }

    // 3. Group by connector for efficient batching
    const byConnector = await this.catalog.resolveBindings(allowed);

    // 4. Fetch data from each connector in parallel
    const data: DataContext = {};
    const resolved: string[] = [];
    const failed: Array<{ binding: string; error: string }> = [];

    const fetchPromises = Array.from(byConnector.entries()).map(
      async ([connector, bindingNames]) => {
        const connectorStart = Date.now();

        try {
          const results = await this.fetchFromConnector(
            connector,
            bindingNames,
            options
          );

          for (const [binding, value] of Object.entries(results)) {
            data[binding] = value;
            resolved.push(binding);
          }
        } catch (error) {
          // Mark all bindings from this connector as failed
          for (const binding of bindingNames) {
            failed.push({
              binding,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        timingByConnector[connector.id] = Date.now() - connectorStart;
      }
    );

    await Promise.all(fetchPromises);

    return {
      data,
      resolved,
      failed,
      denied,
      timing: {
        total: Date.now() - startTime,
        byConnector: timingByConnector,
      },
    };
  }

  /**
   * Subscribe to real-time updates for bindings in a schema
   */
  subscribeToSchema(
    schema: LiquidSchema,
    onUpdate: (binding: string, data: unknown) => void,
    options: ResolveOptions & SubscribeOptions = {}
  ): Unsubscribe {
    const bindings = this.extractBindings(schema);
    const subscriptionIds: string[] = [];

    // Subscribe to each binding
    for (const binding of bindings) {
      const subId = this.subscribe(binding, (data) => onUpdate(binding, data), options);
      if (subId) {
        subscriptionIds.push(subId);
      }
    }

    // Return combined unsubscribe
    return () => {
      for (const id of subscriptionIds) {
        this.unsubscribe(id);
      }
    };
  }

  /**
   * Subscribe to a single binding for real-time updates
   */
  subscribe(
    binding: string,
    callback: DataCallback,
    options: SubscribeOptions = {}
  ): string | null {
    // Resolve binding to connector synchronously (requires catalog to be cached)
    const catalogPromise = this.catalog.resolveBinding(binding);

    // Generate subscription ID
    const subId = `${binding}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Set up subscription asynchronously
    catalogPromise.then((result) => {
      if (!result) {
        callback(undefined, new Error(`Unknown binding: ${binding}`));
        return;
      }

      const { connector, schema: bindingSchema } = result;

      if (!bindingSchema.realtime || !connector.subscribe) {
        callback(undefined, new Error(`Binding '${binding}' does not support real-time`));
        return;
      }

      const unsubscribe = connector.subscribe(binding, callback, options);

      this.activeSubscriptions.set(subId, {
        binding,
        connector: connector.id,
        unsubscribe,
      });
    });

    return subId;
  }

  /**
   * Unsubscribe from a binding
   */
  unsubscribe(subscriptionId: string): boolean {
    const sub = this.activeSubscriptions.get(subscriptionId);
    if (!sub) return false;

    sub.unsubscribe();
    this.activeSubscriptions.delete(subscriptionId);
    return true;
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll(): void {
    for (const sub of this.activeSubscriptions.values()) {
      sub.unsubscribe();
    }
    this.activeSubscriptions.clear();
  }

  /**
   * Extract all binding names from a LiquidSchema
   */
  extractBindings(schema: LiquidSchema): string[] {
    const bindings: string[] = [];

    const walkBlock = (block: Block) => {
      // Extract binding from this block
      if (block.binding) {
        const bindingNames = this.getBindingNames(block.binding);
        bindings.push(...bindingNames);
      }

      // Recurse into children
      if (block.children) {
        for (const child of block.children) {
          walkBlock(child);
        }
      }
    };

    // Walk all layers
    for (const layer of schema.layers) {
      walkBlock(layer.root);
    }

    return bindings;
  }

  /**
   * Extract field names from a Binding
   */
  private getBindingNames(binding: Binding): string[] {
    const names: string[] = [];

    switch (binding.kind) {
      case 'field':
        if (typeof binding.value === 'string') {
          // Handle nested fields: 'summary.revenue' -> 'summary'
          const root = binding.value.split('.')[0];
          if (root) names.push(root);
        }
        break;

      case 'iterator':
        if (typeof binding.value === 'string') {
          names.push(binding.value);
        }
        break;

      case 'computed':
        // Extract field references from computed expressions
        if (typeof binding.value === 'string') {
          const fieldRefs = this.extractFieldsFromExpression(binding.value);
          names.push(...fieldRefs);
        }
        break;

      // indexed, literal, indexRef don't reference named bindings
    }

    // Chart x/y bindings
    if (binding.x) names.push(binding.x.split('.')[0]!);
    if (binding.y) names.push(binding.y.split('.')[0]!);

    return names;
  }

  /**
   * Extract field references from a computed expression
   * e.g., "revenue + costs" -> ['revenue', 'costs']
   */
  private extractFieldsFromExpression(expr: string): string[] {
    // Remove string literals
    const withoutStrings = expr.replace(/'[^']*'|"[^"]*"/g, '');

    // Remove numbers
    const withoutNumbers = withoutStrings.replace(/\b\d+\.?\d*\b/g, '');

    // Remove operators and parens
    const withoutOps = withoutNumbers.replace(/[+\-*/%()=<>!&|,]/g, ' ');

    // Remove pipe formatters (e.g., |currency)
    const withoutPipes = withoutOps.replace(/\|[a-zA-Z]+/g, '');

    // Extract remaining identifiers
    const matches = withoutPipes.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];

    // Filter out common keywords/functions
    const keywords = new Set(['true', 'false', 'null', 'undefined', 'Math', 'Number', 'String']);
    return matches.filter((m) => !keywords.has(m));
  }

  /**
   * Fetch data for bindings from a single connector
   */
  private async fetchFromConnector(
    connector: Connector,
    bindings: string[],
    options: ResolveOptions
  ): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};
    const queryOptions: QueryOptions = {
      noCache: options.noCache,
      timeout: options.timeout,
      signal: options.signal,
    };

    // Fetch each binding (could be parallelized further)
    await Promise.all(
      bindings.map(async (binding) => {
        const cacheKey = `${connector.id}:${binding}`;

        // Check cache first
        if (this.cache && !options.noCache) {
          const cached = await this.cache.get(cacheKey);
          if (cached !== undefined) {
            results[binding] = cached;
            return;
          }
        }

        // Fetch from connector
        const data = await connector.query(binding, queryOptions);

        // Cache the result
        if (this.cache) {
          const catalog = await this.catalog.getCatalog();
          const bindingSchema = catalog.bindings[binding];
          const ttl = bindingSchema?.cacheTtl ?? this.defaultCacheTtl;

          if (ttl > 0) {
            await this.cache.set(cacheKey, data, { ttl });
          }
        }

        results[binding] = data;
      })
    );

    return results;
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    if (this.cache) {
      await this.cache.clear();
    }
  }

  /**
   * Get resolver statistics
   */
  getStats(): {
    activeSubscriptions: number;
    subscriptionsByConnector: Record<string, number>;
  } {
    const byConnector: Record<string, number> = {};

    for (const sub of this.activeSubscriptions.values()) {
      byConnector[sub.connector] = (byConnector[sub.connector] ?? 0) + 1;
    }

    return {
      activeSubscriptions: this.activeSubscriptions.size,
      subscriptionsByConnector: byConnector,
    };
  }
}

// ============================================================================
// Simple In-Memory Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL support
 */
export class MemoryCache implements ResolverCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(cleanupIntervalMs: number = 60_000) {
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);

    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void> {
    const ttl = options?.ttl ?? 30_000;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// ============================================================================
// Default Permission Checker (Allow All)
// ============================================================================

/**
 * Default permission checker that allows all bindings
 */
export class AllowAllPermissions implements PermissionChecker {
  async filter(bindings: string[]): Promise<string[]> {
    return bindings;
  }

  async canAccess(): Promise<boolean> {
    return true;
  }
}
