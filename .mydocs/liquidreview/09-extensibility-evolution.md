# Extensibility and Evolution Review

**Reviewer:** Claude Opus 4.5
**Date:** 2025-12-21
**Documents Analyzed:**
- LiquidCode Specification v2.0
- PRD Liquid Engine v2
- LiquidCode Rationale v2.0

---

## Executive Summary

**Overall Extensibility Assessment:** 7.5/10 - Strong foundation with notable gaps

LiquidCode v2 demonstrates thoughtful platform thinking with several well-designed extension points (custom block types, adapter interface, pluggable storage). However, thinking 5 years ahead reveals critical gaps in schema evolution, signal type extensibility, and LLM model independence. The system is designed for extension but not for *evolution*—there's insufficient machinery for migrating between versions, deprecating features, or handling breaking changes gracefully.

**Key Strengths:**
- Block type extensibility via `custom:${string}` pattern
- Clean adapter interface enabling platform diversity
- Tiered resolution allows swapping cache/LLM implementations
- Hardening spec addresses many production concerns

**Critical Gaps:**
- No signal type extension mechanism beyond `custom`
- No binding slot registration for custom blocks
- Weak schema migration strategy (just version field)
- LLM coupling in discovery/resolution layers
- No operator extensibility in interface algebra

**5-Year Outlook:**
In 5 years, the biggest pressures will be:
1. New interaction patterns (voice, gesture, AR/VR) requiring new signal types
2. Domain-specific block ecosystems needing custom binding slots
3. LLM architecture shifts (e.g., multimodal, agentic) requiring adapter changes
4. Breaking changes in core primitives as edge cases emerge

Without evolution machinery, these will require hard forks rather than graceful upgrades.

---

## Extension Points (Well Designed)

### Extension Point 1: Block Type Extensibility

**Mechanism:**
- `type: BlockType = 'kpi' | 'bar-chart' | ... | custom:${string}`
- Custom types use prefix pattern: `custom:my-gantt-chart`
- Catalog registration via `engine.catalog.register()`

**Use Case:**
- Domain-specific visualizations (e.g., `custom:medical-timeline`, `custom:network-graph`)
- Industry components (e.g., `custom:trading-candlestick`, `custom:seismic-waveform`)
- Experimental types before promotion to core

**Assessment:** ✅ **Good**

**Strengths:**
- Clear namespace separation (`custom:` prefix prevents collisions)
- Zero engine changes needed for new types
- Adapters can implement or render placeholders
- Catalog registration is simple and documented

**Concerns:**
- No standard for "promoting" custom to core
  - When does `custom:gantt` become `gantt`?
  - How to migrate existing schemas using `custom:gantt`?
  - Is there a graduation process?

- No block versioning within custom types
  - What if `custom:gantt-v2` has different bindings than `custom:gantt`?
  - No machinery to express "this custom block requires adapter version ≥X"

- No composition of block behaviors
  - Can't say "this custom block is like kpi + chart"
  - Every custom type starts from scratch

**Recommendations:**
1. Add `BlockTypeMetadata` with version, dependencies, promotion status:
   ```typescript
   interface BlockTypeMetadata {
     type: BlockType;
     version: string;
     status: 'experimental' | 'stable' | 'deprecated' | 'promoted';
     promotedTo?: BlockType;  // If promoted from custom:foo to foo
     deprecationDate?: string;
     replacement?: BlockType;
   }
   ```

2. Define custom block graduation criteria:
   - Adoption threshold (N adapters implement it)
   - Stability period (no breaking changes for X months)
   - Community vote or maintainer approval

3. Add block capability inheritance:
   ```typescript
   interface CustomBlockSpec {
     type: 'custom:gantt';
     extends?: 'chart';  // Inherits chart binding slots
     additionalSlots?: BindingSlot[];
   }
   ```

---

### Extension Point 2: Adapter Interface

**Mechanism:**
- Clean contract defined in `LiquidAdapter<RenderOutput>`
- Metadata declaration of capabilities
- Conformance test suite for validation
- Platform-agnostic schema design

**Use Case:**
- Rendering to new platforms (Flutter, SwiftUI, Qt, Python/tkinter)
- Alternative rendering strategies (SVG, Canvas, WebGL)
- Non-visual adapters (audio descriptions, API spec generation)

**Assessment:** ✅ **Excellent**

**Strengths:**
- Well-bounded interface (7 methods, clear responsibilities)
- Generic type parameter allows any output type
- Metadata enables capability negotiation
- Conformance tests ensure quality
- No React/web assumptions in core schema

**Concerns:**
- No adapter capability versioning
  - If adapter interface adds optional method, how do old adapters declare incompatibility?
  - No way to say "I implement adapter spec v2.1"

- Layout resolution is tightly coupled
  - `resolveLayout()` assumes grid/breakpoint model
  - Alternative layout paradigms (e.g., constraint-based iOS auto-layout) may not map well

