# Semantic Layer Specification

**Version:** 1.0.0
**Status:** Production
**Package:** `@repo/liquid-connect/semantic`

---

## 1. Overview

The Semantic Layer is **Layer 1** of the LiquidConnect architecture. It defines the **meaning** of data before any queries are written. Layer 2 (LiquidFlow queries) references only concepts defined in Layer 1, ensuring:

- **Determinism**: Every query resolves to exactly one SQL interpretation
- **Hallucination-free**: LLMs cannot invent fields, metrics, or joins that do not exist
- **Vocabulary closure**: The set of valid terms is finite and explicitly defined

### Architecture Position

```
┌─────────────────────────────────────────────────────────┐
│                    Layer 2: LiquidFlow                  │
│              (Query DSL - references Layer 1)           │
├─────────────────────────────────────────────────────────┤
│                    Layer 1: Semantic                    │  ← This spec
│    sources │ entities │ metrics │ dimensions │ filters  │
├─────────────────────────────────────────────────────────┤
│                    Layer 0: Database                    │
│              (Physical tables and columns)              │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Explicit over implicit**: Every join path, aggregation rule, and field type is declared
2. **Single source of truth**: One semantic layer file per domain
3. **Composable**: Metrics can reference other metrics; relationships chain
4. **Immutable vocabulary**: Once defined, terms have fixed meaning
5. **Dialect-agnostic**: Semantic definitions compile to any SQL dialect

---

## 2. YAML Schema

Semantic layer files use YAML with the following top-level structure:

```yaml
version: "1.0"
namespace: <string>           # Unique identifier for this semantic layer
description: <string>         # Human-readable description

sources:
  <source_name>: ...          # Database connection definitions

entities:
  <entity_name>: ...          # Table definitions with fields

metrics:
  <metric_name>: ...          # Aggregation definitions

dimensions:
  <dimension_name>: ...       # Grouping field definitions

filters:
  <filter_name>: ...          # Named filter definitions

relationships:
  - ...                       # Join path definitions
```

---

### 2.1 Sources

Sources define database connections. Each source maps to a physical database or schema.

```yaml
sources:
  <source_name>:
    type: <database_type>     # postgres | mysql | duckdb | trino | bigquery | snowflake
    description: <string>     # Optional
    schema: <string>          # Default schema name
    catalog: <string>         # Optional: for Trino/Iceberg catalogs
    connection_ref: <string>  # Reference to connection config (resolved at runtime)
```

**Example:**

```yaml
sources:
  warehouse:
    type: postgres
    description: "Primary analytics warehouse"
    schema: public
    connection_ref: "${WAREHOUSE_CONNECTION}"
```

---

### 2.2 Entities

Entities map to database tables. They define fields, primary keys, and foreign keys.

```yaml
entities:
  <entity_name>:
    source: <source_name>           # Reference to sources section
    table: <string>                 # Physical table name
    description: <string>           # Optional
    primary_key: <field_name>       # Single field or array for composite

    fields:
      <field_name>:
        type: <field_type>          # See Field Types section
        column: <string>            # Physical column name (if different)
        description: <string>       # Optional
        nullable: <boolean>         # Default: true

    foreign_keys:
      <fk_name>:
        field: <field_name>         # Local field
        references:
          entity: <entity_name>     # Target entity
          field: <field_name>       # Target field
```

**Example:**

```yaml
entities:
  orders:
    source: warehouse
    table: orders
    description: "Customer orders"
    primary_key: order_id

    fields:
      order_id:
        type: integer
        description: "Unique order identifier"
        nullable: false
      customer_id:
        type: integer
        description: "Reference to customer"
      order_date:
        type: date
        description: "Date order was placed"
      total_amount:
        type: decimal
        description: "Order total in USD"
      status:
        type: string
        description: "Order status: pending, shipped, delivered, cancelled"

    foreign_keys:
      fk_customer:
        field: customer_id
        references:
          entity: customers
          field: customer_id
