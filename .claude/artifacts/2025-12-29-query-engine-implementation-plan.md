# Query Engine Implementation Plan

**Date:** 2025-12-29
**Status:** Implementation Plan
**Objective:** Bridge natural language to LiquidConnect DSL

---

## The Gap We're Filling

```
"revenue by region last quarter"  →  Q @revenue #region ~Q-1
              ↑                              ↑
         Human speaks                  Compiler needs

                    QUERY ENGINE
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           QUERY ENGINE                                       │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │  NORMALIZER  │───▶│   MATCHER    │───▶│  VALIDATOR   │───▶│  OUTPUT   │ │
│  │              │    │              │    │              │    │           │ │
│  │ lowercase    │    │ 80% pattern  │    │ check vocab  │    │ LC DSL    │ │
│  │ synonyms     │    │ 20% LLM      │    │ check joins  │    │ + trace   │ │
│  │ tokenize     │    │              │    │              │    │           │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └───────────┘ │
│                              │                                              │
│                              ▼                                              │
│                    ┌──────────────────┐                                     │
│                    │  PATTERN STORE   │                                     │
│                    │  (from Vocab     │                                     │
│                    │   Compiler)      │                                     │
│                    └──────────────────┘                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Vocabulary Compiler (`vocabulary/compiler.ts`)

**Purpose:** Transform a saved vocabulary into executable patterns.

**Input:** `DetectedVocabulary` (from onboarding)
**Output:** `CompiledVocabulary` (patterns, slots, synonyms, LLM prompt)

```typescript
interface CompiledVocabulary {
  version: string;
  vocabularyId: string;
  compiledAt: Date;

  // Pattern templates with slots
  patterns: Pattern[];

  // Slot fillers from vocabulary
  slots: {
    m: string[];      // metrics: ["revenue", "orders", "aov"]
    d: string[];      // dimensions: ["region", "category"]
    f: string[];      // filters: ["active", "enterprise"]
    t: string[];      // time: built-in + custom
  };

  // User synonyms + common aliases
  synonyms: Record<string, string>;

  // Pre-built LLM prompt for fallback
  llmPrompt: string;
}

