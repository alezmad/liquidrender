# LiquidConnect Error Model Specification

Version: 1.0.0
Status: Stable
Last Updated: 2024-12

---

## 1. Overview

LiquidConnect uses a structured error model designed for:

- **Human readability**: Clear messages that explain what went wrong
- **Machine parseability**: Consistent codes and structure for programmatic handling
- **LLM self-correction**: Rich context and suggestions that enable AI agents to fix errors autonomously
- **Developer productivity**: Precise source positions and actionable recovery paths

Every error in LiquidConnect is represented as a `LiquidError` object containing:

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Unique error identifier (e.g., `E101`) |
| `category` | `string` | Error classification (e.g., `syntax`) |
| `message` | `string` | Human-readable error description |
| `position` | `Position` | Source location of the error |
| `query` | `string` | The original query that caused the error |
| `suggestions` | `string[]` | Actionable fixes ordered by likelihood |
| `documentation` | `string` | URL to relevant documentation |

### Design Principles

1. **Errors should be self-explanatory** - Never require external lookup to understand
2. **Suggestions should be actionable** - Provide concrete fixes, not vague guidance
3. **Context should be preserved** - Include enough information for debugging
4. **Errors should be specific** - Prefer precise codes over generic catch-alls

---

## 2. Error Categories

### E1xx: Syntax Errors

Errors that occur during lexical analysis or parsing. The query is not well-formed according to LiquidConnect grammar.

| Range | Subcategory | Description |
|-------|-------------|-------------|
| E100-E109 | Lexer errors | Invalid characters, unterminated strings |
| E110-E119 | Parser structure | Missing brackets, delimiters |
| E120-E129 | Parser keywords | Invalid or misplaced keywords |
| E130-E139 | Parser expressions | Malformed expressions |

**When these occur**: During the parse phase, before any semantic analysis.

**Recovery approach**: Fix the syntax according to suggestions; re-parse.

---

### E2xx: Resolution Errors

Errors that occur when resolving identifiers to schema elements. Names cannot be matched to known entities.

| Range | Subcategory | Description |
|-------|-------------|-------------|
| E200-E209 | Entity resolution | Unknown tables, views, models |
| E210-E219 | Field resolution | Unknown columns, attributes |
| E220-E229 | Function resolution | Unknown functions, operators |
| E230-E239 | Namespace resolution | Unknown schemas, namespaces |

**When these occur**: During semantic analysis, after parsing succeeds.

**Recovery approach**: Check spelling, verify schema, use suggestions for similar names.

---

### E3xx: Type Errors

Errors that occur during type checking. Operations are applied to incompatible types.

| Range | Subcategory | Description |
|-------|-------------|-------------|
| E300-E309 | Type mismatch | Incompatible types in operation |
| E310-E319 | Type coercion | Cannot convert between types |
| E320-E329 | Type inference | Cannot determine type |
| E330-E339 | Aggregate types | Invalid aggregate usage |

**When these occur**: During type checking phase.

**Recovery approach**: Cast values, use correct operators, check function signatures.

---

### E4xx: Semantic Errors

Errors in query structure or logic that are syntactically valid but semantically invalid.

| Range | Subcategory | Description |
|-------|-------------|-------------|
| E400-E409 | Query structure | Invalid query composition |
| E410-E419 | Aggregation | Invalid GROUP BY / aggregate |
| E420-E429 | Join semantics | Invalid join conditions |
| E430-E439 | Subquery | Invalid subquery usage |
| E440-E449 | Ordering | Invalid ORDER BY / LIMIT |

**When these occur**: During semantic validation phase.

**Recovery approach**: Restructure query according to semantic rules.

---

### E5xx: Ambiguity Errors

Errors where multiple valid interpretations exist and the system cannot determine intent.

| Range | Subcategory | Description |
|-------|-------------|-------------|
| E500-E509 | Column ambiguity | Column exists in multiple tables |
| E510-E519 | Function ambiguity | Multiple function overloads match |
| E520-E529 | Join path ambiguity | Multiple valid join paths |
| E530-E539 | Intent ambiguity | Query meaning unclear |

**When these occur**: During semantic analysis when disambiguation fails.

**Recovery approach**: Add qualifiers, aliases, or explicit specifications.

---

### E6xx: Conflict Errors

Errors where query elements are incompatible with each other.

| Range | Subcategory | Description |
|-------|-------------|-------------|
| E600-E609 | Filter conflicts | Contradictory WHERE clauses |
| E610-E619 | Join conflicts | Incompatible join conditions |
| E620-E629 | Alias conflicts | Duplicate alias definitions |
| E630-E639 | Schema conflicts | Cross-schema incompatibilities |

**When these occur**: During query optimization or execution planning.

**Recovery approach**: Remove conflicting elements, use consistent definitions.

---

### E7xx: Policy Errors

Errors related to governance, security, or usage policies.