```

---

### 2.3 Metrics

Metrics define aggregations. They can be simple (direct aggregation) or derived (computed from other metrics).

```yaml
metrics:
  <metric_name>:
    type: <metric_type>             # simple | derived
    description: <string>           # Required
    entity: <entity_name>           # Base entity for this metric

    # For type: simple
    expression: <sql_expression>    # Aggregation expression
    time_field: <field_name>        # Optional: for time-based filtering

    # For type: derived
    formula: <expression>           # References other metrics

    # Optional
    filters:                        # Default filters always applied
      - <filter_expression>
    format: <format_string>         # Display format (e.g., "$,.2f")
    unit: <string>                  # Unit label (e.g., "USD", "count")
```

**Simple Metric Example:**

```yaml
metrics:
  total_revenue:
    type: simple
    description: "Sum of all order amounts"
    entity: orders
    expression: "SUM(${total_amount})"
    time_field: order_date
    format: "$,.2f"
    unit: USD

  order_count:
    type: simple
    description: "Number of orders"
    entity: orders
    expression: "COUNT(DISTINCT ${order_id})"
    time_field: order_date

  average_order_value:
    type: simple
    description: "Average order amount"
    entity: orders
    expression: "AVG(${total_amount})"
    time_field: order_date
    format: "$,.2f"
    unit: USD
```

**Derived Metric Example:**

```yaml
metrics:
  revenue_per_order:
    type: derived
    description: "Revenue divided by order count"
    formula: "${total_revenue} / NULLIF(${order_count}, 0)"
    format: "$,.2f"
    unit: USD

  yoy_revenue_growth:
    type: derived
    description: "Year-over-year revenue growth percentage"
    formula: "(${total_revenue} - ${total_revenue_prior_year}) / NULLIF(${total_revenue_prior_year}, 0) * 100"
    format: ".1f%"
```

---

### 2.4 Dimensions

Dimensions define grouping fields. They can be direct field references or computed expressions.

```yaml
dimensions:
  <dimension_name>:
    type: <field_type>              # Output type
    description: <string>           # Required
    entity: <entity_name>           # Source entity

    # One of:
    field: <field_name>             # Direct field reference
    expression: <sql_expression>    # Computed expression

    # Optional
    hierarchy: <hierarchy_name>     # For drill-down support
    level: <integer>                # Position in hierarchy (0 = top)
```

**Example:**

```yaml
dimensions:
  customer_country:
    type: string
    description: "Customer's country"
    entity: customers
    field: country

  order_year:
    type: integer
    description: "Year of order"
    entity: orders
    expression: "EXTRACT(YEAR FROM ${order_date})"
    hierarchy: time
    level: 0

  order_quarter:
    type: string
    description: "Quarter of order (Q1-Q4)"
    entity: orders
    expression: "'Q' || EXTRACT(QUARTER FROM ${order_date})"
    hierarchy: time
    level: 1

  order_month:
    type: string
    description: "Month of order (YYYY-MM)"
    entity: orders
    expression: "TO_CHAR(${order_date}, 'YYYY-MM')"
    hierarchy: time
    level: 2
```

---

### 2.5 Filters

Filters define named filter conditions that can be referenced in queries.

```yaml
filters:
  <filter_name>:
    description: <string>           # Required
    entity: <entity_name>           # Base entity
    expression: <sql_expression>    # Filter condition

    # Optional
    parameters:                     # For parameterized filters
      <param_name>:
        type: <field_type>
        required: <boolean>
        default: <value>
```

**Example:**

```yaml
filters:
  completed_orders:
    description: "Orders that have been delivered"
    entity: orders
    expression: "${status} = 'delivered'"

  recent_orders:
    description: "Orders from the last N days"
    entity: orders
    expression: "${order_date} >= CURRENT_DATE - INTERVAL '${days} days'"
    parameters:
      days:
        type: integer
        required: false
        default: 30

  high_value_orders:
    description: "Orders above threshold amount"
    entity: orders
    expression: "${total_amount} >= ${threshold}"
    parameters:
      threshold:
        type: decimal
        required: true