- No adapter composition
  - Can't chain adapters (e.g., LiquidSchema → SVG adapter → PNG adapter)
  - Can't wrap adapters (e.g., accessibility wrapper around any adapter)

**Recommendations:**
1. Add adapter versioning:
   ```typescript
   interface AdapterMetadata {
     name: string;
     version: string;
     adapterSpecVersion: string;  // "2.0", "2.1", etc.
     // ... existing fields
   }
   ```

2. Make layout resolution pluggable:
   ```typescript
   interface LayoutStrategy {
     name: string;
     resolve(blocks: Block[], context: SlotContext): LayoutResolution;
   }

   interface LiquidAdapter<T> {
     // ... existing methods
     readonly layoutStrategy?: LayoutStrategy;  // Optional override
   }
   ```

3. Enable adapter composition:
   ```typescript
   interface AdapterPipeline<A, B, C> {
     adapters: [LiquidAdapter<A>, Adapter<A, B>, Adapter<B, C>];
     execute(schema: LiquidSchema): C;
   }
   ```

---

### Extension Point 3: Pluggable Storage (Cache/LLM/Telemetry)

**Mechanism:**
- Storage abstraction: `FragmentStorage` interface
- LLM provider abstraction: `LLMProvider` interface
- Configuration-based injection:
  ```typescript
  new LiquidEngine({
    cache: new RedisFragmentStorage(...),
    llm: new AnthropicProvider(...),
    telemetry: new DatadogTelemetry()
  })
  ```

**Use Case:**
- Enterprise infrastructure integration
- Multi-cloud deployments
- Cost optimization via provider switching
- Compliance requirements (on-prem LLM, data residency)

**Assessment:** ✅ **Good**

**Strengths:**
- Clean separation of concerns
- Enables testing with mocks
- Multiple implementations documented
- Configuration over coding

**Concerns:**
- No storage migration tooling
  - How to migrate cache from Redis to S3?
  - How to replay fragments from old storage to new?

- No LLM provider abstraction leakage detection
  - Different LLMs have different tokenization
  - Token budgets assume specific tokenizer
  - No validation that "35 tokens" is actually 35 on this provider

- No telemetry schema versioning
  - If telemetry events change, downstream consumers break
  - No opt-in to "v2 telemetry format"

**Recommendations:**
1. Add storage migration toolkit:
   ```typescript
   interface StorageMigration {
     from: FragmentStorage;
     to: FragmentStorage;
     migrate(options: MigrationOptions): Promise<MigrationResult>;
     validate(): Promise<ValidationReport>;
   }
   ```

2. Add tokenization verification:
   ```typescript
   interface LLMProvider {
     tokenize(text: string): number;  // Required

     verify(liquidCode: string, expectedMax: number): {
       actual: number;
       withinBudget: boolean;
       recommendation?: string;
     };
   }
   ```

3. Version telemetry events:
   ```typescript
   interface TelemetryEvent {
     version: string;  // "2.0"
     name: string;
     timestamp: string;
     payload: unknown;
   }
   ```

---

### Extension Point 4: Discovery Engine Archetypes

**Mechanism:**
- Archetype pattern matching
- UOM primitive inference
- Intent prediction from data fingerprints
- Pre-generation strategies

**Use Case:**
- Domain-specific dashboard patterns (medical, financial, logistics)
- Industry-specific primitives (FHIR resources, GAAP accounts)
- Organizational archetypes (company-specific templates)

**Assessment:** ⚠️ **Concerns**

**Strengths:**
- Pattern-based, not hardcoded
- Pluggable archetype definitions
- Learning from usage via cache

**Concerns:**
- No archetype versioning or migration
  - If archetype definition changes, old cached fragments invalid
  - No way to say "this fragment was generated with archetype v1"

- No archetype composition
  - Can't say "this is overview + time_series hybrid"
  - Either/or classification, not multi-label

- Tight coupling to tabular data model
  - Assumes columns, rows, fields
  - Doesn't extend to graph data, spatial data, event streams

- No extension API documented
  - Spec says "users can add archetypes" but doesn't show how
  - Is it `engine.discovery.registerArchetype()`?

**Recommendations:**
1. Document archetype extension API:
   ```typescript
   interface Archetype {
     name: string;
     version: string;
     pattern: DataPattern;
     prediction: (fingerprint: DataFingerprint) => IntentPrediction[];
     defaultSchema: (data: any) => Partial<LiquidSchema>;
   }

   engine.discovery.registerArchetype(archetype);
   ```

2. Enable archetype composition:
   ```typescript
   interface CompositeArchetype {
     name: string;
     archetypes: string[];  // ['overview', 'time_series']
     mergeStrategy: 'union' | 'intersection' | 'custom';
     customMerge?: (schemas: LiquidSchema[]) => LiquidSchema;
   }
   ```

