// Liquid Platform - Connector infrastructure for dynamic data sources
// ============================================================================

// Core interfaces
export {
  // Types
  type ConnectorType,
  type DataTypeSchema,
  type ParamDef,
  type BindingSchema,
  type ConnectorSchema,
  type HealthCheckResult,
  type Unsubscribe,
  type DataCallback,
  type QueryOptions,
  type SubscribeOptions,
  type Connector,
  type ConnectorConfig,
  type ConnectorFactory,
  // Base class
  BaseConnector,
} from './connector';

// Catalog system
export {
  type CatalogBinding,
  type SchemaCatalog,
  type CatalogOptions,
  CatalogRegistry,
  // Utilities
  filterBindingsByType,
  getRealtimeBindings,
  getConnectorBindings,
  formatCatalog,
} from './catalog';

// Binding resolver
export {
  type DataContext,
  type PermissionChecker,
  type ResolverCache,
  type ResolveOptions,
  type ResolveResult,
  BindingResolver,
  // Built-in implementations
  MemoryCache,
  AllowAllPermissions,
} from './resolver';

// AI prompt generation
export {
  type PromptGeneratorOptions,
  generateSystemPrompt,
  generateBindingsSection,
  generateMinimalPrompt,
  generateConnectorSection,
  estimateTokens,
  truncatePrompt,
} from './prompt-generator';

// Connectors
export {
  type MemoryBinding,
  type MemoryConnectorConfig,
  MemoryConnector,
  createDemoConnector,
  createConnectorFromData,
} from './connectors/memory-connector';

export {
  type RestEndpoint,
  type RestConnectorConfig,
  RestConnector,
  RestConnectorBuilder,
  createRestConnector,
  createJsonApiConnector,
  createGraphQLConnector,
} from './connectors/rest-connector';

// AI Pipeline
export {
  type AIProviderConfig,
  type GenerateOptions,
  type GenerationState,
  type GenerationProgress,
  type GenerationResult,
  type ProgressCallback,
  AIPipeline,
  generateOnce,
  validateDsl,
} from './ai-pipeline';

// React Hooks
export {
  type UseLiquidAIOptions,
  type UseLiquidAIReturn,
  type UseSimpleLiquidAIOptions,
  type LiquidAIProviderProps,
  useLiquidAI,
  useSimpleLiquidAI,
  LiquidAIProvider,
  useLiquidAIFromContext,
} from './use-liquid-ai';

// ============================================================================
// Convenience Factory
// ============================================================================

import { CatalogRegistry } from './catalog';
import { BindingResolver, MemoryCache, AllowAllPermissions } from './resolver';
import { createDemoConnector } from './connectors/memory-connector';

/**
 * Options for creating a Liquid Platform instance
 */
export interface LiquidPlatformOptions {
  /** Enable caching (default: true) */
  cache?: boolean;
  /** Cache TTL in milliseconds (default: 30000) */
  cacheTtl?: number;
  /** Permission checker (default: allow all) */
  permissions?: import('./resolver').PermissionChecker;
  /** Catalog refresh TTL in milliseconds (default: 60000) */
  catalogTtl?: number;
}

/**
 * Complete Liquid Platform instance
 */
export interface LiquidPlatform {
  /** Connector registry and catalog */
  catalog: CatalogRegistry;
  /** Binding resolver for data fetching */
  resolver: BindingResolver;
  /** Clean up resources */
  dispose: () => Promise<void>;
}

/**
 * Create a complete Liquid Platform instance
 */
export function createLiquidPlatform(options: LiquidPlatformOptions = {}): LiquidPlatform {
  const {
    cache = true,
    cacheTtl = 30_000,
    permissions = new AllowAllPermissions(),
    catalogTtl = 60_000,
  } = options;

  const catalogRegistry = new CatalogRegistry({ catalogTtl });
  const memoryCache = cache ? new MemoryCache() : undefined;

  const resolver = new BindingResolver({
    catalog: catalogRegistry,
    cache: memoryCache,
    permissions,
    defaultCacheTtl: cacheTtl,
  });

  return {
    catalog: catalogRegistry,
    resolver,
    dispose: async () => {
      resolver.unsubscribeAll();
      await catalogRegistry.dispose();
      if (memoryCache) {
        memoryCache.dispose();
      }
    },
  };
}

/**
 * Create a demo platform with sample data
 */
export function createDemoPlatform(): LiquidPlatform {
  const platform = createLiquidPlatform();
  platform.catalog.register(createDemoConnector());
  return platform;
}