```

---

### 2.6 Relationships

Relationships define how entities connect. They specify join paths used by the query compiler.

```yaml
relationships:
  - name: <string>                  # Unique relationship name
    description: <string>           # Optional
    from:
      entity: <entity_name>
      field: <field_name>
    to:
      entity: <entity_name>
      field: <field_name>
    type: <join_type>               # one_to_one | one_to_many | many_to_one | many_to_many
    join: <join_strategy>           # inner | left | right | full (default: left)
```

**Example:**

```yaml
relationships:
  - name: order_customer
    description: "Each order belongs to one customer"
    from:
      entity: orders
      field: customer_id
    to:
      entity: customers
      field: customer_id
    type: many_to_one
    join: left

  - name: order_details
    description: "Each order has multiple line items"
    from:
      entity: orders
      field: order_id
    to:
      entity: order_details
      field: order_id
    type: one_to_many
    join: left

  - name: order_detail_product
    description: "Each line item references a product"
    from:
      entity: order_details
      field: product_id
    to:
      entity: products
      field: product_id
    type: many_to_one
    join: left
```

---

## 3. Field Types

The semantic layer supports these field types, which map to appropriate SQL types per dialect:

| Type | Description | PostgreSQL | DuckDB | Trino |
|------|-------------|------------|--------|-------|
| `string` | Variable-length text | `TEXT` | `VARCHAR` | `VARCHAR` |
| `integer` | 64-bit integer | `BIGINT` | `BIGINT` | `BIGINT` |
| `decimal` | Precise decimal | `NUMERIC(18,4)` | `DECIMAL(18,4)` | `DECIMAL(18,4)` |
| `date` | Calendar date | `DATE` | `DATE` | `DATE` |
| `timestamp` | Date and time | `TIMESTAMP` | `TIMESTAMP` | `TIMESTAMP` |
| `boolean` | True/false | `BOOLEAN` | `BOOLEAN` | `BOOLEAN` |

### Type Coercion Rules

1. `integer` + `decimal` = `decimal`
2. `date` can be compared to `timestamp` (implicit cast)
3. `string` comparisons are case-sensitive by default
4. `boolean` cannot be coerced to other types

---

## 4. Metric Types

### 4.1 Simple Metrics

Simple metrics define a direct aggregation on an entity.

**Expression Syntax:**

- Use `${field_name}` to reference entity fields
- Standard SQL aggregation functions: `SUM`, `COUNT`, `AVG`, `MIN`, `MAX`
- Dialect-specific functions are normalized at compile time

**Examples:**

```yaml
# Count distinct
expression: "COUNT(DISTINCT ${customer_id})"

# Conditional sum
expression: "SUM(CASE WHEN ${status} = 'delivered' THEN ${total_amount} ELSE 0 END)"

# Percentage
expression: "100.0 * SUM(CASE WHEN ${status} = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*)"
```

### 4.2 Derived Metrics

Derived metrics compute values from other metrics.

**Formula Syntax:**

- Use `${metric_name}` to reference other metrics
- Standard arithmetic operators: `+`, `-`, `*`, `/`
- Use `NULLIF` to prevent division by zero

**Restrictions:**

- Cannot create circular dependencies
- All referenced metrics must be computable from the same entity graph
- Time alignment must be compatible

**Examples:**

```yaml
# Ratio
formula: "${total_revenue} / NULLIF(${order_count}, 0)"

# Growth rate
formula: "(${current_period_revenue} - ${prior_period_revenue}) / NULLIF(${prior_period_revenue}, 0)"

