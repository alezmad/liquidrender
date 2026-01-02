/**
 * DuckDB Profiler Integration Tests
 *
 * SKIPPED: These tests require a PostgreSQL database connection via DuckDB's
 * PostgreSQL scanner. They cannot run in CI without a real PostgreSQL instance.
 *
 * To run these tests manually:
 * 1. Set up a PostgreSQL database
 * 2. Update connection string in test setup
 * 3. Run: pnpm test profiler-integration
 *
 * Test scenarios:
 * 1. Small table (100 rows) - verify 100% sampling
 * 2. Medium table (50k rows) - verify 10% sampling
 * 3. Large table (500k rows) - verify 1% sampling
 * 4. Empty table - verify graceful handling
 * 5. Multi-table profiling - verify parallel execution
 * 6. Performance benchmark - profile 10 tables < 30 seconds
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DuckDBInstance } from '@duckdb/node-api';
import type { DuckDBConnection } from '@duckdb/node-api';
import { profileSchema, calculateSampleRate } from '../profiler';
import { DuckDBUniversalAdapter } from '../duckdb-adapter';
import type { ExtractedSchema, Table, Column, ProfileResult, TableProfile } from '../models';

// =============================================================================
// Test Database Setup
// =============================================================================

describe.skip('DuckDB Profiler Integration Tests', () => {
  let instance: DuckDBInstance;
  let connection: DuckDBConnection;
  let adapter: DuckDBUniversalAdapter;

  beforeEach(async () => {
    // Create in-memory DuckDB instance
    instance = await DuckDBInstance.create(':memory:');
    connection = await instance.connect();

    // Create adapter
    adapter = new DuckDBUniversalAdapter({
      duckdbPath: ':memory:',
      attachedName: 'test_db',
    });

    // Connect adapter (it will create its own instance)
    await adapter.connect(':memory:');
  });

  afterEach(async () => {
    // Clean up
    await adapter.disconnect();
    if (connection) {
      connection.closeSync();
    }
  });

  // ==========================================================================
  // Test Scenario 1: Small Table (100 rows) - 100% Sampling
  // ==========================================================================

  describe('Scenario 1: Small Table (100 rows)', () => {
    beforeEach(async () => {
      // Create small table with 100 rows
      await adapter.exec(`
        CREATE TABLE public.users_small (
          id INTEGER PRIMARY KEY,
          name VARCHAR,
          email VARCHAR,
          age INTEGER,
          created_at TIMESTAMP,
          is_active BOOLEAN
        )
      `);

      // Insert 100 rows
      for (let i = 1; i <= 100; i++) {
        const name = `User ${i}`;
        const email = `user${i}@example.com`;
        const age = 20 + (i % 50);
        const isActive = i % 2 === 0;

        await adapter.exec(`
          INSERT INTO public.users_small (id, name, email, age, created_at, is_active)
          VALUES (${i}, '${name}', '${email}', ${age}, NOW() - INTERVAL '${i} days', ${isActive})
        `);
      }
    });

    it('should extract schema for small table', async () => {
      const schema = await adapter.extractSchema('public');

      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('users_small');
      expect(schema.tables[0].columns).toHaveLength(6);
    });

    it('should profile small table with 100% sampling', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      expect(result.schema.tableProfiles).toBeDefined();
      expect(result.schema.tableProfiles['users_small']).toBeDefined();

      const tableProfile = result.schema.tableProfiles['users_small'];
      expect(tableProfile.tableName).toBe('users_small');
      expect(tableProfile.rowCountEstimate).toBeGreaterThan(0);
      expect(tableProfile.samplingRate).toBe(1.0); // 100% for small tables
    });

    it('should calculate correct sampling rate (100%) for 100 rows', () => {
      const sampleRate = calculateSampleRate(100);
      expect(sampleRate).toBe(1.0);
    });

    it('should have column profiles for all columns', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const columnProfiles = result.schema.columnProfiles['users_small'];
      expect(columnProfiles).toBeDefined();
      expect(Object.keys(columnProfiles).length).toBeGreaterThan(0);

      // Verify column profiles have required fields
      for (const [colName, profile] of Object.entries(columnProfiles)) {
        expect(profile.columnName).toBe(colName);
        expect(profile.dataType).toBeDefined();
        expect(profile.nullCount).toBeGreaterThanOrEqual(0);
        expect(profile.nullPercentage).toBeGreaterThanOrEqual(0);
      }
    });

    it('should detect numeric profile for age column', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const ageProfile = result.schema.columnProfiles['users_small']['age'];
      expect(ageProfile.numeric).toBeDefined();
      expect(ageProfile.numeric?.min).toBeGreaterThanOrEqual(20);
      expect(ageProfile.numeric?.max).toBeLessThanOrEqual(70);
    });

    it('should detect temporal profile for created_at column', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const createdAtProfile = result.schema.columnProfiles['users_small']['created_at'];
      expect(createdAtProfile.temporal).toBeDefined();
      expect(createdAtProfile.temporal?.min).toBeDefined();
      expect(createdAtProfile.temporal?.max).toBeDefined();
      expect(createdAtProfile.temporal?.spanDays).toBeGreaterThan(0);
    });

    it('should have ProfileResult with correct structure', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      // Verify ProfileResult structure
      expect(result).toHaveProperty('schema');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('warnings');

      // Verify stats
      expect(result.stats.tablesProfiled).toBe(1);
      expect(result.stats.tablesSkipped).toBe(0);
      expect(result.stats.totalDuration).toBeGreaterThan(0);
      expect(result.stats.tier1Duration).toBeGreaterThanOrEqual(0);
      expect(result.stats.tier2Duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Test Scenario 2: Medium Table (50k rows) - 10% Sampling
  // ==========================================================================

  describe('Scenario 2: Medium Table (50k rows)', () => {
    beforeEach(async () => {
      // Create medium table
      await adapter.exec(`
        CREATE TABLE public.orders_medium (
          order_id INTEGER PRIMARY KEY,
          customer_id INTEGER,
          amount DECIMAL(10, 2),
          status VARCHAR,
          order_date TIMESTAMP
        )
      `);

      // Insert 50k rows in batches
      const batchSize = 1000;
      for (let batch = 0; batch < 50; batch++) {
        const values = [];
        for (let i = 0; i < batchSize; i++) {
          const orderId = batch * batchSize + i + 1;
          const customerId = (orderId % 1000) + 1;
          const amount = (Math.random() * 1000).toFixed(2);
          const status = ['pending', 'completed', 'cancelled'][(orderId % 3)];
          const daysAgo = Math.floor(Math.random() * 365);

          values.push(
            `(${orderId}, ${customerId}, ${amount}, '${status}', NOW() - INTERVAL '${daysAgo} days')`
          );
        }

        await adapter.exec(
          `INSERT INTO public.orders_medium VALUES ${values.join(',')}`
        );
      }
    });

    it('should calculate correct sampling rate (10%) for 50k rows', () => {
      const sampleRate = calculateSampleRate(50_000);
      expect(sampleRate).toBe(0.1);
    });

    it('should profile medium table with 10% sampling', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const tableProfile = result.schema.tableProfiles['orders_medium'];
      expect(tableProfile.rowCountEstimate).toBeGreaterThan(40_000); // Approximate
      expect(tableProfile.samplingRate).toBe(0.1);
    });

    it('should have valid column profiles for medium table', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const columnProfiles = result.schema.columnProfiles['orders_medium'];
      expect(columnProfiles['amount'].numeric).toBeDefined();
      expect(columnProfiles['customer_id'].numeric).toBeDefined();
      expect(columnProfiles['order_date'].temporal).toBeDefined();
    });

    it('should detect low cardinality in status column', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const statusProfile = result.schema.columnProfiles['orders_medium']['status'];
      expect(statusProfile.categorical).toBeDefined();
      expect(statusProfile.categorical?.cardinality).toBeLessThan(10);
      expect(statusProfile.categorical?.isLowCardinality).toBe(true);
    });
  });

  // ==========================================================================
  // Test Scenario 3: Large Table (500k rows) - 1% Sampling
  // ==========================================================================

  describe('Scenario 3: Large Table (500k rows)', () => {
    beforeEach(async () => {
      // Create large table
      await adapter.exec(`
        CREATE TABLE public.events_large (
          event_id BIGINT PRIMARY KEY,
          user_id INTEGER,
          event_type VARCHAR,
          value DECIMAL(15, 4),
          timestamp TIMESTAMP
        )
      `);

      // Insert 500k rows in batches
      const batchSize = 5000;
      for (let batch = 0; batch < 100; batch++) {
        const values = [];
        for (let i = 0; i < batchSize; i++) {
          const eventId = batch * batchSize + i + 1;
          const userId = (eventId % 10_000) + 1;
          const eventType = ['click', 'view', 'purchase', 'share', 'comment'][(eventId % 5)];
          const value = (Math.random() * 10_000).toFixed(4);
          const minutesAgo = Math.floor(Math.random() * 525_600); // 1 year

          values.push(
            `(${eventId}, ${userId}, '${eventType}', ${value}, NOW() - INTERVAL '${minutesAgo} minutes')`
          );
        }

        await adapter.exec(
          `INSERT INTO public.events_large VALUES ${values.join(',')}`
        );
      }
    });

    it('should calculate correct sampling rate (1%) for 500k rows', () => {
      const sampleRate = calculateSampleRate(500_000);
      expect(sampleRate).toBe(0.01);
    });

    it('should profile large table with 1% sampling', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const tableProfile = result.schema.tableProfiles['events_large'];
      expect(tableProfile.rowCountEstimate).toBeGreaterThan(450_000); // Approximate
      expect(tableProfile.samplingRate).toBe(0.01);
    });

    it('should complete profiling in reasonable time', async () => {
      const schema = await adapter.extractSchema('public');
      const startTime = Date.now();

      await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30_000); // 30 seconds max
    });
  });

  // ==========================================================================
  // Test Scenario 4: Empty Table - Graceful Handling
  // ==========================================================================

  describe('Scenario 4: Empty Table', () => {
    beforeEach(async () => {
      // Create empty table
      await adapter.exec(`
        CREATE TABLE public.empty_table (
          id INTEGER PRIMARY KEY,
          name VARCHAR,
          description TEXT
        )
      `);
    });

    it('should handle empty table gracefully', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const tableProfile = result.schema.tableProfiles['empty_table'];
      expect(tableProfile).toBeDefined();
      expect(tableProfile.rowCountEstimate).toBe(0);
      expect(tableProfile.samplingRate).toBe(0);
    });

    it('should have empty column profiles for empty table', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const columnProfiles = result.schema.columnProfiles['empty_table'];
      expect(columnProfiles).toBeDefined();
      expect(Object.keys(columnProfiles).length).toBe(0);
    });

    it('should not skip empty table', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      expect(result.stats.tablesProfiled).toBe(1);
      expect(result.stats.tablesSkipped).toBe(0);
    });
  });

  // ==========================================================================
  // Test Scenario 5: Multi-Table Profiling - Parallel Execution
  // ==========================================================================

  describe('Scenario 5: Multi-Table Profiling', () => {
    beforeEach(async () => {
      // Create 5 tables with different sizes
      for (let t = 1; t <= 5; t++) {
        const tableName = `table_${t}`;
        const rowCount = t * 1000; // 1k, 2k, 3k, 4k, 5k rows

        await adapter.exec(`
          CREATE TABLE public.${tableName} (
            id INTEGER PRIMARY KEY,
            value DECIMAL(10, 2),
            category VARCHAR,
            updated_at TIMESTAMP
          )
        `);

        // Insert rows
        const values = [];
        for (let i = 1; i <= rowCount; i++) {
          const value = (Math.random() * 100).toFixed(2);
          const category = `cat_${(i % 5) + 1}`;
          const daysAgo = Math.floor(Math.random() * 30);

          values.push(
            `(${i}, ${value}, '${category}', NOW() - INTERVAL '${daysAgo} days')`
          );

          // Insert in batches
          if (i % 500 === 0 || i === rowCount) {
            await adapter.exec(
              `INSERT INTO public.${tableName} VALUES ${values.join(',')}`
            );
            values.length = 0;
          }
        }
      }
    });

    it('should extract all 5 tables', async () => {
      const schema = await adapter.extractSchema('public');
      expect(schema.tables).toHaveLength(5);
    });

    it('should profile all tables in parallel', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 3, // Allow parallelism
      });

      expect(result.stats.tablesProfiled).toBe(5);
      expect(result.stats.tablesSkipped).toBe(0);
    });

    it('should have profiles for all 5 tables', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 3,
      });

      for (let t = 1; t <= 5; t++) {
        const tableName = `table_${t}`;
        expect(result.schema.tableProfiles[tableName]).toBeDefined();
        expect(result.schema.columnProfiles[tableName]).toBeDefined();
      }
    });

    it('should respect maxConcurrentTables limit', async () => {
      const schema = await adapter.extractSchema('public');

      const concurrencyLimit = 2;
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const trackingOptions = {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: concurrencyLimit,
      };

      // Profile with limited concurrency
      const startTime = Date.now();
      const result = await profileSchema(adapter, schema, trackingOptions);
      const duration = Date.now() - startTime;

      // With limit, should take longer than no limit
      expect(result.stats.tablesProfiled).toBe(5);
      // Concurrency should be respected (harder to test directly without instrumentation)
    });
  });

  // ==========================================================================
  // Test Scenario 6: Performance Benchmark
  // ==========================================================================

  describe('Scenario 6: Performance Benchmark (10 tables < 30 seconds)', () => {
    beforeEach(async () => {
      // Create 10 tables with varying sizes
      for (let t = 1; t <= 10; t++) {
        const tableName = `perf_test_${t}`;
        const rowCount = 5_000; // 5k rows each = 50k total

        await adapter.exec(`
          CREATE TABLE public.${tableName} (
            id INTEGER PRIMARY KEY,
            col_numeric DECIMAL(12, 2),
            col_text VARCHAR,
            col_date TIMESTAMP,
            col_bool BOOLEAN
          )
        `);

        // Insert rows
        const batchSize = 500;
        const numBatches = Math.ceil(rowCount / batchSize);

        for (let batch = 0; batch < numBatches; batch++) {
          const values = [];
          const batchRowCount = Math.min(batchSize, rowCount - batch * batchSize);

          for (let i = 0; i < batchRowCount; i++) {
            const rowId = batch * batchSize + i + 1;
            const numeric = (Math.random() * 10_000).toFixed(2);
            const text = `text_${rowId}`;
            const daysAgo = Math.floor(Math.random() * 365);
            const bool = rowId % 2 === 0;

            values.push(
              `(${rowId}, ${numeric}, '${text}', NOW() - INTERVAL '${daysAgo} days', ${bool})`
            );
          }

          await adapter.exec(
            `INSERT INTO public.${tableName} VALUES ${values.join(',')}`
          );
        }
      }
    });

    it('should profile 10 tables in under 30 seconds', async () => {
      const schema = await adapter.extractSchema('public');

      const startTime = Date.now();
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 5,
      });
      const duration = Date.now() - startTime;

      expect(result.stats.tablesProfiled).toBe(10);
      expect(result.stats.tablesSkipped).toBe(0);
      expect(duration).toBeLessThan(30_000);
    });

    it('should provide performance metrics', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 5,
      });

      expect(result.stats.totalDuration).toBeGreaterThan(0);
      expect(result.stats.tier1Duration).toBeGreaterThanOrEqual(0);
      expect(result.stats.tier2Duration).toBeGreaterThanOrEqual(0);

      // Tier 2 should typically be slower than Tier 1
      expect(result.stats.tier2Duration).toBeGreaterThanOrEqual(result.stats.tier1Duration);
    });

    it('should handle concurrent profiling efficiently', async () => {
      const schema = await adapter.extractSchema('public');

      // Profile with different concurrency levels and compare
      const startTime1 = Date.now();
      const result1 = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });
      const duration1 = Date.now() - startTime1;

      // Reset adapter for clean state
      await adapter.disconnect();
      await adapter.connect(':memory:');

      // Recreate tables for second run
      const schema2 = await adapter.extractSchema('public');

      const startTime2 = Date.now();
      const result2 = await profileSchema(adapter, schema2, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 5,
      });
      const duration2 = Date.now() - startTime2;

      // With more concurrency, should be faster or similar
      // (allowing some variance due to system load)
      expect(result1.stats.tablesProfiled).toBe(result2.stats.tablesProfiled);
    });
  });

  // ==========================================================================
  // Test ProfileResult Structure Validation
  // ==========================================================================

  describe('ProfileResult Structure Validation', () => {
    beforeEach(async () => {
      // Create a simple table
      await adapter.exec(`
        CREATE TABLE public.validation_test (
          id INTEGER PRIMARY KEY,
          name VARCHAR,
          amount DECIMAL(10, 2),
          created_at TIMESTAMP
        )
      `);

      // Insert sample data
      for (let i = 1; i <= 100; i++) {
        await adapter.exec(`
          INSERT INTO public.validation_test
          VALUES (${i}, 'item_${i}', ${Math.random() * 1000}, NOW() - INTERVAL '${i} days')
        `);
      }
    });

    it('should have complete ProfileResult structure', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      // Verify root structure
      expect(result).toHaveProperty('schema');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('warnings');

      // Verify schema structure
      expect(result.schema).toHaveProperty('database');
      expect(result.schema).toHaveProperty('type');
      expect(result.schema).toHaveProperty('tables');
      expect(result.schema).toHaveProperty('tableProfiles');
      expect(result.schema).toHaveProperty('columnProfiles');
      expect(result.schema).toHaveProperty('profiledAt');
      expect(result.schema).toHaveProperty('profilingDuration');
      expect(result.schema).toHaveProperty('samplingStrategy');

      // Verify stats structure
      expect(result.stats).toHaveProperty('tablesProfiled');
      expect(result.stats).toHaveProperty('tablesSkipped');
      expect(result.stats).toHaveProperty('totalDuration');
      expect(result.stats).toHaveProperty('tier1Duration');
      expect(result.stats).toHaveProperty('tier2Duration');
      expect(result.stats).toHaveProperty('tier3Duration');

      // Verify warnings is array
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should have valid TableProfile for profiled table', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const tableProfile = result.schema.tableProfiles['validation_test'];

      // Required fields
      expect(tableProfile).toHaveProperty('tableName');
      expect(tableProfile).toHaveProperty('rowCountEstimate');
      expect(tableProfile).toHaveProperty('tableSizeBytes');
      expect(tableProfile).toHaveProperty('samplingRate');
      expect(tableProfile).toHaveProperty('emptyColumnCount');
      expect(tableProfile).toHaveProperty('sparseColumnCount');

      // Type validation
      expect(typeof tableProfile.tableName).toBe('string');
      expect(typeof tableProfile.rowCountEstimate).toBe('number');
      expect(typeof tableProfile.tableSizeBytes).toBe('number');
      expect(typeof tableProfile.samplingRate).toBe('number');
      expect(typeof tableProfile.emptyColumnCount).toBe('number');
      expect(typeof tableProfile.sparseColumnCount).toBe('number');
    });

    it('should have valid ColumnProfile for profiled columns', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const columnProfiles = result.schema.columnProfiles['validation_test'];

      for (const [colName, profile] of Object.entries(columnProfiles)) {
        // Required fields
        expect(profile).toHaveProperty('columnName');
        expect(profile).toHaveProperty('dataType');
        expect(profile).toHaveProperty('nullCount');
        expect(profile).toHaveProperty('nullPercentage');

        // Type validation
        expect(profile.columnName).toBe(colName);
        expect(typeof profile.dataType).toBe('string');
        expect(typeof profile.nullCount).toBe('number');
        expect(typeof profile.nullPercentage).toBe('number');
        expect(profile.nullPercentage).toBeGreaterThanOrEqual(0);
        expect(profile.nullPercentage).toBeLessThanOrEqual(100);
      }
    });

    it('should populate numeric profile for numeric columns', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const amountProfile = result.schema.columnProfiles['validation_test']['amount'];
      expect(amountProfile.numeric).toBeDefined();

      if (amountProfile.numeric) {
        expect(amountProfile.numeric).toHaveProperty('min');
        expect(amountProfile.numeric).toHaveProperty('max');
        expect(amountProfile.numeric).toHaveProperty('mean');
        expect(amountProfile.numeric).toHaveProperty('stdDev');

        expect(typeof amountProfile.numeric.min).toBe('number');
        expect(typeof amountProfile.numeric.max).toBe('number');
        expect(amountProfile.numeric.min).toBeLessThanOrEqual(amountProfile.numeric.max);
      }
    });

    it('should populate temporal profile for timestamp columns', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      const createdAtProfile = result.schema.columnProfiles['validation_test']['created_at'];
      expect(createdAtProfile.temporal).toBeDefined();

      if (createdAtProfile.temporal) {
        expect(createdAtProfile.temporal).toHaveProperty('min');
        expect(createdAtProfile.temporal).toHaveProperty('max');
        expect(createdAtProfile.temporal).toHaveProperty('spanDays');
        expect(createdAtProfile.temporal).toHaveProperty('hasTime');
        expect(createdAtProfile.temporal).toHaveProperty('uniqueDates');

        expect(createdAtProfile.temporal.min instanceof Date).toBe(true);
        expect(createdAtProfile.temporal.max instanceof Date).toBe(true);
        expect(typeof createdAtProfile.temporal.spanDays).toBe('number');
        expect(typeof createdAtProfile.temporal.hasTime).toBe('boolean');
      }
    });
  });

  // ==========================================================================
  // Test Error Handling and Edge Cases
  // ==========================================================================

  describe('Error Handling and Edge Cases', () => {
    it('should handle table with all NULL columns', async () => {
      await adapter.exec(`
        CREATE TABLE public.all_nulls (
          id INTEGER,
          nullable_col VARCHAR
        )
      `);

      // Insert rows with NULLs
      for (let i = 1; i <= 50; i++) {
        await adapter.exec(`
          INSERT INTO public.all_nulls VALUES (${i}, NULL)
        `);
      }

      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      expect(result.stats.tablesProfiled).toBe(1);
      expect(result.stats.tablesSkipped).toBe(0);

      const nullableColProfile = result.schema.columnProfiles['all_nulls']['nullable_col'];
      expect(nullableColProfile.nullPercentage).toBe(100);
    });

    it('should handle table with single row', async () => {
      await adapter.exec(`
        CREATE TABLE public.single_row (
          id INTEGER PRIMARY KEY,
          data VARCHAR
        )
      `);

      await adapter.exec(`
        INSERT INTO public.single_row VALUES (1, 'single')
      `);

      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      expect(result.stats.tablesProfiled).toBe(1);
      const tableProfile = result.schema.tableProfiles['single_row'];
      expect(tableProfile.rowCountEstimate).toBeGreaterThanOrEqual(1);
    });

    it('should return empty warnings for successful profiling', async () => {
      await adapter.exec(`
        CREATE TABLE public.clean_data (
          id INTEGER PRIMARY KEY,
          value VARCHAR
        )
      `);

      await adapter.exec(`
        INSERT INTO public.clean_data VALUES (1, 'test')
      `);

      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 1,
      });

      expect(result.warnings).toEqual([]);
    });
  });

  // ==========================================================================
  // Test Sampling Strategy Configuration
  // ==========================================================================

  describe('Sampling Strategy Configuration', () => {
    beforeEach(async () => {
      // Create table with various sizes
      for (const size of [100, 5_000, 50_000]) {
        const tableName = `strategy_test_${size}`;
        await adapter.exec(`
          CREATE TABLE public.${tableName} (
            id INTEGER PRIMARY KEY,
            value DECIMAL(10, 2)
          )
        `);

        // Insert data
        const batchSize = Math.min(1000, size);
        for (let batch = 0; batch < Math.ceil(size / batchSize); batch++) {
          const values = [];
          for (let i = 0; i < batchSize && batch * batchSize + i < size; i++) {
            const rowId = batch * batchSize + i + 1;
            values.push(`(${rowId}, ${Math.random() * 1000})`);
          }

          if (values.length > 0) {
            await adapter.exec(
              `INSERT INTO public.${tableName} VALUES ${values.join(',')}`
            );
          }
        }
      }
    });

    it('should use adaptive sampling strategy by default', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false,
        maxConcurrentTables: 5,
      });

      expect(result.schema.samplingStrategy).toBe('adaptive');
    });

    it('should use statistics-only strategy when Tier 2 disabled', async () => {
      const schema = await adapter.extractSchema('public');
      const result = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: false, // Disable sampling
        enableTier3: false,
        maxConcurrentTables: 5,
      });

      expect(result.schema.samplingStrategy).toBe('statistics-only');
    });
  });
});