| Range | Subcategory | Description |
|-------|-------------|-------------|
| E700-E709 | Access control | Insufficient permissions |
| E710-E719 | Row-level security | RLS policy violations |
| E720-E729 | Data masking | Cannot access masked data |
| E730-E739 | Rate limiting | Query limits exceeded |
| E740-E749 | Compliance | Regulatory violations |

**When these occur**: During authorization checks or policy enforcement.

**Recovery approach**: Request permissions, modify query scope, contact admin.

---

## 3. Complete Error Code Table

### E1xx: Syntax Errors

| Code | Message Template | Example |
|------|------------------|---------|
| `E100` | Unexpected character `{char}` at position {pos} | `Unexpected character '@' at position 12` |
| `E101` | Unterminated string literal starting at position {pos} | `Unterminated string literal starting at position 8` |
| `E102` | Invalid escape sequence `{seq}` in string | `Invalid escape sequence '\q' in string` |
| `E103` | Invalid number format `{value}` | `Invalid number format '12.34.56'` |
| `E104` | Unexpected end of input | `Unexpected end of input` |
| `E110` | Expected `{expected}` but found `{found}` | `Expected ')' but found 'WHERE'` |
| `E111` | Unclosed bracket `{bracket}` opened at position {pos} | `Unclosed bracket '(' opened at position 5` |
| `E112` | Unexpected closing bracket `{bracket}` | `Unexpected closing bracket '}'` |
| `E113` | Missing delimiter after `{element}` | `Missing delimiter after column name` |
| `E120` | Unknown keyword `{keyword}` | `Unknown keyword 'SELEC'` |
| `E121` | Keyword `{keyword}` not allowed in this position | `Keyword 'GROUP' not allowed in this position` |
| `E122` | Duplicate clause `{clause}` | `Duplicate clause 'WHERE'` |
| `E123` | Missing required clause `{clause}` | `Missing required clause 'FROM'` |
| `E130` | Invalid expression: {details} | `Invalid expression: operator without operand` |
| `E131` | Empty expression not allowed | `Empty expression not allowed` |
| `E132` | Invalid operator `{op}` between `{left}` and `{right}` | `Invalid operator '/' between 'name' and 'status'` |

### E2xx: Resolution Errors

| Code | Message Template | Example |
|------|------------------|---------|
| `E200` | Unknown entity `{name}` | `Unknown entity 'customers'` |
| `E201` | Entity `{name}` is not accessible from current context | `Entity 'internal_logs' is not accessible from current context` |
| `E202` | Entity `{name}` has been deprecated; use `{replacement}` | `Entity 'users_old' has been deprecated; use 'users'` |
| `E203` | Entity `{name}` requires schema prefix | `Entity 'orders' requires schema prefix` |
| `E210` | Unknown field `{field}` in entity `{entity}` | `Unknown field 'full_name' in entity 'users'` |
| `E211` | Field `{field}` is not selectable | `Field 'password_hash' is not selectable` |
| `E212` | Field `{field}` has been deprecated; use `{replacement}` | `Field 'email' has been deprecated; use 'email_address'` |
| `E213` | Computed field `{field}` cannot be used in `{context}` | `Computed field 'age' cannot be used in WHERE clause` |
| `E220` | Unknown function `{name}` | `Unknown function 'CONCAT_ALL'` |
| `E221` | Function `{name}` requires {n} arguments, got {m} | `Function 'SUBSTRING' requires 3 arguments, got 2` |
| `E222` | Unknown operator `{op}` for types `{types}` | `Unknown operator '~' for types 'string, string'` |
| `E230` | Unknown namespace `{ns}` | `Unknown namespace 'analytics'` |
| `E231` | Cannot access namespace `{ns}` from `{current}` | `Cannot access namespace 'admin' from 'public'` |

### E3xx: Type Errors

| Code | Message Template | Example |
|------|------------------|---------|
| `E300` | Type mismatch: expected `{expected}`, got `{actual}` | `Type mismatch: expected 'integer', got 'string'` |
| `E301` | Cannot compare `{type1}` with `{type2}` | `Cannot compare 'date' with 'boolean'` |
| `E302` | Operator `{op}` not defined for type `{type}` | `Operator '+' not defined for type 'boolean'` |
| `E303` | Cannot use `{type}` in boolean context | `Cannot use 'struct' in boolean context` |
| `E310` | Cannot cast `{from}` to `{to}` | `Cannot cast 'array<string>' to 'integer'` |
| `E311` | Implicit cast from `{from}` to `{to}` may lose precision | `Implicit cast from 'decimal(10,2)' to 'integer' may lose precision` |
| `E312` | Null cannot be assigned to non-nullable `{field}` | `Null cannot be assigned to non-nullable 'user_id'` |
| `E320` | Cannot infer type for expression | `Cannot infer type for expression` |
| `E321` | Recursive type definition detected | `Recursive type definition detected` |
| `E322` | Type parameter `{param}` could not be resolved | `Type parameter 'T' could not be resolved` |
| `E330` | Aggregate function `{func}` requires `{type}`, got `{actual}` | `Aggregate function 'SUM' requires 'numeric', got 'string'` |
| `E331` | Cannot mix aggregate and non-aggregate expressions | `Cannot mix aggregate and non-aggregate expressions` |
| `E332` | Window function `{func}` not allowed in `{context}` | `Window function 'ROW_NUMBER' not allowed in WHERE clause` |