# Weighted average
formula: "${total_revenue} / NULLIF(${total_quantity}, 0)"
```

### 4.3 Metric Resolution Order

When compiling a query with multiple metrics:

1. Build dependency graph of all referenced metrics
2. Topologically sort to find computation order
3. Simple metrics compute first (leaf nodes)
4. Derived metrics compute from their dependencies
5. Final SELECT assembles all requested metrics

---

## 5. Relationship Resolution

### 5.1 Join Path Computation

When a query references fields from multiple entities, the compiler must compute a join path.

**Algorithm:**

1. Identify all entities referenced by metrics, dimensions, and filters
2. Build a graph from the `relationships` section
3. Find shortest path from base entity to each required entity
4. Compose joins in topological order

**Example:**

Query requests:
- Metric: `total_revenue` (entity: `orders`)
- Dimension: `product_category` (entity: `products`)

Resolution:
1. Base entity: `orders`
2. Target entity: `products`
3. Path: `orders` -> `order_details` -> `products`
4. Generated joins:
   ```sql
   FROM orders o
   LEFT JOIN order_details od ON o.order_id = od.order_id
   LEFT JOIN products p ON od.product_id = p.product_id
   ```

### 5.2 Join Type Selection

The default join type comes from the relationship definition, but can be overridden:

| Relationship Type | Default Join | Notes |
|-------------------|--------------|-------|
| `one_to_one` | `LEFT` | Preserves all base records |
| `one_to_many` | `LEFT` | May increase row count |
| `many_to_one` | `LEFT` | Preserves all base records |
| `many_to_many` | `LEFT` | Requires intermediate table |

### 5.3 Ambiguous Paths

When multiple paths exist between entities, the compiler:

1. Prefers paths with explicit `priority` set in relationships
2. Falls back to shortest path by hop count
3. Raises error if paths have equal priority and length

**Resolution via Explicit Path:**

```yaml
# In LiquidFlow query, specify the path explicitly:
join_path:
  - order_customer
  - customer_region
```

---

## 6. Vocabulary Closure

The semantic layer enforces **closed vocabulary** - only explicitly defined terms are valid.

### 6.1 Validation Rules

1. **Entity Validation**: All entity references must exist in `entities` section
2. **Field Validation**: All field references must exist in the entity's `fields` section
3. **Metric Validation**: All metric references must exist in `metrics` section
4. **Dimension Validation**: All dimension references must exist in `dimensions` section
5. **Filter Validation**: All filter references must exist in `filters` section
6. **Relationship Validation**: All relationship endpoints must reference valid entities and fields

### 6.2 Compile-Time Enforcement

The semantic layer loader performs full validation before any query can execute:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  location: {
    section: string;
    name: string;
    field?: string;
  };
}
```

**Error Codes:**

| Code | Description |
|------|-------------|
| `E001` | Unknown entity reference |
| `E002` | Unknown field reference |
| `E003` | Unknown metric reference |
| `E004` | Unknown dimension reference |
| `E005` | Unknown filter reference |
| `E006` | Circular metric dependency |
| `E007` | Unreachable entity (no join path) |
| `E008` | Ambiguous join path |
| `E009` | Type mismatch in expression |
| `E010` | Invalid aggregation expression |

### 6.3 LLM Integration

When an LLM generates queries:

1. LLM receives the semantic layer as context
2. LLM can only reference terms in the vocabulary
3. Query compiler validates all references
4. Invalid references produce clear error messages
5. LLM can self-correct using error feedback

This guarantees that LLM-generated queries are **deterministic** and **hallucination-free**.

---

## 7. Example: Northwind Semantic Layer

Complete example for the Northwind database:

