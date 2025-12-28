# LiquidConnect Language Specification

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2025-12-27

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design Principles](#2-design-principles)
3. [Sigils](#3-sigils)
4. [Stages](#4-stages)
5. [EBNF Grammar](#5-ebnf-grammar)
6. [Examples](#6-examples)
7. [Token Reference](#7-token-reference)

---

## 1. Overview

LiquidConnect is an **LLM-native query language** designed for analytics. It provides a constrained, deterministic syntax that large language models can reliably generate without hallucination.

### Compilation Pipeline

```
LiquidConnect → LiquidFlow IR → SQL
     ↓              ↓            ↓
  Human/LLM      Optimizer    Database
  friendly       layer        execution
```

### Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **LLM-Native** | Designed for reliable LLM generation with zero ambiguity |
| **Sigil-Based** | Visual markers (`@`, `#`, `.`, `?`, `~`) for semantic clarity |
| **Staged Evolution** | Progressive complexity from Stage 0 to Stage 6 |
| **Deterministic** | Same input always produces same output |
| **Closed Vocabulary** | Only registered metrics, dimensions, and entities are valid |

### What LiquidConnect Is NOT

- **Not a general-purpose language** - Only analytics queries
- **Not extensible by users** - Vocabulary is pre-defined
- **Not inferential** - No implicit behaviors or defaults

---

## 2. Design Principles

### 2.1 Closed Vocabulary

Every identifier must exist in the schema registry. There is no dynamic identifier creation.

```
VALID:   Q @revenue           # 'revenue' is a registered metric
INVALID: Q @my_custom_calc    # Not in registry → compile error
```

**Rationale:** LLMs cannot hallucinate metrics that don't exist. The compiler rejects unknown identifiers immediately.

### 2.2 Deterministic Compilation

Given identical input and schema, LiquidConnect produces identical LiquidFlow IR and SQL output.

```
Input:  Q @revenue #region
Schema: v1.2.3
Output: Always the same SQL (byte-for-byte identical)
```

**Rationale:** Enables caching, debugging, and audit trails.

### 2.3 No Inference

LiquidConnect never guesses user intent. Every behavior is explicit.

| Pattern | Behavior |
|---------|----------|
| `Q @revenue` | Aggregate all revenue, no grouping |
| `Q @revenue #region` | Aggregate revenue grouped by region |
| `Q @revenue ?:status="active"` | Explicit filter, not inferred |

**Rationale:** Inference causes LLM confusion and non-determinism.

### 2.4 LLM-Native Design

Optimized for LLM generation reliability:

- **Sigils as anchors** - `@`, `#`, `.` are visually distinct tokens
- **No reserved words** - Avoid collision with natural language
- **Positional independence** - Order doesn't affect semantics (mostly)
- **Minimal punctuation** - Reduce tokenization ambiguity

---

## 3. Sigils

Sigils are single-character markers that denote token semantics. They are the foundation of LiquidConnect's LLM-native design.

### 3.1 Sigil Reference

| Sigil | Name | Purpose | Example |
|-------|------|---------|---------|
| `Q` | Query | Required query marker | `Q @revenue` |
| `@` | Metric | Aggregation (SUM, COUNT, AVG, etc.) | `@revenue`, `@order_count` |
| `#` | Dimension | Grouping column | `#region`, `#product_category` |
| `.` | Entity | Record listing (no aggregation) | `.customers`, `.orders` |
| `?` | Filter | Condition (named or explicit) | `?active`, `?:status="open"` |
| `~` | Time | Temporal expression | `~last_30_days`, `~2024-Q1` |
| `top:` | Limit | Result set limit | `top:10`, `top:100` |
| `+` / `-` | Sort | Ascending / Descending | `+@revenue`, `-@order_count` |
| `vs` | Compare | Period-over-period comparison | `~this_month vs ~last_month` |

### 3.2 Sigil Semantics

#### `Q` - Query Marker

Every LiquidConnect query must begin with `Q`. This marker:
- Signals the start of a query
- Enables detection in mixed content (e.g., chat messages)
- Provides a parsing anchor

```
Q @revenue                    # Valid
@revenue                      # Invalid - missing Q
SELECT revenue FROM sales     # Not LiquidConnect
```

#### `@` - Metric

Metrics represent aggregated values. Each metric maps to a pre-defined aggregation function.

```
@revenue          → SUM(revenue)
@order_count      → COUNT(orders)
@avg_order_value  → AVG(order_value)
@unique_customers → COUNT(DISTINCT customer_id)
```

Multiple metrics are allowed:
```
Q @revenue @order_count @avg_order_value
```

#### `#` - Dimension

Dimensions represent grouping columns. They do not aggregate; they segment.

```
Q @revenue #region                    # Revenue by region
Q @revenue #region #product_category  # Revenue by region and category
```

Order of dimensions affects output column order but not semantics.

#### `.` - Entity

Entities represent record listings without aggregation. Mutually exclusive with metrics.

```
Q .customers                   # List customer records
Q .orders ?:status="pending"   # List pending orders
```

**Constraint:** Cannot combine `.` and `@` in the same query.

```
VALID:   Q .customers
VALID:   Q @customer_count
INVALID: Q .customers @revenue    # Compile error
```

#### `?` - Filter

Filters constrain the result set. Two forms exist:

**Named Filter** (references pre-defined filter):
```
Q @revenue ?active              # Uses registered 'active' filter
Q @revenue ?high_value          # Uses registered 'high_value' filter
```

**Explicit Filter** (inline condition with `:`):
```
Q @revenue ?:status="active"
Q @revenue ?:amount>1000
Q @revenue ?:region="APAC" ?:status="closed"
```

#### `~` - Time Expression

Time expressions constrain or define temporal scope.

**Relative:**
```
~today
~yesterday
~last_7_days
~last_30_days
~this_week
~this_month
~this_quarter
~this_year
~last_week
~last_month
~last_quarter
~last_year
```

**Absolute:**
```
~2024-01-01
~2024-01-01..2024-03-31
~2024-Q1
~2024-W01
~2024-01
```

#### `top:` - Limit

Limits the number of results returned.

```
Q @revenue #customer top:10     # Top 10 customers by revenue
Q .orders top:100               # First 100 orders
```

#### `+` / `-` - Sort Direction

Sort markers apply to metrics or dimensions.

```
Q @revenue #customer -@revenue top:10    # Top 10 by revenue DESC
Q @revenue #customer +@revenue top:10    # Bottom 10 by revenue ASC
Q .customers +#name                      # Customers sorted by name ASC
```

**Default:** If no sort specified with `top:`, defaults to descending on first metric.

#### `vs` - Period Comparison

Compares two time periods.

```
Q @revenue ~this_month vs ~last_month
Q @revenue #region ~this_quarter vs ~last_quarter
Q @revenue ~2024-Q1 vs ~2023-Q1
```

Produces additional columns:
- `{metric}_current`
- `{metric}_previous`
- `{metric}_change`
- `{metric}_change_pct`

---

## 4. Stages

LiquidConnect uses an evolutionary stage model. Each stage builds on the previous, adding capabilities.

### 4.1 Stage Overview

| Stage | Capabilities | Complexity |
|-------|--------------|------------|
| 0 | `Q @metric` or `Q .entity` only | Minimal |
| 1 | + `#dimension` (grouping) | Low |
| 2 | + `?filter` (named and explicit) | Medium |
| 3 | + `~time` expressions | Medium |
| 4 | + `top:N` and `±sort` | Medium-High |
| 5 | + `vs` period comparison | High |
| 6 | + parameters, governance | Enterprise |

### 4.2 Stage 0: Basic Queries

The simplest queries. Either aggregate a metric or list an entity.

**Syntax:**
```
Q @metric
Q .entity
```

**Examples:**
```
Q @revenue              # Total revenue
Q @order_count          # Total order count
Q .customers            # List all customers
Q .products             # List all products
```

**Constraints:**
- Exactly one `Q` marker
- One or more `@metric` OR exactly one `.entity`
- No dimensions, filters, time, or sorting

### 4.3 Stage 1: Dimensions

Add grouping with `#dimension`.

**Syntax:**
```
Q @metric #dimension [#dimension...]
```

**Examples:**
```
Q @revenue #region                     # Revenue by region
Q @revenue #region #product_category   # Revenue by region and category
Q @order_count #status                 # Order count by status
Q @revenue @margin #customer           # Revenue and margin by customer
```

**Constraints:**
- One or more dimensions allowed
- Dimensions must be registered in schema
- Cannot use dimensions with `.entity`

### 4.4 Stage 2: Filters

Add filtering with `?` (named or explicit).

**Syntax:**
```
Q @metric [#dimension...] [?filter...]
Q @metric [#dimension...] [?:condition...]
Q .entity [?filter...]
Q .entity [?:condition...]
```

**Named Filter Examples:**
```
Q @revenue ?active                     # Pre-defined 'active' filter
Q @revenue #region ?enterprise         # 'enterprise' segment filter
Q .customers ?high_value               # 'high_value' customer filter
```

**Explicit Filter Examples:**
```
Q @revenue ?:status="active"
Q @revenue ?:amount>1000
Q @revenue ?:region="APAC"
Q @revenue #customer ?:status="active" ?:amount>1000
Q .orders ?:created_at>"2024-01-01"
```

**Operators in Explicit Filters:**

| Operator | Meaning | Example |
|----------|---------|---------|
| `=` | Equals | `?:status="active"` |
| `!=` | Not equals | `?:status!="cancelled"` |
| `>` | Greater than | `?:amount>1000` |
| `>=` | Greater or equal | `?:amount>=1000` |
| `<` | Less than | `?:amount<100` |
| `<=` | Less or equal | `?:amount<=100` |
| `~=` | Contains (string) | `?:name~="Corp"` |
| `^=` | Starts with | `?:name^="Acme"` |
| `$=` | Ends with | `?:email$="@gmail.com"` |
| `in` | In list | `?:region in ["US","EU","APAC"]` |
| `not in` | Not in list | `?:status not in ["cancelled","refunded"]` |

### 4.5 Stage 3: Time Expressions

Add temporal constraints with `~`.

**Syntax:**
```
Q @metric [#dimension...] [?filter...] ~time_expression
```

**Relative Time Examples:**
```
Q @revenue ~today
Q @revenue ~yesterday
Q @revenue ~last_7_days
Q @revenue ~last_30_days
Q @revenue #region ~this_month
Q @revenue ~this_quarter
Q @revenue ~this_year
Q @revenue ~last_week
Q @revenue ~last_month
Q @revenue ~last_quarter
Q @revenue ~last_year
```

**Absolute Time Examples:**
```
Q @revenue ~2024-01-01                 # Single day
Q @revenue ~2024-01-01..2024-03-31     # Date range
Q @revenue ~2024-Q1                    # Quarter
Q @revenue ~2024-Q1..2024-Q2           # Quarter range
Q @revenue ~2024-W01                   # ISO week
Q @revenue ~2024-01                    # Month (January 2024)
```

**Time with Dimensions and Filters:**
```
Q @revenue #region ?active ~last_30_days
Q @order_count #product_category ~this_quarter
Q .orders ?:status="pending" ~today
```

### 4.6 Stage 4: Limit and Sort

Add result limiting with `top:N` and sorting with `+`/`-`.

**Syntax:**
```
Q @metric [#dimension...] [?filter...] [~time] [±@metric|±#dimension] [top:N]
```

**Examples:**
```
Q @revenue #customer top:10                    # Top 10 customers
Q @revenue #customer -@revenue top:10          # Explicit: top 10 by revenue DESC
Q @revenue #customer +@revenue top:10          # Bottom 10 by revenue ASC
Q @revenue #product -@revenue top:5 ~this_month
Q @order_count #region +@order_count top:3     # Bottom 3 regions
Q .customers +#name top:100                    # First 100 customers by name
```

**Sort Precedence:**
1. Explicit sort (`+`/`-`) takes priority
2. If `top:N` without sort, defaults to `-` (DESC) on first metric
3. For `.entity`, defaults to primary key ASC

**Multiple Sorts:**
```
Q @revenue @margin #customer -@revenue +@margin top:10
```
Primary sort: revenue DESC, secondary sort: margin ASC.

### 4.7 Stage 5: Period Comparison

Add period-over-period comparison with `vs`.

**Syntax:**
```
Q @metric [#dimension...] [?filter...] ~period_a vs ~period_b
```

**Examples:**
```
Q @revenue ~this_month vs ~last_month
Q @revenue #region ~this_quarter vs ~last_quarter
Q @revenue #product ~2024-Q1 vs ~2023-Q1
Q @order_count ~this_week vs ~last_week
Q @revenue @margin #customer ~this_year vs ~last_year top:10
```

**Output Columns:**

For `Q @revenue ~this_month vs ~last_month`:

| Column | Description |
|--------|-------------|
| `revenue_current` | Value for this_month |
| `revenue_previous` | Value for last_month |
| `revenue_change` | Absolute change |
| `revenue_change_pct` | Percentage change |

**Constraints:**
- Both periods must be of compatible granularity
- `vs` is a binary operator (exactly two periods)

### 4.8 Stage 6: Parameters and Governance

Enterprise features: parameterized queries and governance controls.

**Parameterized Queries:**
```
Q @revenue #region ?:region=$selected_region ~$date_range
```

Parameters are prefixed with `$` and resolved at runtime.

**Governance Tags:**
```
Q @revenue #customer [audit:pii] [mask:partial]
```

Governance tags in `[]` control data access and masking.

**Access Control:**
```
Q @salary #department [access:hr_only]
```

**Stage 6 Capabilities:**

| Feature | Syntax | Purpose |
|---------|--------|---------|
| Parameters | `$param_name` | Runtime substitution |
| Audit tags | `[audit:*]` | Compliance logging |
| Masking | `[mask:*]` | Data obfuscation |
| Access control | `[access:*]` | Role-based filtering |
| Lineage | `[lineage:*]` | Data provenance |

---

## 5. EBNF Grammar

### 5.1 Complete Grammar

```ebnf
(* LiquidConnect Grammar - Version 1.0.0 *)

(* Top-level *)
query           = "Q" , ( metric_query | entity_query ) ;

(* Query Types *)
metric_query    = metrics , [ dimensions ] , [ filters ] , [ time_expr ] , [ comparison ] , [ sorts ] , [ limit ] , [ governance ] ;
entity_query    = entity , [ filters ] , [ time_expr ] , [ sorts ] , [ limit ] , [ governance ] ;

(* Metrics *)
metrics         = metric , { metric } ;
metric          = "@" , identifier ;

(* Entity *)
entity          = "." , identifier ;

(* Dimensions *)
dimensions      = dimension , { dimension } ;
dimension       = "#" , identifier ;

(* Filters *)
filters         = filter , { filter } ;
filter          = named_filter | explicit_filter ;
named_filter    = "?" , identifier ;
explicit_filter = "?:" , condition ;

(* Conditions *)
condition       = identifier , operator , value ;
operator        = "=" | "!=" | ">" | ">=" | "<" | "<=" | "~=" | "^=" | "$=" | "in" | "not in" ;
value           = string_literal | number_literal | boolean_literal | list_literal | parameter ;

(* Time Expressions *)
time_expr       = "~" , time_value ;
time_value      = relative_time | absolute_time | time_range ;
relative_time   = "today" | "yesterday" | "last_7_days" | "last_30_days" | "last_90_days"
                | "this_week" | "last_week" | "this_month" | "last_month"
                | "this_quarter" | "last_quarter" | "this_year" | "last_year" ;
absolute_time   = date | year_quarter | year_week | year_month ;
time_range      = absolute_time , ".." , absolute_time ;
date            = year , "-" , month , "-" , day ;
year_quarter    = year , "-Q" , quarter ;
year_week       = year , "-W" , week ;
year_month      = year , "-" , month ;

(* Comparison *)
comparison      = "vs" , "~" , time_value ;

(* Sorting *)
sorts           = sort , { sort } ;
sort            = sort_direction , ( metric | dimension ) ;
sort_direction  = "+" | "-" ;

(* Limit *)
limit           = "top:" , positive_integer ;

(* Governance (Stage 6) *)
governance      = governance_tag , { governance_tag } ;
governance_tag  = "[" , tag_name , ":" , tag_value , "]" ;
tag_name        = "audit" | "mask" | "access" | "lineage" ;
tag_value       = identifier ;

(* Parameters (Stage 6) *)
parameter       = "$" , identifier ;

(* Literals *)
string_literal  = '"' , { character } , '"' ;
number_literal  = [ "-" ] , digit , { digit } , [ "." , digit , { digit } ] ;
boolean_literal = "true" | "false" ;
list_literal    = "[" , value , { "," , value } , "]" ;

(* Primitives *)
identifier      = letter , { letter | digit | "_" } ;
letter          = "a" | "b" | ... | "z" | "A" | "B" | ... | "Z" ;
digit           = "0" | "1" | ... | "9" ;
positive_integer = digit - "0" , { digit } | "0" ;
year            = digit , digit , digit , digit ;
month           = "0" , digit - "0" | "1" , ( "0" | "1" | "2" ) ;
day             = "0" , digit - "0" | ( "1" | "2" ) , digit | "3" , ( "0" | "1" ) ;
quarter         = "1" | "2" | "3" | "4" ;
week            = "0" , digit - "0" | ( "1" | "2" | "3" | "4" ) , digit | "5" , ( "0" | "1" | "2" | "3" ) ;
character       = (* any printable character except unescaped quote *) ;
```

### 5.2 Stage-Specific Grammars

#### Stage 0 Grammar
```ebnf
query_s0        = "Q" , ( metric | entity ) ;
metric          = "@" , identifier ;
entity          = "." , identifier ;
```

#### Stage 1 Grammar
```ebnf
query_s1        = "Q" , metrics , [ dimensions ] ;
query_s1        = query_s0 | "Q" , metrics , dimensions ;
```

#### Stage 2 Grammar
```ebnf
query_s2        = "Q" , ( metrics , [ dimensions ] , [ filters ] )
                | "Q" , ( entity , [ filters ] ) ;
```

#### Stage 3 Grammar
```ebnf
query_s3        = query_s2 , [ time_expr ] ;
```

#### Stage 4 Grammar
```ebnf
query_s4        = query_s3 , [ sorts ] , [ limit ] ;
```

#### Stage 5 Grammar
```ebnf
query_s5        = "Q" , metrics , [ dimensions ] , [ filters ] , [ time_expr ] , [ comparison ] , [ sorts ] , [ limit ] ;
```

#### Stage 6 Grammar
```ebnf
query_s6        = query_s5 , [ governance ] ;
(* Additionally, 'value' may contain 'parameter' *)
```

---

## 6. Examples

### 6.1 Stage 0 Examples

```
# Metric queries
Q @revenue                    # Total revenue
Q @order_count                # Total orders
Q @avg_order_value            # Average order value
Q @unique_customers           # Count distinct customers

# Entity queries
Q .customers                  # List all customers
Q .orders                     # List all orders
Q .products                   # List all products
```

### 6.2 Stage 1 Examples

```
# Single dimension
Q @revenue #region            # Revenue by region
Q @order_count #status        # Orders by status
Q @revenue #customer          # Revenue by customer

# Multiple dimensions
Q @revenue #region #product_category
Q @order_count #year #month
Q @revenue #sales_rep #region

# Multiple metrics with dimensions
Q @revenue @margin @order_count #customer
Q @revenue @cost @profit #product
```

### 6.3 Stage 2 Examples

```
# Named filters
Q @revenue ?active
Q @revenue #region ?enterprise
Q @revenue #customer ?high_value ?active
Q .customers ?churned

# Explicit filters - equality
Q @revenue ?:status="active"
Q @revenue #region ?:country="US"
Q .orders ?:status="pending"

# Explicit filters - comparison
Q @revenue ?:amount>1000
Q @revenue ?:margin>=0.2
Q .products ?:stock<10

# Explicit filters - string matching
Q .customers ?:name~="Corp"
Q .customers ?:email$="@gmail.com"

# Explicit filters - list membership
Q @revenue ?:region in ["US","EU","APAC"]
Q @revenue ?:status not in ["cancelled","refunded"]

# Combined filters
Q @revenue #customer ?active ?:amount>1000 ?:region="APAC"
```

### 6.4 Stage 3 Examples

```
# Relative time
Q @revenue ~today
Q @revenue ~last_7_days
Q @revenue ~last_30_days
Q @revenue #region ~this_month
Q @revenue ~this_quarter
Q @revenue #product ~last_year

# Absolute time - dates
Q @revenue ~2024-01-01
Q @revenue ~2024-01-01..2024-03-31

# Absolute time - periods
Q @revenue ~2024-Q1
Q @revenue ~2024-W01
Q @revenue ~2024-01

# Combined with dimensions and filters
Q @revenue #region ?active ~last_30_days
Q @order_count #product_category ?:status="completed" ~this_quarter
Q .orders ?:status="pending" ~today
```

### 6.5 Stage 4 Examples

```
# Basic limit
Q @revenue #customer top:10
Q .orders top:100

# Descending sort (explicit)
Q @revenue #customer -@revenue top:10
Q @revenue #product -@revenue top:5 ~this_month

# Ascending sort
Q @revenue #customer +@revenue top:10
Q .customers +#name top:50

# Multiple sorts
Q @revenue @margin #customer -@revenue +@margin top:20

# Full query with all elements
Q @revenue @order_count #customer ?active ?:region="US" ~last_30_days -@revenue top:10
```

### 6.6 Stage 5 Examples

```
# Month over month
Q @revenue ~this_month vs ~last_month
Q @revenue #region ~this_month vs ~last_month

# Quarter over quarter
Q @revenue ~this_quarter vs ~last_quarter
Q @revenue #product ~2024-Q1 vs ~2023-Q4

# Year over year
Q @revenue ~this_year vs ~last_year
Q @revenue #customer ~2024-Q1 vs ~2023-Q1 top:10

# Complex comparison query
Q @revenue @margin #region ?active ~this_quarter vs ~last_quarter -@revenue top:5
```

### 6.7 Stage 6 Examples

```
# Parameterized queries
Q @revenue #region ?:region=$selected_region
Q @revenue ~$start_date..$end_date
Q @revenue #product ?:category=$category ~$period

# Governance tags
Q @revenue #customer [audit:pii]
Q @salary #department [access:hr_only]
Q @revenue #customer [mask:partial] [audit:gdpr]

# Combined
Q @salary #employee ?:department=$dept ~this_month [access:hr_only] [audit:pii] [mask:full]
```

---

## 7. Token Reference

### 7.1 Token Types

| Token Type | Pattern | Examples |
|------------|---------|----------|
| `QUERY_MARKER` | `Q` | `Q` |
| `METRIC_SIGIL` | `@` | `@` |
| `DIMENSION_SIGIL` | `#` | `#` |
| `ENTITY_SIGIL` | `.` | `.` |
| `FILTER_NAMED` | `?` followed by identifier | `?active` |
| `FILTER_EXPLICIT` | `?:` | `?:` |
| `TIME_SIGIL` | `~` | `~` |
| `LIMIT` | `top:` followed by integer | `top:10` |
| `SORT_ASC` | `+` | `+` |
| `SORT_DESC` | `-` | `-` |
| `COMPARE` | `vs` | `vs` |
| `IDENTIFIER` | `[a-zA-Z][a-zA-Z0-9_]*` | `revenue`, `customer_id` |
| `STRING` | `"[^"]*"` | `"active"`, `"US"` |
| `NUMBER` | `-?[0-9]+(\.[0-9]+)?` | `1000`, `-5.5` |
| `BOOLEAN` | `true` \| `false` | `true` |
| `LIST_OPEN` | `[` | `[` |
| `LIST_CLOSE` | `]` | `]` |
| `RANGE` | `..` | `..` |
| `PARAMETER` | `$` followed by identifier | `$region` |
| `GOV_OPEN` | `[` (in governance context) | `[` |
| `GOV_CLOSE` | `]` (in governance context) | `]` |
| `GOV_COLON` | `:` (in governance context) | `:` |

### 7.2 Operator Tokens

| Token | Lexeme | Semantics |
|-------|--------|-----------|
| `OP_EQ` | `=` | Equals |
| `OP_NEQ` | `!=` | Not equals |
| `OP_GT` | `>` | Greater than |
| `OP_GTE` | `>=` | Greater than or equal |
| `OP_LT` | `<` | Less than |
| `OP_LTE` | `<=` | Less than or equal |
| `OP_CONTAINS` | `~=` | Contains substring |
| `OP_STARTS` | `^=` | Starts with |
| `OP_ENDS` | `$=` | Ends with |
| `OP_IN` | `in` | In list |
| `OP_NOT_IN` | `not in` | Not in list |

### 7.3 Reserved Time Identifiers

| Identifier | Description |
|------------|-------------|
| `today` | Current date |
| `yesterday` | Previous date |
| `last_7_days` | Rolling 7-day window |
| `last_30_days` | Rolling 30-day window |
| `last_90_days` | Rolling 90-day window |
| `this_week` | Current ISO week |
| `last_week` | Previous ISO week |
| `this_month` | Current calendar month |
| `last_month` | Previous calendar month |
| `this_quarter` | Current fiscal quarter |
| `last_quarter` | Previous fiscal quarter |
| `this_year` | Current calendar year |
| `last_year` | Previous calendar year |

### 7.4 Lexical Precedence

Tokens are matched in the following order:

1. Keywords: `Q`, `vs`, `in`, `not in`, `true`, `false`, `top:`
2. Sigils: `@`, `#`, `.`, `?:`, `?`, `~`, `+`, `-`
3. Operators: `!=`, `>=`, `<=`, `~=`, `^=`, `$=`, `=`, `>`, `<`
4. Delimiters: `[`, `]`, `..`, `,`
5. Literals: strings, numbers
6. Identifiers

### 7.5 Whitespace and Comments

- **Whitespace**: Spaces and tabs are ignored between tokens
- **Newlines**: Queries must be single-line (no embedded newlines)
- **Comments**: Not supported in LiquidConnect syntax

---

## Appendix A: Compilation to LiquidFlow IR

LiquidConnect compiles to LiquidFlow IR (Intermediate Representation) before SQL generation.

### Example Transformation

**LiquidConnect:**
```
Q @revenue #region ?active ~last_30_days -@revenue top:10
```

**LiquidFlow IR (conceptual):**
```yaml
type: metric_query
metrics:
  - name: revenue
    aggregation: SUM
dimensions:
  - name: region
filters:
  - type: named
    name: active
time:
  type: relative
  value: last_30_days
sort:
  - metric: revenue
    direction: DESC
limit: 10
```

**Generated SQL:**
```sql
SELECT
  region,
  SUM(revenue) AS revenue
FROM sales
WHERE status = 'active'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY region
ORDER BY revenue DESC
LIMIT 10
```

---

## Appendix B: Error Messages

| Error Code | Message | Cause |
|------------|---------|-------|
| `LC001` | Unknown metric: `{name}` | Metric not in schema registry |
| `LC002` | Unknown dimension: `{name}` | Dimension not in schema registry |
| `LC003` | Unknown entity: `{name}` | Entity not in schema registry |
| `LC004` | Unknown named filter: `{name}` | Named filter not defined |
| `LC005` | Cannot combine metric and entity | Used `@` and `.` in same query |
| `LC006` | Invalid time expression: `{expr}` | Malformed temporal expression |
| `LC007` | Invalid operator: `{op}` | Unknown comparison operator |
| `LC008` | Type mismatch in filter | Value type doesn't match field type |
| `LC009` | Missing query marker | Query doesn't start with `Q` |
| `LC010` | Incompatible comparison periods | `vs` periods have different granularity |

---

## Appendix C: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-27 | Initial specification |

---

*End of LiquidConnect Language Specification*
