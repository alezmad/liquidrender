# LiquidCode Specification v2.1 - Part 2C

**Sections:** 14-15 (Operations & Composition)
**Version:** 2.1
**Date:** 2025-12-22
**Status:** Draft
**Authors:** Liquid Engine Core Team

---

## Navigation

- [Part 1 (Sections 1-7): Foundation](./SPEC-v2.1-part1.md)
- [Part 2A (Sections 8-11): Mechanics](./SPEC-v2.1-part2a.md)
- [Part 2B (Sections 12-13): Discovery & Resolution](./SPEC-v2.1-part2b.md)
- **Part 2C (Sections 14-15): Operations & Composition** ← YOU ARE HERE
- [Part 3 (Sections 16-20): System Integration](./SPEC-v2.1-part3.md)
- [Appendices](./SPEC-v2.1-appendices.md)

---

## 14. Fragment Cache Architecture

### 14.1 Fragment Types

| Fragment Type | Contains | Reusability |
|---------------|----------|-------------|
| `archetype` | L0 structure + layout | High (pattern-based) |
| `block` | Single block definition | Very high |
| `composition` | Block combinations | Medium |
| `polish` | L2 formatting | Very high |
| `binding-template` | Binding patterns | High |

### 14.2 Storage Interface

```typescript
interface FragmentStorage {
  get(key: CacheKey): Promise<CachedFragment | null>;
  set(key: CacheKey, fragment: CachedFragment, ttl?: number): Promise<void>;
  search(embedding: number[], limit: number): Promise<SemanticMatch[]>;
  invalidate(pattern: string): Promise<number>;
  clear(): Promise<void>;
}
```

### 14.3 Cache Warming Strategy

**Enhanced with ISS-015 resolution**

#### 14.3.1 Pre-Generation Overview

The cache warming system proactively generates interface fragments before user requests to achieve zero-latency response for common queries.