3. Generalize data model assumptions:
   ```typescript
   interface DataFingerprint {
     model: 'tabular' | 'graph' | 'spatial' | 'temporal' | 'custom';
     // Tabular-specific fields only if model === 'tabular'
     schema?: TabularSchema;
     graph?: GraphSchema;
     spatial?: SpatialSchema;
   }
   ```

---

## Extension Gaps (Missing Mechanisms)

### Gap 1: Signal Type Extensibility

**Need:** Custom signal types for domain-specific interactions

**Current State:**
- Fixed set: `dateRange`, `selection`, `filter`, `search`, `pagination`, `sort`, `toggle`, `custom`
- `custom` is catch-all with no structure

**Problem:**
- Complex domains need typed custom signals:
  - Medical: `patientContext`, `diagnosisFilter`, `encounterSelection`
  - Financial: `portfolioSelection`, `timeframeComparison`, `riskThreshold`
  - Spatial: `mapBounds`, `layerToggle`, `featureSelection`

- No way to define:
  - Signal value schema (what shape is the data?)
  - Signal validation rules
  - Signal transformation functions
  - Signal serialization for persistence

**Example Failure:**
```typescript
// Want to create this:
signals: {
  patientContext: {
    type: 'custom',  // Too vague!
    default: ???,    // What shape?
    persist: 'session',
    validation: ???  // How to validate?
  }
}
```

**Recommendation:**
Add signal type registration:

```typescript
interface SignalTypeDefinition {
  name: string;
  valueSchema: z.ZodType;  // Zod schema for value
  defaultValue: unknown;
  serialize?: (value: unknown) => string;
  deserialize?: (str: string) => unknown;
  validate?: (value: unknown) => boolean;
}

// Usage
engine.signals.registerType({
  name: 'patientContext',
  valueSchema: z.object({
    patientId: z.string(),
    encounterId: z.string().optional(),
    mrn: z.string()
  }),
  defaultValue: { patientId: '', mrn: '' },
  serialize: (v) => JSON.stringify(v),
  deserialize: (s) => JSON.parse(s)
});

// Then in schema
signals: {
  patient: {
    type: 'patientContext',  // Fully typed!
    default: { patientId: '123', mrn: 'MRN-456' },
    persist: 'url'
  }
}
```

**Why This Matters (5 Years Out):**
Voice/gesture/AR interfaces will require entirely new signal types (e.g., `voiceCommand`, `gesture`, `gaze`, `spatialAnchor`). Without extensibility, these become "custom" soup with no type safety.

---

### Gap 2: Binding Slot Extensibility

**Need:** Custom blocks need custom binding slots

**Current State:**
- Fixed set of slots: `x`, `y`, `value`, `label`, `category`, `series`, `color`, etc.
- Custom block types can't define their own slots

**Problem:**
```typescript
// I create a custom Gantt chart block
catalog.register({
  type: 'custom:gantt',
  category: 'atomic',
  bindings: ???  // Can't add 'startDate', 'endDate', 'dependency' slots
});

// LiquidCode can't encode it
G$taskName$startDate$endDate  // Parser doesn't know these slots exist!
```

**Example Use Cases:**
- Gantt chart: `task`, `startDate`, `endDate`, `dependency`, `milestone`
- Network diagram: `source`, `target`, `weight`, `nodeLabel`
- Sankey diagram: `from`, `to`, `flow`, `stage`
- Timeline: `event`, `timestamp`, `duration`, `category`

**Recommendation:**
Add slot registration tied to block types:

```typescript
interface BindingSlotDefinition {
  name: string;
  required: boolean;
  valueType: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  description: string;
  examples?: string[];
}

interface CustomBlockSpec {
  type: BlockType;
  category: BlockCategory;
  slots: BindingSlotDefinition[];
  signals?: SignalSpec[];
}

// Registration
catalog.register({
  type: 'custom:gantt',
  category: 'atomic',
  slots: [
    { name: 'task', required: true, valueType: 'string', description: 'Task name' },
    { name: 'startDate', required: true, valueType: 'date', description: 'Start date' },
    { name: 'endDate', required: true, valueType: 'date', description: 'End date' },
    { name: 'dependency', required: false, valueType: 'string', description: 'Depends on task' }
  ]
});

// LiquidCode can now handle it
custom:gantt$task$startDate$endDate$dependency
```

**Why This Matters (5 Years Out):**
Domain-specific ecosystems will emerge (medical, financial, scientific). Each domain will have 20+ custom block types with specialized slots. Without slot extensibility, these can't be first-class citizens.

---

### Gap 3: Schema Migration Strategy

**Need:** Graceful evolution between schema versions

**Current State:**
- Schema has `version: "2.0"` field
- Adapters declare `supportedSchemaVersions: string[]`
- That's it. No migration machinery.