### E4xx: Semantic Errors

| Code | Message Template | Example |
|------|------------------|---------|
| `E400` | Invalid query structure: {details} | `Invalid query structure: SELECT without FROM` |
| `E401` | Circular reference detected: {path} | `Circular reference detected: a -> b -> a` |
| `E402` | Self-referencing query requires explicit alias | `Self-referencing query requires explicit alias` |
| `E403` | Subquery must return single column for use as scalar | `Subquery must return single column for use as scalar` |
| `E410` | Non-aggregated field `{field}` must appear in GROUP BY | `Non-aggregated field 'name' must appear in GROUP BY` |
| `E411` | GROUP BY position {n} is out of range | `GROUP BY position 5 is out of range` |
| `E412` | Cannot GROUP BY aggregate expression | `Cannot GROUP BY aggregate expression` |
| `E413` | HAVING clause requires GROUP BY or aggregate | `HAVING clause requires GROUP BY or aggregate` |
| `E420` | No valid join path between `{a}` and `{b}` | `No valid join path between 'users' and 'products'` |
| `E421` | Join condition must be boolean expression | `Join condition must be boolean expression` |
| `E422` | Cross join not allowed without explicit CROSS keyword | `Cross join not allowed without explicit CROSS keyword` |
| `E423` | Self-join requires distinct aliases | `Self-join requires distinct aliases` |
| `E430` | Correlated subquery references unavailable column `{col}` | `Correlated subquery references unavailable column 'outer.id'` |
| `E431` | Subquery depth exceeds maximum ({max}) | `Subquery depth exceeds maximum (10)` |
| `E432` | Subquery in `{context}` must be deterministic | `Subquery in ORDER BY must be deterministic` |
| `E440` | ORDER BY field `{field}` not in SELECT list for DISTINCT | `ORDER BY field 'age' not in SELECT list for DISTINCT` |
| `E441` | LIMIT must be positive integer, got `{value}` | `LIMIT must be positive integer, got '-5'` |
| `E442` | OFFSET without LIMIT is not allowed | `OFFSET without LIMIT is not allowed` |

### E5xx: Ambiguity Errors

| Code | Message Template | Example |
|------|------------------|---------|
| `E500` | Ambiguous column `{col}`: exists in {entities} | `Ambiguous column 'id': exists in users, orders` |
| `E501` | Ambiguous reference `{ref}`: could be {options} | `Ambiguous reference 'date': could be field, function` |
| `E502` | Ambiguous null comparison: use IS NULL or IS NOT NULL | `Ambiguous null comparison: use IS NULL or IS NOT NULL` |
| `E510` | Ambiguous function call: `{func}` matches {signatures} | `Ambiguous function call: 'CAST' matches 3 signatures` |
| `E511` | Cannot determine overload for `{func}` with argument types `{types}` | `Cannot determine overload for 'ADD' with argument types 'any, any'` |
| `E520` | Multiple join paths between `{a}` and `{b}`: {paths} | `Multiple join paths between 'users' and 'orders': users.id, users.email` |
| `E521` | Ambiguous relationship: `{rel}` could traverse {options} | `Ambiguous relationship: 'purchases' could traverse direct, via cart` |
| `E530` | Query intent unclear: {interpretation1} or {interpretation2}? | `Query intent unclear: filter then aggregate or aggregate then filter?` |
| `E531` | Natural language query `{nl}` has multiple interpretations | `Natural language query 'users with orders' has multiple interpretations` |

### E6xx: Conflict Errors

| Code | Message Template | Example |
|------|------------------|---------|
| `E600` | Contradictory filters: `{filter1}` conflicts with `{filter2}` | `Contradictory filters: 'status = active' conflicts with 'status = inactive'` |
| `E601` | Filter makes query unsatisfiable | `Filter makes query unsatisfiable` |
| `E602` | Redundant filter: `{filter}` is always true/false | `Redundant filter: 'id > 0' is always true` |
| `E610` | Join creates Cartesian product (missing join condition) | `Join creates Cartesian product (missing join condition)` |
| `E611` | Conflicting join types on same pair: `{type1}` vs `{type2}` | `Conflicting join types on same pair: 'LEFT' vs 'INNER'` |
| `E612` | Join condition references only one table | `Join condition references only one table` |
| `E620` | Duplicate alias `{alias}` | `Duplicate alias 'u'` |
| `E621` | Alias `{alias}` shadows existing entity | `Alias 'users' shadows existing entity` |
| `E622` | Reserved word `{word}` cannot be used as alias | `Reserved word 'SELECT' cannot be used as alias` |
| `E630` | Schema version conflict: `{schema}` requires `{v1}`, but `{other}` requires `{v2}` | `Schema version conflict: 'orders' requires 'v2', but 'legacy_orders' requires 'v1'` |
| `E631` | Incompatible collations: `{c1}` vs `{c2}` | `Incompatible collations: 'utf8_general_ci' vs 'utf8_bin'` |

