// Schema Catalog - Unified view of all available data bindings
// ============================================================================

import type { Connector, ConnectorSchema, BindingSchema, ParamDef } from './connector';

/**
 * Enriched binding info that includes connector source
 */
export interface CatalogBinding extends BindingSchema {
  /** Which connector provides this binding */
  connector: string;
  /** Full qualified name (connector.binding) */
  qualifiedName: string;
}

/**
 * The unified schema catalog aggregating all connectors
 */
export interface SchemaCatalog {
  /** All available bindings across all connectors */
  bindings: Record<string, CatalogBinding>;
  /** Connectors indexed by ID */
  connectors: Record<string, { name: string; type: string; bindingCount: number }>;
  /** Relationships between bindings */
  relationships: Record<string, string[]>;
  /** When this catalog was last refreshed */
  timestamp: number;
}

/**
 * Options for catalog operations
 */
export interface CatalogOptions {
  /** Force refresh from connectors */
  refresh?: boolean;
  /** Include disabled connectors */
  includeDisabled?: boolean;
}

/**
 * Catalog Registry - Manages connectors and generates unified catalog
 */
export class CatalogRegistry {
  private connectors: Map<string, Connector> = new Map();
  private disabledConnectors: Set<string> = new Set();
  private cachedCatalog: SchemaCatalog | null = null;
  private catalogTimestamp: number = 0;
  private catalogTtl: number;

  constructor(options: { catalogTtl?: number } = {}) {
    this.catalogTtl = options.catalogTtl ?? 60_000; // Default 1 minute
  }

  /**
   * Register a connector
   */
  register(connector: Connector): void {
    if (this.connectors.has(connector.id)) {
      throw new Error(`Connector '${connector.id}' is already registered`);
    }
    this.connectors.set(connector.id, connector);
    this.invalidateCatalog();
  }

  /**
   * Unregister a connector
   */
  unregister(connectorId: string): boolean {
    const removed = this.connectors.delete(connectorId);
    if (removed) {
      this.disabledConnectors.delete(connectorId);
      this.invalidateCatalog();
    }
    return removed;
  }

  /**
   * Disable a connector temporarily
   */
  disable(connectorId: string): void {
    if (!this.connectors.has(connectorId)) {
      throw new Error(`Connector '${connectorId}' not found`);
    }
    this.disabledConnectors.add(connectorId);
    this.invalidateCatalog();
  }

  /**
   * Enable a disabled connector
   */
  enable(connectorId: string): void {
    this.disabledConnectors.delete(connectorId);
    this.invalidateCatalog();
  }

  /**
   * Get a specific connector
   */
  getConnector(connectorId: string): Connector | undefined {
    return this.connectors.get(connectorId);
  }