**Problem:**
```typescript
// What happens when we release v3.0 with breaking changes?
const v2Schema: LiquidSchema = loadOldDashboard();

// Option A: Reject it
if (v2Schema.version !== '3.0') {
  throw new Error('Unsupported version');  // User's dashboard is dead
}

// Option B: Try to render it
adapter.render(v2Schema, data);  // Undefined behavior, may crash
```

**Missing Machinery:**
- No migration functions (`v2 → v3`)
- No deprecation warnings
- No compatibility matrix
- No "render in compatibility mode"

**Example Scenario (5 Years Out):**
```
LiquidCode v2.0 (2025): Signals use `persist` field
LiquidCode v3.0 (2027): Signals use `storage` with new options
LiquidCode v4.0 (2029): Signals have `scope` (global/local/inherited)

User in 2030 loads a dashboard from 2025. What happens?
```

**Recommendation:**
Add migration infrastructure:

```typescript
interface SchemaMigration {
  from: string;  // "2.0"
  to: string;    // "3.0"
  migrate(schema: LiquidSchema): LiquidSchema;
  validate?(schema: LiquidSchema): ValidationResult;
  changelog: string;  // What changed
}

// Registry
const migrations: SchemaMigration[] = [
  {
    from: '2.0',
    to: '3.0',
    migrate: (schema) => {
      // Transform signals.persist → signals.storage
      const newSchema = { ...schema, version: '3.0' };
      if (schema.signals) {
        Object.values(schema.signals).forEach(sig => {
          if (sig.persist) {
            sig.storage = {
              type: sig.persist,
              ttl: sig.persist === 'session' ? 3600 : undefined
            };
            delete sig.persist;
          }
        });
      }
      return newSchema;
    },
    changelog: 'Signals: persist → storage with TTL support'
  }
];

// Engine auto-migrates
const loaded = loadSchema('dashboard-2025.json');  // version: "2.0"
const current = engine.migrate(loaded, '3.0');     // Automatic chain: 2.0 → 3.0
```

**Deprecation Warnings:**
```typescript
interface DeprecatedFeature {
  field: string;
  deprecatedIn: string;   // "3.0"
  removedIn: string;      // "4.0"
  replacement: string;
  migration: string;      // Link to migration guide
}

// When loading old schema
engine.validate(schema, { warnDeprecated: true });
// Warning: Field 'signals.*.persist' deprecated in 3.0, removed in 4.0
//          Replace with 'signals.*.storage'. See: docs.liquidcode.dev/migrate/3.0
```

**Why This Matters:**
Without migration machinery, every breaking change creates a hard fork. In 5 years, users will have dashboards created across multiple versions. Either they all break, or the system ossifies and can't evolve.

---

### Gap 4: Operator Extensibility (Interface Algebra)

**Need:** Custom mutation operators for domain workflows

**Current State:**
- Fixed set: `+` (add), `-` (remove), `→` (replace), `~` (modify), `↑` (move)
- No way to add domain-specific operations

**Problem:**
Some domains have common mutation patterns that don't map cleanly:

- **Duplicate:** `Δ*@K0` (duplicate a block)
  - Current workaround: Query block, then add with same config
  - Inefficient: 2 operations instead of 1

- **Swap:** `Δ↔@K0,@K1` (swap positions)
  - Current workaround: Move K0 to temp, move K1 to K0's spot, move K0 to K1's spot
  - Inefficient: 3 operations instead of 1

- **Batch transform:** `Δ~@K*.format:"$"` (apply to all matching)
  - Exists! (Wildcard support)
  - But no other batch operators

- **Conditional modify:** `Δ~@K0.label:if($revenue>1000,"High","Low")`
  - No conditional logic in mutations
  - Must use LiquidExpr transform on binding side

**Recommendation:**
Make operator set extensible:

```typescript
interface MutationOperator {
  symbol: string;       // '*' for duplicate
  name: string;         // 'duplicate'
  arity: number;        // How many operands
  execute(twin: DigitalTwin, operands: Operand[]): LiquidSchema;
  invert?(op: Operation): Operation;  // For undo
  syntax: string;       // LiquidCode syntax
  description: string;
}

// Registration
engine.mutations.registerOperator({
  symbol: '*',
  name: 'duplicate',
  arity: 1,  // One target
  execute: (twin, [target]) => {
    const block = resolveAddress(twin.schema, target);
    const newBlock = { ...block, uid: generateUID() };
    return addBlock(twin.schema, newBlock);
  },
  invert: (op) => ({ type: 'remove', target: op.result.uid }),
  syntax: 'Δ*@address',
  description: 'Duplicate block at address'
});

// Usage
Δ*@K0  // Duplicate first KPI
```

**Conservative Approach:**
If full extensibility is too complex, add the most common built-in operators:
- `*` Duplicate
- `↔` Swap
- `⊕` Merge (combine two blocks into one)
- `⊖` Split (split one block into multiple)

