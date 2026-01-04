# Semantic Layer Generation - Edge Case Analysis

Generated: 2026-01-02

## Mock Data vs Real-World Gaps

### Current Mock (Too Simple)
- ✅ 3 tables with clean foreign keys
- ✅ All tables have single-column primary keys
- ✅ All tables have timestamp columns
- ✅ PostgreSQL standard types only
- ✅ SaaS business type only
- ✅ Perfect vocabulary mapping

### Untested Real-World Scenarios

#### 1. **Missing Primary Keys**
```sql
-- Common in legacy databases
CREATE TABLE logs (
  message TEXT,
  timestamp TIMESTAMP
);
-- No PRIMARY KEY!
```
**Current behavior:** Falls back to first column name or 'id'
**Risk:** 'id' might not exist → broken queries

#### 2. **Composite Primary Keys**
```sql
CREATE TABLE order_items (
  order_id INT,
  product_id INT,
  quantity INT,
  PRIMARY KEY (order_id, product_id)
);
```
**Current behavior:** Only uses `order_id` (first column)
**Risk:** Non-unique entity references

#### 3. **No Time Fields**
```sql
CREATE TABLE product_categories (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);
-- No created_at, updated_at!
```
**Current behavior:** `defaultTimeField: undefined`
**Risk:** Might break time-series queries if code assumes time field exists

#### 4. **Database-Specific Types**

**PostgreSQL:**
- `JSONB` → mapped to 'string' ❌
- `UUID` → mapped to 'string' ❌
- `ENUM` → mapped to 'string' ❌
- `TIMESTAMPTZ` → mapped to 'timestamp' ✅
- `ARRAY` → mapped to 'string' ❌

**MySQL:**
- `DATETIME` → mapped to 'timestamp' ✅ (includes 'datetime')
- `ENUM('a','b','c')` → mapped to 'string' ❌
- `TINYINT(1)` → mapped to 'integer' ❌ (should be boolean)

**SQLite:**
- `INTEGER` (Unix timestamp) → mapped to 'integer' ❌
- `TEXT` (ISO8601 dates) → mapped to 'string' ❌
- No native timestamp types!

#### 5. **Large Schemas**
```
Scenario: E-commerce DB with 150 tables
- Current: Generates 150 entities
- Risk: Performance, validation time, memory usage
- Mitigation: Need table filtering or pagination
```

#### 6. **Circular Foreign Keys**
```sql
CREATE TABLE employees (
  id INT PRIMARY KEY,
  manager_id INT REFERENCES employees(id)
);
```
**Current behavior:** Should work (self-reference)
**Risk:** Not tested in integration

#### 7. **Many-to-Many Junction Tables**
```sql
CREATE TABLE user_roles (
  user_id INT REFERENCES users(id),
  role_id INT REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);
```
**Current behavior:** Detected as entity with composite PK issue
**Risk:** Should be marked as `isJunction: true` in DetectedVocabulary

#### 8. **Multiple Business Types**

Current test: SaaS only

Untested:
- E-commerce (different KPI patterns)
- Marketplace (buyer/seller dynamics)
- FinTech (transaction-heavy)
- Content Platform (engagement metrics)

#### 9. **Empty Vocabulary**
```typescript
const detected: DetectedVocabulary = {
  entities: [], metrics: [], dimensions: [],
  timeFields: [], filters: [], relationships: []
};
```
**Current behavior:** Has explicit test ✅
**Result:** Generates semantic layer from schema only

#### 10. **Schema Namespacing**
```sql
-- PostgreSQL schemas
CREATE SCHEMA analytics;
CREATE SCHEMA staging;

CREATE TABLE analytics.daily_stats (...);
CREATE TABLE staging.daily_stats (...);
```
**Current behavior:** Uses `table.name` (no schema prefix)
**Risk:** Name collisions if multiple schemas

## Recommendations

### Immediate (Before Production)

1. **Add composite PK detection:**
   ```typescript
   const primaryKey = table.primaryKeyColumns.length > 1
     ? table.primaryKeyColumns.join(',')  // composite
     : table.primaryKeyColumns[0] || table.columns[0]?.name;
   ```

2. **Enhance time field detection:**
   ```typescript
   const timeColumn = table.columns.find(col => {
     const type = col.dataType.toLowerCase();
     return type.includes('timestamp') ||
            type.includes('datetime') ||
            type.includes('date') ||
            (type === 'integer' && col.name.includes('_at')); // Unix timestamps
   });
   ```

3. **Better type mapping for JSON/UUID:**
   ```typescript
   if (normalized.includes('json')) return 'json';
   if (normalized.includes('uuid')) return 'uuid';
   if (normalized.includes('enum')) return 'enum';
   ```

4. **Add schema prefix support:**
   ```typescript
   const fullTableName = table.schema
     ? `${table.schema}.${table.name}`
     : table.name;
   ```

### Testing Strategy

**Phase 1: Edge Case Unit Tests**
- Tables without PKs
- Composite PKs
- No time fields
- Self-referencing FKs
- Junction tables

**Phase 2: Real Schema Integration**
- Load schemas from public datasets:
  - Pagila (PostgreSQL DVD rental)
  - Sakila (MySQL equivalent)
  - Chinook (SQLite music store)
  - AdventureWorks (SQL Server e-commerce)

**Phase 3: Multi-DB Compatibility**
- Test ExtractedSchema from actual MySQL connection
- Test ExtractedSchema from SQLite
- Test ExtractedSchema from DuckDB

**Phase 4: Business Type Coverage**
- Test all 4-5 business type templates
- Verify each template's KPI mappings work

## Current Risk Level

🟡 **Medium-High Risk** for production use

**Safe for:**
- Clean PostgreSQL schemas
- Single-schema databases
- Well-designed tables (PKs, timestamps, FKs)
- SaaS business type

**Risky for:**
- Legacy databases
- Multi-schema PostgreSQL
- MySQL/SQLite differences
- Large schemas (100+ tables)
- Non-SaaS business types

## Verdict

The code is **not overfitted to mock data**, but it **makes optimistic assumptions** about schema quality that won't hold in all real-world databases.

**Recommendation:** Add defensive edge case handling BEFORE moving to Wave 3.
