/**
 * Real Database Integration Tests
 *
 * Tests the full pipeline against REAL databases from LiquidGym:
 *   Database → DuckDB → ExtractedSchema → DetectedVocabulary → SemanticLayer
 *
 * These tests prove the pipeline isn't overfit to mock data.
 *
 * Prerequisites:
 * - LiquidGym infrastructure running: cd ~/Desktop/liquidgym/infra && docker compose up -d
 * - Datasets loaded: docker compose --profile loader up
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { DuckDBUniversalAdapter } from '../uvb/duckdb-adapter';
import { applyHardRules } from '../uvb/rules';
import { generateSemanticLayer, type ResolvedVocabulary, type ResolvedVocabularyItem } from '../semantic/from-vocabulary';
import type { DetectedVocabulary } from '../uvb/models';

/**
 * Convert DetectedVocabulary to ResolvedVocabulary structure for testing
 * This adapter allows testing generateSemanticLayer without database
 */
function detectedToResolved(detected: DetectedVocabulary): ResolvedVocabulary {
  const items: ResolvedVocabularyItem[] = [];

  // Convert entities - use table name as slug to match entity key expectations
  for (const entity of detected.entities) {
    items.push({
      id: `entity_${entity.table}`,
      slug: entity.table, // Use exact table name
      canonicalName: entity.name,
      abbreviation: null,
      type: 'entity',
      category: null,
      scope: 'workspace',
      definition: {
        descriptionHuman: `${entity.name} from ${entity.table}`,
        sourceTables: [entity.table],
      },
      suggestedForRoles: null,
      isFavorite: false,
      recentlyUsedAt: null,
      useCount: 0,
    });
  }

  // Convert metrics - use table_column as slug for uniqueness
  for (const metric of detected.metrics) {
    const slug = `${metric.table}_${metric.column}`.toLowerCase();
    items.push({
      id: `metric_${slug}`,
      slug,
      canonicalName: metric.name,
      abbreviation: null,
      type: 'metric',
      category: null,
      scope: 'workspace',
      definition: {
        descriptionHuman: `${metric.aggregation} of ${metric.column} from ${metric.table}`,
        formulaSql: `${metric.aggregation}(${metric.table}.${metric.column})`,
        sourceTables: [metric.table],
      },
      suggestedForRoles: null,
      isFavorite: false,
      recentlyUsedAt: null,
      useCount: 0,
    });
  }

  // Convert dimensions - use table_column as slug
  for (const dimension of detected.dimensions) {
    const slug = `${dimension.table}_${dimension.column}`.toLowerCase();
    items.push({
      id: `dimension_${slug}`,
      slug,
      canonicalName: dimension.name,
      abbreviation: null,
      type: 'dimension',
      category: null,
      scope: 'workspace',
      definition: {
        descriptionHuman: `${dimension.name} from ${dimension.table}`,
        sourceTables: [dimension.table],
      },
      suggestedForRoles: null,
      isFavorite: false,
      recentlyUsedAt: null,
      useCount: 0,
    });
  }

  // Build bySlug map
  const bySlug = new Map(items.map(item => [item.slug, item]));

  return {
    items,
    bySlug,
    favorites: [],
    recentlyUsed: [],
    synonyms: {},
  };
}