### E7xx: Policy Errors

| Code | Message Template | Example |
|------|------------------|---------|
| `E700` | Access denied: no permission to `{action}` on `{resource}` | `Access denied: no permission to SELECT on 'salaries'` |
| `E701` | Insufficient role: `{action}` requires role `{role}` | `Insufficient role: DELETE requires role 'admin'` |
| `E702` | Session expired or invalid | `Session expired or invalid` |
| `E703` | API key invalid or revoked | `API key invalid or revoked` |
| `E710` | Row-level security policy blocks access | `Row-level security policy blocks access` |
| `E711` | Cannot access rows belonging to other `{scope}` | `Cannot access rows belonging to other tenant` |
| `E712` | RLS policy `{policy}` evaluation failed | `RLS policy 'tenant_isolation' evaluation failed` |
| `E720` | Field `{field}` is masked; cannot access raw value | `Field 'ssn' is masked; cannot access raw value` |
| `E721` | Masked field `{field}` cannot be used in `{context}` | `Masked field 'email' cannot be used in WHERE clause` |
| `E722` | Unmasking requires additional authentication | `Unmasking requires additional authentication` |
| `E730` | Rate limit exceeded: {limit} queries per {period} | `Rate limit exceeded: 100 queries per minute` |
| `E731` | Query cost ({cost}) exceeds maximum ({max}) | `Query cost (5000) exceeds maximum (1000)` |
| `E732` | Concurrent query limit ({n}) reached | `Concurrent query limit (10) reached` |
| `E740` | Query would violate `{regulation}` compliance | `Query would violate 'GDPR' compliance` |
| `E741` | Cross-border data transfer not permitted for `{field}` | `Cross-border data transfer not permitted for 'health_data'` |
| `E742` | Data retention policy prevents access to `{period}` data | `Data retention policy prevents access to 'pre-2020' data` |

---

## 4. LiquidError TypeScript Interface

```typescript
/**
 * Position information for error source mapping.
 */
interface Position {
  /** Line number (1-indexed) */
  line: number;

  /** Column number (1-indexed) */
  column: number;

  /** Absolute character offset from start of input */
  offset: number;

  /** Length of the error span in characters */
  length: number;
}

/**
 * Error severity levels.
 */
type ErrorSeverity = 'error' | 'warning' | 'info' | 'hint';

/**
 * Error categories matching E{N}xx codes.
 */
type ErrorCategory =
  | 'syntax'      // E1xx
  | 'resolution'  // E2xx
  | 'type'        // E3xx
  | 'semantic'    // E4xx
  | 'ambiguity'   // E5xx
  | 'conflict'    // E6xx
  | 'policy';     // E7xx

/**
 * A suggested fix for an error.
 */
interface Suggestion {
  /** Human-readable description of the fix */
  message: string;

  /** The corrected query text (if applicable) */
  replacement?: string;

  /** Confidence score for this suggestion (0-1) */
  confidence: number;

  /** Whether applying this fix requires additional context */
  requiresContext?: boolean;
}

/**
 * Related information for an error.
 */
interface RelatedInfo {
  /** Description of the related information */
  message: string;

  /** Position of related code */
  position?: Position;

  /** Related query fragment */
  query?: string;
}

/**
 * The complete error representation for LiquidConnect.
 */
interface LiquidError {
  /**
   * Unique error code (e.g., "E101", "E300").
   * Format: E{category}{specific} where category is 1-7.
   */
  code: string;

  /**
   * Error category for grouping and filtering.
   */
  category: ErrorCategory;

  /**
   * Error severity level.
   * - error: Must be fixed before query can execute
   * - warning: Query will execute but may have issues
   * - info: Informational, no action required
   * - hint: Style or optimization suggestion
   */
  severity: ErrorSeverity;

  /**
   * Human-readable error message.
   * Should be complete and self-explanatory.
   */
  message: string;

  /**
   * Position of the error in the source query.
   */
  position: Position;

  /**
   * The original query that caused the error.
   * Preserved for context and debugging.
   */
  query: string;

  /**
   * Actionable suggestions for fixing the error.
   * Ordered by confidence/likelihood (highest first).
   */
  suggestions: Suggestion[];

  /**
   * URL to relevant documentation.
   * Should link to specific error code documentation.
   */
  documentation: string;

  /**
   * Additional context for debugging.
   */
  context?: {
    /** The specific token or fragment that caused the error */
    fragment?: string;

    /** Expected values (for syntax/type errors) */
    expected?: string[];

    /** Actual value found */
    actual?: string;

    /** Related errors (for cascading errors) */
    related?: RelatedInfo[];

    /** Stack trace (for internal errors) */
    stack?: string[];
  };

  /**
   * Timestamp when the error occurred.
   */
  timestamp: string;

  /**
   * Unique error instance ID for tracking.
   */
  errorId: string;
}

/**
 * Collection of errors from a single query.
 */
interface LiquidErrorResult {
  /** Whether the query can still execute (has only warnings/info) */
  canExecute: boolean;

  /** All errors, warnings, and hints */
  errors: LiquidError[];

  /** Summary counts by severity */
  summary: {
    errors: number;
    warnings: number;
    info: number;
    hints: number;
  };

  /** Whether errors were truncated due to limit */
  truncated: boolean;

  /** Total error count if truncated */
  totalCount?: number;
}
```

