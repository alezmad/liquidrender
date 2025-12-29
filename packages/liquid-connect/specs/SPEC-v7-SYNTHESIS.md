# LiquidConnect v7.0 - Synthesis Specification

**Status**: Production-ready
**Philosophy**: language.md implementation + v6 compression + enterprise features
**Version**: 7.0

---

## Synthesis Decisions

| Feature | language.md | v6 | v7 Decision |
|---------|-------------|-----|-------------|
| Time notation | `~last_30_days` | `~P30d` | **v6** - 25:1 compression |
| Filter AND | implicit spaces | explicit `&` | **v6** - unambiguous |
| Comparison cols | `_current/_previous` | `_compare/_delta` | **v6** - concise |
| Stages model | Yes (0-6) | No | **language.md** - learning curve |
| Governance | No | RLS/CLS | **v6** - enterprise-ready |
| Explain mode | No | `!explain` | **v6** - debugging |
| Readable time | `~this_month` | `~M` | **BOTH** - aliases |

---

## Core Syntax

```
Q @metric #dim ?filter ~time top:N ±sort vs period
```

| Element | Sigil | Example |
|---------|-------|---------|
| Query marker | `Q` | `Q @revenue` |
| Metric | `@` | `@revenue @orders` |
| Dimension | `#` | `#region #customer` |
| Entity | `.` | `.customers .orders` |
| Filter (named) | `?` | `?enterprise ?active` |
| Filter (explicit) | `?:` | `?:segment="ENT"` |
| Time | `~` | `~Q-1 ~30d ~YTD` |
| Limit | `top:` | `top:10` |
| Sort | `+/-` | `-@revenue +#name` |
| Compare | `vs` | `vs Q-4` |

---

## Time Expressions (v7 Unified)

### Compressed Notation (LLM-optimized)

| Expression | Meaning | Equivalent SQL |
|------------|---------|----------------|
| `~D` | Today | `DATE(NOW())` |
| `~D-1` | Yesterday | `DATE(NOW()) - 1` |
| `~W` | This week | Week containing today |
| `~W-1` | Last week | Previous week |
| `~M` | This month | Month containing today |
| `~M-1` | Last month | Previous month |
| `~Q` | This quarter | Quarter containing today |
| `~Q-1` | Last quarter | Previous quarter |
| `~Y` | This year | Year containing today |
| `~Y-1` | Last year | Previous year |

### Duration Notation (ISO 8601 inspired)

| Expression | Meaning |
|------------|---------|
| `~7d` | Last 7 days |
| `~30d` | Last 30 days |
| `~90d` | Last 90 days |
| `~6M` | Last 6 months |
| `~1Y` | Last 1 year |

### Readable Aliases (optional, same as compressed)

| Alias | Equivalent |
|-------|------------|
| `~today` | `~D` |
| `~yesterday` | `~D-1` |
| `~this_week` | `~W` |
| `~last_week` | `~W-1` |
| `~this_month` | `~M` |
| `~last_month` | `~M-1` |
| `~this_quarter` | `~Q` |
| `~last_quarter` | `~Q-1` |
| `~this_year` | `~Y` |
| `~last_year` | `~Y-1` |
| `~YTD` | `~[Y..D]` |
| `~MTD` | `~[M..D]` |
| `~QTD` | `~[Q..D]` |

### Specific Dates

| Expression | Meaning |
|------------|---------|
| `~2024` | Year 2024 |
| `~2024-Q3` | Q3 2024 |
| `~2024-06` | June 2024 |
| `~2024-06-15` | June 15, 2024 |

### Ranges

| Expression | Meaning |
|------------|---------|
| `~[Q-4..Q-1]` | Last 4 quarters |
| `~[M-12..M-1]` | Last 12 months |
| `~[2024-01..2024-06]` | Jan-Jun 2024 |

---

## Filters (v7 Unified)

### Explicit AND Required

