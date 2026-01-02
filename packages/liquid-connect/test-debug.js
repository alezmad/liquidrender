import { detectBusinessType } from './src/business-types/detector.js';

function createMockSchema(tableNames, extraColumns = {}) {
  const tables = tableNames.map((name) => ({
    name,
    schema: 'public',
    columns: [
      {
        name: 'id',
        dataType: 'integer',
        isPrimaryKey: true,
        isForeignKey: false,
        isNotNull: true,
      },
      ...(extraColumns[name] || []).map((colName) => ({
        name: colName,
        dataType: 'varchar',
        isPrimaryKey: false,
        isForeignKey: false,
        isNotNull: false,
      })),
    ],
    primaryKeyColumns: ['id'],
    foreignKeys: [],
  }));

  return {
    database: 'test_db',
    type: 'postgres',
    schema: 'public',
    tables,
    extractedAt: new Date().toISOString(),
  };
}

// Test 1: SaaS
const schema1 = createMockSchema(['subscriptions', 'plans', 'users']);
const result1 = detectBusinessType(schema1);
console.log('Test 1 - SaaS:', JSON.stringify(result1, null, 2));

// Test 2: E-commerce
const schema2 = createMockSchema(['orders', 'products', 'customers']);
const result2 = detectBusinessType(schema2);
console.log('\nTest 2 - E-commerce:', JSON.stringify(result2, null, 2));