---

## 5. Error Response JSON Format

### Single Error Response

```json
{
  "success": false,
  "error": {
    "code": "E210",
    "category": "resolution",
    "severity": "error",
    "message": "Unknown field 'full_name' in entity 'users'",
    "position": {
      "line": 1,
      "column": 8,
      "offset": 7,
      "length": 9
    },
    "query": "SELECT full_name FROM users",
    "suggestions": [
      {
        "message": "Did you mean 'first_name'?",
        "replacement": "SELECT first_name FROM users",
        "confidence": 0.85
      },
      {
        "message": "Did you mean 'name'?",
        "replacement": "SELECT name FROM users",
        "confidence": 0.75
      },
      {
        "message": "Use CONCAT(first_name, ' ', last_name) for full name",
        "replacement": "SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users",
        "confidence": 0.60
      }
    ],
    "documentation": "https://docs.liquidconnect.dev/errors/E210",
    "context": {
      "fragment": "full_name",
      "expected": ["id", "first_name", "last_name", "email", "created_at"],
      "actual": "full_name"
    },
    "timestamp": "2024-12-15T10:30:00.000Z",
    "errorId": "err_01HX8Y2Z3A4B5C6D7E8F9G0H"
  }
}
```

### Multiple Errors Response

```json
{
  "success": false,
  "errors": {
    "canExecute": false,
    "errors": [
      {
        "code": "E120",
        "category": "syntax",
        "severity": "error",
        "message": "Unknown keyword 'SELEC'",
        "position": {
          "line": 1,
          "column": 1,
          "offset": 0,
          "length": 5
        },
        "query": "SELEC * FORM users",
        "suggestions": [
          {
            "message": "Did you mean 'SELECT'?",
            "replacement": "SELECT * FORM users",
            "confidence": 0.95
          }
        ],
        "documentation": "https://docs.liquidconnect.dev/errors/E120",
        "timestamp": "2024-12-15T10:30:00.000Z",
        "errorId": "err_01HX8Y2Z3A4B5C6D7E8F9G01"
      },
      {
        "code": "E120",
        "category": "syntax",
        "severity": "error",
        "message": "Unknown keyword 'FORM'",
        "position": {
          "line": 1,
          "column": 9,
          "offset": 8,
          "length": 4
        },
        "query": "SELEC * FORM users",
        "suggestions": [
          {
            "message": "Did you mean 'FROM'?",
            "replacement": "SELEC * FROM users",
            "confidence": 0.95
          }
        ],
        "documentation": "https://docs.liquidconnect.dev/errors/E120",
        "timestamp": "2024-12-15T10:30:00.000Z",
        "errorId": "err_01HX8Y2Z3A4B5C6D7E8F9G02"
      }
    ],
    "summary": {
      "errors": 2,
      "warnings": 0,
      "info": 0,
      "hints": 0
    },
    "truncated": false
  }
}
```

### Warning Response (Query Can Execute)

```json
{
  "success": true,
  "data": { /* query results */ },
  "warnings": {
    "canExecute": true,
    "errors": [
      {
        "code": "E311",
        "category": "type",
        "severity": "warning",
        "message": "Implicit cast from 'decimal(10,2)' to 'integer' may lose precision",
        "position": {
          "line": 1,
          "column": 8,
          "offset": 7,
          "length": 5
        },
        "query": "SELECT price::int FROM products",
        "suggestions": [
          {
            "message": "Use ROUND() before casting to control rounding behavior",
            "replacement": "SELECT ROUND(price)::int FROM products",
            "confidence": 0.80
          }
        ],
        "documentation": "https://docs.liquidconnect.dev/errors/E311",
        "timestamp": "2024-12-15T10:30:00.000Z",
        "errorId": "err_01HX8Y2Z3A4B5C6D7E8F9G03"
      }
    ],
    "summary": {
      "errors": 0,
      "warnings": 1,
      "info": 0,
      "hints": 0
    },
    "truncated": false
  }
}
```

---

## 6. Recovery Strategies

### 6.1 Syntax Errors (E1xx)

**Strategy: Parse and Suggest**