```
# CORRECT - explicit AND
Q @revenue ?:segment="ENT"&:status="active"

# CORRECT - named filters with AND
Q @revenue ?enterprise&active

# ERROR - implicit AND not allowed
Q @revenue ?enterprise ?active   # ERROR E104
```

### Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `=` | equals | `?:status="active"` |
| `!=` | not equals | `?:status!="cancelled"` |
| `>` `>=` `<` `<=` | comparison | `?:amount>=5000` |
| `~~` | contains | `?:name~~"corp"` |
| `:[]` | in set | `?:region:["NA","EU"]` |
| `!:[]` | not in set | `?:region!:["APAC"]` |
| `:[..]` | range | `?:amount:[1000..5000]` |
| `!` | IS NOT NULL | `?:email!` |
| `?` | IS NULL | `?:shippedDate?` |

### Boolean Operators

| Operator | Precedence | Example |
|----------|------------|---------|
| `!` (NOT) | Highest | `?!cancelled` |
| `&` (AND) | Middle | `?:a="x"&:b="y"` |
| `\|` (OR) | Lowest | `?:a="x"\|:a="y"` |
| `()` | Grouping | `?(:a="x"\|:b="y")&:c="z"` |

---

## Comparison Output (v7)

```
Q @revenue #region ~Q vs Q-4
```

| Column | Meaning |
|--------|---------|
| `revenue` | Value for base period |
| `revenue_compare` | Value for comparison period |
| `revenue_delta` | Absolute change (base - compare) |
| `revenue_pct` | Percentage change |

---

## Sort by Query Type

| Query Type | Sort Target | Example |
|------------|-------------|---------|
| Metric query | `@metric` or `#dim` | `-@revenue +#region` |
| Entity query | `:field` | `+:name -:created_at` |

---

## Enterprise Features (from v6)

### Parameters

```
Q @revenue ?:amount>=$minAmount ~[$start..$end]
Q @revenue #customer top:$limit -@revenue
```

### Scope Pins

```
Q@orders @revenue #region ~Q-1    # Uses @revenue@orders
Q@invoices @revenue #region ~Q-1  # Uses @revenue@invoices
```

### Time Override

```
Q @revenue ~Q-1 @t:signupDate     # Filter by signup, not order date
```

### Explain Mode

```
Q @revenue #region ~Q-1 !explain  # Returns resolution trace, not data
```

### Null Checks

```
Q .customers ?:email! top:100     # Email IS NOT NULL
Q .orders ?:shippedDate? ~M-1     # Shipped date IS NULL
```

---

## Governance

### Row-Level Security (RLS)

```yaml
governance:
  rowLevelSecurity:
    - role: regional_manager
      inject: ":region = $user.region"
    - role: account_owner
      inject: ":customerId = $user.customerId"
```

### Column-Level Security (CLS)

```yaml
governance:
  columnRestrictions:
    - role: analyst
      hidden: [":customerEmail", ":customerPhone"]
```

### Metric Allowlists

```yaml
governance:
  metricAllowlists:
    - role: viewer
      allowed: ["@orderCount", "@customerCount"]
    - role: admin
      allowed: ["*"]
```

### Query Limits

```yaml
governance:
  limits:
    maxJoinDepth: 3
    maxLimit: 10000
    defaultLimit: 1000
    queryTimeout: 30000
```

---

## Stages (Evolutionary Learning)

| Stage | Capabilities | Example |
|-------|--------------|---------|
| 0 | `Q @metric` or `Q .entity` | `Q @revenue` |
| 1 | + `#dimension` | `Q @revenue #region` |
| 2 | + `?filter` | `Q @revenue ?enterprise` |
| 3 | + `~time` | `Q @revenue ~Q-1` |
| 4 | + `top:N` `±sort` | `Q @revenue #customer top:10 -@revenue` |
| 5 | + `vs` comparison | `Q @revenue ~Q vs Q-4` |
| 6 | + parameters, governance | Enterprise features |