**Goals:**
- 85%+ first-query cache hit rate
- <10ms response time for cached queries
- Efficient resource usage (don't pre-generate everything)

**Strategy:**
- Predict high-probability user intents from data schema
- Generate fragments in priority order
- Warm cache in background (non-blocking)
- Continuous learning from actual usage

#### 14.3.2 Warming Pipeline

```
Data Source Connected
    ↓
Schema Fingerprinting (§12.3)
    ↓ (primitives: date, currency, category, etc.)
Archetype Detection (§12.4)
    ↓ (overview, time_series, comparison, etc.)
Intent Prediction
    ↓ (ranked list of likely user questions)
Fragment Prioritization
    ↓ (top N intents by predicted probability)
Progressive Generation
    ↓ (generate in priority order)
Cache Population
    ↓
Ready for Queries
```

#### 14.3.3 Intent Prediction Algorithm

```typescript
interface PredictedIntent {
  intent: string;                // Natural language intent
  probability: number;           // 0-1 likelihood
  archetype: string;             // Predicted archetype
  bindings: BindingSuggestion[]; // Predicted field mappings
  signals?: string[];            // Predicted signals
  priority: number;              // Generation priority (1-5)
}

function predictIntents(
  fingerprint: DataFingerprint,
  archetypes: string[]
): PredictedIntent[] {
  const intents: PredictedIntent[] = [];

  // Rule-based intent generation
  for (const archetype of archetypes) {
    const archetypeIntents = generateArchetypeIntents(fingerprint, archetype);
    intents.push(...archetypeIntents);
  }

  // Cross-product intents (combining primitives)
  const crossIntents = generateCrossProductIntents(fingerprint);
  intents.push(...crossIntents);

  // Historical learning (if available)
  const historicalIntents = getHistoricalIntents(fingerprint);
  intents.push(...historicalIntents);

  // Score and rank
  return intents
    .map(i => ({ ...i, probability: scoreIntent(i, fingerprint) }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 50);  // Top 50 intents
}
```

#### 14.3.4 Archetype-Based Intent Generation

```typescript
function generateArchetypeIntents(
  fingerprint: DataFingerprint,
  archetype: string
): PredictedIntent[] {
  switch (archetype) {
    case 'overview':
      return generateOverviewIntents(fingerprint);
    case 'time_series':
      return generateTimeSeriesIntents(fingerprint);
    case 'comparison':
      return generateComparisonIntents(fingerprint);
    case 'distribution':
      return generateDistributionIntents(fingerprint);
    case 'funnel':
      return generateFunnelIntents(fingerprint);
    default:
      return [];
  }
}

function generateOverviewIntents(fp: DataFingerprint): PredictedIntent[] {
  const intents: PredictedIntent[] = [];
  const currencies = fp.fields.filter(f => f.primitive === 'currency');
  const dates = fp.fields.filter(f => f.primitive === 'date');
  const categories = fp.fields.filter(f => f.primitive === 'category');

  // Intent 1: Key metrics overview
  if (currencies.length >= 2) {
    intents.push({
      intent: `Show overview of ${currencies.map(c => c.name).join(', ')}`,
      probability: 0.9,
      archetype: 'overview',
      bindings: currencies.map(c => ({ field: c.name, target: 'value', score: 0.9 })),
      priority: 1,
    });
  }

  // Intent 2: Metrics with trend
  if (currencies.length >= 1 && dates.length >= 1) {
    const metric = currencies[0];
    const dateField = dates[0];
    intents.push({
      intent: `Show ${metric.name} trend over time`,
      probability: 0.85,
      archetype: 'overview',
      bindings: [
        { field: metric.name, target: 'value', score: 0.9 },
        { field: dateField.name, target: 'x', score: 0.9 },
      ],
      signals: ['dateRange'],
      priority: 1,
    });
  }

  // Intent 3: Breakdown by category
  if (currencies.length >= 1 && categories.length >= 1) {
    const metric = currencies[0];
    const category = categories[0];
    intents.push({
      intent: `Show ${metric.name} by ${category.name}`,
      probability: 0.8,
      archetype: 'overview',
      bindings: [
        { field: metric.name, target: 'value', score: 0.9 },
        { field: category.name, target: 'category', score: 0.9 },
      ],
      priority: 2,
    });
  }

  return intents;
}

function generateTimeSeriesIntents(fp: DataFingerprint): PredictedIntent[] {
  const intents: PredictedIntent[] = [];
  const dates = fp.fields.filter(f => f.primitive === 'date');
  const measures = fp.fields.filter(f => f.primitive === 'currency' || f.primitive === 'count');

  if (dates.length === 0 || measures.length === 0) return [];

  const dateField = dates[0];

  // Single metric trend
  for (const measure of measures.slice(0, 3)) {
    intents.push({
      intent: `Show ${measure.name} over time`,
      probability: 0.85,
      archetype: 'time_series',
      bindings: [
        { field: dateField.name, target: 'x', score: 0.95 },
        { field: measure.name, target: 'y', score: 0.9 },
      ],
      signals: ['dateRange'],
      priority: 1,
    });
  }

  // Multi-metric comparison
  if (measures.length >= 2) {
    intents.push({
      intent: `Compare ${measures[0].name} vs ${measures[1].name} over time`,
      probability: 0.75,
      archetype: 'time_series',
      bindings: [
        { field: dateField.name, target: 'x', score: 0.95 },
        { field: measures[0].name, target: 'series', score: 0.85 },
        { field: measures[1].name, target: 'series', score: 0.85 },
      ],
      signals: ['dateRange'],
      priority: 2,
    });
  }

  return intents;
}

function generateComparisonIntents(fp: DataFingerprint): PredictedIntent[] {
  const intents: PredictedIntent[] = [];
  const measures = fp.fields.filter(f => f.primitive === 'currency' || f.primitive === 'count');

  // Two measures side-by-side
  for (let i = 0; i < measures.length; i++) {
    for (let j = i + 1; j < measures.length; j++) {
      const m1 = measures[i];
      const m2 = measures[j];

      // Check if they look like current vs previous (naming pattern)
      const isComparison = (
        (m1.name.includes('current') && m2.name.includes('previous')) ||
        (m1.name.includes('actual') && m2.name.includes('budget')) ||
        (m1.name.includes('this') && m2.name.includes('last'))
      );

      intents.push({
        intent: `Compare ${m1.name} vs ${m2.name}`,
        probability: isComparison ? 0.9 : 0.6,
        archetype: 'comparison',
        bindings: [
          { field: m1.name, target: 'current', score: 0.9 },
          { field: m2.name, target: 'previous', score: 0.9 },
        ],
        priority: isComparison ? 1 : 3,
      });
    }
  }

  return intents;
}

function generateDistributionIntents(fp: DataFingerprint): PredictedIntent[] {
  const intents: PredictedIntent[] = [];
  const categories = fp.fields.filter(f => f.primitive === 'category');
  const measures = fp.fields.filter(f => f.primitive === 'currency' || f.primitive === 'count');

  // Category breakdown
  for (const category of categories.slice(0, 2)) {
    for (const measure of measures.slice(0, 2)) {
      intents.push({
        intent: `Show ${measure.name} distribution by ${category.name}`,
        probability: 0.75,
        archetype: 'distribution',
        bindings: [
          { field: category.name, target: 'label', score: 0.9 },
          { field: measure.name, target: 'value', score: 0.9 },
        ],
        priority: 2,
      });
    }
  }

  return intents;
}

function generateFunnelIntents(fp: DataFingerprint): PredictedIntent[] {
  const intents: PredictedIntent[] = [];
  const stageFields = fp.fields.filter(f =>
    f.name.toLowerCase().includes('stage') ||
    f.name.toLowerCase().includes('step') ||
    f.name.toLowerCase().includes('funnel')
  );

  if (stageFields.length === 0) return [];

  const measures = fp.fields.filter(f => f.primitive === 'count' || f.primitive === 'currency');

  for (const measure of measures.slice(0, 2)) {
    intents.push({
      intent: `Show ${measure.name} funnel`,
      probability: 0.8,
      archetype: 'funnel',
      bindings: [
        { field: stageFields[0].name, target: 'stage', score: 0.9 },
        { field: measure.name, target: 'value', score: 0.9 },
      ],
      priority: 2,
    });
  }

  return intents;
}
```

#### 14.3.5 Cross-Product Intent Generation

Generate intents by combining primitives:

```typescript
function generateCrossProductIntents(fp: DataFingerprint): PredictedIntent[] {
  const intents: PredictedIntent[] = [];

  // Date × Currency → Time series
  const dates = fp.fields.filter(f => f.primitive === 'date');
  const currencies = fp.fields.filter(f => f.primitive === 'currency');

  for (const date of dates.slice(0, 1)) {
    for (const currency of currencies.slice(0, 3)) {
      intents.push({
        intent: `Show ${currency.name} over ${date.name}`,
        probability: 0.8,
        archetype: 'time_series',
        bindings: [
          { field: date.name, target: 'x', score: 0.9 },
          { field: currency.name, target: 'y', score: 0.9 },
        ],
        signals: ['dateRange'],
        priority: 1,
      });
    }
  }

  // Category × Currency → Distribution
  const categories = fp.fields.filter(f => f.primitive === 'category');

  for (const category of categories.slice(0, 2)) {
    for (const currency of currencies.slice(0, 2)) {
      intents.push({
        intent: `Show ${currency.name} by ${category.name}`,
        probability: 0.75,
        archetype: 'distribution',
        bindings: [
          { field: category.name, target: 'category', score: 0.9 },
          { field: currency.name, target: 'value', score: 0.9 },
        ],
        signals: ['filter'],
        priority: 2,
      });
    }
  }

  // Category × Date × Currency → Filtered time series
  for (const category of categories.slice(0, 1)) {
    for (const date of dates.slice(0, 1)) {
      for (const currency of currencies.slice(0, 2)) {
        intents.push({
          intent: `Show ${currency.name} trend by ${category.name}`,
          probability: 0.7,
          archetype: 'time_series',
          bindings: [
            { field: date.name, target: 'x', score: 0.9 },
            { field: currency.name, target: 'y', score: 0.9 },
            { field: category.name, target: 'series', score: 0.8 },
          ],
          signals: ['dateRange', 'categoryFilter'],
          priority: 3,
        });
      }
    }
  }

  return intents;
}
```

#### 14.3.6 Intent Scoring

```typescript
function scoreIntent(intent: PredictedIntent, fp: DataFingerprint): number {
  let score = intent.probability;  // Base probability

  // Boost by field name semantic match
  const semanticBoost = intent.bindings.reduce((sum, b) => {
    const field = fp.fields.find(f => f.name === b.field);
    return sum + (field?.semanticScore ?? 0);
  }, 0) / intent.bindings.length;
  score *= (1 + semanticBoost * 0.2);

  // Boost by field position (first fields more important)
  const positionBoost = intent.bindings.reduce((sum, b) => {
    const field = fp.fields.find(f => f.name === b.field);
    const position = fp.fields.indexOf(field!);
    return sum + (1 - position / fp.fields.length);
  }, 0) / intent.bindings.length;
  score *= (1 + positionBoost * 0.1);

  // Boost by archetype frequency (if historical data available)
  const archetypeFreq = getArchetypeFrequency(intent.archetype);
  score *= (1 + archetypeFreq * 0.15);

  // Penalize complex intents (too many bindings)
  if (intent.bindings.length > 4) {
    score *= 0.8;
  }

  return Math.min(score, 1.0);
}

function getArchetypeFrequency(archetype: string): number {
  // Historical data: what % of queries use this archetype
  const frequencies: Record<string, number> = {
    'overview': 0.35,
    'time_series': 0.25,
    'distribution': 0.15,
    'comparison': 0.10,
    'funnel': 0.05,
  };
  return frequencies[archetype] ?? 0.05;
}
```

#### 14.3.7 Fragment Prioritization

```typescript
interface GenerationTask {
  intent: PredictedIntent;
  priority: number;           // 1-5 (1 = highest)
  estimatedTokens: number;    // LLM token cost
  estimatedTime: number;      // Generation time (ms)
}

function prioritizeTasks(intents: PredictedIntent[]): GenerationTask[] {
  const tasks = intents.map(intent => ({
    intent,
    priority: calculatePriority(intent),
    estimatedTokens: estimateTokens(intent),
    estimatedTime: estimateTime(intent),
  }));

  // Sort by priority, then by cost (prefer cheap high-value)
  return tasks.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;  // Lower number = higher priority
    }
    return a.estimatedTokens - b.estimatedTokens;  // Prefer cheaper
  });
}

function calculatePriority(intent: PredictedIntent): number {
  // Priority 1: probability > 0.85
  if (intent.probability > 0.85) return 1;

  // Priority 2: probability > 0.7
  if (intent.probability > 0.7) return 2;

  // Priority 3: probability > 0.5
  if (intent.probability > 0.5) return 3;

  // Priority 4: probability > 0.3
  if (intent.probability > 0.3) return 4;

  // Priority 5: everything else
  return 5;
}

function estimateTokens(intent: PredictedIntent): number {
  // Estimate LLM tokens needed for generation
  const baseTokens = 35;  // Typical LiquidCode generation
  const bindingTokens = intent.bindings.length * 3;
  const signalTokens = (intent.signals?.length ?? 0) * 5;
  return baseTokens + bindingTokens + signalTokens;
}

function estimateTime(intent: PredictedIntent): number {
  // Estimate generation time
  const tokens = estimateTokens(intent);
  const msPerToken = 2;  // Typical LLM latency
  return tokens * msPerToken + 50;  // +50ms overhead
}
```

#### 14.3.8 Progressive Generation

```typescript
interface WarmingConfig {
  maxConcurrent: number;        // Max parallel generations
  maxTotalTime: number;         // Total warming budget (ms)
  maxCacheSize: number;         // Max fragments to cache
  priorityThreshold: number;    // Only generate priority ≤ N
}

const DEFAULT_CONFIG: WarmingConfig = {
  maxConcurrent: 5,
  maxTotalTime: 10000,          // 10 seconds
  maxCacheSize: 100,
  priorityThreshold: 3,         // Only priority 1-3
};

async function warmCache(
  fingerprint: DataFingerprint,
  config: WarmingConfig = DEFAULT_CONFIG
): Promise<WarmingResult> {
  const startTime = Date.now();
  const generated: CachedFragment[] = [];
  const skipped: PredictedIntent[] = [];

  // 1. Predict intents
  const archetypes = detectArchetypes(fingerprint);
  const intents = predictIntents(fingerprint, archetypes);

  // 2. Prioritize
  const tasks = prioritizeTasks(intents)
    .filter(t => t.priority <= config.priorityThreshold)
    .slice(0, config.maxCacheSize);

  // 3. Generate in waves
  const queue = [...tasks];
  const inFlight = new Set<Promise<CachedFragment>>();

  while (queue.length > 0 || inFlight.size > 0) {
    // Check time budget
    if (Date.now() - startTime > config.maxTotalTime) {
      skipped.push(...queue.map(t => t.intent));
      break;
    }

    // Fill up to maxConcurrent
    while (queue.length > 0 && inFlight.size < config.maxConcurrent) {
      const task = queue.shift()!;
      const promise = generateFragment(task.intent, fingerprint)
        .then(fragment => {
          generated.push(fragment);
          return fragment;
        })
        .finally(() => {
          inFlight.delete(promise);
        });
      inFlight.add(promise);
    }

    // Wait for at least one to complete
    if (inFlight.size > 0) {
      await Promise.race(inFlight);
    }
  }

  // 4. Populate cache
  for (const fragment of generated) {
    await fragmentCache.set(fragment.key, fragment, {
      ttl: 3600 * 24 * 7,  // 7 days for pre-generated
    });
  }

  return {
    generated: generated.length,
    skipped: skipped.length,
    totalTime: Date.now() - startTime,
    cacheSize: generated.length,
  };
}

interface WarmingResult {
  generated: number;
  skipped: number;
  totalTime: number;
  cacheSize: number;
}
```

#### 14.3.9 Fragment Generation

```typescript
async function generateFragment(
  intent: PredictedIntent,
  fingerprint: DataFingerprint
): Promise<CachedFragment> {
  // Use LLM to generate LiquidCode for this intent
  const prompt = buildGenerationPrompt(intent, fingerprint);
  const liquidCode = await llm.generate(prompt, {
    maxTokens: 100,
    temperature: 0.3,  // Low temp for cache warming (consistent)
  });

  // Compile to schema
  const schema = await compiler.compile(liquidCode);

  // Validate
  await validator.validate(schema);

  // Create cache fragment
  const fragment: CachedFragment = {
    key: createCacheKey(intent, fingerprint),
    intent: intent.intent,
    liquidCode,
    schema,
    metadata: {
      archetype: intent.archetype,
      probability: intent.probability,
      generatedAt: new Date().toISOString(),
      source: 'pre-generation',
    },
  };

  return fragment;
}

function buildGenerationPrompt(
  intent: PredictedIntent,
  fingerprint: DataFingerprint
): string {
  return `
Generate LiquidCode for: "${intent.intent}"

Data schema:
${fingerprint.fields.map(f => `  ${f.name}: ${f.primitive} (${f.type})`).join('\n')}

Suggested archetype: ${intent.archetype}
Suggested bindings:
${intent.bindings.map(b => `  ${b.field} → ${b.target}`).join('\n')}

Output LiquidCode only (ASCII format, no explanation):
  `.trim();
}

function createCacheKey(
  intent: PredictedIntent,
  fingerprint: DataFingerprint
): CacheKey {
  return {
    intentHash: hashIntent(intent.intent),
    dataFingerprint: fingerprint.signature,
    archetypeHint: intent.archetype,
    scope: 'interface',
  };
}

function hashIntent(intent: string): string {
  // Normalize and hash intent
  const normalized = intent.toLowerCase().trim().replace(/\s+/g, ' ');
  return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}
```

#### 14.3.10 Continuous Learning

Update predictions based on actual usage:

```typescript
interface UsageEvent {
  timestamp: string;
  intent: string;
  dataFingerprint: string;
  cacheHit: boolean;
  latency: number;
}

class UsageLearning {
  private events: UsageEvent[] = [];

  record(event: UsageEvent): void {
    this.events.push(event);
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);  // Keep recent
    }
  }

  getTopIntents(fingerprint: string, limit: number = 20): string[] {
    const filtered = this.events.filter(e => e.dataFingerprint === fingerprint);
    const counts = new Map<string, number>();

    for (const event of filtered) {
      counts.set(event.intent, (counts.get(event.intent) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([intent]) => intent);
  }

  getCacheHitRate(fingerprint: string): number {
    const filtered = this.events.filter(e => e.dataFingerprint === fingerprint);
    if (filtered.length === 0) return 0;

    const hits = filtered.filter(e => e.cacheHit).length;
    return hits / filtered.length;
  }

  // Use historical data to boost intent probabilities
  boostIntentProbabilities(
    intents: PredictedIntent[],
    fingerprint: DataFingerprint
  ): PredictedIntent[] {
    const topIntents = this.getTopIntents(fingerprint.signature, 50);

    return intents.map(intent => {
      const rank = topIntents.indexOf(intent.intent);
      if (rank !== -1) {
        // Boost probability based on actual usage rank
        const boost = Math.max(0, 1 - rank / topIntents.length) * 0.3;
        return {
          ...intent,
          probability: Math.min(1, intent.probability + boost),
        };
      }
      return intent;
    });
  }
}
```

#### 14.3.11 Warming Triggers

```typescript
enum WarmingTrigger {
  ON_CONNECT = 'on_connect',           // Data source connected
  ON_SCHEMA_CHANGE = 'on_schema_change', // Schema updated
  ON_IDLE = 'on_idle',                  // System idle
  PERIODIC = 'periodic',                // Scheduled refresh
}

interface WarmingScheduler {
  schedule(
    trigger: WarmingTrigger,
    fingerprint: DataFingerprint,
    config?: Partial<WarmingConfig>
  ): Promise<void>;
}

// Example: warm on connect
dataSource.on('connect', async (source) => {
  const fingerprint = await fingerprinter.analyze(source.schema);

  await warmingScheduler.schedule(
    WarmingTrigger.ON_CONNECT,
    fingerprint,
    {
      maxTotalTime: 5000,  // Fast initial warm
      priorityThreshold: 2,  // Only top priorities
    }
  );
});

// Example: periodic refresh
setInterval(async () => {
  const fingerprint = await fingerprinter.analyze(dataSource.schema);
  const hitRate = usageLearning.getCacheHitRate(fingerprint.signature);

  if (hitRate < 0.80) {  // Below target
    await warmingScheduler.schedule(
      WarmingTrigger.PERIODIC,
      fingerprint,
      {
        maxTotalTime: 30000,  // Longer budget for refresh
        priorityThreshold: 4,  // Broader coverage
      }
    );
  }
}, 3600000);  // Every hour
```

### 14.4 Invalidation Rules

| Event | Invalidation Scope |
|-------|-------------------|
| Schema change | All fragments for that data source |
| User correction | Specific fragment + similar |
| TTL expiry | Individual fragment |
| Manual clear | All fragments |

---

## 15. Compositional Grammar Engine

**Enhanced with ISS-004 and ISS-099 resolutions**

### 15.1 Purpose

When no single cached fragment matches, compose from smaller pieces.

### 15.2 Composition Rules

```typescript
interface CompositionRule {
  pattern: IntentPattern;      // What intent structure matches
  fragments: FragmentRef[];    // What fragments to combine
  layout: LayoutRule;          // How to arrange
  signals: SignalWiring;       // How to connect
}
```

#### 15.2.1 Fragment Selection Algorithm

**From ISS-004 resolution**

The composition engine selects fragments to combine using a multi-stage matching process:

```typescript
interface FragmentSelector {
  selectFragments(
    intent: UserIntent,
    dataFingerprint: DataFingerprint,
    cache: FragmentStorage
  ): FragmentSet;
}

interface FragmentSet {
  fragments: CachedFragment[];
  coverage: number;           // 0-1, how much of intent is covered
  conflicts: Conflict[];      // Detected incompatibilities
  confidence: number;         // 0-1, overall confidence score
}

interface Conflict {
  type: 'binding' | 'signal' | 'layout' | 'type';
  fragments: [string, string];  // UIDs of conflicting fragments
  severity: 'blocking' | 'warning' | 'info';
  resolution?: ConflictResolution;
}
```

**Selection process:**

```
1. Parse Intent → Extract Components
   - Identify requested block types (e.g., "KPI", "chart", "table")
   - Extract data requirements (fields, aggregations)
   - Detect interaction patterns (filtering, selection)

2. Query Cache → Find Candidates
   For each component:
     a. Exact match: component hash matches cached fragment
     b. Semantic match: embedding similarity > 0.7
     c. Type match: same block type, any binding

3. Score Candidates → Rank by Fitness
   For each candidate fragment:
     score =
       (0.4 × intentSimilarity) +        // How well it matches intent
       (0.3 × dataCompatibility) +       // Binding fields available
       (0.2 × coherenceWithOthers) +     // Compatible with other selections
       (0.1 × recency)                   // Recently used/validated

4. Select Optimal Set → Maximize Coverage
   Use greedy algorithm:
     a. Sort candidates by score (descending)
     b. While coverage < 0.9 and conflicts < threshold:
        - Add highest-scored unused fragment
        - Update coverage
        - Check for new conflicts
        - Recalculate scores for remaining candidates
     c. Return selected set

5. Validate Set → Check Viability
   If coverage < 0.7 OR blocking conflicts exist:
     → Escalate to LLM tier (§13.4)
   Else:
     → Proceed to compatibility checking
```

**Coverage calculation:**

```typescript
function calculateCoverage(
  intent: UserIntent,
  fragments: CachedFragment[]
): number {
  const required = intent.components;
  const provided = fragments.flatMap(f => f.blocks.map(b => b.type));

  let covered = 0;
  for (const req of required) {
    if (provided.includes(req.type) &&
        hasCompatibleBinding(req, provided)) {
      covered++;
    }
  }

  return covered / required.length;
}
```

#### 15.2.2 Compatibility Checking

**From ISS-004 resolution**

Before merging, validate that fragments can coexist:

```typescript
interface CompatibilityChecker {
  check(fragments: CachedFragment[]): CompatibilityResult;
}

interface CompatibilityResult {
  compatible: boolean;
  checks: {
    bindings: CheckResult;
    signals: CheckResult;
    layout: CheckResult;
    types: CheckResult;
  };
  repairs: Repair[];
}

interface CheckResult {
  pass: boolean;
  confidence: number;
  issues: Issue[];
}

interface Repair {
  type: 'binding' | 'signal' | 'layout';
  scope: 'micro-llm' | 'rule-based' | 'user-prompt';
  cost: number;              // Token cost estimate
  fix: RepairOperation;
}
```

**Compatibility checks (executed in parallel):**

**1. Binding Compatibility**

```typescript
function checkBindingCompatibility(
  fragments: CachedFragment[],
  dataFingerprint: DataFingerprint
): CheckResult {
  const issues: Issue[] = [];

  for (const fragment of fragments) {
    for (const block of fragment.blocks) {
      if (!block.binding) continue;

      // Check: All bound fields exist in data
      for (const field of block.binding.fields) {
        if (!dataFingerprint.hasField(field.field)) {
          issues.push({
            type: 'missing-field',
            field: field.field,
            block: block.uid,
            severity: 'blocking',
            repair: { type: 'binding', scope: 'micro-llm' }
          });
        }

        // Check: Field type compatible with binding slot
        const dataType = dataFingerprint.getFieldType(field.field);
        const slotType = getRequiredType(field.target);
        if (!isTypeCompatible(dataType, slotType)) {
          issues.push({
            type: 'type-mismatch',
            field: field.field,
            expected: slotType,
            actual: dataType,
            severity: 'warning',
            repair: { type: 'binding', scope: 'rule-based' }
          });
        }
      }

      // Check: Aggregations are consistent
      const sameFieldBindings = findBindingsForField(
        fragments,
        block.binding.fields[0].field
      );

      if (sameFieldBindings.length > 1) {
        const aggregations = sameFieldBindings.map(b => b.aggregate);
        if (new Set(aggregations).size > 1) {
          issues.push({
            type: 'inconsistent-aggregation',
            field: block.binding.fields[0].field,
            aggregations: aggregations,
            severity: 'warning',
            repair: { type: 'binding', scope: 'rule-based' }
          });
        }
      }
    }
  }

  return {
    pass: issues.filter(i => i.severity === 'blocking').length === 0,
    confidence: 1 - (issues.length * 0.15),
    issues
  };
}
```

**2. Signal Compatibility**

```typescript
function checkSignalCompatibility(
  fragments: CachedFragment[]
): CheckResult {
  const issues: Issue[] = [];
  const allSignals = new Map<string, SignalDefinition[]>();

  // Collect all signal declarations
  for (const fragment of fragments) {
    if (!fragment.signals) continue;
    for (const [name, def] of Object.entries(fragment.signals)) {
      if (!allSignals.has(name)) {
        allSignals.set(name, []);
      }
      allSignals.get(name)!.push({ ...def, source: fragment.uid });
    }
  }

  // Check for conflicts
  for (const [name, defs] of allSignals) {
    if (defs.length > 1) {
      // Same signal declared multiple times
      const types = new Set(defs.map(d => d.type));
      if (types.size > 1) {
        issues.push({
          type: 'signal-type-conflict',
          signal: name,
          types: Array.from(types),
          severity: 'blocking',
          repair: { type: 'signal', scope: 'user-prompt' }
        });
      }

      // Check if defaults conflict
      const defaults = defs.map(d => d.default).filter(d => d !== undefined);
      if (defaults.length > 1 && !allEqual(defaults)) {
        issues.push({
          type: 'signal-default-conflict',
          signal: name,
          defaults: defaults,
          severity: 'warning',
          repair: { type: 'signal', scope: 'rule-based' }
        });
      }
    }
  }

  // Check for orphaned signal receivers
  const declared = new Set(allSignals.keys());
  const emitted = new Set<string>();
  const received = new Set<string>();

  for (const fragment of fragments) {
    for (const block of fragment.blocks) {
      block.signals?.emits?.forEach(e => emitted.add(e.signal));
      block.signals?.receives?.forEach(r => received.add(r.signal));
    }
  }

  for (const signal of received) {
    if (!declared.has(signal) && !emitted.has(signal)) {
      issues.push({
        type: 'orphaned-receiver',
        signal: signal,
        severity: 'blocking',
        repair: { type: 'signal', scope: 'rule-based' }
      });
    }
  }

  return {
    pass: issues.filter(i => i.severity === 'blocking').length === 0,
    confidence: 1 - (issues.length * 0.2),
    issues
  };
}
```

**3. Layout Compatibility**

```typescript
function checkLayoutCompatibility(
  fragments: CachedFragment[]
): CheckResult {
  const issues: Issue[] = [];
  const blockCount = fragments.reduce((sum, f) => sum + f.blocks.length, 0);

  // Check: Block count fits in inferred layout
  const layout = inferLayout(fragments);
  const capacity = calculateCapacity(layout);

  if (blockCount > capacity) {
    issues.push({
      type: 'insufficient-capacity',
      required: blockCount,
      available: capacity,
      severity: 'warning',
      repair: { type: 'layout', scope: 'rule-based' }
    });
  }

  // Check: Relationship constraints are satisfiable
  const relationships = fragments.flatMap(f =>
    f.blocks
      .filter(b => b.layout?.relationship)
      .map(b => b.layout!.relationship!)
  );

  for (const rel of relationships) {
    if (rel.with) {
      const allUids = new Set(fragments.flatMap(f => f.blocks.map(b => b.uid)));
      const missingRefs = rel.with.filter(uid => !allUids.has(uid));

      if (missingRefs.length > 0) {
        issues.push({
          type: 'broken-relationship',
          relationship: rel.type,
          missingBlocks: missingRefs,
          severity: 'warning',
          repair: { type: 'layout', scope: 'rule-based' }
        });
      }
    }
  }

  return {
    pass: true,  // Layout issues are rarely blocking
    confidence: 1 - (issues.length * 0.1),
    issues
  };
}
```

**4. Type Compatibility**

```typescript
function checkTypeCompatibility(
  fragments: CachedFragment[]
): CheckResult {
  const issues: Issue[] = [];

  // Check: No duplicate block types where uniqueness expected
  const typeCount = new Map<BlockType, number>();
  for (const fragment of fragments) {
    for (const block of fragment.blocks) {
      typeCount.set(block.type, (typeCount.get(block.type) || 0) + 1);
    }
  }

  // Some block types should be unique (e.g., date-filter in same scope)
  const uniqueTypes: BlockType[] = ['date-filter', 'search-input'];
  for (const type of uniqueTypes) {
    if ((typeCount.get(type) || 0) > 1) {
      issues.push({
        type: 'duplicate-unique-type',
        blockType: type,
        count: typeCount.get(type),
        severity: 'warning',
        repair: { type: 'layout', scope: 'rule-based' }
      });
    }
  }

  return {
    pass: true,
    confidence: 1 - (issues.length * 0.05),
    issues
  };
}
```

**Overall compatibility decision:**

```typescript
function decideCompatibility(result: CompatibilityResult): Decision {
  const blockingIssues = Object.values(result.checks)
    .flatMap(c => c.issues)
    .filter(i => i.severity === 'blocking');

  if (blockingIssues.length > 0) {
    // Check if all blocking issues are repairable
    const unrepairable = blockingIssues.filter(i => !i.repair || i.repair.scope === 'user-prompt');

    if (unrepairable.length > 0) {
      return { proceed: false, reason: 'unrepairable-conflicts', escalate: 'llm' };
    }

    // Estimate repair cost
    const totalCost = result.repairs.reduce((sum, r) => sum + r.cost, 0);
    if (totalCost > 20) {  // Token budget threshold
      return { proceed: false, reason: 'expensive-repairs', escalate: 'llm' };
    }

    return { proceed: true, requiresRepair: true, repairs: result.repairs };
  }

  // Check overall confidence
  const avgConfidence = Object.values(result.checks)
    .reduce((sum, c) => sum + c.confidence, 0) / Object.keys(result.checks).length;

  if (avgConfidence < 0.7) {
    return { proceed: false, reason: 'low-confidence', escalate: 'llm' };
  }

  return { proceed: true, requiresRepair: false };
}
```

#### 15.2.3 Fragment Merging Algorithm

**From ISS-004 resolution**

Once compatibility is verified, merge fragments into a single schema:

```typescript
interface FragmentMerger {
  merge(
    fragments: CachedFragment[],
    repairs: Repair[],
    intent: UserIntent
  ): LiquidSchema;
}
```

**Merging process:**

```
1. Initialize Schema Structure
   schema = {
     version: '2.0',
     scope: 'interface',
     uid: generateUID('s_'),
     title: deriveTitle(intent),
     generatedAt: new Date().toISOString(),
     blocks: [],
     signals: {},
   }

2. Merge Signal Registries
   For each fragment:
     For each signal in fragment.signals:
       If signal not in schema.signals:
         → Add signal definition
       Else:
         → Resolve conflict using precedence rules:
           a. Explicit intent wins
           b. More specific type wins
           c. Non-null default wins
           d. First declaration wins (stable)

3. Collect All Blocks
   allBlocks = []
   For each fragment:
     For each block in fragment.blocks:
       → Regenerate UID (to avoid collisions)
       → Preserve relative references (update relationship.with)
       → Add to allBlocks

4. Apply Repairs
   For each repair in repairs:
     If repair.type === 'binding':
       → Execute binding fix (micro-LLM or rule-based)
     If repair.type === 'signal':
       → Execute signal fix (add declaration, update reference)
     If repair.type === 'layout':
       → Execute layout fix (update relationship, remove broken refs)

5. Infer Combined Layout (§15.3)
   layout = inferLayout(allBlocks, intent)
   schema.layout = layout

6. Apply Auto-Wiring (§15.4)
   For each interactive block in allBlocks:
     For each data block in allBlocks:
       If shouldAutoWire(interactive, data):
         → Add signal connection
         → Ensure signal is declared

7. Ensure Binding Coherence (§15.5)
   For each unique field used across blocks:
     If multiple aggregations:
       → Normalize to most common aggregation
     If scale mismatches in same row:
       → Flag for L2 polish

8. Assign Block Positions
   positions = assignPositions(allBlocks, layout)
   For each block, position in positions:
     → Update block metadata (for addressing)

9. Validate Merged Schema
   validatedSchema = LiquidSchemaSchema.parse(schema)
   If validation fails:
     → Log error with context
     → Escalate to LLM tier

10. Return Merged Schema
    Return validatedSchema with explainability metadata:
      - source: 'composition'
      - confidence: min(compatibilityConfidence, 0.95)
      - sourceFragments: fragment UIDs
```

**Signal merging precedence:**

```typescript
function mergeSignalDefinitions(
  existing: SignalDefinition,
  incoming: SignalDefinition,
  intent: UserIntent
): SignalDefinition {
  return {
    // Type: More specific wins
    type:
      incoming.type !== 'custom' ? incoming.type : existing.type,

    // Default: Non-null wins, or use incoming
    default:
      incoming.default !== undefined ? incoming.default : existing.default,

    // Persist: More persistent wins (url > session > local > none)
    persist:
      comparePersistence(incoming.persist, existing.persist) > 0
        ? incoming.persist
        : existing.persist,

    // Validation: Combine (AND logic)
    validation:
      existing.validation && incoming.validation
        ? `(${existing.validation}) && (${incoming.validation})`
        : existing.validation || incoming.validation,
  };
}

function comparePersistence(a?: PersistStrategy, b?: PersistStrategy): number {
  const order = { 'url': 3, 'session': 2, 'local': 1, 'none': 0 };
  return (order[a || 'none'] || 0) - (order[b || 'none'] || 0);
}
```

**Position assignment:**

```typescript
function assignPositions(
  blocks: Block[],
  layout: LayoutBlock
): Map<string, GridPosition> {
  const positions = new Map<string, GridPosition>();

  if (layout.type === 'grid') {
    // Use layout inference rules (§15.3)
    const { rows, cols } = inferGridDimensions(blocks);

    // Sort blocks by priority for placement
    const sorted = [...blocks].sort((a, b) =>
      (a.layout?.priority || 2) - (b.layout?.priority || 2)
    );

    let row = 0, col = 0;
    for (const block of sorted) {
      const span = block.layout?.span || { columns: 1, rows: 1 };

      positions.set(block.uid, { row, col });

      // Advance position
      col += (typeof span.columns === 'number' ? span.columns : 1);
      if (col >= cols) {
        col = 0;
        row++;
      }
    }
  } else if (layout.type === 'stack') {
    // Vertical stacking, simple
    blocks.forEach((block, index) => {
      positions.set(block.uid, { row: index, col: 0 });
    });
  }

  return positions;
}
```

**Auto-wiring decision:**

```typescript
function shouldAutoWire(
  interactive: Block,
  data: Block
): boolean {
  // Rules from §15.4

  if (interactive.type === 'date-filter' && isTimeSeriesBlock(data)) {
    return true;
  }

  if (interactive.type === 'select-filter' && data.binding?.groupBy) {
    // Check if select-filter options match groupBy field
    const filterField = interactive.binding?.fields[0]?.field;
    const groupByField = data.binding.groupBy[0];
    return filterField === groupByField;
  }

  if (interactive.type === 'search-input' && data.type === 'data-table') {
    return true;
  }

  return false;
}

function isTimeSeriesBlock(block: Block): boolean {
  if (!block.binding) return false;

  return block.binding.fields.some(f =>
    f.target === 'x' &&
    f.field.match(/date|time|timestamp|created_at|updated_at/i)
  );
}
```

### 15.3 Layout Inference

From block count and types, infer layout:

| Block Composition | Inferred Layout |
|-------------------|-----------------|
| 2-4 KPIs | Single row |
| KPIs + 1 chart | KPI row + chart below |
| KPIs + 2 charts | KPI row + 2-col chart row |
| KPIs + charts + table | 3-row grid |
| All charts | Responsive grid |

### 15.4 Signal Auto-Wiring

When composing fragments with interactive blocks:

| Interactive Block | Target Blocks | Auto-Wire |
|-------------------|---------------|-----------|
| date-filter | All time-series | @dateRange |
| select-filter | Blocks with matching groupBy | @filter |
| search-input | Tables | @search |

### 15.5 Binding Coherence

Ensure composed fragments share consistent bindings:

```
Rule: If multiple blocks use same field, use same aggregation
Rule: If blocks are in same row, likely related—use compatible scales
Rule: If filter exists, all data blocks should receive it
```

### 15.6 Partial Fragment Matching

**From ISS-099 resolution**

When no single fragment fully satisfies the intent, the engine MAY compose from multiple partial fragments or fall back to LLM generation.

#### 15.6.1 Match Scoring

```typescript
interface FragmentMatchScore {
  fragment: CachedFragment;
  coverage: number;              // 0-1: what % of requirements are met
  compatibility: number;         // 0-1: how well it fits context
  adaptation: number;            // 0-1: ease of adaptation (1 = no changes)
  overall: number;               // Weighted composite score
  requirements: RequirementMatch[];
}

interface RequirementMatch {
  requirement: IntentRequirement;
  met: boolean;
  partial: boolean;
  confidence: number;
}

interface IntentRequirement {
  type: 'block_type' | 'binding_field' | 'signal' | 'layout' | 'archetype';
  value: any;
  optional: boolean;
  weight: number;                // Importance (0-1)
}

function scoreFragmentMatch(
  fragment: CachedFragment,
  requirements: IntentRequirement[],
  context: DataFingerprint
): FragmentMatchScore {
  const reqMatches: RequirementMatch[] = [];
  let totalWeight = 0;
  let metWeight = 0;
  let partialWeight = 0;

  for (const req of requirements) {
    totalWeight += req.weight;
    const match = evaluateRequirement(fragment, req, context);
    reqMatches.push(match);

    if (match.met) {
      metWeight += req.weight;
    } else if (match.partial) {
      partialWeight += req.weight * match.confidence;
    }
  }

  const coverage = totalWeight > 0 ? (metWeight + partialWeight) / totalWeight : 0;
  const compatibility = assessCompatibility(fragment, context);
  const adaptation = calculateAdaptationCost(fragment, requirements);

  // Weighted composite score
  const overall = (
    coverage * 0.5 +
    compatibility * 0.3 +
    adaptation * 0.2
  );

  return {
    fragment,
    coverage,
    compatibility,
    adaptation,
    overall,
    requirements: reqMatches,
  };
}
```

#### 15.6.2 Partial Match Thresholds

| Overall Score | Strategy | Example |
|---------------|----------|---------|
| ≥ 0.85 | Use fragment directly | Exact match or trivial adaptation |
| 0.70 - 0.85 | Adapt fragment | Change 1-2 bindings, adjust layout |
| 0.50 - 0.70 | Compose from partials | Combine 2-3 fragments |
| 0.30 - 0.50 | Hybrid (partial + LLM) | Use fragment base, LLM fills gaps |
| < 0.30 | Generate from scratch | No useful fragments found |

#### 15.6.3 Composition Algorithm

When multiple fragments each partially match:

```typescript
interface CompositionCandidate {
  fragments: FragmentMatchScore[];
  combinedCoverage: number;      // Total requirements covered
  coherence: number;             // How well fragments fit together
  cost: number;                  // Composition complexity
  score: number;                 // Overall viability
}

function findBestComposition(
  requirements: IntentRequirement[],
  context: DataFingerprint,
  fragmentPool: CachedFragment[]
): CompositionCandidate | null {
  // Score all fragments individually
  const scored = fragmentPool
    .map(f => scoreFragmentMatch(f, requirements, context))
    .filter(s => s.coverage > 0.3);  // Ignore low-coverage fragments

  // Try single fragment first
  const best = scored.sort((a, b) => b.overall - a.overall)[0];
  if (best && best.overall >= 0.7) {
    return {
      fragments: [best],
      combinedCoverage: best.coverage,
      coherence: 1.0,              // Single fragment = perfect coherence
      cost: 1 - best.adaptation,
      score: best.overall,
    };
  }

  // Try combinations of 2-3 fragments
  const combinations = generateCombinations(scored, 3);

  return combinations
    .map(combo => scoreCombination(combo, requirements, context))
    .filter(c => c.score > 0.5)
    .sort((a, b) => b.score - a.score)[0] || null;
}

function scoreCombination(
  fragments: FragmentMatchScore[],
  requirements: IntentRequirement[],
  context: DataFingerprint
): CompositionCandidate {
  // Calculate combined coverage
  const coveredReqs = new Set<string>();
  for (const frag of fragments) {
    for (const reqMatch of frag.requirements) {
      if (reqMatch.met || reqMatch.partial) {
        coveredReqs.add(reqMatch.requirement.type + ':' + reqMatch.requirement.value);
      }
    }
  }
  const combinedCoverage = coveredReqs.size / requirements.length;

  // Calculate coherence (how well fragments work together)
  const coherence = assessCoherence(fragments, context);

  // Calculate composition cost (complexity of merging)
  const cost = calculateCompositionCost(fragments);

  // Weighted score
  const score = (
    combinedCoverage * 0.5 +
    coherence * 0.3 +
    (1 - cost) * 0.2
  );

  return {
    fragments,
    combinedCoverage,
    coherence,
    cost,
    score,
  };
}
```

#### 15.6.4 Coherence Assessment

Check if fragments can be combined meaningfully:

```typescript
function assessCoherence(
  fragments: FragmentMatchScore[],
  context: DataFingerprint
): number {
  let coherenceScore = 1.0;

  // Check 1: Binding compatibility
  const allBindings = fragments.flatMap(f =>
    f.fragment.blocks.flatMap(b => b.binding?.fields || [])
  );
  const fieldConflicts = findFieldConflicts(allBindings);
  coherenceScore -= fieldConflicts.length * 0.1;

  // Check 2: Signal compatibility
  const allSignals = fragments.flatMap(f =>
    Object.keys(f.fragment.signals || {})
  );
  const signalConflicts = findSignalConflicts(allSignals);
  coherenceScore -= signalConflicts.length * 0.15;

  // Check 3: Layout compatibility
  const layoutConflict = hasLayoutConflict(fragments);
  if (layoutConflict) coherenceScore -= 0.3;

  // Check 4: Archetype alignment
  const archetypes = fragments
    .map(f => f.fragment.archetype)
    .filter(a => a);
  if (new Set(archetypes).size > 1) coherenceScore -= 0.2;

  return Math.max(0, coherenceScore);
}

interface FieldConflict {
  field: string;
  bindings: FieldBinding[];
  conflict: 'different_targets' | 'different_transforms' | 'different_aggregations';
}

function findFieldConflicts(bindings: FieldBinding[]): FieldConflict[] {
  const conflicts: FieldConflict[] = [];
  const byField = new Map<string, FieldBinding[]>();

  for (const binding of bindings) {
    const existing = byField.get(binding.field) || [];
    existing.push(binding);
    byField.set(binding.field, existing);
  }

  for (const [field, fieldBindings] of byField) {
    if (fieldBindings.length <= 1) continue;

    // Check if all bindings use field consistently
    const targets = new Set(fieldBindings.map(b => b.target));
    const transforms = new Set(fieldBindings.map(b => b.transform || 'none'));

    if (targets.size > 1) {
      conflicts.push({
        field,
        bindings: fieldBindings,
        conflict: 'different_targets',
      });
    } else if (transforms.size > 1) {
      conflicts.push({
        field,
        bindings: fieldBindings,
        conflict: 'different_transforms',
      });
    }
  }

  return conflicts;
}
```

#### 15.6.5 Composition Cost

Estimate complexity of merging fragments:

```typescript
function calculateCompositionCost(fragments: FragmentMatchScore[]): number {
  let cost = 0;

  // Base cost: number of fragments to merge
  cost += (fragments.length - 1) * 0.2;

  // Layout merging complexity
  const layouts = fragments.map(f => f.fragment.layout?.type).filter(Boolean);
  if (new Set(layouts).size > 1) {
    cost += 0.3;  // Different layout types = expensive merge
  }

  // Signal wiring complexity
  const totalSignals = fragments.reduce(
    (sum, f) => sum + Object.keys(f.fragment.signals || {}).length,
    0
  );
  cost += Math.min(totalSignals * 0.05, 0.3);

  // Block count complexity
  const totalBlocks = fragments.reduce(
    (sum, f) => sum + f.fragment.blocks.length,
    0
  );
  if (totalBlocks > 10) cost += 0.2;

  return Math.min(cost, 1.0);
}
```

#### 15.6.6 Fallback Decision Tree

```typescript
function selectResolutionStrategy(
  requirements: IntentRequirement[],
  context: DataFingerprint,
  fragmentPool: CachedFragment[]
): ResolutionStrategy {
  const composition = findBestComposition(requirements, context, fragmentPool);

  if (!composition) {
    return { type: 'llm', reason: 'No viable fragments found' };
  }

  if (composition.score >= 0.85) {
    return {
      type: 'use_fragment',
      fragments: composition.fragments,
      reason: 'High-confidence match',
    };
  }

  if (composition.score >= 0.7) {
    return {
      type: 'adapt_fragment',
      fragments: composition.fragments,
      reason: 'Good match with minor adaptations',
    };
  }

  if (composition.score >= 0.5 && composition.coherence >= 0.7) {
    return {
      type: 'compose',
      fragments: composition.fragments,
      reason: 'Coherent partial fragments available',
    };
  }

  if (composition.score >= 0.4 && composition.combinedCoverage >= 0.6) {
    return {
      type: 'hybrid',
      fragments: composition.fragments,
      reason: 'Partial fragments cover most requirements, LLM fills gaps',
    };
  }

  return {
    type: 'llm',
    reason: `Fragment composition score too low (${composition.score.toFixed(2)})`,
  };
}

type ResolutionStrategy =
  | { type: 'use_fragment'; fragments: FragmentMatchScore[]; reason: string }
  | { type: 'adapt_fragment'; fragments: FragmentMatchScore[]; reason: string }
  | { type: 'compose'; fragments: FragmentMatchScore[]; reason: string }
  | { type: 'hybrid'; fragments: FragmentMatchScore[]; reason: string }
  | { type: 'llm'; reason: string };
```

#### 15.6.7 Partial Match Examples

**Example 1: High partial coverage, use fragment**
```typescript
// Intent: "Show revenue KPI and orders chart"
// Fragment: "Revenue KPI, orders KPI, revenue line chart"
// Match: 2/2 requirements met + 1 extra block
// Coverage: 1.0, Coherence: 1.0
// Strategy: use_fragment (trim extra KPI)
```

**Example 2: Complementary fragments, compose**
```typescript
// Intent: "Dashboard with KPIs and table"
// Fragment A: "3 KPIs in row"
// Fragment B: "Data table with filters"
// Match: A covers KPIs (0.5), B covers table (0.5)
// Combined coverage: 1.0, Coherence: 0.9 (same data source)
// Strategy: compose (merge into grid layout)
```

**Example 3: Partial fragment + LLM, hybrid**
```typescript
// Intent: "Sales dashboard with forecast chart"
// Fragment: "Sales KPIs and historical trend chart"
// Match: Covers KPIs and one chart (0.6 coverage)
// Missing: forecast chart (novel requirement)
// Strategy: hybrid (use fragment, LLM generates forecast chart)
```

**Example 4: Low coherence, fall back to LLM**
```typescript
// Intent: "Product analytics dashboard"
// Fragment A: "Financial KPIs" (archetype: overview)
// Fragment B: "User engagement funnel" (archetype: funnel)
// Match: Different domains, conflicting archetypes
// Coherence: 0.3
// Strategy: llm (fragments too different to merge meaningfully)
```

---

## Integration Points

The complete composition algorithm integrates with:

1. **§13.3 (Tiered Resolution):** Composition is Tier 3, invoked when cache miss and semantic search insufficient
2. **§14.2 (Fragment Storage):** Fragments retrieved via `FragmentStorage.search()`
3. **§15.3 (Layout Inference):** Used in merge step 5
4. **§15.4 (Signal Auto-Wiring):** Used in merge step 6
5. **§15.5 (Binding Coherence):** Used in merge step 7
6. **Appendix B.5 (Coherence Gate):** Compatibility checking implements coherence gate requirements

---

## Algorithm Properties

**Time Complexity:**
- Fragment selection: O(n log n) where n = cached fragments
- Compatibility checking: O(f × b) where f = fragments, b = blocks per fragment
- Merging: O(f × b)
- Total: O(n log n + f²b) ≈ O(n log n) for typical cases

**Space Complexity:** O(f × b) for storing intermediate results

**Success Rate (Expected):**
- Coverage ≥ 0.9: 85% of composition attempts
- Repairable conflicts: 90% of incompatible sets
- Overall composition success: ~75% of Tier 3 attempts

**Fallback:** If composition fails (coverage < 0.7 or unrepairable conflicts), escalate to Tier 4 (LLM generation).

---

*End of Part 2C*