1. Identify the exact position where parsing failed
2. Determine what tokens were expected at that position
3. Check for common typos (Levenshtein distance <= 2)
4. Suggest corrections with high confidence

```typescript
// Example recovery for E120 (Unknown keyword)
function recoverFromUnknownKeyword(token: string, position: Position): Suggestion[] {
  const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'ORDER', 'GROUP', 'HAVING', 'LIMIT'];

  return keywords
    .map(kw => ({
      keyword: kw,
      distance: levenshteinDistance(token.toUpperCase(), kw)
    }))
    .filter(({ distance }) => distance <= 2)
    .sort((a, b) => a.distance - b.distance)
    .map(({ keyword, distance }) => ({
      message: `Did you mean '${keyword}'?`,
      replacement: query.slice(0, position.offset) + keyword + query.slice(position.offset + token.length),
      confidence: 1 - (distance / 10)
    }));
}
```

### 6.2 Resolution Errors (E2xx)

**Strategy: Fuzzy Match and Schema Lookup**

1. Search schema for similar names (case-insensitive, typo-tolerant)
2. Check for deprecated entities with replacements
3. Look for entities in other accessible namespaces
4. Suggest commonly confused alternatives

```typescript
// Example recovery for E210 (Unknown field)
function recoverFromUnknownField(field: string, entity: Entity): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // 1. Fuzzy match existing fields
  for (const entityField of entity.fields) {
    const distance = levenshteinDistance(field.toLowerCase(), entityField.name.toLowerCase());
    if (distance <= 3) {
      suggestions.push({
        message: `Did you mean '${entityField.name}'?`,
        confidence: 1 - (distance / 10)
      });
    }
  }

  // 2. Check for computed field alternatives
  const computedMatch = entity.computedFields.find(cf =>
    cf.name.toLowerCase().includes(field.toLowerCase())
  );
  if (computedMatch) {
    suggestions.push({
      message: `Use computed field '${computedMatch.name}' or expression: ${computedMatch.expression}`,
      confidence: 0.6
    });
  }

  // 3. Check for deprecated field mappings
  const deprecation = entity.deprecations.find(d => d.old === field);
  if (deprecation) {
    suggestions.push({
      message: `Field was renamed to '${deprecation.new}'`,
      replacement: /* updated query */,
      confidence: 0.95
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
```

### 6.3 Type Errors (E3xx)

**Strategy: Provide Casts and Conversions**

1. Determine source and target types
2. Find available cast paths (direct or multi-step)
3. Warn about precision loss or semantic changes
4. Suggest type-appropriate alternatives

```typescript
// Example recovery for E300 (Type mismatch)
function recoverFromTypeMismatch(expected: Type, actual: Type, position: Position): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // 1. Direct cast if safe
  if (canCastSafely(actual, expected)) {
    suggestions.push({
      message: `Cast to ${expected.name}: ${expression}::${expected.name}`,
      confidence: 0.9
    });
  }

  // 2. Conversion function
  const converter = findConverter(actual, expected);
  if (converter) {
    suggestions.push({
      message: `Use ${converter.name}(): ${converter.name}(${expression})`,
      confidence: 0.85
    });
  }

  // 3. Parse function for string to other
  if (actual.name === 'string') {
    const parser = findParser(expected);
    if (parser) {
      suggestions.push({
        message: `Parse string to ${expected.name}: ${parser.name}(${expression})`,
        confidence: 0.75
      });
    }
  }

  return suggestions;
}
```

### 6.4 Semantic Errors (E4xx)

**Strategy: Restructure Query**

1. Analyze the intended semantics
2. Provide correct query structure
3. Explain why the original structure was invalid
4. Show multiple valid alternatives if applicable

```typescript
// Example recovery for E410 (Non-aggregated field not in GROUP BY)
function recoverFromMissingGroupBy(field: string, query: ParsedQuery): Suggestion[] {
  return [
    {
      message: `Add '${field}' to GROUP BY clause`,
      replacement: addToGroupBy(query, field),
      confidence: 0.7
    },
    {
      message: `Apply aggregate function: MAX(${field}), MIN(${field}), or FIRST(${field})`,
      replacement: wrapWithAggregate(query, field, 'MAX'),
      confidence: 0.6
    },
    {
      message: `Remove '${field}' from SELECT if not needed`,
      replacement: removeFromSelect(query, field),
      confidence: 0.5
    }
  ];
}
```

### 6.5 Ambiguity Errors (E5xx)

**Strategy: Enumerate Options and Request Clarification**

1. List all possible interpretations
2. Provide syntax for each disambiguation
3. Explain the semantic difference between options
4. Let the user or LLM choose

```typescript
// Example recovery for E500 (Ambiguous column)
function recoverFromAmbiguousColumn(column: string, entities: string[]): Suggestion[] {
  return entities.map(entity => ({
    message: `Use '${entity}.${column}' to reference column in ${entity}`,
    replacement: qualifyColumn(query, column, entity),
    confidence: 0.5, // Equal confidence - user must choose
    requiresContext: true
  }));
}
```