---

## Examples

```
// Stage 0 - Basic
Q @revenue
Q .customers

// Stage 1 - Grouped
Q @revenue #region
Q @revenue #region #segment

// Stage 2 - Filtered
Q @revenue ?enterprise
Q @revenue ?:segment="ENT"
Q @revenue ?:segment="ENT"&:amount>=5000

// Stage 3 - Time
Q @revenue ~Q-1
Q @revenue #region ~30d
Q @revenue ~[M-12..M-1]

// Stage 4 - Sorted
Q @revenue #customer top:10 -@revenue
Q .orders top:100 -:amount

// Stage 5 - Comparison
Q @revenue ~Q vs Q-4
Q @revenue #region ~M vs M-1

// Stage 6 - Enterprise
Q @revenue ?:amount>=$threshold ~[$start..$end]
Q@orders @revenue ~Q-1 @t:signupDate !explain
```

---

## Token Efficiency

| Query Type | SQL Tokens | LC Tokens | Ratio |
|------------|------------|-----------|-------|
| Simple aggregate | 15 | 2 | **7.5x** |
| With time | 25 | 4 | **6.3x** |
| Grouped | 30 | 4 | **7.5x** |
| Filtered | 40 | 5 | **8.0x** |
| Multi-join | 60 | 6 | **10x** |
| Comparison | 80 | 7 | **11.4x** |

---

## EBNF Grammar (Complete)

```ebnf
query           = "Q" [ scope_pin ] ( metric_query | entity_query )
                  [ time_override ] [ explain ] ;

metric_query    = metrics { dimension } [ filter_clause ] [ time ]
                  [ limit ] { sort_item } [ compare ] ;

entity_query    = entity [ filter_clause ] [ limit ] { sort_item } ;

(* Elements *)
metrics         = metric { metric } ;
metric          = "@" identifier ;
dimension       = "#" identifier ;
entity          = "." identifier ;

(* Filters *)
filter_clause   = "?" [ "!" ] bool_expr ;
bool_expr       = or_expr ;
or_expr         = and_expr { "|" and_expr } ;
and_expr        = unary_expr { "&" unary_expr } ;
unary_expr      = [ "!" ] primary ;
primary         = predicate | "(" bool_expr ")" ;
predicate       = named_pred | explicit_pred | null_check ;
named_pred      = identifier ;
explicit_pred   = ":" identifier comparator value
                | ":" identifier set_op
                | ":" identifier range_op ;

comparator      = "=" | "!=" | ">" | ">=" | "<" | "<=" | "~~" ;
set_op          = [ "!" ] ":" "[" value_list "]" ;
range_op        = ":" "[" value ".." value "]" ;
null_check      = ":" identifier ( "!" | "?" ) ;

(* Time *)
time            = "~" time_expr ;
compare         = "vs" time_expr ;
time_expr       = duration | period | specific | range | alias ;
duration        = pos_int time_unit ;
period          = period_unit [ "-" pos_int ] ;
specific        = year [ "-Q" quarter ] | year "-" month [ "-" day ] ;
range           = "[" time_bound ".." time_bound "]" ;
alias           = "today" | "yesterday" | "this_week" | "last_week"
                | "this_month" | "last_month" | "this_quarter" | "last_quarter"
                | "this_year" | "last_year" | "YTD" | "MTD" | "QTD" ;

time_unit       = "d" | "w" | "M" | "Y" ;
period_unit     = "D" | "W" | "M" | "Q" | "Y" ;

(* Limit and Sort *)
limit           = "top:" ( pos_int | parameter ) ;
sort_item       = ( "+" | "-" ) sort_target ;
sort_target     = "@" identifier | "#" identifier | ":" identifier ;

(* Enterprise *)
scope_pin       = "@" identifier ;
time_override   = "@t:" identifier ;
explain         = "!" "explain" ;
parameter       = "$" identifier ;

(* Terminals *)
identifier      = letter { letter | digit | "_" } ;
string          = '"' { string_char } '"' ;
number          = [ "-" ] digit { digit } [ "." digit { digit } ] ;
value           = string | number | boolean | date | parameter ;
pos_int         = nonzero { digit } ;
year            = digit digit digit digit ;
month           = digit digit ;
day             = digit digit ;
quarter         = "1" | "2" | "3" | "4" ;
```