  /**
   * List all registered connectors
   */
  listConnectors(): Array<{ id: string; name: string; type: string; enabled: boolean }> {
    return Array.from(this.connectors.values()).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      enabled: !this.disabledConnectors.has(c.id),
    }));
  }

  /**
   * Get the unified schema catalog
   */
  async getCatalog(options: CatalogOptions = {}): Promise<SchemaCatalog> {
    const now = Date.now();
    const needsRefresh =
      options.refresh ||
      !this.cachedCatalog ||
      now - this.catalogTimestamp > this.catalogTtl;

    if (needsRefresh) {
      const catalog = await this.buildCatalog(options);
      this.cachedCatalog = catalog;
      this.catalogTimestamp = now;
      return catalog;
    }

    // If we reach here, needsRefresh was false, meaning cachedCatalog exists
    return this.cachedCatalog!;
  }

  /**
   * Look up which connector provides a binding
   */
  async resolveBinding(
    bindingName: string,
    options: CatalogOptions = {}
  ): Promise<{ connector: Connector; schema: BindingSchema } | null> {
    const catalog = await this.getCatalog(options);
    const binding = catalog.bindings[bindingName];

    if (!binding) {
      return null;
    }

    const connector = this.connectors.get(binding.connector);
    if (!connector) {
      return null;
    }

    return { connector, schema: binding };
  }

  /**
   * Resolve multiple bindings, grouped by connector for efficient batching
   */
  async resolveBindings(
    bindingNames: string[],
    options: CatalogOptions = {}
  ): Promise<Map<Connector, string[]>> {
    const catalog = await this.getCatalog(options);
    const result = new Map<Connector, string[]>();

    for (const name of bindingNames) {
      const binding = catalog.bindings[name];
      if (!binding) continue;

      const connector = this.connectors.get(binding.connector);
      if (!connector) continue;

      const existing = result.get(connector) ?? [];
      existing.push(name);
      result.set(connector, existing);
    }

    return result;
  }

  /**
   * Invalidate the cached catalog
   */
  invalidateCatalog(): void {
    this.cachedCatalog = null;
    this.catalogTimestamp = 0;
  }

  /**
   * Build the catalog from all connectors
   */
  private async buildCatalog(options: CatalogOptions): Promise<SchemaCatalog> {
    const bindings: Record<string, CatalogBinding> = {};
    const connectorsMeta: Record<string, { name: string; type: string; bindingCount: number }> = {};
    const relationships: Record<string, string[]> = {};

    // Fetch schemas from all enabled connectors in parallel
    const activeConnectors = Array.from(this.connectors.values()).filter(
      (c) => options.includeDisabled || !this.disabledConnectors.has(c.id)
    );

    const schemas = await Promise.allSettled(
      activeConnectors.map(async (connector) => {
        const schema = await connector.getSchema();
        return { connector, schema };
      })
    );

    // Merge schemas into unified catalog
    for (const result of schemas) {
      if (result.status === 'rejected') {
        console.error('Failed to fetch connector schema:', result.reason);
        continue;
      }

      const { connector, schema } = result.value;

      // Track connector metadata
      connectorsMeta[connector.id] = {
        name: connector.name,
        type: connector.type,
        bindingCount: Object.keys(schema.bindings).length,
      };

      // Add each binding with connector info
      for (const [bindingName, bindingSchema] of Object.entries(schema.bindings)) {
        // Check for naming conflicts
        if (bindings[bindingName]) {
          console.warn(
            `Binding '${bindingName}' from '${connector.id}' conflicts with existing binding from '${bindings[bindingName].connector}'. Using first registered.`
          );
          continue;
        }

        bindings[bindingName] = {
          ...bindingSchema,
          connector: connector.id,
          qualifiedName: `${connector.id}.${bindingName}`,
        };
      }

      // Merge relationships
      if (schema.relationships) {
        Object.assign(relationships, schema.relationships);
      }
    }

    return {
      bindings,
      connectors: connectorsMeta,
      relationships,
      timestamp: Date.now(),
    };
  }

  /**
   * Dispose all connectors
   */
  async dispose(): Promise<void> {
    const disposals = Array.from(this.connectors.values())
      .filter((c) => c.dispose)
      .map((c) => c.dispose!());

    await Promise.allSettled(disposals);
    this.connectors.clear();
    this.disabledConnectors.clear();
    this.invalidateCatalog();
  }
}

// ============================================================================
// Catalog Utilities
// ============================================================================

/**
 * Filter catalog bindings by type
 */
export function filterBindingsByType(
  catalog: SchemaCatalog,
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
): Record<string, CatalogBinding> {
  return Object.fromEntries(
    Object.entries(catalog.bindings).filter(([_, b]) => b.type === type)
  );
}

/**
 * Get bindings that support real-time updates
 */
export function getRealtimeBindings(catalog: SchemaCatalog): Record<string, CatalogBinding> {
  return Object.fromEntries(
    Object.entries(catalog.bindings).filter(([_, b]) => b.realtime)
  );
}

/**
 * Get bindings from a specific connector
 */
export function getConnectorBindings(
  catalog: SchemaCatalog,
  connectorId: string
): Record<string, CatalogBinding> {
  return Object.fromEntries(
    Object.entries(catalog.bindings).filter(([_, b]) => b.connector === connectorId)
  );
}

/**
 * Format catalog as YAML-like string for debugging
 */
export function formatCatalog(catalog: SchemaCatalog): string {
  const lines: string[] = ['# Schema Catalog', ''];

  // Group by connector
  const byConnector = new Map<string, Array<[string, CatalogBinding]>>();
  for (const [name, binding] of Object.entries(catalog.bindings)) {
    const existing = byConnector.get(binding.connector) ?? [];
    existing.push([name, binding]);
    byConnector.set(binding.connector, existing);
  }

  for (const [connectorId, bindings] of byConnector) {
    const meta = catalog.connectors[connectorId];
    lines.push(`## ${meta?.name ?? connectorId} (${meta?.type ?? 'unknown'})`);
    lines.push('');

    for (const [name, binding] of bindings) {
      const realtime = binding.realtime ? ' [realtime]' : '';
      lines.push(`- :${name} (${binding.type})${realtime}`);
      lines.push(`  ${binding.description}`);
      if (binding.example !== undefined) {
        lines.push(`  Example: ${JSON.stringify(binding.example)}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