interface Pattern {
  id: string;
  // Natural language template with slots
  template: string;        // "{m} by {d} {t}"
  // LC output template
  output: string;          // "Q @{m} #{d} ~{t}"
  // Priority for matching (higher = try first)
  priority: number;
  // Examples for this pattern
  examples: string[];
}
```

**Default Patterns (built-in):**

```typescript
const DEFAULT_PATTERNS: Pattern[] = [
  // Single metric
  { template: "{m}", output: "Q @{m}", priority: 10 },
  { template: "total {m}", output: "Q @{m}", priority: 10 },
  { template: "show {m}", output: "Q @{m}", priority: 10 },

  // Metric + dimension
  { template: "{m} by {d}", output: "Q @{m} #{d}", priority: 20 },
  { template: "{m} per {d}", output: "Q @{m} #{d}", priority: 20 },
  { template: "{m} grouped by {d}", output: "Q @{m} #{d}", priority: 20 },

  // Metric + time
  { template: "{m} {t}", output: "Q @{m} ~{t}", priority: 20 },
  { template: "{m} for {t}", output: "Q @{m} ~{t}", priority: 20 },

  // Metric + dimension + time
  { template: "{m} by {d} {t}", output: "Q @{m} #{d} ~{t}", priority: 30 },
  { template: "{m} by {d} for {t}", output: "Q @{m} #{d} ~{t}", priority: 30 },

  // With filters
  { template: "{m} for {f}", output: "Q @{m} ?{f}", priority: 25 },
  { template: "{m} by {d} for {f}", output: "Q @{m} #{d} ?{f}", priority: 35 },
  { template: "{m} by {d} {t} for {f}", output: "Q @{m} #{d} ~{t} ?{f}", priority: 40 },

  // Top N
  { template: "top {n} {d} by {m}", output: "Q @{m} #{d} top:{n} -@{m}", priority: 30 },
  { template: "bottom {n} {d} by {m}", output: "Q @{m} #{d} top:{n} +@{m}", priority: 30 },

  // Comparison
  { template: "{m} {t} vs {t2}", output: "Q @{m} ~{t} vs ~{t2}", priority: 35 },
  { template: "compare {m} {t} to {t2}", output: "Q @{m} ~{t} vs ~{t2}", priority: 35 },

  // Two dimensions
  { template: "{m} by {d} by {d2}", output: "Q @{m} #{d} #{d2}", priority: 25 },
  { template: "{m} by {d} and {d2}", output: "Q @{m} #{d} #{d2}", priority: 25 },
];
```

**Time Slot (built-in):**

```typescript
const TIME_SLOTS: Record<string, string> = {
  // Absolute
  "today": "today",
  "yesterday": "yesterday",
  "this week": "this_week",
  "last week": "last_week",
  "this month": "this_month",
  "last month": "last_month",
  "this quarter": "this_quarter",
  "last quarter": "last_quarter",
  "this year": "this_year",
  "last year": "last_year",

  // Relative
  "mtd": "this_month",
  "ytd": "this_year",
  "qtd": "this_quarter",
  "q-1": "Q-1",
  "q-2": "Q-2",
  "m-1": "M-1",
  "m-3": "M-3",
  "y-1": "Y-1",

  // Ranges
  "last 7 days": "D-7",
  "last 30 days": "D-30",
  "last 90 days": "D-90",
  "past week": "D-7",
  "past month": "D-30",
};
```

**Common Synonyms (built-in):**

```typescript
const COMMON_SYNONYMS: Record<string, string> = {
  // Metric synonyms
  "sales": "revenue",
  "income": "revenue",
  "money": "revenue",
  "earnings": "revenue",
  "count": "orders",
  "number of": "orders",
  "how many": "orders",

  // Dimension synonyms
  "geo": "region",
  "geography": "region",
  "area": "region",
  "location": "region",
  "type": "category",

  // Action words (stripped)
  "show me": "",
  "what is": "",
  "what's": "",
  "give me": "",
  "display": "",
  "get": "",
};
```

---

### 2. Normalizer (`query/normalizer.ts`)

**Purpose:** Clean and prepare natural language input.

```typescript
interface NormalizeResult {
  original: string;
  normalized: string;
  tokens: string[];
  substitutions: Array<{ from: string; to: string }>;
}

function normalize(
  input: string,
  synonyms: Record<string, string>
): NormalizeResult {
  let normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, ' ')  // Remove punctuation
    .replace(/\s+/g, ' ');       // Collapse whitespace

  const substitutions: Array<{ from: string; to: string }> = [];

  // Apply synonyms (longest match first)
  const sortedSynonyms = Object.entries(synonyms)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [from, to] of sortedSynonyms) {
    if (normalized.includes(from)) {
      normalized = normalized.replace(from, to);
      substitutions.push({ from, to });
    }
  }

  const tokens = normalized.split(' ').filter(Boolean);

  return { original: input, normalized, tokens, substitutions };
}
```

---

### 3. Pattern Matcher (`query/matcher.ts`)

**Purpose:** Match normalized input against patterns.

```typescript
interface MatchResult {
  matched: boolean;
  pattern?: Pattern;
  slots?: Record<string, string>;
  lcOutput?: string;
  confidence: number;
}

function match(
  normalized: NormalizeResult,
  compiled: CompiledVocabulary
): MatchResult {
  // Sort patterns by priority (highest first)
  const patterns = [...compiled.patterns].sort((a, b) => b.priority - a.priority);

  for (const pattern of patterns) {
    const result = tryMatch(normalized.normalized, pattern, compiled.slots);
    if (result.matched) {
      return {
        matched: true,
        pattern,
        slots: result.slots,
        lcOutput: buildOutput(pattern.output, result.slots),
        confidence: 1.0,
      };
    }
  }

  return { matched: false, confidence: 0 };
}