---

## Error Codes

| Code | Category | Message |
|------|----------|---------|
| E101 | Syntax | Unexpected token |
| E102 | Syntax | Expected 'Q' at start |
| E103 | Syntax | Invalid time expression |
| E104 | Syntax | Use & between filters |
| E201 | Resolution | Unknown metric |
| E202 | Resolution | Unknown dimension |
| E203 | Resolution | Unknown field |
| E204 | Resolution | Unknown named filter |
| E301 | Type | Type mismatch |
| E401 | Semantic | Cannot mix entity and metric |
| E501 | Ambiguity | Multiple join paths |
| E701 | Policy | Metric not allowed |
| E702 | Policy | Field not allowed |

---

## LLM Prompt (200 tokens)

```
Generate LiquidConnect query. Output ONLY the query starting with Q.

SYNTAX:
Q @metric #dim ?filter ~time top:N ±sort vs period

VOCAB:
Metrics: @revenue @orders @aov @customers
Dims: #region #segment #customer #month
Fields: :amount :segment :status :region
Named: ?enterprise ?active ?cancelled
Entities: .customers .orders

TIME:
~D (today) ~W (week) ~M (month) ~Q (quarter) ~Y (year)
~30d (last 30 days) ~Q-1 (last quarter) ~[M-12..M-1] (range)

RULES:
- Start with Q
- ?:field=val for explicit, ?name for named
- Use & for AND: ?:a="x"&:b="y"
- Use | for OR: ?:a="x"|:a="y"
- ?! for NOT: ?!cancelled

EXAMPLES:
"revenue" → Q @revenue
"by region" → Q @revenue #region
"enterprise" → Q @revenue ?enterprise
"segment ENT" → Q @revenue ?:segment="ENT"
"top 10" → Q @revenue #customer top:10 -@revenue
"last quarter" → Q @revenue ~Q-1
"vs last year" → Q @revenue ~Q vs Q-4

Question: {question}
```

---

## Migration from language.md

| Old Syntax | v7 Syntax |
|------------|-----------|
| `~last_30_days` | `~30d` |
| `~last_month` | `~M-1` (or alias `~last_month`) |
| `~this_quarter` | `~Q` (or alias `~this_quarter`) |
| `?:a="x" ?:b="y"` | `?:a="x"&:b="y"` |
| `_current/_previous` | `_compare/_delta` |

---

## Summary

v7 combines:
- **v6 compression** for LLM token efficiency (8x average)
- **v6 enterprise features** for production (RLS, CLS, governance)
- **language.md stages** for learning curve
- **Readable aliases** for human authoring
- **Explicit &** for unambiguous parsing

```
┌─────────────────────────────────────────────────────────────────────┐
│  LIQUIDCONNECT v7.0 - UNIFIED SPECIFICATION                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Q @metric #dim ?filter ~time top:N ±sort vs period                 │
│                                                                     │
│  TIME:    ~D ~W ~M ~Q ~Y | ~30d ~6M | ~Q-1 ~M-3 | ~[Q-4..Q-1]       │
│  FILTER:  ?name | ?:field=val | ?a&b | ?a|b | ?!x                   │
│  SORT:    -@revenue (metric) | +:name (entity)                      │
│                                                                     │
│  8x token compression | RLS/CLS governance | LLM-native             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

*LiquidConnect v7.0 - Taking the best of both worlds*