### 6.6 Conflict Errors (E6xx)

**Strategy: Identify and Resolve Conflict**

1. Pinpoint the conflicting elements
2. Explain why they conflict
3. Suggest removing one or the other
4. Provide merged/reconciled alternatives if possible

```typescript
// Example recovery for E600 (Contradictory filters)
function recoverFromContradictoryFilters(filter1: Filter, filter2: Filter): Suggestion[] {
  return [
    {
      message: `Remove first filter: ${filter1.expression}`,
      replacement: removeFilter(query, filter1),
      confidence: 0.5
    },
    {
      message: `Remove second filter: ${filter2.expression}`,
      replacement: removeFilter(query, filter2),
      confidence: 0.5
    },
    {
      message: `Use OR instead of AND: (${filter1.expression} OR ${filter2.expression})`,
      replacement: combineWithOr(query, filter1, filter2),
      confidence: 0.3
    }
  ];
}
```

### 6.7 Policy Errors (E7xx)

**Strategy: Explain Requirements and Alternatives**

1. Clearly state what permission/role is required
2. Explain who can grant access
3. Suggest alternative queries within current permissions
4. Provide escalation path

```typescript
// Example recovery for E700 (Access denied)
function recoverFromAccessDenied(action: string, resource: string, currentRoles: string[]): Suggestion[] {
  const requiredRole = getRequiredRole(action, resource);
  const accessibleAlternatives = findAccessibleAlternatives(resource, currentRoles);

  const suggestions: Suggestion[] = [
    {
      message: `Request '${requiredRole}' role from your administrator`,
      confidence: 0.3,
      requiresContext: true
    }
  ];

  for (const alt of accessibleAlternatives) {
    suggestions.push({
      message: `Use '${alt.name}' instead (accessible with your current roles)`,
      replacement: replaceResource(query, resource, alt.name),
      confidence: 0.6
    });
  }

  return suggestions;
}
```

---

## 7. Diagnostic API

The Diagnostic API provides programmatic access to detailed error information for tooling, IDE integration, and LLM-based error correction.

### 7.1 Endpoints

#### Validate Query

```http
POST /api/v1/validate
Content-Type: application/json

{
  "query": "SELECT * FROM users WHER id = 1",
  "options": {
    "maxErrors": 10,
    "includeSuggestions": true,
    "includeDocumentation": true,
    "suggestionConfidenceThreshold": 0.3
  }
}
```

**Response:**

```json
{
  "valid": false,
  "errors": [/* LiquidError[] */],
  "parseTree": null,
  "diagnosticId": "diag_01HX8Y2Z3A4B5C6D7E8F9G0H"
}
```

#### Get Error Details

```http
GET /api/v1/errors/{errorId}
```

**Response:**

```json
{
  "error": {/* LiquidError */},
  "additionalContext": {
    "schemaState": { /* relevant schema snapshot */ },
    "previousAttempts": [ /* if part of retry session */ ],
    "debugTrace": [ /* internal diagnostic info */ ]
  }
}
```

#### Explain Error

```http
POST /api/v1/errors/explain
Content-Type: application/json

{
  "code": "E410",
  "context": {
    "query": "SELECT name, COUNT(*) FROM users",
    "position": { "line": 1, "column": 8, "offset": 7, "length": 4 }
  }
}
```

**Response:**

```json
{
  "explanation": {
    "title": "Non-aggregated Field in Aggregate Query",
    "summary": "When using aggregate functions like COUNT(), SUM(), etc., all non-aggregated fields must appear in the GROUP BY clause.",
    "details": "The field 'name' appears in SELECT but is not wrapped in an aggregate function and is not included in GROUP BY. SQL requires that in an aggregate query, the database knows how to combine multiple rows into one result row for each field.",
    "examples": [
      {
        "incorrect": "SELECT name, COUNT(*) FROM users",
        "correct": "SELECT name, COUNT(*) FROM users GROUP BY name",
        "explanation": "Groups results by name, counting occurrences of each"
      },
      {
        "incorrect": "SELECT name, COUNT(*) FROM users",
        "correct": "SELECT MAX(name), COUNT(*) FROM users",
        "explanation": "Uses aggregate function on name instead of grouping"
      }
    ],
    "relatedConcepts": ["Aggregate Functions", "GROUP BY Clause", "HAVING Clause"],
    "documentationLinks": [
      "https://docs.liquidconnect.dev/concepts/aggregation",
      "https://docs.liquidconnect.dev/errors/E410"
    ]
  }
}
```

### 7.2 Programmatic Usage

