// REST Connector - Connect to REST APIs as data sources
// ============================================================================

import {
  BaseConnector,
  type ConnectorConfig,
  type ConnectorSchema,
  type BindingSchema,
  type QueryOptions,
  type HealthCheckResult,
} from '../connector';

/**
 * REST endpoint definition
 */
export interface RestEndpoint {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Path relative to base URL (can include :params) */
  path: string;
  /** Schema for this endpoint's response */
  schema: BindingSchema;
  /** Default query parameters */
  defaultParams?: Record<string, string | number>;
  /** Transform function for response data */
  transform?: (response: unknown) => unknown;
  /** Cache TTL override for this endpoint */
  cacheTtl?: number;
}

/**
 * REST connector configuration
 */
export interface RestConnectorConfig extends ConnectorConfig {
  /** Base URL for API requests */
  baseUrl: string;
  /** Default headers to include in all requests */
  headers?: Record<string, string>;
  /** Endpoint definitions mapped to binding names */
  endpoints: Record<string, RestEndpoint>;
  /** Global response transform */
  globalTransform?: (response: unknown) => unknown;
}

/**
 * REST API Connector
 *
 * Features:
 * - Configure endpoints as bindings
 * - Support for path parameters
 * - Response transformation
 * - Authentication via headers
 */
export class RestConnector extends BaseConnector {
  private baseUrl: string;
  private headers: Record<string, string>;
  private endpoints: Map<string, RestEndpoint>;
  private globalTransform?: (response: unknown) => unknown;

  constructor(config: RestConnectorConfig) {
    super({ ...config, type: 'rest' });
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.headers = config.headers ?? {};
    this.endpoints = new Map(Object.entries(config.endpoints));
    this.globalTransform = config.globalTransform;
  }

  protected async fetchSchema(): Promise<ConnectorSchema> {
    const bindings: Record<string, BindingSchema> = {};

    for (const [name, endpoint] of this.endpoints) {
      bindings[name] = {
        ...endpoint.schema,
        cacheTtl: endpoint.cacheTtl,
      };
    }

    return { bindings };
  }

