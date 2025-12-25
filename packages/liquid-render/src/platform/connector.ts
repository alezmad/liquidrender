// Connector Interface - Unified abstraction over data sources
// ============================================================================

/**
 * Supported connector types
 */
export type ConnectorType = 'database' | 'rest' | 'graphql' | 'websocket' | 'memory';

/**
 * JSON Schema subset for describing data shapes
 */
export interface DataTypeSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  items?: DataTypeSchema | Record<string, DataTypeSchema>;
  properties?: Record<string, DataTypeSchema>;
  example?: unknown;
}

/**
 * Parameter definition for bindings that accept arguments
 */
export interface ParamDef {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required?: boolean;
  default?: unknown;
  description?: string;
}

/**
 * Describes a single data binding provided by a connector
 */
export interface BindingSchema {
  /** Data type returned by this binding */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Human-readable description for AI context */
  description: string;
  /** Detailed schema for complex types */
  schema?: DataTypeSchema;
  /** Whether this binding supports real-time subscriptions */
  realtime?: boolean;
  /** Parameters this binding accepts */
  params?: ParamDef[];
  /** Example value(s) for AI context */
  example?: unknown;
  /** Suggested LiquidCode component (Kp, Ln, Br, Pi, Tb) */
  suggestedComponent?: string;
  /** Cache TTL in milliseconds (0 = no cache) */
  cacheTtl?: number;
}

/**
 * Schema exposed by a connector
 */
export interface ConnectorSchema {
  /** All bindings this connector provides */
  bindings: Record<string, BindingSchema>;
  /** Optional relationships between bindings */
  relationships?: Record<string, string[]>;
}

/**
 * Result of a connector health check
 */
export interface HealthCheckResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Unsubscribe function returned by subscribe()
 */
export type Unsubscribe = () => void;

/**
 * Callback for real-time data updates
 */
export type DataCallback<T = unknown> = (data: T, error?: Error) => void;

/**
 * Query options for fetching data
 */
export interface QueryOptions {
  /** Parameters to pass to the binding */
  params?: Record<string, unknown>;
  /** Force bypass cache */
  noCache?: boolean;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Subscription options for real-time data
 */
export interface SubscribeOptions {
  /** Parameters to pass to the binding */
  params?: Record<string, unknown>;
  /** Reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnect attempts (0 = infinite) */
  maxReconnects?: number;
}

/**
 * Core Connector Interface
 *
 * A connector provides a unified interface to any data source:
 * - Databases (PostgreSQL, MongoDB, etc.)
 * - REST APIs
 * - GraphQL endpoints
 * - WebSocket streams
 * - In-memory data
 */
export interface Connector {
  /** Unique identifier for this connector */
  readonly id: string;

  /** Type of data source */
  readonly type: ConnectorType;

  /** Human-readable name */
  readonly name: string;

  /**
   * Get the schema describing all available bindings
   */
  getSchema(): Promise<ConnectorSchema>;

  /**
   * Query a specific binding for data
   * @param binding - The binding name (e.g., 'revenue', 'salesByRegion')
   * @param options - Query options
   * @returns The data for this binding
   */
  query<T = unknown>(binding: string, options?: QueryOptions): Promise<T>;

  /**
   * Subscribe to real-time updates for a binding
   * @param binding - The binding name
   * @param callback - Called when data updates
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  subscribe?<T = unknown>(
    binding: string,
    callback: DataCallback<T>,
    options?: SubscribeOptions
  ): Unsubscribe;

  /**
   * Check connector health/connectivity
   */
  test(): Promise<HealthCheckResult>;

  /**
   * Clean up resources (connections, subscriptions)
   */
  dispose?(): Promise<void>;
}

/**
 * Configuration for creating a connector
 */
export interface ConnectorConfig {
  id: string;
  name: string;
  type: ConnectorType;
  /** Connection string or base URL */
  connection?: string;
  /** Authentication credentials */
  auth?: {
    type: 'basic' | 'bearer' | 'api-key' | 'custom';
    credentials: Record<string, string>;
  };
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Default cache TTL in milliseconds */
  cacheTtl?: number;
  /** Additional type-specific options */
  options?: Record<string, unknown>;
}

/**
 * Factory function type for creating connectors
 */
export type ConnectorFactory = (config: ConnectorConfig) => Connector;

// ============================================================================
// Base Connector Class (optional helper)
// ============================================================================

/**
 * Abstract base class with common connector functionality
 */
export abstract class BaseConnector implements Connector {
  readonly id: string;
  readonly type: ConnectorType;
  readonly name: string;

  protected config: ConnectorConfig;
  protected schemaCache: ConnectorSchema | null = null;

  constructor(config: ConnectorConfig) {
    this.id = config.id;
    this.type = config.type;
    this.name = config.name;
    this.config = config;
  }

  async getSchema(): Promise<ConnectorSchema> {
    if (!this.schemaCache) {
      this.schemaCache = await this.fetchSchema();
    }
    return this.schemaCache;
  }

  /**
   * Override to provide schema discovery
   */
  protected abstract fetchSchema(): Promise<ConnectorSchema>;

  abstract query<T = unknown>(binding: string, options?: QueryOptions): Promise<T>;

  abstract test(): Promise<HealthCheckResult>;

  /**
   * Invalidate schema cache (e.g., after schema changes)
   */
  invalidateSchema(): void {
    this.schemaCache = null;
  }
}