**Why This Matters:**
In 5 years, domain-specific workflows will emerge (e.g., "medical dashboard refactoring" or "financial report templating"). Custom operators enable domain DSLs built on LiquidCode.

---

### Gap 5: Transform Function Extensibility (LiquidExpr)

**Need:** Custom transform functions for domain logic

**Current State:**
- Fixed set of built-ins: `round()`, `upper()`, `currency()`, etc.
- No extension mechanism

**Problem:**
Domain-specific transforms needed:

**Medical:**
- `icd10Lookup(code)` → description
- `calculateBMI(weight, height)` → number
- `ageFromDOB(dob)` → years

**Financial:**
- `fiscalQuarter(date)` → string
- `irr(cashflows)` → number
- `sharpeRatio(returns, risk)` → number

**Scientific:**
- `siPrefix(number)` → string (1000 → "1k", 1000000 → "1M")
- `gaussianSmooth(array, sigma)` → array

**Current Workaround:**
Put this logic in adapter's data transformation layer. But then:
- It's outside the schema (not portable)
- It's not cacheable
- It's not declarative

**Recommendation:**
Allow function registration:

```typescript
interface LiquidExprFunction {
  name: string;
  arity: number | 'variadic';
  pure: boolean;  // Must be true for now
  returnType: LiquidExprType;
  paramTypes: LiquidExprType[];
  execute: (...args: any[]) => any;
  description: string;
}

// Registration
engine.transforms.registerFunction({
  name: 'fiscalQuarter',
  arity: 1,
  pure: true,
  returnType: 'string',
  paramTypes: ['date'],
  execute: (date: Date) => {
    const month = date.getMonth();
    return `Q${Math.floor(month / 3) + 1}`;
  },
  description: 'Convert date to fiscal quarter'
});

// Usage in binding
fields: [
  {
    target: 'label',
    field: 'date',
    transform: 'fiscalQuarter($date)'
  }
]
```

**Security Constraint:**
All custom functions MUST be:
- Pure (no side effects)
- Total (no exceptions, return null on error)
- Bounded (execution time limit)
- Sandboxed (no access to global state)

Validate these at registration time.

**Why This Matters:**
In 5 years, industry-specific LiquidCode packages will emerge:
- `@liquidcode/medical` with ICD/SNOMED/FHIR functions
- `@liquidcode/financial` with GAAP/IFRS functions
- `@liquidcode/scientific` with statistical functions

Without function extensibility, these can't be first-class.

---

## Evolution Risks (Breaking Changes)

### Risk 1: Signal Persistence Model Evolution

**Change:** Migrate from simple `persist` field to complex storage strategy

**Current (v2):**
```typescript
persist?: 'none' | 'url' | 'session' | 'local';
```

**Future (v3):**
```typescript
storage?: {
  type: 'none' | 'url' | 'session' | 'local' | 'database' | 'custom';
  ttl?: number;  // Time to live in seconds
  scope?: 'user' | 'organization' | 'global';
  encryption?: boolean;
  customProvider?: string;
};
```

**Breaking?:** Yes - field name changes, structure changes

**Mitigation:**
1. Accept both forms in v3.0:
   ```typescript
   persist?: 'none' | 'url' | 'session' | 'local';  // Deprecated
   storage?: StorageStrategy;  // Preferred
   ```

2. Auto-migrate `persist` to `storage` at load time

3. Deprecation warnings in v3.0-3.5

4. Remove `persist` in v4.0

**Likelihood:** High - storage requirements will evolve
**Impact:** Medium - affects all interactive interfaces
**Timeline:** 2-3 years

---

### Risk 2: Block Primitive Evolution (Four Primitives?)

**Change:** Discover that three primitives (Block, Slot, Signal) are insufficient