  async query<T = unknown>(binding: string, options?: QueryOptions): Promise<T> {
    const endpoint = this.endpoints.get(binding);

    if (!endpoint) {
      throw new Error(`Unknown binding: ${binding}`);
    }

    // Build URL
    let url = `${this.baseUrl}${endpoint.path}`;

    // Replace path parameters
    const params = { ...endpoint.defaultParams, ...options?.params };
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, encodeURIComponent(String(value)));
    }

    // Add remaining params as query string for GET requests
    const method = endpoint.method ?? 'GET';
    if (method === 'GET') {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (!endpoint.path.includes(`:${key}`)) {
          queryParams.set(key, String(value));
        }
      }
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Make request
    const controller = new AbortController();
    const timeoutId = options?.timeout
      ? setTimeout(() => controller.abort(), options.timeout)
      : null;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        signal: options?.signal ?? controller.signal,
        body: method !== 'GET' && params ? JSON.stringify(params) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data = await response.json();

      // Apply transforms
      if (this.globalTransform) {
        data = this.globalTransform(data);
      }
      if (endpoint.transform) {
        data = endpoint.transform(data);
      }

      return data as T;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async test(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Try to fetch from the first endpoint as a health check
      const firstEndpoint = this.endpoints.keys().next().value;
      if (firstEndpoint) {
        await this.query(firstEndpoint, { timeout: 5000 });
      }

      return {
        ok: true,
        latencyMs: Date.now() - startTime,
        details: {
          baseUrl: this.baseUrl,
          endpointCount: this.endpoints.size,
        },
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================================================
  // Configuration Helpers
  // ============================================================================

  /**
   * Add or update an endpoint at runtime
   */
  setEndpoint(name: string, endpoint: RestEndpoint): void {
    this.endpoints.set(name, endpoint);
    this.invalidateSchema();
  }

  /**
   * Remove an endpoint
   */
  removeEndpoint(name: string): boolean {
    const removed = this.endpoints.delete(name);
    if (removed) {
      this.invalidateSchema();
    }
    return removed;
  }

  /**
   * Update default headers
   */
  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  /**
   * Set authorization header
   */
  setAuthorization(type: 'Bearer' | 'Basic' | 'ApiKey', token: string): void {
    if (type === 'ApiKey') {
      this.headers['X-API-Key'] = token;
    } else {
      this.headers['Authorization'] = `${type} ${token}`;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Quick REST connector builder
 */
export class RestConnectorBuilder {
  private config: Partial<RestConnectorConfig> = {
    endpoints: {},
  };

  constructor(id: string, name: string) {
    this.config.id = id;
    this.config.name = name;
  }

  baseUrl(url: string): this {
    this.config.baseUrl = url;
    return this;
  }

  header(key: string, value: string): this {
    this.config.headers = { ...this.config.headers, [key]: value };
    return this;
  }

  bearerAuth(token: string): this {
    return this.header('Authorization', `Bearer ${token}`);
  }

  apiKey(key: string, headerName: string = 'X-API-Key'): this {
    return this.header(headerName, key);
  }

  endpoint(name: string, endpoint: RestEndpoint): this {
    this.config.endpoints![name] = endpoint;
    return this;
  }

  get(name: string, path: string, schema: BindingSchema): this {
    return this.endpoint(name, { method: 'GET', path, schema });
  }

  post(name: string, path: string, schema: BindingSchema): this {
    return this.endpoint(name, { method: 'POST', path, schema });
  }

  transform(fn: (response: unknown) => unknown): this {
    this.config.globalTransform = fn;
    return this;
  }

  build(): RestConnector {
    if (!this.config.id || !this.config.name || !this.config.baseUrl) {
      throw new Error('RestConnector requires id, name, and baseUrl');
    }
    return new RestConnector(this.config as RestConnectorConfig);
  }
}

/**
 * Create a REST connector with fluent builder
 */
export function createRestConnector(id: string, name: string): RestConnectorBuilder {
  return new RestConnectorBuilder(id, name);
}

// ============================================================================
// Common API Patterns
// ============================================================================

/**
 * Create a connector for a typical JSON:API compliant service
 */
export function createJsonApiConnector(
  id: string,
  name: string,
  baseUrl: string,
  resources: Array<{
    name: string;
    endpoint: string;
    description: string;
    type: 'array' | 'object';
  }>
): RestConnector {
  const endpoints: Record<string, RestEndpoint> = {};

  for (const resource of resources) {
    // List endpoint
    endpoints[resource.name] = {
      method: 'GET',
      path: resource.endpoint,
      schema: {
        type: resource.type,
        description: resource.description,
        suggestedComponent: resource.type === 'array' ? 'Tb' : 'Kp',
      },
      transform: (response: unknown) => {
        // JSON:API wraps data in { data: [...] }
        if (response && typeof response === 'object' && 'data' in response) {
          return (response as { data: unknown }).data;
        }
        return response;
      },
    };
  }

  return new RestConnector({
    id,
    name,
    type: 'rest',
    baseUrl,
    endpoints,
  });
}

/**
 * Create a connector for a GraphQL endpoint (simplified)
 */
export function createGraphQLConnector(
  id: string,
  name: string,
  endpoint: string,
  queries: Record<string, { query: string; schema: BindingSchema; variables?: Record<string, unknown> }>
): RestConnector {
  const endpoints: Record<string, RestEndpoint> = {};

  for (const [bindingName, config] of Object.entries(queries)) {
    endpoints[bindingName] = {
      method: 'POST',
      path: '',
      schema: config.schema,
      defaultParams: {
        query: config.query,
        ...(config.variables && { variables: JSON.stringify(config.variables) }),
      },
      transform: (response: unknown) => {
        // GraphQL wraps data in { data: { queryName: [...] } }
        if (response && typeof response === 'object' && 'data' in response) {
          const data = (response as { data: Record<string, unknown> }).data;
          // Return the first field in data
          const keys = Object.keys(data);
          return keys.length === 1 ? data[keys[0]!] : data;
        }
        return response;
      },
    };
  }

  return new RestConnector({
    id,
    name,
    type: 'rest',
    baseUrl: endpoint,
    endpoints,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