function tryMatch(
  input: string,
  pattern: Pattern,
  slots: CompiledVocabulary['slots']
): { matched: boolean; slots?: Record<string, string> } {
  // Convert pattern template to regex
  // "{m} by {d}" → /^(\w+) by (\w+)$/
  // But smarter - each slot must match valid vocabulary items

  const slotMatches: Record<string, string> = {};
  let remaining = input;

  // Parse pattern into segments
  const segments = parsePatternSegments(pattern.template);

  for (const segment of segments) {
    if (segment.type === 'literal') {
      if (!remaining.startsWith(segment.value)) {
        return { matched: false };
      }
      remaining = remaining.slice(segment.value.length).trim();
    } else if (segment.type === 'slot') {
      // Try to match a vocabulary item for this slot type
      const slotType = segment.value as keyof typeof slots;
      const candidates = slots[slotType] || [];

      // Special handling for numbers
      if (slotType === 'n') {
        const numMatch = remaining.match(/^(\d+)/);
        if (numMatch) {
          slotMatches[slotType] = numMatch[1];
          remaining = remaining.slice(numMatch[0].length).trim();
          continue;
        }
        return { matched: false };
      }

      // Find longest matching candidate
      let found = false;
      for (const candidate of candidates.sort((a, b) => b.length - a.length)) {
        if (remaining.startsWith(candidate)) {
          slotMatches[slotType] = candidate;
          remaining = remaining.slice(candidate.length).trim();
          found = true;
          break;
        }
      }

      if (!found) {
        return { matched: false };
      }
    }
  }

  // Must consume entire input
  if (remaining.length > 0) {
    return { matched: false };
  }

  return { matched: true, slots: slotMatches };
}

function buildOutput(template: string, slots: Record<string, string>): string {
  let output = template;
  for (const [key, value] of Object.entries(slots)) {
    output = output.replace(`{${key}}`, value);
  }
  return output;
}
```

---

### 4. LLM Fallback (`query/fallback.ts`)

**Purpose:** Handle queries that don't match patterns.

```typescript
interface FallbackResult {
  lcOutput: string;
  confidence: number;
  reasoning?: string;
}