```yaml
version: "1.0"
namespace: northwind
description: "Northwind Traders semantic layer"

# ============================================================================
# SOURCES
# ============================================================================
sources:
  northwind:
    type: postgres
    description: "Northwind database"
    schema: public
    connection_ref: "${NORTHWIND_CONNECTION}"

# ============================================================================
# ENTITIES
# ============================================================================
entities:
  customers:
    source: northwind
    table: customers
    description: "Customer master data"
    primary_key: customer_id
    fields:
      customer_id:
        type: string
        column: customerid
        nullable: false
      company_name:
        type: string
        column: companyname
      contact_name:
        type: string
        column: contactname
      country:
        type: string
      city:
        type: string
      region:
        type: string

  employees:
    source: northwind
    table: employees
    description: "Employee records"
    primary_key: employee_id
    fields:
      employee_id:
        type: integer
        column: employeeid
        nullable: false
      first_name:
        type: string
        column: firstname
      last_name:
        type: string
        column: lastname
      title:
        type: string
      hire_date:
        type: date
        column: hiredate
      reports_to:
        type: integer
        column: reportsto
    foreign_keys:
      fk_manager:
        field: reports_to
        references:
          entity: employees
          field: employee_id

  categories:
    source: northwind
    table: categories
    description: "Product categories"
    primary_key: category_id
    fields:
      category_id:
        type: integer
        column: categoryid
        nullable: false
      category_name:
        type: string
        column: categoryname
      description:
        type: string

  products:
    source: northwind
    table: products
    description: "Product catalog"
    primary_key: product_id
    fields:
      product_id:
        type: integer
        column: productid
        nullable: false
      product_name:
        type: string
        column: productname
      category_id:
        type: integer
        column: categoryid
      supplier_id:
        type: integer
        column: supplierid
      unit_price:
        type: decimal
        column: unitprice
      units_in_stock:
        type: integer
        column: unitsinstock
      discontinued:
        type: boolean
    foreign_keys:
      fk_category:
        field: category_id
        references:
          entity: categories
          field: category_id

  orders:
    source: northwind
    table: orders
    description: "Customer orders"
    primary_key: order_id
    fields:
      order_id:
        type: integer
        column: orderid
        nullable: false
      customer_id:
        type: string
        column: customerid
      employee_id:
        type: integer
        column: employeeid
      order_date:
        type: date
        column: orderdate
      required_date:
        type: date
        column: requireddate
      shipped_date:
        type: date
        column: shippeddate
      ship_country:
        type: string
        column: shipcountry
      ship_city:
        type: string
        column: shipcity
      freight:
        type: decimal
    foreign_keys:
      fk_customer:
        field: customer_id
        references:
          entity: customers
          field: customer_id
      fk_employee:
        field: employee_id
        references:
          entity: employees
          field: employee_id

  order_details:
    source: northwind
    table: order_details
    description: "Order line items"
    primary_key: [order_id, product_id]
    fields:
      order_id:
        type: integer
        column: orderid
        nullable: false
      product_id:
        type: integer
        column: productid
        nullable: false
      unit_price:
        type: decimal
        column: unitprice
      quantity:
        type: integer
      discount:
        type: decimal
    foreign_keys:
      fk_order:
        field: order_id
        references:
          entity: orders
          field: order_id
      fk_product:
        field: product_id
        references:
          entity: products
          field: product_id

# ============================================================================
# METRICS
# ============================================================================
metrics:
  # Revenue metrics
  total_revenue:
    type: simple
    description: "Total revenue from all orders"
    entity: order_details
    expression: "SUM(${unit_price} * ${quantity} * (1 - ${discount}))"
    time_field: order_date  # resolved via relationship
    format: "$,.2f"
    unit: USD

  order_count:
    type: simple
    description: "Number of orders"
    entity: orders
    expression: "COUNT(DISTINCT ${order_id})"
    time_field: order_date

  customer_count:
    type: simple
    description: "Number of unique customers"
    entity: orders
    expression: "COUNT(DISTINCT ${customer_id})"
    time_field: order_date

  items_sold:
    type: simple
    description: "Total quantity of items sold"
    entity: order_details
    expression: "SUM(${quantity})"
    time_field: order_date

  average_order_value:
    type: derived
    description: "Average revenue per order"
    formula: "${total_revenue} / NULLIF(${order_count}, 0)"
    format: "$,.2f"
    unit: USD

  revenue_per_customer:
    type: derived
    description: "Average revenue per customer"
    formula: "${total_revenue} / NULLIF(${customer_count}, 0)"
    format: "$,.2f"
    unit: USD

  # Freight metrics
  total_freight:
    type: simple
    description: "Total freight costs"
    entity: orders
    expression: "SUM(${freight})"
    time_field: order_date
    format: "$,.2f"
    unit: USD

  freight_ratio:
    type: derived
    description: "Freight as percentage of revenue"
    formula: "100.0 * ${total_freight} / NULLIF(${total_revenue}, 0)"
    format: ".1f%"

  # Product metrics
  product_count:
    type: simple
    description: "Number of unique products sold"
    entity: order_details
    expression: "COUNT(DISTINCT ${product_id})"
    time_field: order_date

  avg_discount:
    type: simple
    description: "Average discount applied"
    entity: order_details
    expression: "AVG(${discount}) * 100"
    time_field: order_date
    format: ".1f%"

# ============================================================================
# DIMENSIONS
# ============================================================================
dimensions:
  # Time dimensions
  order_year:
    type: integer
    description: "Year of order"
    entity: orders
    expression: "EXTRACT(YEAR FROM ${order_date})"
    hierarchy: time
    level: 0

  order_quarter:
    type: string
    description: "Quarter of order (Q1-Q4)"
    entity: orders
    expression: "'Q' || EXTRACT(QUARTER FROM ${order_date})"
    hierarchy: time
    level: 1

  order_month:
    type: string
    description: "Month of order (YYYY-MM)"
    entity: orders
    expression: "TO_CHAR(${order_date}, 'YYYY-MM')"
    hierarchy: time
    level: 2

  order_date:
    type: date
    description: "Date of order"
    entity: orders
    field: order_date
    hierarchy: time
    level: 3

  # Geography dimensions
  customer_country:
    type: string
    description: "Customer's country"
    entity: customers
    field: country
    hierarchy: geography
    level: 0

  customer_city:
    type: string
    description: "Customer's city"
    entity: customers
    field: city
    hierarchy: geography
    level: 1

  ship_country:
    type: string
    description: "Shipping destination country"
    entity: orders
    field: ship_country

  ship_city:
    type: string
    description: "Shipping destination city"
    entity: orders
    field: ship_city

  # Product dimensions
  category_name:
    type: string
    description: "Product category"
    entity: categories
    field: category_name
    hierarchy: product
    level: 0

  product_name:
    type: string
    description: "Product name"
    entity: products
    field: product_name
    hierarchy: product
    level: 1

  # Employee dimensions
  employee_name:
    type: string
    description: "Employee full name"
    entity: employees
    expression: "${first_name} || ' ' || ${last_name}"

  employee_title:
    type: string
    description: "Employee job title"
    entity: employees
    field: title

  # Customer dimensions
  company_name:
    type: string
    description: "Customer company name"
    entity: customers
    field: company_name

  contact_name:
    type: string
    description: "Customer contact name"
    entity: customers
    field: contact_name

# ============================================================================
# FILTERS
# ============================================================================
filters:
  shipped_orders:
    description: "Orders that have been shipped"
    entity: orders
    expression: "${shipped_date} IS NOT NULL"

  pending_orders:
    description: "Orders not yet shipped"
    entity: orders
    expression: "${shipped_date} IS NULL"

  late_orders:
    description: "Orders shipped after required date"
    entity: orders
    expression: "${shipped_date} > ${required_date}"

  active_products:
    description: "Products not discontinued"
    entity: products
    expression: "${discontinued} = false"

  in_stock:
    description: "Products with inventory"
    entity: products
    expression: "${units_in_stock} > 0"

  date_range:
    description: "Orders within date range"
    entity: orders
    expression: "${order_date} >= ${start_date} AND ${order_date} <= ${end_date}"
    parameters:
      start_date:
        type: date
        required: true
      end_date:
        type: date
        required: true

  country_filter:
    description: "Filter by customer country"
    entity: customers
    expression: "${country} = ${country_value}"
    parameters:
      country_value:
        type: string
        required: true

  category_filter:
    description: "Filter by product category"
    entity: categories
    expression: "${category_name} = ${category_value}"
    parameters:
      category_value:
        type: string
        required: true

  high_value_orders:
    description: "Orders with line items above threshold"
    entity: order_details
    expression: "(${unit_price} * ${quantity}) >= ${threshold}"
    parameters:
      threshold:
        type: decimal
        required: false
        default: 1000

# ============================================================================
# RELATIONSHIPS
# ============================================================================
relationships:
  - name: order_customer
    description: "Each order belongs to one customer"
    from:
      entity: orders
      field: customer_id
    to:
      entity: customers
      field: customer_id
    type: many_to_one
    join: left

  - name: order_employee
    description: "Each order is handled by one employee"
    from:
      entity: orders
      field: employee_id
    to:
      entity: employees
      field: employee_id
    type: many_to_one
    join: left

  - name: order_details_order
    description: "Order details belong to an order"
    from:
      entity: order_details
      field: order_id
    to:
      entity: orders
      field: order_id
    type: many_to_one
    join: inner

  - name: order_details_product
    description: "Order details reference a product"
    from:
      entity: order_details
      field: product_id
    to:
      entity: products
      field: product_id
    type: many_to_one
    join: left

  - name: product_category
    description: "Each product belongs to a category"
    from:
      entity: products
      field: category_id
    to:
      entity: categories
      field: category_id
    type: many_to_one
    join: left

  - name: employee_manager
    description: "Employee reports to manager"
    from:
      entity: employees
      field: reports_to
    to:
      entity: employees
      field: employee_id
    type: many_to_one
    join: left
```