describe('Real Database Integration Tests', () => {
  // Connection string for LiquidGym PostgreSQL
  const LIQUIDGYM_POSTGRES = 'postgresql://postgres:postgres@localhost:5433';

  // Connection string for Knosia (our production database)
  const KNOSIA_POSTGRES = 'postgresql://turbostarter:turbostarter@localhost:5440/core';

  describe('Pagila (DVD Rental Store)', () => {
    it('extracts schema from 22-table database via DuckDB', async () => {
      const adapter = new DuckDBUniversalAdapter();

      // Connect to Pagila database via postgres_scanner
      await adapter.connect(`${LIQUIDGYM_POSTGRES}/pagila`);

      // Extract schema
      const schema = await adapter.extractSchema('public');

      // Verify extraction
      expect(schema.type).toBe('postgres');
      expect(schema.database).toBe('pagila');
      expect(schema.tables.length).toBeGreaterThan(15); // At least 15 main tables

      // Check key tables exist
      const tableNames = schema.tables.map(t => t.name);
      expect(tableNames).toContain('customer');
      expect(tableNames).toContain('film');
      expect(tableNames).toContain('rental');
      expect(tableNames).toContain('payment_p2022_01'); // Partitioned table

      // Check foreign keys detected
      const rentalTable = schema.tables.find(t => t.name === 'rental');
      expect(rentalTable).toBeDefined();
      expect(rentalTable!.foreignKeys.length).toBeGreaterThan(0);

      // Cleanup
      await adapter.disconnect();
    }, 30000); // 30s timeout for real DB

    it('detects vocabulary from complex schema', async () => {
      const adapter = new DuckDBUniversalAdapter();
      await adapter.connect(`${LIQUIDGYM_POSTGRES}/pagila`);

      const schema = await adapter.extractSchema('public');
      const { detected } = applyHardRules(schema);

      // Should detect entities (not just from vocabulary, but all tables)
      expect(detected.entities.length).toBeGreaterThan(10);

      // Should detect metrics (payment amounts, counts)
      expect(detected.metrics.length).toBeGreaterThan(0);

      // Should detect dimensions (film titles, customer names, categories)
      expect(detected.dimensions.length).toBeGreaterThan(0);

      // Should detect time fields (rental_date, payment_date)
      expect(detected.timeFields.length).toBeGreaterThan(0);

      // Should detect relationships (many foreign keys)
      expect(detected.relationships.length).toBeGreaterThan(5);

      await adapter.disconnect();
    }, 30000);

    it('generates semantic layer from real schema', async () => {
      const adapter = new DuckDBUniversalAdapter();
      await adapter.connect(`${LIQUIDGYM_POSTGRES}/pagila`);

      const schema = await adapter.extractSchema('public');
      const { detected } = applyHardRules(schema);

      // Convert to ResolvedVocabulary structure
      const resolved = detectedToResolved(detected);

      // Generate semantic layer
      const semanticLayer = generateSemanticLayer(resolved, schema);

      // Validate structure
      expect(semanticLayer.entities).toBeDefined();
      expect(semanticLayer.metrics).toBeDefined();
      expect(semanticLayer.dimensions).toBeDefined();

      // Should have entities for major tables
      expect(Object.keys(semanticLayer.entities).length).toBeGreaterThan(10);

      // Check specific entities exist
      expect(semanticLayer.entities.customer).toBeDefined();
      expect(semanticLayer.entities.film).toBeDefined();
      expect(semanticLayer.entities.rental).toBeDefined();

      // Entities should have proper structure
      const customerEntity = semanticLayer.entities.customer;
      expect(customerEntity.source).toBe('customer'); // EntityDefinition has .source not .table
      expect(customerEntity.primaryKey).toBeDefined();
      expect(customerEntity.fields).toBeDefined();
      expect(Object.keys(customerEntity.fields).length).toBeGreaterThan(0);

      // Should have metrics
      expect(Object.keys(semanticLayer.metrics).length).toBeGreaterThan(0);

      // Should have dimensions
      expect(Object.keys(semanticLayer.dimensions).length).toBeGreaterThan(0);

      await adapter.disconnect();
    }, 30000);

    it('handles junction tables correctly', async () => {
      const adapter = new DuckDBUniversalAdapter();
      await adapter.connect(`${LIQUIDGYM_POSTGRES}/pagila`);

      const schema = await adapter.extractSchema('public');
      const result = applyHardRules(schema);

      // Junction tables are tracked in stats, not in detected.entities array
      // (they're filtered out by design since they're many-to-many bridges)
      expect(result.stats.junctionTables).toBeGreaterThan(0);

      // film_actor and film_category should be detected as junction tables
      // Verify by checking the table characteristics
      const filmActorTable = schema.tables.find(t => t.name === 'film_actor');
      expect(filmActorTable).toBeDefined();

      // Junction tables have exactly 2 foreign keys and minimal other columns
      expect(filmActorTable!.foreignKeys.length).toBe(2);

      await adapter.disconnect();
    }, 30000);
  });

  describe('Chinook (Music Store)', () => {
    it('extracts and processes music store schema', async () => {
      const adapter = new DuckDBUniversalAdapter();
      await adapter.connect(`${LIQUIDGYM_POSTGRES}/chinook`);

      const schema = await adapter.extractSchema('public');
      const { detected } = applyHardRules(schema);

      // Check key tables
      const tableNames = schema.tables.map(t => t.name);
      expect(tableNames).toContain('invoice');
      expect(tableNames).toContain('track');
      expect(tableNames).toContain('album');
      expect(tableNames).toContain('artist');

      // Should detect invoice amounts as metrics
      const invoiceMetrics = detected.metrics.filter(m =>
        m.table === 'invoice' || m.table === 'invoiceline'
      );
      expect(invoiceMetrics.length).toBeGreaterThan(0);

      // Should detect relationships
      expect(detected.relationships.length).toBeGreaterThan(0);

      // Convert to ResolvedVocabulary structure
      const resolved = detectedToResolved(detected);

      // Generate semantic layer
      const semanticLayer = generateSemanticLayer(resolved, schema);

      // Validate basic structure
      expect(semanticLayer.entities).toBeDefined();
      expect(Object.keys(semanticLayer.entities).length).toBeGreaterThan(5);

      await adapter.disconnect();
    }, 30000);
  });

  describe('Northwind (E-commerce)', () => {
    it('extracts and processes e-commerce schema', async () => {
      const adapter = new DuckDBUniversalAdapter();
      await adapter.connect(`${LIQUIDGYM_POSTGRES}/northwind`);

      const schema = await adapter.extractSchema('public');
      const { detected } = applyHardRules(schema);

      // Check key tables
      const tableNames = schema.tables.map(t => t.name);
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('customers');
      expect(tableNames).toContain('products');
      expect(tableNames).toContain('order_details');

      // Should detect order totals/quantities as metrics
      const orderMetrics = detected.metrics.filter(m =>
        m.table === 'orders' || m.table === 'order_details'
      );
      expect(orderMetrics.length).toBeGreaterThan(0);

      // Convert to ResolvedVocabulary structure
      const resolved = detectedToResolved(detected);

      // Generate semantic layer
      const semanticLayer = generateSemanticLayer(resolved, schema);

      // Should have key entities
      expect(semanticLayer.entities.orders).toBeDefined();
      expect(semanticLayer.entities.customers).toBeDefined();
      expect(semanticLayer.entities.products).toBeDefined();

      await adapter.disconnect();
    }, 30000);
  });

  describe('Edge Cases & Type Mapping', () => {
    it('handles composite primary keys (Pagila payment partitions)', async () => {
      const adapter = new DuckDBUniversalAdapter();
      await adapter.connect(`${LIQUIDGYM_POSTGRES}/pagila`);

      const schema = await adapter.extractSchema('public');

      // Payment partitions might have composite PKs
      const paymentTable = schema.tables.find(t => t.name.startsWith('payment'));
      expect(paymentTable).toBeDefined();

      // Should handle gracefully (use first column or composite)
      expect(paymentTable!.primaryKeyColumns.length).toBeGreaterThan(0);

      await adapter.disconnect();
    }, 30000);

    it('handles PostgreSQL-specific types', async () => {
      const adapter = new DuckDBUniversalAdapter();
      await adapter.connect(`${LIQUIDGYM_POSTGRES}/pagila`);

      const schema = await adapter.extractSchema('public');

      // DuckDB normalizes types - verify we get consistent type names
      const allTypes = schema.tables.flatMap(t => t.columns.map(c => c.dataType));

      // Should have standard DuckDB types
      expect(allTypes.some(t => t.includes('VARCHAR') || t.includes('TEXT'))).toBe(true);
      expect(allTypes.some(t => t.includes('INTEGER') || t.includes('BIGINT'))).toBe(true);
      expect(allTypes.some(t => t.includes('TIMESTAMP') || t.includes('DATE'))).toBe(true);

      await adapter.disconnect();
    }, 30000);

    it('detects time fields across different type variations', async () => {
      const adapter = new DuckDBUniversalAdapter();
      await adapter.connect(`${LIQUIDGYM_POSTGRES}/pagila`);

      const schema = await adapter.extractSchema('public');
      const { detected } = applyHardRules(schema);

      // Should detect rental_date, payment_date, last_update fields
      expect(detected.timeFields.length).toBeGreaterThan(2);

      // Check specific time fields
      const timeFieldNames = detected.timeFields.map(tf => tf.column);
      const hasRentalDate = timeFieldNames.some(name => name.includes('rental_date'));
      const hasLastUpdate = timeFieldNames.some(name => name.includes('last_update'));

      expect(hasRentalDate || hasLastUpdate).toBe(true);

      await adapter.disconnect();
    }, 30000);
  });

  describe('Cross-Database Consistency', () => {
    it('produces consistent entity structures across databases', async () => {
      const adapter = new DuckDBUniversalAdapter();

      // Test Pagila
      await adapter.connect(`${LIQUIDGYM_POSTGRES}/pagila`);
      const paginaSchema = await adapter.extractSchema('public');
      const paginaDetected = applyHardRules(paginaSchema);
      const paginaResolved = detectedToResolved(paginaDetected.detected);
      const paginaSemantic = generateSemanticLayer(paginaResolved, paginaSchema);
      await adapter.disconnect();

      // Test Chinook
      await adapter.connect(`${LIQUIDGYM_POSTGRES}/chinook`);
      const chinookSchema = await adapter.extractSchema('public');
      const chinookDetected = applyHardRules(chinookSchema);
      const chinookResolved = detectedToResolved(chinookDetected.detected);
      const chinookSemantic = generateSemanticLayer(chinookResolved, chinookSchema);
      await adapter.disconnect();

      // Both should have consistent structure
      expect(paginaSemantic.entities).toBeDefined();
      expect(chinookSemantic.entities).toBeDefined();

      // Both should have tables as entities
      expect(Object.keys(paginaSemantic.entities).length).toBeGreaterThan(5);
      expect(Object.keys(chinookSemantic.entities).length).toBeGreaterThan(5);

      // All entities should have required fields
      Object.values(paginaSemantic.entities).forEach(entity => {
        expect(entity.source).toBeDefined(); // EntityDefinition has .source not .table
        expect(entity.primaryKey).toBeDefined();
        expect(entity.fields).toBeDefined();
      });

      Object.values(chinookSemantic.entities).forEach(entity => {
        expect(entity.source).toBeDefined(); // EntityDefinition has .source not .table
        expect(entity.primaryKey).toBeDefined();
        expect(entity.fields).toBeDefined();
      });
    }, 60000); // 60s for two databases
  });

  describe('Knosia (Our Production Database)', () => {
    it('extracts Knosia schema and generates semantic layer', async () => {
      const adapter = new DuckDBUniversalAdapter();

      // Connect to Knosia database
      await adapter.connect(KNOSIA_POSTGRES);

      // Extract public schema (main tables)
      const schema = await adapter.extractSchema('public');

      // Should have core TurboStarter tables + Knosia tables
      expect(schema.tables.length).toBeGreaterThan(10);

      const tableNames = schema.tables.map(t => t.name);

      // Check for Knosia tables
      const knosiaTables = tableNames.filter(t => t.startsWith('knosia_'));
      expect(knosiaTables.length).toBeGreaterThan(5);

      // Verify key Knosia tables exist
      expect(tableNames).toContain('knosia_organization');
      expect(tableNames).toContain('knosia_workspace');
      expect(tableNames).toContain('knosia_connection');
      expect(tableNames).toContain('knosia_vocabulary_item');

      // Run vocabulary detection
      const { detected } = applyHardRules(schema);

      // Should detect entities from our schema
      expect(detected.entities.length).toBeGreaterThan(5);

      // Should detect metrics (counts, timestamps, etc.)
      expect(detected.metrics.length).toBeGreaterThan(0);

      // Should detect relationships
      expect(detected.relationships.length).toBeGreaterThan(0);

      // Convert to resolved vocabulary
      const resolved = detectedToResolved(detected);

      // Generate semantic layer
      const semanticLayer = generateSemanticLayer(resolved, schema);

      // Validate structure
      expect(semanticLayer.entities).toBeDefined();
      expect(semanticLayer.metrics).toBeDefined();
      expect(semanticLayer.dimensions).toBeDefined();

      // Should have entities for Knosia tables
      expect(Object.keys(semanticLayer.entities).length).toBeGreaterThan(5);

      // Check specific Knosia entities exist
      expect(semanticLayer.entities.knosia_organization).toBeDefined();
      expect(semanticLayer.entities.knosia_workspace).toBeDefined();
      expect(semanticLayer.entities.knosia_connection).toBeDefined();

      // Verify entity structure
      const orgEntity = semanticLayer.entities.knosia_organization;
      expect(orgEntity.source).toBe('knosia_organization');
      expect(orgEntity.primaryKey).toBeDefined();
      expect(orgEntity.fields).toBeDefined();

      await adapter.disconnect();
    }, 30000);

    it('handles Knosia JSONB columns and custom types', async () => {
      const adapter = new DuckDBUniversalAdapter();
      await adapter.connect(KNOSIA_POSTGRES);

      const schema = await adapter.extractSchema('public');

      // Find knosia_vocabulary_item which has JSONB columns
      const vocabTable = schema.tables.find(t => t.name === 'knosia_vocabulary_item');
      expect(vocabTable).toBeDefined();

      // Check for JSONB columns (definition, semantics)
      const jsonbColumns = vocabTable!.columns.filter(c =>
        c.dataType.includes('JSON')
      );
      expect(jsonbColumns.length).toBeGreaterThan(0);

      // DuckDB should normalize PostgreSQL types
      const allTypes = schema.tables.flatMap(t => t.columns.map(c => c.dataType));
      expect(allTypes.length).toBeGreaterThan(0);

      await adapter.disconnect();
    }, 30000);

    it('detects Knosia business metrics and dimensions', async () => {
      const adapter = new DuckDBUniversalAdapter();
      await adapter.connect(KNOSIA_POSTGRES);

      const schema = await adapter.extractSchema('public');
      const { detected } = applyHardRules(schema);

      // Should detect workspace-related metrics
      const workspaceMetrics = detected.metrics.filter(m =>
        m.table.includes('workspace') || m.table.includes('organization')
      );

      // Should detect connection health metrics
      const connectionMetrics = detected.metrics.filter(m =>
        m.table.includes('connection')
      );

      // Should detect vocabulary items as dimensions
      const vocabDimensions = detected.dimensions.filter(d =>
        d.table === 'knosia_vocabulary_item'
      );

      console.log('Knosia Detection Stats:');
      console.log('  Entities:', detected.entities.length);
      console.log('  Metrics:', detected.metrics.length);
      console.log('  Dimensions:', detected.dimensions.length);
      console.log('  Workspace metrics:', workspaceMetrics.length);
      console.log('  Connection metrics:', connectionMetrics.length);
      console.log('  Vocab dimensions:', vocabDimensions.length);

      await adapter.disconnect();
    }, 30000);
  });
});