```typescript
import { LiquidConnect, DiagnosticClient } from '@liquid/connect';

const client = new LiquidConnect({ /* config */ });
const diagnostics = new DiagnosticClient(client);

// Validate a query
const result = await diagnostics.validate('SELECT * FROM users WHER id = 1');

if (!result.valid) {
  for (const error of result.errors) {
    console.log(`[${error.code}] ${error.message}`);
    console.log(`  at line ${error.position.line}, column ${error.position.column}`);

    // Apply first suggestion if confident enough
    if (error.suggestions.length > 0 && error.suggestions[0].confidence > 0.8) {
      console.log(`  Auto-fix: ${error.suggestions[0].message}`);
      const fixedQuery = error.suggestions[0].replacement;
      // Retry with fixed query...
    }
  }
}

// Get detailed explanation for LLM processing
const explanation = await diagnostics.explain('E410', {
  query: 'SELECT name, COUNT(*) FROM users',
  position: { line: 1, column: 8, offset: 7, length: 4 }
});

// Format for LLM self-correction
const llmContext = diagnostics.formatForLLM(result.errors);
// Returns structured text optimized for LLM understanding
```

### 7.3 LLM Integration Format

When errors need to be processed by an LLM for self-correction, use the following format:

```typescript
interface LLMErrorContext {
  /** The original query that failed */
  originalQuery: string;

  /** Structured error information */
  errors: Array<{
    code: string;
    message: string;
    location: string; // "line X, column Y"
    fragment: string; // the problematic text
    suggestions: string[]; // top 3 suggestions as strings
  }>;

  /** Natural language summary for LLM understanding */
  summary: string;

  /** The most likely correct query */
  proposedFix: string | null;

  /** Confidence in the proposed fix */
  fixConfidence: number;
}
```

**Example LLM Context:**

```json
{
  "originalQuery": "SELEC * FROM users WHER active = true",
  "errors": [
    {
      "code": "E120",
      "message": "Unknown keyword 'SELEC'",
      "location": "line 1, column 1",
      "fragment": "SELEC",
      "suggestions": [
        "Change 'SELEC' to 'SELECT'",
        "Check spelling of SQL keywords"
      ]
    },
    {
      "code": "E120",
      "message": "Unknown keyword 'WHER'",
      "location": "line 1, column 16",
      "fragment": "WHER",
      "suggestions": [
        "Change 'WHER' to 'WHERE'",
        "Check spelling of SQL keywords"
      ]
    }
  ],
  "summary": "The query has 2 syntax errors: misspelled keywords 'SELEC' (should be 'SELECT') and 'WHER' (should be 'WHERE').",
  "proposedFix": "SELECT * FROM users WHERE active = true",
  "fixConfidence": 0.95
}
```

### 7.4 Batch Validation

For validating multiple queries efficiently:

```http
POST /api/v1/validate/batch
Content-Type: application/json

{
  "queries": [
    { "id": "q1", "query": "SELECT * FROM users" },
    { "id": "q2", "query": "SELECT * FORM orders" },
    { "id": "q3", "query": "SELECT undefined_col FROM products" }
  ],
  "options": {
    "stopOnFirstError": false,
    "maxErrorsPerQuery": 5
  }
}
```

**Response:**

```json
{
  "results": [
    { "id": "q1", "valid": true, "errors": [] },
    { "id": "q2", "valid": false, "errors": [/* E120 */] },
    { "id": "q3", "valid": false, "errors": [/* E210 */] }
  ],
  "summary": {
    "total": 3,
    "valid": 1,
    "invalid": 2
  }
}
```

---

## 8. Best Practices

### 8.1 For Error Producers (Library Authors)

1. **Be specific**: Use the most specific error code that applies
2. **Preserve context**: Include the original query fragment in errors
3. **Suggest fixes**: Always provide at least one actionable suggestion
4. **Order suggestions**: Put highest-confidence suggestions first
5. **Link documentation**: Include documentation URLs for all errors
6. **Generate unique IDs**: Every error instance should have a unique `errorId`

### 8.2 For Error Consumers (Application Developers)

1. **Display context**: Show the user the exact location of the error
2. **Offer quick fixes**: Present suggestions as clickable actions
3. **Handle warnings**: Don't block on warnings, but show them
4. **Log error IDs**: Store `errorId` for debugging and support
5. **Retry intelligently**: Apply confident auto-fixes before retrying

### 8.3 For LLM Integration

1. **Use structured format**: Pass `LLMErrorContext` not raw messages
2. **Include suggestions**: LLMs can evaluate and apply suggestions
3. **Set confidence thresholds**: Only auto-apply fixes above 0.8 confidence
4. **Limit retries**: Maximum 3 auto-correction attempts
5. **Escalate gracefully**: After retries fail, request human intervention

---

## Appendix A: Error Code Quick Reference

| Range | Category | Description |
|-------|----------|-------------|
| E100-E139 | Syntax | Lexer and parser errors |
| E200-E239 | Resolution | Unknown identifiers |
| E300-E339 | Type | Type system errors |
| E400-E449 | Semantic | Query logic errors |
| E500-E539 | Ambiguity | Multiple interpretations |
| E600-E639 | Conflict | Incompatible elements |
| E700-E749 | Policy | Governance violations |

---

## Appendix B: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12 | Initial specification |