---

## 8. File Organization

Recommended file structure for semantic layers:

```
semantic/
├── northwind.yaml          # Main semantic layer
├── northwind.metrics.yaml  # Optional: metrics split out
├── northwind.entities.yaml # Optional: entities split out
└── shared/
    ├── time_dimensions.yaml    # Reusable time dimensions
    └── common_filters.yaml     # Reusable filters
```

For split files, use YAML anchors and references:

```yaml
# northwind.yaml
version: "1.0"
namespace: northwind

# Import other files
imports:
  - ./northwind.entities.yaml
  - ./northwind.metrics.yaml
  - ./shared/time_dimensions.yaml
```

---

## 9. Versioning

Semantic layers should be versioned. Breaking changes require version increment:

**Breaking changes:**
- Removing or renaming entities, fields, metrics, dimensions, or filters
- Changing field types
- Modifying metric expressions in ways that change results
- Removing relationships

**Non-breaking changes:**
- Adding new entities, fields, metrics, dimensions, or filters
- Adding descriptions
- Adding new relationships (existing queries unaffected)

**Version format:** `MAJOR.MINOR`
- `MAJOR`: Breaking changes
- `MINOR`: Additions and non-breaking changes

---

## 10. Compilation

The semantic layer compiles to an in-memory representation used by the query engine:

```typescript
interface CompiledSemanticLayer {
  namespace: string;
  version: string;

  sources: Map<string, CompiledSource>;
  entities: Map<string, CompiledEntity>;
  metrics: Map<string, CompiledMetric>;
  dimensions: Map<string, CompiledDimension>;
  filters: Map<string, CompiledFilter>;

  // Precomputed for query resolution
  entityGraph: EntityGraph;
  metricDependencies: DependencyGraph;
  joinPaths: Map<string, JoinPath[]>;
}
```

The compiled layer is cached and reused across queries until the source YAML changes.

---

## 11. Summary

The Semantic Layer provides:

1. **Single source of truth** for data definitions
2. **Explicit vocabulary** that eliminates ambiguity
3. **Type safety** across all field references
4. **Relationship resolution** for automatic join generation
5. **Metric composition** for derived calculations
6. **Named filters** for reusable query conditions
7. **Deterministic compilation** from LiquidFlow to SQL

This foundation enables LiquidConnect to be:
- **Hallucination-free**: Only defined terms are valid
- **Deterministic**: Same query always produces same SQL
- **Self-documenting**: The semantic layer is the documentation
- **LLM-compatible**: Closed vocabulary enables reliable generation
