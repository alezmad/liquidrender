// Memory Connector - In-memory data source for testing and demos
// ============================================================================

import type {
  Connector,
  ConnectorSchema,
  BindingSchema,
  QueryOptions,
  SubscribeOptions,
  DataCallback,
  Unsubscribe,
  HealthCheckResult,
} from '../connector';

/**
 * Memory binding definition with data and optional simulator
 */
export interface MemoryBinding<T = unknown> {
  /** The static data or initial value */
  data: T;
  /** Schema definition */
  schema: BindingSchema;
  /** Optional function to simulate real-time updates */
  simulator?: (current: T) => T;
  /** Simulation interval in ms (default 1000) */
  simulationInterval?: number;
}

/**
 * Configuration for MemoryConnector
 */
export interface MemoryConnectorConfig {
  id: string;
  name: string;
  bindings: Record<string, MemoryBinding>;
}

/**
 * Active simulation state
 */
interface SimulationState {
  binding: string;
  interval: ReturnType<typeof setInterval>;
  callbacks: Set<DataCallback>;
  currentValue: unknown;
}

/**
 * In-memory connector for testing, demos, and prototyping
 *
 * Features:
 * - Define bindings with static data
 * - Optional real-time simulation
 * - Full schema support
 */
export class MemoryConnector implements Connector {
  readonly id: string;
  readonly type = 'memory' as const;
  readonly name: string;

  private bindings: Map<string, MemoryBinding>;
  private simulations: Map<string, SimulationState> = new Map();

  constructor(config: MemoryConnectorConfig) {
    this.id = config.id;
    this.name = config.name;
    this.bindings = new Map(Object.entries(config.bindings));
  }

  async getSchema(): Promise<ConnectorSchema> {
    const schema: ConnectorSchema = {
      bindings: {},
    };

    for (const [name, binding] of this.bindings) {
      schema.bindings[name] = {
        ...binding.schema,
        realtime: !!binding.simulator,
      };
    }

    return schema;
  }

  async query<T = unknown>(binding: string, _options?: QueryOptions): Promise<T> {
    const memBinding = this.bindings.get(binding);

    if (!memBinding) {
      throw new Error(`Unknown binding: ${binding}`);
    }

    // If there's an active simulation, return current simulated value
    const sim = this.simulations.get(binding);
    if (sim) {
      return sim.currentValue as T;
    }

    return memBinding.data as T;
  }

  subscribe<T = unknown>(
    binding: string,
    callback: DataCallback<T>,
    options?: SubscribeOptions
  ): Unsubscribe {
    const memBinding = this.bindings.get(binding);

    if (!memBinding) {
      callback(undefined as T, new Error(`Unknown binding: ${binding}`));
      return () => {};
    }

    if (!memBinding.simulator) {
      callback(undefined as T, new Error(`Binding '${binding}' does not support real-time`));
      return () => {};
    }

    // Get or create simulation
    let sim = this.simulations.get(binding);

    if (!sim) {
      sim = this.startSimulation(binding, memBinding);
    }

    // Add callback
    sim.callbacks.add(callback as DataCallback);

    // Send current value immediately
    callback(sim.currentValue as T);

    // Return unsubscribe function
    return () => {
      sim!.callbacks.delete(callback as DataCallback);

      // Stop simulation if no more subscribers
      if (sim!.callbacks.size === 0) {
        this.stopSimulation(binding);
      }
    };
  }

  async test(): Promise<HealthCheckResult> {
    return {
      ok: true,
      latencyMs: 0,
      details: {
        bindingCount: this.bindings.size,
        activeSimulations: this.simulations.size,
      },
    };
  }

