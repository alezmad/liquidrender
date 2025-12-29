# Structure Detection Rules

**Date:** 2025-12-28
**Status:** Specification Complete
**Version:** 1.0

---

## Philosophy

The schema contains everything except **meaning**. These rules extract structure deterministically; only business semantics need user confirmation.

```
SCHEMA                    STRUCTURE                 VOCABULARY
(what exists)     →       (what it is)       →      (what it means)
  Certain                   Certain                   Needs user
  (read)                    (rules)                   (confirm)
```

---

## Rule Categories

### Category 1: Entity Detection (100% Certain)

| Rule | Condition | Output |
|------|-----------|--------|
| E1 | Table has single-column PK | Entity candidate |
| E2 | Table has composite PK of 2 FKs only | Junction table (NOT entity) |
| E3 | Table has composite PK with non-FK columns | Entity (composite key) |
| E4 | Table has no PK | Log/audit table (NOT entity) |

```typescript
function detectEntity(table: Table): EntityCandidate | null {
  const pk = table.primaryKey;

  // No PK = not an entity
  if (!pk || pk.length === 0) return null;

  // Single column PK = entity
  if (pk.length === 1) {
    return { name: table.name, pkColumn: pk[0], type: 'standard' };
  }

  // Composite PK: check if all are FKs
  const pkFkCount = pk.filter(col => isForeignKey(table, col)).length;

  // All PK columns are FKs = junction table
  if (pkFkCount === pk.length) return null;

  // Mixed composite = entity with composite key
  return { name: table.name, pkColumns: pk, type: 'composite' };
}
```

---

### Category 2: Relationship Detection (100% Certain)

| Rule | Condition | Output |
|------|-----------|--------|
| R1 | Column has FK constraint | Direct relationship |
| R2 | Junction table exists | Many-to-many relationship |
| R3 | FK column name matches pattern `{table}_id` | Implied relationship |

```typescript
function detectRelationships(tables: Table[]): Relationship[] {
  const relationships: Relationship[] = [];

  for (const table of tables) {
    // Explicit FK constraints
    for (const fk of table.foreignKeys) {
      relationships.push({
        from: table.name,
        to: fk.referencedTable,
        via: fk.column,
        type: 'many_to_one',
        certainty: 1.0
      });
    }
  }

  // Junction tables create many-to-many
  const junctions = tables.filter(t => isJunctionTable(t));
  for (const junction of junctions) {
    const [fk1, fk2] = junction.foreignKeys;
    relationships.push({
      from: fk1.referencedTable,
      to: fk2.referencedTable,
      via: junction.name,
      type: 'many_to_many',
      certainty: 1.0
    });
  }

  return relationships;
}
```

---

### Category 3: Metric Detection (95% Certain)

| Rule | Condition | Aggregation | Certainty |
|------|-----------|-------------|-----------|
| M1 | DECIMAL/NUMERIC + name matches `/amount\|price\|total\|cost\|value\|fee\|revenue/` | SUM | 100% |
| M2 | DECIMAL/NUMERIC + name matches `/rate\|ratio\|percent\|avg\|average/` | AVG | 100% |
| M3 | INTEGER + is PK | COUNT DISTINCT | 100% |
| M4 | INTEGER + name matches `/count\|qty\|quantity\|units/` | SUM | 100% |
| M5 | DECIMAL/NUMERIC + no name pattern | SUM (default) | 80% |

```typescript
const metricPatterns = {
  sum: /amount|price|total|cost|value|fee|revenue|sales|freight/i,
  avg: /rate|ratio|percent|average|avg|score|rating/i,
  count: /count|qty|quantity|units|items|number/i
};

function detectMetrics(table: Table): MetricCandidate[] {
  const metrics: MetricCandidate[] = [];

  for (const col of table.columns) {
    // Skip PK columns (they become COUNT entities)
    if (isPrimaryKey(table, col.name)) {
      metrics.push({
        name: `${singularize(table.name)}`,
        expression: `COUNT(DISTINCT ${table.name}.${col.name})`,
        aggregation: 'COUNT',
        sourceColumn: col.name,
        sourceTable: table.name,
        certainty: 1.0
      });
      continue;
    }

    // Numeric columns
    if (isNumericType(col.type)) {
      let agg = 'SUM';
      let certainty = 0.8;

      if (metricPatterns.sum.test(col.name)) {
        agg = 'SUM';
        certainty = 1.0;
      } else if (metricPatterns.avg.test(col.name)) {
        agg = 'AVG';
        certainty = 1.0;
      } else if (metricPatterns.count.test(col.name)) {
        agg = 'SUM';
        certainty = 1.0;
      }

      metrics.push({
        name: col.name,
        expression: `${agg}(${table.name}.${col.name})`,
        aggregation: agg,
        sourceColumn: col.name,
        sourceTable: table.name,
        certainty
      });
    }
  }

  return metrics;
}
```

---

### Category 4: Dimension Detection (90% Certain)

| Rule | Condition | Output | Certainty |
|------|-----------|--------|-----------|
| D1 | VARCHAR + cardinality < 100 | Dimension | 95% |
| D2 | VARCHAR + cardinality 100-1000 | Maybe dimension | 75% |
| D3 | VARCHAR + cardinality > 1000 | Not dimension | 0% |
| D4 | ENUM type | Dimension | 100% |
| D5 | Column name matches `/status\|type\|category\|segment\|tier\|level\|region\|country/` | Dimension | 100% |

