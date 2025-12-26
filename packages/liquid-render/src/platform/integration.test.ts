// Platform Integration Test
// Demonstrates the complete flow: Connectors → Catalog → Resolver → LiquidUI
// ============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createLiquidPlatform,
  createDemoPlatform,
  createConnectorFromData,
  generateSystemPrompt,
  generateMinimalPrompt,
  type LiquidPlatform,
} from './index';
import { parseUI } from '../compiler/ui-compiler';

describe('Platform Integration', () => {
  let platform: LiquidPlatform;

  afterEach(async () => {
    if (platform) {
      await platform.dispose();
    }
  });

  describe('Demo Platform', () => {
    beforeEach(() => {
      platform = createDemoPlatform();
    });

    it('should create platform with demo connector', async () => {
      const connectors = platform.catalog.listConnectors();
      expect(connectors).toHaveLength(1);
      expect(connectors[0]).toEqual({
        id: 'demo',
        name: 'Demo Data',
        type: 'memory',
        enabled: true,
      });
    });

    it('should generate catalog with all demo bindings', async () => {
      const catalog = await platform.catalog.getCatalog();

      // Check metrics
      expect(catalog.bindings.revenue).toBeDefined();
      expect(catalog.bindings.revenue!.type).toBe('number');
      expect(catalog.bindings.orders).toBeDefined();
      expect(catalog.bindings.customers).toBeDefined();
      expect(catalog.bindings.growth).toBeDefined();

      // Check arrays
      expect(catalog.bindings.monthlyData).toBeDefined();
      expect(catalog.bindings.monthlyData!.type).toBe('array');
      expect(catalog.bindings.salesByRegion).toBeDefined();
      expect(catalog.bindings.recentOrders).toBeDefined();

      // Check real-time
      expect(catalog.bindings.liveUsers!.realtime).toBe(true);
      expect(catalog.bindings.liveRevenue!.realtime).toBe(true);
    });

    it('should resolve bindings from DSL', async () => {
      const dsl = 'Kp :revenue :orders Br :salesByRegion';
      const schema = parseUI(dsl);

      const result = await platform.resolver.resolve(schema);

      expect(result.resolved).toContain('revenue');
      expect(result.resolved).toContain('orders');
      expect(result.resolved).toContain('salesByRegion');
      expect(result.failed).toHaveLength(0);
      expect(result.denied).toHaveLength(0);

      // Check data
      expect(result.data.revenue).toBe(1250000);
      expect(result.data.orders).toBe(2847);
      expect(Array.isArray(result.data.salesByRegion)).toBe(true);
    });

    it('should extract bindings from complex DSL', async () => {
      const dsl = `
        @tab
        Cn ^r [ Bt "Overview" >tab=0 Bt "Charts" >tab=1 Bt "Data" >tab=2 ]
        ?@tab=0 Kp :summary
        ?@tab=1 Ln :monthlyData
        ?@tab=2 Tb :recentOrders
      `;
      const schema = parseUI(dsl);
      const bindings = platform.resolver.extractBindings(schema);

      expect(bindings).toContain('summary');
      expect(bindings).toContain('monthlyData');
      expect(bindings).toContain('recentOrders');
    });

    it('should resolve nested binding fields', async () => {
      const dsl = 'Kp :summary.revenue :summary.orders';
      const schema = parseUI(dsl);
      const bindings = platform.resolver.extractBindings(schema);

      // Should extract root 'summary' from nested paths
      expect(bindings).toContain('summary');
    });

    it('should include timing information', async () => {
      const dsl = 'Kp :revenue Br :salesByRegion';
      const schema = parseUI(dsl);

      const result = await platform.resolver.resolve(schema);

      expect(result.timing.total).toBeGreaterThanOrEqual(0);
      expect(result.timing.byConnector).toHaveProperty('demo');
    });
  });

  describe('Custom Connector', () => {
    it('should create connector from raw data', async () => {
      platform = createLiquidPlatform();

      const connector = createConnectorFromData('custom', 'Custom Data', {
        totalSales: 50000,
        activeUsers: 1234,
        topProducts: [
          { name: 'Widget A', sales: 100 },
          { name: 'Widget B', sales: 85 },
        ],
        settings: { darkMode: true, language: 'en' },
      });

      platform.catalog.register(connector);

      const catalog = await platform.catalog.getCatalog();

      expect(catalog.bindings.totalSales!.type).toBe('number');
      expect(catalog.bindings.activeUsers!.type).toBe('number');
      expect(catalog.bindings.topProducts!.type).toBe('array');
      expect(catalog.bindings.settings!.type).toBe('object');
    });

    it('should resolve custom bindings', async () => {
      platform = createLiquidPlatform();

      const connector = createConnectorFromData('sales', 'Sales Data', {
        revenue: 75000,
        deals: [
          { client: 'Acme', value: 25000 },
          { client: 'Beta', value: 50000 },
        ],
      });

      platform.catalog.register(connector);

      const dsl = 'Kp :revenue Tb :deals';
      const schema = parseUI(dsl);
      const result = await platform.resolver.resolve(schema);

      expect(result.data.revenue).toBe(75000);
      expect(result.data.deals).toHaveLength(2);
    });
  });

  describe('Multiple Connectors', () => {
    it('should merge bindings from multiple connectors', async () => {
      platform = createLiquidPlatform();

      // Register two connectors with different data
      platform.catalog.register(
        createConnectorFromData('sales', 'Sales', { revenue: 100000, orders: 500 })
      );
      platform.catalog.register(
        createConnectorFromData('marketing', 'Marketing', { leads: 2500, campaigns: 12 })
      );

      const catalog = await platform.catalog.getCatalog();

      // Should have bindings from both
      expect(catalog.bindings.revenue!.connector).toBe('sales');
      expect(catalog.bindings.orders!.connector).toBe('sales');
      expect(catalog.bindings.leads!.connector).toBe('marketing');
      expect(catalog.bindings.campaigns!.connector).toBe('marketing');
    });

    it('should resolve from correct connectors', async () => {
      platform = createLiquidPlatform();

      platform.catalog.register(
        createConnectorFromData('a', 'Source A', { metricA: 100 })
      );
      platform.catalog.register(
        createConnectorFromData('b', 'Source B', { metricB: 200 })
      );

      const dsl = 'Kp :metricA :metricB';
      const schema = parseUI(dsl);
      const result = await platform.resolver.resolve(schema);

      expect(result.data.metricA).toBe(100);
      expect(result.data.metricB).toBe(200);
      expect(result.timing.byConnector).toHaveProperty('a');
      expect(result.timing.byConnector).toHaveProperty('b');
    });

    it('should handle binding name conflicts', async () => {
      platform = createLiquidPlatform();

      // Both connectors have 'revenue' - first one wins
      platform.catalog.register(
        createConnectorFromData('first', 'First', { revenue: 100 })
      );
      platform.catalog.register(
        createConnectorFromData('second', 'Second', { revenue: 200 })
      );

      const catalog = await platform.catalog.getCatalog();

      // First connector's binding should win
      expect(catalog.bindings.revenue!.connector).toBe('first');
    });
  });

  describe('AI Prompt Generation', () => {
    beforeEach(() => {
      platform = createDemoPlatform();
    });

    it('should generate system prompt with all bindings', async () => {
      const catalog = await platform.catalog.getCatalog();
      const prompt = generateSystemPrompt(catalog);

      // Should include header
      expect(prompt).toContain('LiquidCode UI Generator');

      // Should include bindings
      expect(prompt).toContain(':revenue');
      expect(prompt).toContain(':orders');
      expect(prompt).toContain(':monthlyData');
      expect(prompt).toContain(':salesByRegion');

      // Should include real-time markers
      expect(prompt).toContain(':liveUsers');

      // Should include syntax reference
      expect(prompt).toContain('Kp');
      expect(prompt).toContain('Ln');
      expect(prompt).toContain('Br');

      // Should include rules
      expect(prompt).toContain('Only use listed bindings');
    });

    it('should generate minimal prompt for constrained contexts', async () => {
      const catalog = await platform.catalog.getCatalog();
      const prompt = generateMinimalPrompt(catalog);

      expect(prompt.length).toBeLessThan(500);
      expect(prompt).toContain(':revenue');
      expect(prompt).toContain('Kp');
    });

    it('should respect verbosity options', async () => {
      const catalog = await platform.catalog.getCatalog();

      const minimalPrompt = generateSystemPrompt(catalog, { verbosity: 'minimal' });
      const detailedPrompt = generateSystemPrompt(catalog, { verbosity: 'detailed' });

      expect(detailedPrompt.length).toBeGreaterThan(minimalPrompt.length);
    });

    it('should limit bindings when specified', async () => {
      const catalog = await platform.catalog.getCatalog();
      const prompt = generateSystemPrompt(catalog, { maxBindings: 3 });

      // Should mention there are more
      expect(prompt).toContain('more bindings');
    });
  });

  describe('Caching', () => {
    it('should cache resolved data', async () => {
      platform = createDemoPlatform();

      const dsl = 'Kp :revenue';
      const schema = parseUI(dsl);

      // First resolve
      const result1 = await platform.resolver.resolve(schema);
      expect(result1.data.revenue).toBe(1250000);

      // Second resolve should use cache (much faster)
      const result2 = await platform.resolver.resolve(schema);
      expect(result2.data.revenue).toBe(1250000);

      // Timing for second should be less (cached)
      // Note: This might be flaky due to timing variations
      expect(result2.timing.total).toBeLessThanOrEqual(result1.timing.total + 10);
    });

    it('should bypass cache when requested', async () => {
      platform = createDemoPlatform();

      const dsl = 'Kp :revenue';
      const schema = parseUI(dsl);

      await platform.resolver.resolve(schema);
      const result = await platform.resolver.resolve(schema, { noCache: true });

      // Should still work
      expect(result.data.revenue).toBe(1250000);
    });

    it('should clear cache', async () => {
      platform = createDemoPlatform();

      const dsl = 'Kp :revenue';
      const schema = parseUI(dsl);

      await platform.resolver.resolve(schema);
      await platform.resolver.clearCache();

      // Should still work after cache clear
      const result = await platform.resolver.resolve(schema);
      expect(result.data.revenue).toBe(1250000);
    });
  });

  describe('Error Handling', () => {
    it('should report unknown bindings as failed', async () => {
      platform = createDemoPlatform();

      // Create schema with unknown binding manually
      const schema = parseUI('Kp :unknownBinding');
      const result = await platform.resolver.resolve(schema);

      // unknownBinding should not be in resolved
      expect(result.resolved).not.toContain('unknownBinding');
    });

    it('should handle empty schema gracefully', async () => {
      platform = createDemoPlatform();

      const schema = parseUI('Cn []');
      const result = await platform.resolver.resolve(schema);

      expect(result.data).toEqual({});
      expect(result.resolved).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('Connector Management', () => {
    it('should disable and enable connectors', async () => {
      platform = createDemoPlatform();

      // Disable demo connector
      platform.catalog.disable('demo');

      const catalog = await platform.catalog.getCatalog({ refresh: true });
      expect(Object.keys(catalog.bindings)).toHaveLength(0);

      // Re-enable
      platform.catalog.enable('demo');

      const catalogAfter = await platform.catalog.getCatalog({ refresh: true });
      expect(Object.keys(catalogAfter.bindings).length).toBeGreaterThan(0);
    });

    it('should unregister connectors', async () => {
      platform = createDemoPlatform();

      expect(platform.catalog.listConnectors()).toHaveLength(1);

      platform.catalog.unregister('demo');

      expect(platform.catalog.listConnectors()).toHaveLength(0);
    });
  });
});

describe('Full Integration Example', () => {
  it('should demonstrate complete AI-to-render flow', async () => {
    // 1. Create platform with data sources
    const platform = createDemoPlatform();

    try {
      // 2. Generate AI system prompt from catalog
      const catalog = await platform.catalog.getCatalog();
      const systemPrompt = generateSystemPrompt(catalog);

      // Verify prompt is useful for AI
      expect(systemPrompt).toContain('Available Data Bindings');
      expect(systemPrompt).toContain(':revenue');

      // 3. Simulate AI generating DSL (in reality, this comes from LLM)
      const aiGeneratedDsl = `
        Cn ^r [ Kp :revenue "Revenue" #green Kp :orders "Orders" #blue ]
        Br :salesByRegion "Sales by Region"
        Tb :recentOrders "Recent Orders"
      `;

      // 4. Parse DSL to schema
      const schema = parseUI(aiGeneratedDsl);
      expect(schema.layers).toHaveLength(1);

      // 5. Resolve bindings to fetch data
      const result = await platform.resolver.resolve(schema);

      expect(result.resolved).toContain('revenue');
      expect(result.resolved).toContain('orders');
      expect(result.resolved).toContain('salesByRegion');
      expect(result.resolved).toContain('recentOrders');

      // 6. Data is ready for LiquidUI rendering
      expect(result.data.revenue).toBe(1250000);
      expect(result.data.orders).toBe(2847);
      expect(Array.isArray(result.data.salesByRegion)).toBe(true);
      expect(Array.isArray(result.data.recentOrders)).toBe(true);

      // In a real app:
      // <LiquidUI schema={schema} data={result.data} />
    } finally {
      await platform.dispose();
    }
  });
});