async function fallback(
  input: string,
  compiled: CompiledVocabulary,
  options: { model?: string; maxRetries?: number }
): Promise<FallbackResult> {
  const prompt = buildFallbackPrompt(input, compiled);

  const response = await callLLM({
    model: options.model || "claude-3-haiku-20240307",
    messages: [{ role: "user", content: prompt }],
    maxTokens: 100,
    temperature: 0, // Deterministic
  });

  // Extract LC from response
  const lcMatch = response.content.match(/Q\s+[@#?~\w\s:+-]+/);
  if (!lcMatch) {
    throw new QueryEngineError("LLM did not produce valid LC output");
  }

  return {
    lcOutput: lcMatch[0].trim(),
    confidence: 0.8,
    reasoning: response.content,
  };
}

function buildFallbackPrompt(input: string, compiled: CompiledVocabulary): string {
  return `Generate a LiquidConnect query. Output ONLY the query starting with Q.

VOCABULARY:
Metrics: ${compiled.slots.m.map(m => `@${m}`).join(' ')}
Dimensions: ${compiled.slots.d.map(d => `#${d}`).join(' ')}
Filters: ${compiled.slots.f.map(f => `?${f}`).join(' ')}
Time: ~today ~this_month ~last_month ~this_quarter ~last_quarter ~Q-1 ~M-1 ~Y-1

SYNTAX:
Q @metric #dimension ?filter ~time top:N ±@metric_for_sort vs ~period

EXAMPLES:
"revenue" → Q @revenue
"revenue by region" → Q @revenue #region
"top 10 customers by revenue" → Q @revenue #customer top:10 -@revenue
"revenue last quarter" → Q @revenue ~last_quarter
"enterprise revenue by region this month" → Q @revenue #region ?enterprise ~this_month

Question: ${input}
Answer: Q`;
}
```

---

### 5. Validator (`query/validator.ts`)

**Purpose:** Ensure LC output is valid against vocabulary.

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  position?: number;
}

function validate(
  lcOutput: string,
  vocabulary: DetectedVocabulary
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Parse LC to extract references
  const refs = extractReferences(lcOutput);

  // Check metrics exist
  for (const metric of refs.metrics) {
    if (!vocabulary.metrics.find(m => m.name === metric)) {
      errors.push({
        code: 'UNKNOWN_METRIC',
        message: `Unknown metric: @${metric}`,
      });
    }
  }

  // Check dimensions exist
  for (const dim of refs.dimensions) {
    if (!vocabulary.dimensions.find(d => d.name === dim)) {
      errors.push({
        code: 'UNKNOWN_DIMENSION',
        message: `Unknown dimension: #${dim}`,
      });
    }
  }

  // Check filters exist
  for (const filter of refs.filters) {
    if (!vocabulary.filters.find(f => f.name === filter)) {
      errors.push({
        code: 'UNKNOWN_FILTER',
        message: `Unknown filter: ?${filter}`,
      });
    }
  }

  // Check join paths exist for cross-entity queries
  const entities = getEntitiesFromRefs(refs, vocabulary);
  if (entities.length > 1) {
    for (let i = 0; i < entities.length - 1; i++) {
      const from = entities[i];
      const to = entities[i + 1];
      if (!hasJoinPath(from, to, vocabulary.relationships)) {
        errors.push({
          code: 'NO_JOIN_PATH',
          message: `No relationship between ${from} and ${to}`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function extractReferences(lc: string): {
  metrics: string[];
  dimensions: string[];
  filters: string[];
  time: string[];
} {
  return {
    metrics: [...lc.matchAll(/@(\w+)/g)].map(m => m[1]),
    dimensions: [...lc.matchAll(/#(\w+)/g)].map(m => m[1]),
    filters: [...lc.matchAll(/\?(\w+)/g)].map(m => m[1]),
    time: [...lc.matchAll(/~([\w-]+)/g)].map(m => m[1]),
  };
}
```

---

### 6. Query Engine (`query/engine.ts`)

**Purpose:** Orchestrate the full pipeline.

```typescript
interface QueryResult {
  success: boolean;
  lcOutput?: string;
  trace: QueryTrace;
  error?: string;
}

interface QueryTrace {
  input: string;
  normalized: NormalizeResult;
  matchAttempt: MatchResult;
  fallbackUsed: boolean;
  fallbackResult?: FallbackResult;
  validation: ValidationResult;
  timingMs: {
    normalize: number;
    match: number;
    fallback?: number;
    validate: number;
    total: number;
  };
}

async function query(
  input: string,
  vocabularyId: string,
  options?: QueryOptions
): Promise<QueryResult> {
  const startTime = Date.now();
  const trace: Partial<QueryTrace> = { input };

  // 1. Load compiled vocabulary
  const compiled = await loadCompiledVocabulary(vocabularyId);
  const vocabulary = await loadVocabulary(vocabularyId);

  // 2. Normalize
  const normalizeStart = Date.now();
  const normalized = normalize(input, compiled.synonyms);
  trace.normalized = normalized;
  const normalizeTime = Date.now() - normalizeStart;

  // 3. Try pattern match
  const matchStart = Date.now();
  const matchResult = match(normalized, compiled);
  trace.matchAttempt = matchResult;
  const matchTime = Date.now() - matchStart;

  let lcOutput: string;
  let fallbackTime = 0;

  if (matchResult.matched) {
    lcOutput = matchResult.lcOutput!;
    trace.fallbackUsed = false;
  } else {
    // 4. Fallback to LLM
    trace.fallbackUsed = true;
    const fallbackStart = Date.now();
    try {
      const fallbackResult = await fallback(input, compiled, options);
      trace.fallbackResult = fallbackResult;
      lcOutput = fallbackResult.lcOutput;
      fallbackTime = Date.now() - fallbackStart;
    } catch (error) {
      return {
        success: false,
        error: `Query not understood: ${error.message}`,
        trace: trace as QueryTrace,
      };
    }
  }

  // 5. Validate
  const validateStart = Date.now();
  const validation = validate(lcOutput, vocabulary);
  trace.validation = validation;
  const validateTime = Date.now() - validateStart;

  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.map(e => e.message).join('; '),
      trace: {
        ...trace,
        timingMs: {
          normalize: normalizeTime,
          match: matchTime,
          fallback: fallbackTime || undefined,
          validate: validateTime,
          total: Date.now() - startTime,
        },
      } as QueryTrace,
    };
  }

  return {
    success: true,
    lcOutput,
    trace: {
      ...trace,
      timingMs: {
        normalize: normalizeTime,
        match: matchTime,
        fallback: fallbackTime || undefined,
        validate: validateTime,
        total: Date.now() - startTime,
      },
    } as QueryTrace,
  };
}
```

---

## File Structure

```
packages/liquid-connect/src/
├── compiler/              ✓ DONE
├── resolver/              ✓ DONE
├── emitters/              ✓ DONE
├── uvb/                   ✓ DONE
│
├── vocabulary/            NEW
│   ├── index.ts           Exports
│   ├── compiler.ts        DetectedVocabulary → CompiledVocabulary
│   ├── patterns.ts        Default patterns + time slots
│   └── synonyms.ts        Common synonyms
│
└── query/                 NEW
    ├── index.ts           Exports
    ├── engine.ts          Main orchestrator
    ├── normalizer.ts      Text normalization
    ├── matcher.ts         Pattern matching
    ├── fallback.ts        LLM fallback
    └── validator.ts       LC validation
```

---

## API Integration

```typescript
// New API route: POST /api/query
// packages/api/src/modules/query/router.ts

router.post('/query', async (c) => {
  const { input, vocabularyId } = await c.req.json();

  // 1. Query Engine: NL → LC
  const queryResult = await query(input, vocabularyId);

  if (!queryResult.success) {
    return c.json({ error: queryResult.error, trace: queryResult.trace }, 400);
  }

  // 2. Compiler: LC → SQL
  const compileResult = compile(queryResult.lcOutput, vocabulary);

  if (!compileResult.success) {
    return c.json({ error: compileResult.error }, 400);
  }

  // 3. Execute SQL
  const data = await executeQuery(compileResult.sql, connectionId);

  // 4. Return with metadata
  return c.json({
    data,
    lc: queryResult.lcOutput,
    sql: compileResult.sql,
    trace: queryResult.trace,
  });
});
```

---

## Implementation Waves

### Wave 1: Core Infrastructure (4 files)
- `vocabulary/patterns.ts` - Default patterns + time slots
- `vocabulary/synonyms.ts` - Common synonyms
- `vocabulary/compiler.ts` - Compile vocabulary to patterns
- `query/normalizer.ts` - Text normalization

### Wave 2: Pattern Matching (2 files)
- `query/matcher.ts` - Pattern matching algorithm
- `query/validator.ts` - LC validation

### Wave 3: LLM Fallback (1 file)
- `query/fallback.ts` - Claude Haiku integration

### Wave 4: Integration (2 files)
- `query/engine.ts` - Orchestrator
- `query/index.ts` - Exports

### Wave 5: API Route (1 file)
- `packages/api/src/modules/query/router.ts`

---

## Test Strategy

```typescript
// Pattern matching tests
describe('matcher', () => {
  test('matches "revenue" → Q @revenue', ...);
  test('matches "revenue by region" → Q @revenue #region', ...);
  test('matches "top 10 customers by revenue" → Q @revenue #customer top:10 -@revenue', ...);
  test('does not match unknown metric', ...);
  test('handles synonyms', ...);
});

// End-to-end tests
describe('query engine', () => {
  test('pattern match path', ...);
  test('LLM fallback path', ...);
  test('validation rejects unknown terms', ...);
  test('timing under 50ms for pattern match', ...);
});
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Pattern match latency | < 10ms |
| LLM fallback latency | < 500ms |
| Pattern match rate | > 80% |
| Validation latency | < 5ms |
| End-to-end (pattern) | < 20ms |
| End-to-end (LLM) | < 600ms |

---

## Success Criteria

1. **80%+ pattern match rate** on common queries
2. **< 50ms average latency** (weighted by pattern vs LLM)
3. **100% validation accuracy** - never send invalid LC to compiler
4. **Graceful degradation** - LLM fallback works when patterns fail
5. **Full traceability** - every query has complete trace

---

*This is the bridge between human language and the deterministic compiler.*