```typescript
const dimensionPatterns = /status|state|type|category|segment|tier|level|region|country|city|class|group|kind|mode/i;

function detectDimensions(table: Table, stats: ColumnStats[]): DimensionCandidate[] {
  const dimensions: DimensionCandidate[] = [];

  for (const col of table.columns) {
    // Skip PKs and FKs
    if (isPrimaryKey(table, col.name) || isForeignKey(table, col.name)) continue;

    // ENUM types are always dimensions
    if (col.type === 'ENUM') {
      dimensions.push({
        name: col.name,
        field: `${table.name}.${col.name}`,
        sourceTable: table.name,
        certainty: 1.0
      });
      continue;
    }

    // VARCHAR with pattern match
    if (isStringType(col.type)) {
      const colStats = stats.find(s => s.column === col.name);
      const cardinality = colStats?.cardinality ?? Infinity;

      let certainty = 0;
      if (dimensionPatterns.test(col.name)) {
        certainty = 1.0;
      } else if (cardinality < 100) {
        certainty = 0.95;
      } else if (cardinality < 1000) {
        certainty = 0.75;
      }

      if (certainty > 0) {
        dimensions.push({
          name: col.name,
          field: `${table.name}.${col.name}`,
          sourceTable: table.name,
          cardinality,
          certainty
        });
      }
    }
  }

  return dimensions;
}
```

---

### Category 5: Time Field Detection (100% Certain)

| Rule | Condition | Output |
|------|-----------|--------|
| T1 | DATE type | Time field |
| T2 | TIMESTAMP/DATETIME type | Time field |
| T3 | Column name matches `/date\|time\|created\|updated\|at$/` | Primary time (higher priority) |

```typescript
const primaryTimePatterns = /^(created|updated|order_date|date|timestamp|time)$|_at$|_date$|_time$/i;

function detectTimeFields(table: Table): TimeFieldCandidate[] {
  const timeFields: TimeFieldCandidate[] = [];

  for (const col of table.columns) {
    if (isTemporalType(col.type)) {
      const isPrimary = primaryTimePatterns.test(col.name);

      timeFields.push({
        name: col.name,
        field: `${table.name}.${col.name}`,
        sourceTable: table.name,
        type: col.type,
        isPrimaryCandidate: isPrimary,
        certainty: 1.0
      });
    }
  }

  // Sort by primary candidate first
  return timeFields.sort((a, b) =>
    (b.isPrimaryCandidate ? 1 : 0) - (a.isPrimaryCandidate ? 1 : 0)
  );
}
```

---

### Category 6: Filter Detection (100% Certain)

| Rule | Condition | Output |
|------|-----------|--------|
| F1 | BOOLEAN type | Filter |
| F2 | INTEGER + values only {0, 1} | Filter |
| F3 | Column name matches `/is_\|has_\|flag\|active\|enabled\|deleted/` | Filter |
| F4 | ENUM with 2-3 values | Filter |

```typescript
const filterPatterns = /^(is_|has_|can_)|_(flag|active|enabled|disabled|deleted|archived|hidden|published)$/i;

function detectFilters(table: Table, stats: ColumnStats[]): FilterCandidate[] {
  const filters: FilterCandidate[] = [];

  for (const col of table.columns) {
    let isFilter = false;

    // Boolean type
    if (col.type === 'BOOLEAN') {
      isFilter = true;
    }

    // Name pattern match
    if (filterPatterns.test(col.name)) {
      isFilter = true;
    }

    // Integer with only 0/1 values
    if (col.type === 'INTEGER' || col.type === 'SMALLINT') {
      const colStats = stats.find(s => s.column === col.name);
      if (colStats && colStats.min === 0 && colStats.max === 1) {
        isFilter = true;
      }
    }

    if (isFilter) {
      filters.push({
        name: col.name,
        expression: `${table.name}.${col.name} = true`,
        sourceTable: table.name,
        sourceColumn: col.name,
        certainty: 1.0
      });
    }
  }

  return filters;
}
```

---

## Type Mappings

```typescript
function isNumericType(type: string): boolean {
  return /^(DECIMAL|NUMERIC|REAL|DOUBLE|FLOAT|INTEGER|INT|BIGINT|SMALLINT|TINYINT|MONEY)/i.test(type);
}

function isStringType(type: string): boolean {
  return /^(VARCHAR|CHAR|TEXT|STRING|NVARCHAR|CLOB)/i.test(type);
}

function isTemporalType(type: string): boolean {
  return /^(DATE|TIMESTAMP|DATETIME|TIME|INTERVAL)/i.test(type);
}
```

---

## What Requires User Confirmation (~10%)

These cannot be determined from schema alone:

| Question | Why Unknown | Resolution |
|----------|-------------|------------|
| Metric display names | Preference | User renames |
| Primary time field | Business logic | User selects from candidates |
| Threshold values | Business rules | User provides |
| Which aggregation for unmarked numerics | Semantic meaning | User confirms SUM/AVG/COUNT |
| Derived metric formulas | Business definition | User defines |

---

## Certainty Levels

| Level | Range | Action |
|-------|-------|--------|
| Definite | 100% | Auto-include, no confirmation |
| High | 90-99% | Auto-include, allow rename |
| Medium | 75-89% | Show to user, suggest include |
| Low | 50-74% | Show to user, suggest exclude |
| None | <50% | Don't show |

---

## Implementation Order

1. **Schema Reader** - Extract raw schema (information_schema queries)
2. **Structure Detector** - Apply rules (this document)
3. **Candidate Ranker** - Sort by certainty
4. **Confirmation UI** - Present top candidates to user
5. **Vocabulary Generator** - Produce semantic_layer.yaml