  async dispose(): Promise<void> {
    // Stop all simulations
    for (const binding of this.simulations.keys()) {
      this.stopSimulation(binding);
    }
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  /**
   * Update binding data programmatically
   */
  setData<T>(binding: string, data: T): void {
    const memBinding = this.bindings.get(binding);
    if (!memBinding) {
      throw new Error(`Unknown binding: ${binding}`);
    }

    memBinding.data = data;

    // If simulating, update current value and notify
    const sim = this.simulations.get(binding);
    if (sim) {
      sim.currentValue = data;
      this.notifySubscribers(sim, data);
    }
  }

  /**
   * Add a new binding at runtime
   */
  addBinding<T>(name: string, binding: MemoryBinding<T>): void {
    if (this.bindings.has(name)) {
      throw new Error(`Binding '${name}' already exists`);
    }
    this.bindings.set(name, binding);
  }

  /**
   * Remove a binding
   */
  removeBinding(name: string): boolean {
    this.stopSimulation(name);
    return this.bindings.delete(name);
  }

  // ============================================================================
  // Simulation
  // ============================================================================

  private startSimulation(binding: string, memBinding: MemoryBinding): SimulationState {
    const interval = memBinding.simulationInterval ?? 1000;

    const state: SimulationState = {
      binding,
      currentValue: memBinding.data,
      callbacks: new Set(),
      interval: setInterval(() => {
        if (memBinding.simulator) {
          state.currentValue = memBinding.simulator(state.currentValue);
          this.notifySubscribers(state, state.currentValue);
        }
      }, interval),
    };

    this.simulations.set(binding, state);
    return state;
  }

  private stopSimulation(binding: string): void {
    const sim = this.simulations.get(binding);
    if (sim) {
      clearInterval(sim.interval);
      this.simulations.delete(binding);
    }
  }

  private notifySubscribers(sim: SimulationState, data: unknown): void {
    for (const callback of sim.callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in subscription callback for '${sim.binding}':`, error);
      }
    }
  }
}

// ============================================================================
// Demo Data Factory
// ============================================================================

/**
 * Create a demo connector with sample dashboard data
 */
export function createDemoConnector(): MemoryConnector {
  return new MemoryConnector({
    id: 'demo',
    name: 'Demo Data',
    bindings: {
      // Single metrics
      revenue: {
        data: 1250000,
        schema: {
          type: 'number',
          description: 'Total revenue',
          example: 1250000,
          suggestedComponent: 'Kp',
        },
      },
      orders: {
        data: 2847,
        schema: {
          type: 'number',
          description: 'Total orders',
          example: 2847,
          suggestedComponent: 'Kp',
        },
      },
      customers: {
        data: 1293,
        schema: {
          type: 'number',
          description: 'Total customers',
          example: 1293,
          suggestedComponent: 'Kp',
        },
      },
      growth: {
        data: 0.14,
        schema: {
          type: 'number',
          description: 'Growth rate (decimal)',
          example: 0.14,
          suggestedComponent: 'Kp',
        },
      },

      // Object (auto-expands with Kp)
      summary: {
        data: {
          revenue: 1250000,
          orders: 2847,
          customers: 1293,
          growth: 0.14,
        },
        schema: {
          type: 'object',
          description: 'Dashboard summary metrics',
          suggestedComponent: 'Kp',
        },
      },

      // Time series (for line charts)
      monthlyData: {
        data: [
          { month: 'Jan', revenue: 65000, orders: 420, profit: 12000 },
          { month: 'Feb', revenue: 72000, orders: 480, profit: 15000 },
          { month: 'Mar', revenue: 68000, orders: 450, profit: 13500 },
          { month: 'Apr', revenue: 85000, orders: 520, profit: 18000 },
          { month: 'May', revenue: 92000, orders: 580, profit: 21000 },
          { month: 'Jun', revenue: 78000, orders: 510, profit: 16000 },
        ],
        schema: {
          type: 'array',
          description: 'Monthly performance data',
          suggestedComponent: 'Ln',
          schema: {
            type: 'array',
            items: {
              month: { type: 'string' },
              revenue: { type: 'number' },
              orders: { type: 'number' },
              profit: { type: 'number' },
            },
          },
        },
      },

      // Categorical data (for bar/pie charts)
      salesByRegion: {
        data: [
          { region: 'North', amount: 450000 },
          { region: 'South', amount: 320000 },
          { region: 'East', amount: 280000 },
          { region: 'West', amount: 200000 },
        ],
        schema: {
          type: 'array',
          description: 'Sales breakdown by region',
          suggestedComponent: 'Br',
        },
      },

      salesByCategory: {
        data: [
          { category: 'Electronics', sales: 420000 },
          { category: 'Clothing', sales: 310000 },
          { category: 'Home', sales: 260000 },
          { category: 'Sports', sales: 160000 },
          { category: 'Other', sales: 100000 },
        ],
        schema: {
          type: 'array',
          description: 'Sales by product category',
          suggestedComponent: 'Pi',
        },
      },

      // Table data
      recentOrders: {
        data: [
          { id: 'ORD-001', customer: 'Acme Corp', amount: 12500, date: '2024-06-15', status: 'Completed' },
          { id: 'ORD-002', customer: 'TechStart', amount: 8900, date: '2024-06-14', status: 'Completed' },
          { id: 'ORD-003', customer: 'Global Inc', amount: 15200, date: '2024-06-14', status: 'Pending' },
          { id: 'ORD-004', customer: 'StartupXYZ', amount: 4500, date: '2024-06-13', status: 'Completed' },
          { id: 'ORD-005', customer: 'MegaCorp', amount: 28000, date: '2024-06-12', status: 'Completed' },
        ],
        schema: {
          type: 'array',
          description: 'Recent order transactions',
          suggestedComponent: 'Tb',
        },
      },

      // Real-time metrics (with simulator)
      liveUsers: {
        data: 1247,
        schema: {
          type: 'number',
          description: 'Current active users (real-time)',
          suggestedComponent: 'Kp',
        },
        simulator: (current: number) => {
          // Random walk simulation
          const change = Math.floor(Math.random() * 50) - 25;
          return Math.max(0, current + change);
        },
        simulationInterval: 2000,
      },

      liveRevenue: {
        data: 45230,
        schema: {
          type: 'number',
          description: 'Today\'s revenue (real-time)',
          suggestedComponent: 'Kp',
        },
        simulator: (current: number) => {
          // Accumulating revenue
          const sale = Math.floor(Math.random() * 500);
          return current + sale;
        },
        simulationInterval: 3000,
      },
    },
  });
}

/**
 * Create a connector from raw data object
 * Automatically infers schema from data types
 */
export function createConnectorFromData(
  id: string,
  name: string,
  data: Record<string, unknown>
): MemoryConnector {
  const bindings: Record<string, MemoryBinding> = {};

  for (const [key, value] of Object.entries(data)) {
    bindings[key] = {
      data: value,
      schema: inferSchema(value, key),
    };
  }

  return new MemoryConnector({ id, name, bindings });
}

/**
 * Infer binding schema from data
 */
function inferSchema(value: unknown, name: string): BindingSchema {
  if (value === null || value === undefined) {
    return { type: 'string', description: name };
  }

  if (typeof value === 'number') {
    return {
      type: 'number',
      description: formatName(name),
      suggestedComponent: 'Kp',
      example: value,
    };
  }

  if (typeof value === 'string') {
    return {
      type: 'string',
      description: formatName(name),
      example: value,
    };
  }

  if (typeof value === 'boolean') {
    return {
      type: 'boolean',
      description: formatName(name),
      example: value,
    };
  }

  if (Array.isArray(value)) {
    const firstItem = value[0];
    const suggestedComponent = firstItem && typeof firstItem === 'object'
      ? (Object.keys(firstItem).length <= 3 ? 'Br' : 'Tb')
      : 'Ls';

    return {
      type: 'array',
      description: formatName(name),
      suggestedComponent,
      example: value.slice(0, 2),
    };
  }

  if (typeof value === 'object') {
    return {
      type: 'object',
      description: formatName(name),
      suggestedComponent: 'Kp',
    };
  }

  return { type: 'string', description: formatName(name) };
}

/**
 * Format camelCase/snake_case name to readable description
 */
function formatName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