**Scenario:**
After 3 years, patterns emerge that don't fit cleanly:
- **Portals:** Blocks that render in multiple locations (can't be expressed with slots)
- **Shared state:** State that's not a signal but affects multiple blocks (e.g., theme)
- **Constraints:** Layout constraints that cross block boundaries

**Possible Fourth Primitive: Context**
```typescript
interface Context {
  name: string;
  scope: 'interface' | 'subtree' | 'block';
  value: unknown;
  providers: string[];  // Block UIDs that provide this context
  consumers: string[];  // Block UIDs that consume this context
}
```

**Breaking?:** Yes - core conceptual model changes

**Mitigation:**
- Context could be implemented *on top of* existing primitives (syntactic sugar)
- V2 schemas could render without understanding contexts
- But: If contexts become semantic, old schemas can't express them

**Likelihood:** Low-Medium - Three primitives are well-justified
**Impact:** Critical - Would require major rearchitecture
**Timeline:** 5+ years

**Alternative:** Resist adding primitives, instead extend signals to handle these cases
- Portals: Signal with "render location" target
- Shared state: Interface-level signals with auto-receive
- Constraints: Signal-like constraint channels

---

### Risk 3: LiquidCode Grammar Breaking Changes

**Change:** Grammar evolution for new features

**Examples:**

**Multi-dimensional bindings:**
Current: `L$date$revenue` (X=date, Y=revenue)
Future: `Heatmap$x:date$y:category$color:revenue` (3 dimensions)

**Nested mutations:**
Current: Flat operations only
Future: `Δ[@K0+L$trend, @K1~.label:"New"]` (atomic batch)

**Conditional generation:**
Current: LLM decides
Future: `K$revenue?revenue>1000` (conditional inclusion in LiquidCode)

**Breaking?:** Depends on backward compatibility

**Mitigation:**
1. Grammar versioning in schema:
   ```typescript
   interface LiquidSchema {
     version: "2.0";
     grammarVersion?: "2.1";  // Default to schema version
   }
   ```

2. Parser supports multiple grammar versions

3. Always parse to AST, then transform AST between versions

**Likelihood:** Medium - Grammar will need to evolve
**Impact:** High - Affects all tooling, adapters, examples
**Timeline:** 2-4 years

---

### Risk 4: Adapter Interface Expansion

**Change:** Add required methods to `LiquidAdapter` interface

**Scenario:**
V3 adds required support for:
- Accessibility (ARIA, screen reader)
- Performance (virtual scrolling, lazy loading)
- Advanced layout (constraint solvers, flex engines)

**Current:**
```typescript
interface LiquidAdapter<T> {
  render(schema, data): T;
  renderBlock(block, data): T;
  supports(blockType): boolean;
  renderPlaceholder(block, reason): T;
  createSignalRuntime(registry): SignalRuntime;
  readonly metadata: AdapterMetadata;
}
```

**Future:**
```typescript
interface LiquidAdapter<T> {
  // ... existing methods

  // NEW REQUIRED METHODS (breaking!)
  renderAccessible(schema, data, a11yOptions): T;
  optimizePerformance(schema, options): PerformanceConfig;
  resolveAdvancedLayout(blocks, constraints): LayoutPlan;
}
```

**Breaking?:** Yes - Existing adapters don't implement new methods

**Mitigation:**
1. Use optional methods with default implementations:
   ```typescript
   renderAccessible?(schema, data, options): T;
   ```

2. Adapter capability flags:
   ```typescript
   metadata: {
     supportsAccessibility: boolean;
     supportsPerformanceOptimization: boolean;
   }
   ```

3. Engine provides fallback if method missing

**Likelihood:** High - Adapter contract will expand
**Impact:** Medium - Breaks community adapters
**Timeline:** 1-3 years per addition

**Better Approach:**
Use capability-based design from the start:

```typescript
interface LiquidAdapter<T> {
  // Core (always required)
  render(schema, data): T;
  supports(blockType): boolean;
  metadata: AdapterMetadata;

  // Capabilities (optional)
  capabilities?: {
    accessibility?: AccessibilityAdapter<T>;
    performance?: PerformanceAdapter<T>;
    advancedLayout?: AdvancedLayoutAdapter<T>;
  };
}
```

This allows new capabilities without breaking existing adapters.

---

### Risk 5: Tiered Resolution Strategy Changes

**Change:** Add/remove/reorder resolution tiers

**Current:**
1. Cache (40%)
2. Semantic (50%)
3. Composition (9%)
4. LLM (1%)

**Possible Future (v4):**
1. Cache (40%)
2. **User history** (25%) ← NEW
3. Semantic (20%)
4. **ML model** (10%) ← NEW (local, not LLM)
5. Composition (4%)
6. LLM (1%)

**Breaking?:** Not for end users, but for internal architecture

**Problems:**
- Cache keys might change (include user context)
- Fragment format might change (include ML features)
- Performance characteristics change (new tiers have different latencies)

**Mitigation:**
- Tier system is internal implementation detail
- As long as public API (`engine.resolve()`) stays same, not breaking
- Document performance characteristics as "best effort"

**Likelihood:** High - Resolution will get smarter
**Impact:** Low (if properly abstracted)
**Timeline:** 2-3 years

---

### Risk 6: LLM Model Architecture Shift

**Change:** LLMs evolve from text-only to multimodal or agentic

**Scenario 1: Multimodal LLMs (Vision + Text)**
User provides: Screenshot + "Make it look like this" + Data

Current engine can't:
- Parse visual mockups
- Extract layout from images
- Match data to visual elements

**Scenario 2: Agentic LLMs (Tool Use)**
LLM wants to:
- Query data source directly ("What columns exist?")
- Render preview ("Show me how this looks")
- Iterate on design ("Try bar chart instead")

Current engine:
- Assumes single LLM call → LiquidCode → done
- No iteration loop
- No tool calling interface

**Breaking?:** Depends on how deeply LLM is coupled

**Current Coupling Points:**
- Discovery layer: Assumes LLM can infer from data fingerprint
- Resolution layer: Micro-LLM calls assume text prompts
- LiquidCode generation: Assumes text output

**Mitigation:**
Abstract LLM interaction:

```typescript
interface LLMProvider {
  // Current: Text → Text
  generate(prompt: string): Promise<string>;

  // Future: Multimodal → Structured
  generateMultimodal?(inputs: MultimodalInput[]): Promise<StructuredOutput>;

  // Future: Agentic
  generateWithTools?(prompt: string, tools: Tool[]): Promise<AgenticResult>;
}

interface MultimodalInput {
  type: 'text' | 'image' | 'data' | 'schema';
  content: any;
}
```

**Likelihood:** Very High - LLMs are rapidly evolving
**Impact:** High - Core value prop depends on LLM efficiency
**Timeline:** 2-3 years

**Deeper Issue:**
The whole system is optimized for **text token efficiency**. If future LLMs work differently (e.g., structured output, internal reasoning, tool use), the 114x compression might not matter.

**Example:**
```
Future LLM with structured output mode:
  Input: { data: fingerprint, intent: "overview" }
  Output: { blocks: [...], layout: "grid", signals: [...] }

This bypasses LiquidCode entirely!
```

**Recommendation:**
Position LiquidCode as:
1. **Interface specification language** (primary value)
2. Token efficiency (secondary benefit that may erode)

If LLMs can output JSON cheaply, LiquidCode still has value as the *schema* they output to. But the encoding layer becomes less critical.

---

## Versioning Strategy Assessment

**Current State:**
- Schema has `version` field
- Adapters declare `supportedSchemaVersions`
- No migration machinery
- No deprecation warnings
- No compatibility mode

**Grade: 4/10 - Insufficient**

**What's Missing:**

1. **Migration Functions**
   - No automated schema upgrades
   - No tooling to migrate v2 → v3
   - Users stuck on old versions

2. **Deprecation Process**
   - No warnings when using deprecated features
   - No timeline for removal
   - No alternative documented

3. **Compatibility Matrix**
   - Which adapter versions work with which schema versions?
   - Which engine versions can read which schemas?
   - No documentation

4. **Feature Flags**
   - Can't enable experimental features per-schema
   - Can't opt-in to v3 behaviors while on v2

5. **Semantic Versioning Enforcement**
   - Schema version is just a string
   - No enforcement of semver rules
   - No way to express "supports 2.x" vs "supports exactly 2.0"

**Recommendations:**

### 1. Adopt Strict Semantic Versioning

```typescript
interface LiquidSchema {
  version: `${number}.${number}.${number}`;  // Enforce semver

  // Optional: Feature flags
  features?: {
    experimentalSignals?: boolean;
    advancedLayout?: boolean;
  };
}

// Version comparison
function isCompatible(schema: string, engine: string): boolean {
  const [sMajor, sMinor] = schema.split('.').map(Number);
  const [eMajor, eMinor] = engine.split('.').map(Number);

  // Same major = compatible (minor is backward compatible)
  return sMajor === eMajor && sMinor <= eMinor;
}
```

### 2. Build Migration Infrastructure

```typescript
interface VersionMigrator {
  from: string;
  to: string;
  migrate(schema: any): LiquidSchema;
  validate(schema: any): { valid: boolean; errors: string[] };
}

class SchemaEvolution {
  private migrations: Map<string, VersionMigrator>;

  migrate(schema: any, targetVersion: string): LiquidSchema {
    const path = this.findMigrationPath(schema.version, targetVersion);
    return path.reduce((s, m) => m.migrate(s), schema);
  }

  private findMigrationPath(from: string, to: string): VersionMigrator[] {
    // Dijkstra's algorithm to find shortest path through version graph
  }
}
```

### 3. Deprecation Warnings

```typescript
interface DeprecationWarning {
  field: string;
  deprecatedIn: string;
  removedIn: string;
  replacement: string;
  migration: string;  // URL to migration guide
}

function validateWithWarnings(schema: LiquidSchema): {
  valid: boolean;
  errors: ValidationError[];
  warnings: DeprecationWarning[];
} {
  // Check for deprecated features and emit warnings
}
```

### 4. Compatibility Mode

```typescript
const engine = new LiquidEngine({
  compatibilityMode: '2.0',  // Render old schemas as if on v2 engine
  strictMode: false,         // Allow minor deviations
});

// Engine can render v2 schemas in v3+ engine
const result = engine.render(v2Schema, data);
```

### 5. Version Negotiation

```typescript
interface VersionNegotiation {
  schema: string;    // What version is the schema
  engine: string;    // What version is the engine
  adapter: string;   // What version is the adapter

  resolve(): {
    compatible: boolean;
    renderVersion: string;  // What version semantics to use
    warnings: string[];
  };
}
```

---

## Extensibility Score

**7.5/10**

### Breakdown

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Block extensibility | 8/10 | 20% | 1.6 |
| Adapter extensibility | 9/10 | 20% | 1.8 |
| Signal extensibility | 4/10 | 15% | 0.6 |
| Schema evolution | 3/10 | 15% | 0.45 |
| Operator extensibility | 2/10 | 10% | 0.2 |
| Storage/LLM pluggability | 8/10 | 10% | 0.8 |
| Transform extensibility | 5/10 | 10% | 0.5 |
| **Total** | | **100%** | **7.55** |

### Score Justification

**Strengths (8-9/10):**
- Block types: Custom prefix, clear registration
- Adapters: Clean interface, conformance tests, multiple implementations possible
- Storage/LLM: Pluggable via constructor injection

**Moderate (5-6/10):**
- Transforms: Fixed set, but LiquidExpr is sandboxed and safe

**Weak (3-4/10):**
- Signals: Only `custom` escape hatch, no type definition
- Schema evolution: Version field exists but no migration machinery

**Very Weak (2/10):**
- Operators: Fixed set, no extension API

### What Would Make This 10/10?

1. **Signal Type Registry** (add 1.5 points)
   - Typed custom signals with schemas
   - Validation and serialization hooks

2. **Migration Framework** (add 1.0 points)
   - Automated schema upgrades
   - Deprecation warnings
   - Compatibility matrix

3. **Operator Extensibility** (add 0.5 points)
   - Custom mutation operators
   - Domain-specific batch operations

4. **Binding Slot Registry** (add 0.3 points)
   - Custom blocks define their own slots
   - LiquidCode parser handles them

5. **Transform Function Registry** (add 0.2 points)
   - Domain-specific functions
   - Sandboxed but extensible

**Achievable 5-Year Score: 9.5/10**

---

## Recommendations Summary

### Immediate (Phase 1)

1. **Add Migration Infrastructure**
   - Build `SchemaMigrator` with v2 → v3 example
   - Document migration process
   - Add deprecation warning system

2. **Document Extension APIs**
   - Block registration examples
   - Adapter creation guide
   - Custom archetype examples

3. **Add Adapter Capability System**
   - Optional capabilities instead of required methods
   - Prevents breaking changes

### Near-Term (Phase 2, 1-2 years)

4. **Signal Type Registry**
   - Allow custom signal types with schemas
   - Critical for domain extensions

5. **Binding Slot Extensibility**
   - Custom blocks need custom slots
   - Unblocks domain-specific ecosystems

6. **Transform Function Registry**
   - Sandboxed custom functions
   - Domain logic in schemas

### Long-Term (Phase 3, 3-5 years)

7. **Operator Extensibility**
   - Custom mutation operators
   - Domain DSLs on LiquidCode

8. **Multimodal LLM Abstraction**
   - Prepare for vision + text LLMs
   - Tool-using agentic LLMs

9. **Schema 3.0 Planning**
   - Gather 2+ years of usage data
   - Identify breaking changes needed
   - Plan migration path

---

## 5-Year Evolution Roadmap

### 2025: LiquidCode v2.0 (Current)
- Three primitives stable
- 13 core block types
- Custom blocks via prefix
- Basic versioning

### 2026: LiquidCode v2.5 (Extensions)
- Signal type registry
- Binding slot registry
- Transform function registry
- Migration framework v1

### 2027: LiquidCode v2.9 (Stabilization)
- Operator extensibility
- Adapter capabilities
- Comprehensive migration tools
- Deprecation warnings for v3

### 2028: LiquidCode v3.0 (Evolution)
**Potential Breaking Changes:**
- Signal persistence → storage model
- Grammar enhancements (multi-dimensional bindings)
- Adapter interface 2.0 (capabilities-based)
- LiquidExpr 2.0 (with custom functions)

**Preserved:**
- Three primitives (backward compatible)
- Core block types (expanded, not replaced)
- Position-derived addressing
- Tiered resolution (internal changes, same API)

### 2029-2030: LiquidCode v3.x (Maturity)
- Ecosystem of domain packages
- 50+ community adapters
- Industry standardization efforts
- Multimodal LLM support

---

## Conclusion

LiquidCode v2 has a **solid extensibility foundation** but **weak evolution machinery**. The core architecture (three primitives, interface algebra, constraint-based layout) is sound and will age well. However, the lack of migration tooling, signal/slot extensibility, and LLM abstraction will create pressure points in 2-3 years.

**The critical risk:** Without migration infrastructure, the system will ossify. Maintainers will avoid breaking changes to preserve compatibility, leading to technical debt accumulation. By year 5, v2.x will be held together with workarounds and compromises.

**The opportunity:** Building migration machinery now (before users accumulate schemas) allows confident evolution. Schema v3, v4, v5 can improve the model without breaking the ecosystem.

**Recommended Next Step:** Implement the migration framework and signal/slot registries in a v2.1 release. These are additive (non-breaking) but position the system for graceful evolution.

---

**Review Complete**
