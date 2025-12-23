# LiquidCode Specification v2.1 - Part 3 (Sections 16-20)

**Version:** 2.1
**Date:** 2025-12-22
**Status:** Draft
**Part:** 3 of 3 (Sections 16-20)

---

## 16. Digital Twin & State Management

### 16.1 Digital Twin

The **Digital Twin** is the authoritative current state of the interface:

```typescript
interface DigitalTwin {
  schema: LiquidSchema;          // Current valid schema
  timestamp: number;             // Last update time
  operationCount: number;        // Total operations applied
}
```

### 16.2 Operation History

```typescript
interface OperationHistory {
  operations: AppliedOperation[];
  maxSize: number;               // Undo depth limit

  push(op: Operation): void;
  undo(): Operation | null;
  redo(): Operation | null;
  snapshot(index: number): LiquidSchema;

  // Enhanced methods (ISS-102)
  snapshotSafe(index: number, fallback?: SnapshotFallback): LiquidSchema | null;
  getInitialSchema(): LiquidSchema;
  getCurrentIndex(): number;
  getOldestAvailableIndex(): number;
  isSnapshotAvailable(index: number): boolean;
  getAvailableRange(): { min: number; max: number };
  listOperations(from?: number, to?: number): AppliedOperation[];
}

interface AppliedOperation {
  operation: Operation;          // The mutation
  timestamp: number;
  inverse: Operation;            // For undo
  beforeHash: string;            // State verification
  afterHash: string;
  bindingRepairs?: BindingRepair[];  // NEW (ISS-098)
}

// ISS-098: Binding Repair Tracking
interface BindingRepair {
  blockUid: string;
  repairType: 'auto-substitute' | 'auto-declare' | 'auto-transform' | 'micro-llm';
  confidence: number;
  before: DataBinding;
  after: DataBinding;
  reason: string;
}

// ISS-102: Snapshot Fallback Strategies
type SnapshotFallback =
  | { type: 'null' }
  | { type: 'current' }
  | { type: 'closest' }
  | { type: 'throw' }
  | { type: 'custom'; handler: (index: number) => LiquidSchema };
```

### 16.3 Snapshot Addressing

Reference historical states for comparison or rollback:

```typescript
// Get schema as it was after operation N
twin.history.snapshot(3)

// In LiquidCode
?@snapshot:3.@K0  // Query first KPI at snapshot 3
```

### 16.4 Source Propagation

Track where each piece of the schema came from:

```typescript
interface SourceTracking {
  source: 'cache' | 'semantic' | 'composition' | 'llm' | 'mutation';
  confidence: number;
  timestamp: number;
  operationId?: string;
}
```

This enables:
- Debugging why something looks wrong
- Learning from corrections
- Explaining decisions to users

### 16.5 State Management Philosophy (ISS-068)

#### 16.5.1 Why a Separate State Layer?

The Digital Twin exists separately from LiquidSchema for several critical reasons:

**Separation of Concerns:**
- **Schema** = what the interface looks like NOW
- **State** = how we got here + where we can go
- **Operations** = mutation history for undo/redo

**Benefits:**
1. Schema remains pure and serializable
2. State management complexity isolated
3. Undo/redo without schema pollution
4. Multiple views of same schema (time travel)

**Alternative Considered:** Embedding history in schema
- **Rejected:** Bloats schema size, couples concerns, breaks pure functional model

#### 16.5.2 Operation History Scaling

**Problem:** Unbounded history grows linearly with session length, causing memory exhaustion.

**Solution: Bounded Sliding Window**

```typescript
interface HistoryConfig {
  maxOperations: number;        // Default: 50
  pruneStrategy: 'fifo' | 'lru' | 'smart';
  keepInitial: boolean;         // Always preserve snapshot 0
}

class BoundedHistory implements OperationHistory {
  private operations: AppliedOperation[] = [];
  private maxSize: number;
  private initialSchema: LiquidSchema;

  push(op: AppliedOperation): void {
    this.operations.push(op);

    if (this.operations.length > this.maxSize) {
      // Always keep initial schema
      if (this.keepInitial) {
        this.operations.shift(); // Remove oldest non-initial
      } else {
        this.operations.shift(); // Remove oldest
      }
    }
  }

  snapshot(index: number): LiquidSchema {
    if (index === 0) return this.initialSchema; // Always available

    const oldest = this.getOldestAvailableIndex();
    if (index < oldest) {
      throw new Error(`Snapshot ${index} pruned. Available range: [${oldest}, ${this.getCurrentIndex()}]`);
    }

    // Replay operations from initial
    let schema = this.initialSchema;
    for (let i = 0; i <= index; i++) {
      schema = applyOperation(schema, this.operations[i]);
    }
    return schema;
  }
}
```

**Memory Budget:**
- 50 operations × ~640 bytes/op = ~32KB per session
- Initial schema: ~8KB
- **Total:** ~40KB per active session

**Smart Pruning Strategy:**
```typescript
interface SmartPruneStrategy {
  // Keep snapshots that are:
  keepMilestones: boolean;      // Major structural changes (L0 mutations)
  keepBookmarks: boolean;       // User-marked important states
  keepRecent: number;           // Last N operations always preserved
}

function smartPrune(history: AppliedOperation[], config: SmartPruneStrategy): AppliedOperation[] {
  const milestones = config.keepMilestones
    ? history.filter(op => op.operation.layer === 'L0')
    : [];

  const bookmarks = config.keepBookmarks
    ? history.filter(op => op.bookmarked)
    : [];

  const recent = history.slice(-config.keepRecent);

  // Merge and deduplicate
  return [...new Set([...milestones, ...bookmarks, ...recent])];
}
```

#### 16.5.3 Concurrent Mutation Handling

**Problem:** Multiple users/agents editing same interface simultaneously.

**Solution: Operational Transformation (OT)**

```typescript
interface MutationContext {
  baseSnapshotIndex: number;    // Which snapshot this mutation is based on
  operationId: string;          // Unique mutation ID
  timestamp: number;
  userId?: string;
}

function applyWithConflictResolution(
  twin: DigitalTwin,
  mutation: Operation,
  context: MutationContext
): MutationResult {
  const currentIndex = twin.history.getCurrentIndex();

  // No conflict if based on current state
  if (context.baseSnapshotIndex === currentIndex) {
    return applyMutation(twin, mutation);
  }

  // Conflict: transform mutation to apply on current state
  const intermediateOps = twin.history.listOperations(
    context.baseSnapshotIndex + 1,
    currentIndex
  );

  const transformedMutation = transformOperation(mutation, intermediateOps);

  return applyMutation(twin, transformedMutation);
}

function transformOperation(
  op: Operation,
  intermediateOps: AppliedOperation[]
): Operation {
  let transformed = op;

  for (const intermediate of intermediateOps) {
    transformed = operationalTransform(transformed, intermediate.operation);
  }

  return transformed;
}

// OT Rules
function operationalTransform(op1: Operation, op2: Operation): Operation {
  // Rule 1: Address resolution
  if (op1.type === 'modify' && op2.type === 'remove') {
    if (op1.targetUid === op2.targetUid) {
      return { ...op1, skip: true }; // Target was deleted
    }
  }

  // Rule 2: Position adjustment
  if (op1.type === 'add' && op2.type === 'add') {
    if (op1.position >= op2.position) {
      return { ...op1, position: op1.position + 1 }; // Shift down
    }
  }

  // Rule 3: Property conflict
  if (op1.type === 'modify' && op2.type === 'modify') {
    if (op1.targetUid === op2.targetUid && op1.property === op2.property) {
      // Last-write-wins (timestamp-based)
      return op1.timestamp > op2.timestamp ? op1 : { ...op1, skip: true };
    }
  }

  return op1;
}
```

**Complexity:** O(N × M) where N = concurrent mutations, M = intermediate ops

**Optimization:** Batch transform for N > 10

#### 16.5.4 Snapshot Strategies

**Three approaches to snapshot storage:**

**1. Replay-Based (Default)**
- Store initial schema + operation log
- Reconstruct snapshot by replaying operations
- **Pro:** Minimal storage (~40KB)
- **Con:** O(N) time to reconstruct

**2. Checkpoint-Based**
- Store full schema every K operations
- Replay only from nearest checkpoint
- **Pro:** Bounded reconstruction time O(K)
- **Con:** Higher storage (K × 8KB)

**3. Hybrid (Recommended)**
```typescript
interface HybridSnapshotStrategy {
  checkpointInterval: number;   // Store full schema every 10 ops
  maxReplayDepth: number;       // Max 5 ops to replay
}

class HybridHistory {
  private checkpoints: Map<number, LiquidSchema> = new Map();

  snapshot(index: number): LiquidSchema {
    const nearestCheckpoint = this.findNearestCheckpoint(index);
    const startIndex = nearestCheckpoint.index;
    const startSchema = nearestCheckpoint.schema;

    // Replay from checkpoint
    let schema = startSchema;
    for (let i = startIndex + 1; i <= index; i++) {
      schema = applyOperation(schema, this.operations[i]);
    }

    return schema;
  }

  push(op: AppliedOperation): void {
    this.operations.push(op);

    // Store checkpoint every N operations
    if (this.operations.length % this.checkpointInterval === 0) {
      this.checkpoints.set(
        this.operations.length - 1,
        this.getCurrentSchema()
      );
    }
  }
}
```

**Storage:** Initial (8KB) + Operations (50 × 640B) + Checkpoints (5 × 8KB) = **80KB**

**Reconstruction:** Max 5 operations to replay = **<10ms**

#### 16.5.5 State Verification

**Problem:** Ensure mutations don't corrupt schema integrity.

**Solution: Hash-Based Verification**

```typescript
interface AppliedOperation {
  // ... other fields
  beforeHash: string;           // SHA-256 of schema before mutation
  afterHash: string;            // SHA-256 of schema after mutation
}

function applyMutationWithVerification(
  twin: DigitalTwin,
  mutation: Operation
): MutationResult {
  const beforeHash = hashSchema(twin.schema);

  // Apply mutation
  const newSchema = applyOperation(twin.schema, mutation);

  const afterHash = hashSchema(newSchema);

  // Store operation with hashes
  twin.history.push({
    operation: mutation,
    timestamp: Date.now(),
    inverse: computeInverse(mutation),
    beforeHash,
    afterHash,
  });

  twin.schema = newSchema;

  return { success: true, schema: newSchema };
}

function hashSchema(schema: LiquidSchema): string {
  const canonical = canonicalizeSchema(schema);
  return sha256(JSON.stringify(canonical));
}

function verifyHistoryIntegrity(history: OperationHistory): boolean {
  let currentHash = hashSchema(history.getInitialSchema());

  for (const op of history.listOperations()) {
    if (op.beforeHash !== currentHash) {
      console.error(`Integrity violation at operation ${op.operation.id}`);
      return false;
    }
    currentHash = op.afterHash;
  }

  return true;
}
```

**Cost:** ~1ms per mutation for SHA-256 hashing

#### 16.5.6 Source Propagation (Explainability)

**Why:** Users need to understand where schema decisions came from.

```typescript
interface SchemaExplainability {
  source: 'cache' | 'semantic' | 'composition' | 'llm' | 'mutation';
  confidence: number;
  reasoning?: string;
  sourceFragments?: string[];
}

interface Block {
  // ... other fields
  _source?: BlockSource;        // Metadata, not part of schema hash
}

interface BlockSource {
  origin: 'cache' | 'llm' | 'mutation';
  fragmentId?: string;
  confidence: number;
  timestamp: number;
  userId?: string;
  reasoning?: string;
}

// Track source through operations
function applyMutationWithSource(
  twin: DigitalTwin,
  mutation: Operation,
  source: OperationSource
): MutationResult {
  const result = applyMutation(twin, mutation);

  // Propagate source to affected blocks
  for (const blockUid of mutation.affectedBlocks) {
    const block = findBlockByUid(result.schema, blockUid);
    if (block) {
      block._source = {
        origin: 'mutation',
        confidence: 1.0,
        timestamp: Date.now(),
        userId: source.userId,
        reasoning: source.reasoning,
      };
    }
  }

  return result;
}
```

**UI Integration:**
```typescript
// User hovers over block, sees:
{
  "origin": "cache",
  "confidence": 0.92,
  "reasoning": "Matched 'revenue overview' intent from fragment F1234",
  "timestamp": "2025-12-21T10:30:00Z"
}
```

#### 16.5.7 Memory Management

**Total Memory Budget per Session:** ~100KB

**Breakdown:**
- Initial schema: 8KB
- Current schema: 8KB
- Operation log (50 ops): 32KB
- Checkpoints (5 snapshots): 40KB
- Metadata: 12KB
- **Total:** 100KB

**For 10,000 concurrent sessions:** 1GB RAM

**Scaling Strategy:**
- LRU eviction: Sessions idle >30min evicted
- Persistence: Save to disk after 5min idle
- Lazy loading: Restore from disk on access

```typescript
class SessionMemoryManager {
  private sessions: Map<string, DigitalTwin> = new Map();
  private lru: LRUCache<string, DigitalTwin>;

  constructor(maxSessions: number = 10000) {
    this.lru = new LRUCache({
      max: maxSessions,
      maxSize: 100 * 1024, // 100KB per session
      sizeCalculation: (twin) => estimateSize(twin),
      dispose: (sessionId, twin) => this.persist(sessionId, twin),
    });
  }

  get(sessionId: string): DigitalTwin {
    let twin = this.lru.get(sessionId);

    if (!twin) {
      // Load from disk
      twin = this.restore(sessionId);
      this.lru.set(sessionId, twin);
    }

    return twin;
  }

  private persist(sessionId: string, twin: DigitalTwin): void {
    // Write to disk/DB
    fs.writeFileSync(
      `sessions/${sessionId}.json`,
      JSON.stringify(serializeTwin(twin))
    );
  }

  private restore(sessionId: string): DigitalTwin {
    const data = fs.readFileSync(`sessions/${sessionId}.json`, 'utf8');
    return deserializeTwin(JSON.parse(data));
  }
}
```

#### 16.5.8 Comparison to Alternatives

**Alternative 1: Stateless (Regenerate on Every Mutation)**

| Aspect | Digital Twin | Stateless |
|--------|--------------|-----------|
| Undo/Redo | O(1) | Impossible |
| Mutation Latency | <5ms | 100-500ms (LLM call) |
| Memory | ~100KB/session | ~0KB |
| Explainability | Full history | None |
| Cost | $0/mutation | $0.001/mutation |

**Verdict:** Digital Twin superior for interactive UIs

**Alternative 2: Event Sourcing**

| Aspect | Digital Twin | Event Sourcing |
|--------|--------------|----------------|
| Storage | In-memory + disk | Append-only log |
| Query | O(1) current state | O(N) replay |
| Snapshots | Checkpointed | Manual |
| Complexity | Medium | High |

**Verdict:** Event sourcing overkill for single-user sessions; useful for multi-user audit logs

**Alternative 3: CRDT (Conflict-Free Replicated Data Type)**

| Aspect | Digital Twin + OT | CRDT |
|--------|-------------------|------|
| Conflict Resolution | Operational Transform | Automatic merge |
| Correctness | Guaranteed if OT correct | Always converges |
| Complexity | Medium | High |
| Performance | O(N × M) | O(log N) |

**Verdict:** CRDTs better for highly concurrent edits (10+ simultaneous users), but adds complexity

#### 16.5.9 State Persistence

**Persistence Triggers:**
1. After every mutation (async write)
2. On session idle (5min timeout)
3. On explicit save (user action)
4. On session close (cleanup)

**Storage Format:**
```typescript
interface PersistedSession {
  sessionId: string;
  userId: string;
  initialSchema: LiquidSchema;
  operations: AppliedOperation[];
  checkpoints: Record<number, LiquidSchema>;
  metadata: SessionMetadata;
  version: string;              // Persistence format version
}

interface SessionMetadata {
  createdAt: string;
  lastModified: string;
  operationCount: number;
  tags?: string[];
}
```

**Storage Backends:**
- **Development:** Local filesystem (JSON files)
- **Production:** PostgreSQL (JSONB) or S3 (archived sessions)

**Restoration:**
```typescript
async function restoreSession(sessionId: string): Promise<DigitalTwin> {
  const persisted = await db.sessions.findOne({ sessionId });

  if (!persisted) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Verify version compatibility
  if (!isCompatible(persisted.version, CURRENT_VERSION)) {
    persisted = await migrateSession(persisted);
  }

  return {
    schema: persisted.checkpoints[persisted.operations.length - 1] || persisted.initialSchema,
    timestamp: Date.parse(persisted.lastModified),
    operationCount: persisted.operationCount,
    history: new BoundedHistory(persisted.operations, persisted.checkpoints),
  };
}
```

#### 16.5.10 State Machine View

The Digital Twin can be viewed as a state machine:

```
States: {Initial, Modified, Undone, Redone, Saved}
Events: {Mutate, Undo, Redo, Save, Load}
Transitions:
  Initial --Mutate--> Modified
  Modified --Undo--> Undone
  Undone --Redo--> Modified
  Modified --Save--> Saved
  Saved --Mutate--> Modified
```

```typescript
enum TwinState {
  Initial = 'initial',
  Modified = 'modified',
  Undone = 'undone',
  Redone = 'redone',
  Saved = 'saved',
}

interface StateMachine {
  currentState: TwinState;

  transition(event: TwinEvent): void {
    const nextState = TRANSITIONS[this.currentState]?.[event];
    if (!nextState) {
      throw new Error(`Invalid transition: ${this.currentState} --${event}-->`);
    }
    this.currentState = nextState;
  }
}

const TRANSITIONS: Record<TwinState, Partial<Record<TwinEvent, TwinState>>> = {
  [TwinState.Initial]: {
    [TwinEvent.Mutate]: TwinState.Modified,
  },
  [TwinState.Modified]: {
    [TwinEvent.Undo]: TwinState.Undone,
    [TwinEvent.Save]: TwinState.Saved,
  },
  [TwinState.Undone]: {
    [TwinEvent.Redo]: TwinState.Redone,
    [TwinEvent.Mutate]: TwinState.Modified,
  },
  [TwinState.Saved]: {
    [TwinEvent.Mutate]: TwinState.Modified,
  },
};
```

---

## 17. Compilation Pipeline

### 17.1 LiquidCode → LiquidSchema

```
LiquidCode (35 tokens)
    ↓
Tokenizer (see §6.6.1)
    ↓ (token stream)
Parser (see §6.6.2)
    ↓ (AST)
Semantic Analyzer (see §6.6.4)
    ↓ (validated AST with resolved references)
Schema Generator
    ↓ (LiquidSchema JSON)
Validator (Zod)
    ↓ (validated LiquidSchema)
Output
```

**Tokenizer responsibilities:**
- Normalize Unicode to ASCII (§6.6.5, B.1.2)
- Strip whitespace and comments
- Emit token stream with position information
- MUST NOT fail on unknown characters (emit ERROR token)

**Parser responsibilities:**
- Build AST from token stream per §6.6.2 grammar
- Apply precedence rules (§6.6.3)
- Resolve ambiguities per §6.6.4
- SHOULD recover from errors per §6.6.6
- Emit ParseError for irrecoverable issues

**Semantic Analyzer responsibilities:**
- Resolve all addresses (§8, §6.6.4 Rule 4)
- Validate signal references (emitted signals must be declared)
- Validate binding slots match block type (§9.2)
- Validate layout constraints (§11)
- MUST fail on unresolvable references

### 17.2 Parallel Tree Compilation

L1 blocks compile in parallel:

```
L0 completes
    ↓
┌────────┬────────┬────────┐
│ Block1 │ Block2 │ Block3 │  (parallel)
└────────┴────────┴────────┘
    ↓
Merge into schema
    ↓
L2 polish (parallel per block)
    ↓
Final schema
```

### 17.3 Streaming Support

For real-time rendering:

```
L0 complete → Render skeleton
L1[0] complete → Render first block
L1[1] complete → Render second block
...
L2 complete → Apply polish
```

Users see progressive interface construction.

### 17.4 Compilation Guarantees (Normative)

A compiler conforming to this specification MUST provide these guarantees:

| Guarantee | Mechanism | Requirement Level |
|-----------|-----------|-------------------|
| Type safety | Zod validation | MUST validate all schemas |
| No undefined references | Semantic analysis | MUST resolve all addresses before emit |
| Valid layout | Layout constraint solver | MUST produce renderable layout |
| Signal consistency | Signal registry validation | MUST validate all signal connections |
| Binding validity | Binding schema matching | MUST verify binding slots match block types |

**Correctness invariant:**

> If compilation succeeds, rendering MUST NOT fail due to schema issues.

Adapters MAY fail to render due to:
- Unsupported block types (MUST render placeholder, see B.3)
- Missing data (MUST render empty state)
- Platform limitations (MUST degrade gracefully)

But adapters MUST NOT fail due to:
- Invalid schema structure (compilation prevents this)
- Undefined references (semantic analysis prevents this)
- Type mismatches (Zod validation prevents this)

### 17.5 Error Recovery (ISS-107)

**Problem:** LLM-generated LiquidCode may contain recoverable errors that should not fail entire compilation.

**Solution: Multi-Level Error Recovery**

#### 17.5.1 Recovery Levels

```typescript
enum RecoveryLevel {
  NONE = 'none',           // Fail immediately (strict mode)
  SYNTAX = 'syntax',       // Recover from tokenizer/parser errors
  SEMANTIC = 'semantic',   // Recover from reference/type errors
  FULL = 'full',           // Recover from all non-fatal errors
}

interface CompilationOptions {
  recovery: RecoveryLevel;
  maxErrors: number;       // Abort after N errors
  warnOnRecovery: boolean; // Emit warnings for recovered errors
}
```

#### 17.5.2 Syntax Error Recovery

**Tokenizer Recovery:**
```typescript
class RecoveringTokenizer {
  tokenize(source: string): TokenStream {
    const tokens: Token[] = [];
    const errors: ParseError[] = [];

    for (let i = 0; i < source.length; i++) {
      try {
        const token = this.nextToken(source, i);
        tokens.push(token);
        i += token.length - 1;
      } catch (err) {
        // Recovery: Skip unknown character
        errors.push({
          position: i,
          message: `Unknown character '${source[i]}'`,
          recovery: 'skipped',
        });
      }
    }

    return { tokens, errors };
  }
}
```

**Parser Recovery:**
```typescript
class RecoveringParser {
  parse(tokens: Token[]): AST {
    const ast: AST = { type: 'Program', body: [] };
    const errors: ParseError[] = [];

    let i = 0;
    while (i < tokens.length) {
      try {
        const node = this.parseStatement(tokens, i);
        ast.body.push(node);
        i = node.endIndex + 1;
      } catch (err) {
        // Recovery strategies:
        if (err instanceof MissingSemicolonError) {
          // Insert implicit semicolon
          errors.push({
            position: i,
            message: 'Missing semicolon',
            recovery: 'inserted',
          });
          // Continue parsing
        } else if (err instanceof UnexpectedTokenError) {
          // Skip to next statement boundary
          i = this.findNextStatementBoundary(tokens, i);
          errors.push({
            position: i,
            message: `Unexpected token, skipped to next statement`,
            recovery: 'skipped',
          });
        } else {
          throw err; // Unrecoverable
        }
      }
    }

    return { ast, errors };
  }

  private findNextStatementBoundary(tokens: Token[], start: number): number {
    for (let i = start; i < tokens.length; i++) {
      if (tokens[i].type === 'SEMICOLON') {
        return i + 1;
      }
    }
    return tokens.length;
  }
}
```

#### 17.5.3 Semantic Error Recovery

**Address Resolution Recovery:**
```typescript
function resolveAddressSafe(
  selector: string,
  schema: LiquidSchema,
  recovery: RecoveryLevel
): AddressResolution {
  try {
    return resolveAddress(selector, schema);
  } catch (err) {
    if (recovery === RecoveryLevel.NONE) throw err;

    // Recovery: Use ordinal fallback
    const ordinal = extractOrdinal(selector); // "@K0" → 0
    if (ordinal !== null) {
      return {
        selector,
        resolvedUids: [schema.blocks[ordinal]?.uid].filter(Boolean),
        ambiguous: false,
        recovered: true,
        recoveryReason: `Address '${selector}' invalid, using ordinal ${ordinal}`,
      };
    }

    throw err; // Cannot recover
  }
}
```

**Binding Validation Recovery:**
```typescript
function validateBindingSafe(
  block: Block,
  dataFingerprint: DataFingerprint,
  recovery: RecoveryLevel
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const field of block.binding?.fields || []) {
    if (!dataFingerprint.hasField(field.field)) {
      if (recovery >= RecoveryLevel.SEMANTIC) {
        // Recovery: Find closest field name
        const closest = findClosestField(field.field, dataFingerprint.fields);
        errors.push({
          message: `Field '${field.field}' not found, using '${closest}'`,
          severity: 'warning',
          recovery: 'substituted',
        });
        field.field = closest; // Auto-repair
      } else {
        errors.push({
          message: `Field '${field.field}' not found`,
          severity: 'error',
        });
      }
    }
  }

  return { valid: errors.filter(e => e.severity === 'error').length === 0, errors };
}

function findClosestField(target: string, fields: string[]): string {
  let minDistance = Infinity;
  let closest = fields[0];

  for (const field of fields) {
    const distance = levenshteinDistance(target.toLowerCase(), field.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      closest = field;
    }
  }

  return closest;
}
```

#### 17.5.4 Recovery Strategies Table

| Error Type | Strict Mode | Syntax Recovery | Semantic Recovery | Full Recovery |
|------------|-------------|-----------------|-------------------|---------------|
| Unknown character | FAIL | Skip character | Skip character | Skip character |
| Missing semicolon | FAIL | Insert semicolon | Insert semicolon | Insert semicolon |
| Unknown block type | FAIL | FAIL | Use 'custom:X' | Use 'custom:X' |
| Invalid address | FAIL | FAIL | Use ordinal fallback | Use ordinal fallback |
| Missing field | FAIL | FAIL | Suggest closest field | Auto-substitute closest |
| Type mismatch | FAIL | FAIL | Warn | Coerce if safe |
| Circular signals | FAIL | FAIL | FAIL | Break at lowest confidence |

#### 17.5.5 Recovery Reporting

```typescript
interface CompilationResult {
  success: boolean;
  schema?: LiquidSchema;
  errors: CompilationError[];
  warnings: CompilationWarning[];
  recovered: RecoveryReport[];
}

interface RecoveryReport {
  location: SourceLocation;
  originalError: string;
  recoveryAction: string;
  confidence: number;        // 0-1, how confident the recovery is
  suggestion?: string;       // User-facing suggestion to fix
}

// Example output
{
  "success": true,
  "schema": { /* ... */ },
  "errors": [],
  "warnings": [
    {
      "code": "LC-BIND-FIELD-001",
      "message": "Field 'revenu' not found in data",
      "location": { "line": 3, "column": 8 }
    }
  ],
  "recovered": [
    {
      "location": { "line": 3, "column": 8 },
      "originalError": "Field 'revenu' not found",
      "recoveryAction": "Substituted with 'revenue' (Levenshtein distance: 1)",
      "confidence": 0.95,
      "suggestion": "Did you mean 'revenue'? Confirm or edit binding."
    }
  ]
}
```

#### 17.5.6 LLM Feedback Loop

**Use recovery reports to improve LLM output:**

```typescript
async function compileWithFeedback(
  liquidCode: string,
  llm: LLMProvider,
  maxRetries: number = 2
): Promise<CompilationResult> {
  let result = compile(liquidCode, { recovery: RecoveryLevel.FULL });

  for (let retry = 0; retry < maxRetries && !result.success; retry++) {
    // Generate feedback prompt
    const feedback = generateFeedback(result.errors, result.recovered);

    // Ask LLM to fix
    const fixedCode = await llm.complete({
      system: "You are a LiquidCode compiler. Fix the following errors:",
      prompt: `
Original code:
\`\`\`
${liquidCode}
\`\`\`

Errors:
${feedback}

Provide corrected LiquidCode only.
      `,
    });

    result = compile(fixedCode, { recovery: RecoveryLevel.FULL });
  }

  return result;
}

function generateFeedback(
  errors: CompilationError[],
  recovered: RecoveryReport[]
): string {
  const feedback: string[] = [];

  for (const err of errors) {
    feedback.push(`- Line ${err.location.line}: ${err.message}`);
  }

  for (const rec of recovered) {
    if (rec.confidence < 0.8) {
      feedback.push(`- Line ${rec.location.line}: ${rec.suggestion}`);
    }
  }

  return feedback.join('\n');
}
```

#### 17.5.7 Performance Impact

**Recovery overhead:**
- Syntax recovery: +5-10ms (skip invalid tokens)
- Semantic recovery: +10-20ms (fuzzy field matching)
- Full recovery with LLM feedback: +500ms (LLM call)

**Recommendation:**
- Development mode: Use `FULL` recovery with feedback loop
- Production mode: Use `SEMANTIC` recovery without LLM (faster)

---

## 18. Adapter Interface Contract

### 18.1 Core Interface

```typescript
interface LiquidAdapter<RenderOutput> {
  // Render complete schema
  render(schema: LiquidSchema, data: any): RenderOutput;

  // Render single block
  renderBlock(block: Block, data: any): RenderOutput;

  // Check if block type is supported
  supports(blockType: BlockType): boolean;

  // Render unsupported block as placeholder
  renderPlaceholder(block: Block, reason: string): RenderOutput;

  // Create signal runtime
  createSignalRuntime(registry: SignalRegistry): SignalRuntime;

  // Metadata
  readonly metadata: AdapterMetadata;
}
```

### 18.2 Adapter Metadata

```typescript
interface AdapterMetadata {
  name: string;                      // "react", "react-native", "qt"
  version: string;                   // Semver
  platform: string;                  // "web", "mobile", "desktop"
  supportedSchemaVersions: string[]; // ["1.x", "2.x"]
  supportedBlockTypes: BlockType[];  // What blocks this adapter renders
  supportsSignals: boolean;          // Whether signals work
  supportsStreaming: boolean;        // Whether progressive render works
  supportsLayout: boolean;           // Whether layout resolution works (§11)
  breakpointThresholds?: BreakpointThresholds;  // Custom breakpoint values
}
```

### 18.3 Signal Runtime Interface

```typescript
interface SignalRuntime {
  // Value access
  get(signalName: string): any;
  set(signalName: string, value: any): void;

  // Subscription management
  subscribe(signalName: string, callback: (value: any) => void): () => void;

  // Persistence operations
  persist(): void;              // Save all signals to their configured storage
  restore(): void;              // Load all signals from storage
  persistSignal(signalName: string): void;    // Save single signal
  restoreSignal(signalName: string): void;    // Load single signal

  // Metadata
  readonly registry: SignalRegistry;
}
```

### 18.4 Enhanced Conformance Testing (ISS-012)

Adapters MUST pass conformance tests to be certified for production use.

#### 18.4.1 Block Rendering Tests (5 tests)

```typescript
const BLOCK_RENDERING_TESTS = [
  {
    id: 'CONF-R-001',
    name: 'renders all core block types',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const coreBlockTypes: BlockType[] = [
        'kpi', 'bar-chart', 'line-chart', 'pie-chart', 'data-table',
        'grid', 'stack', 'text', 'metric-group', 'comparison',
        'date-filter', 'select-filter', 'search-input'
      ];

      for (const blockType of coreBlockTypes) {
        const block: Block = createSampleBlock(blockType);
        const data = createSampleData(blockType);

        const result = adapter.renderBlock(block, data);

        assert(result !== null, `Failed to render ${blockType}`);
        assert(result !== undefined, `Undefined output for ${blockType}`);
      }
    },
  },

  {
    id: 'CONF-R-002',
    name: 'renders placeholder for unknown block type',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const unknownBlock: Block = {
        uid: 'b_test123456',
        type: 'custom:nonexistent' as BlockType,
      };

      const result = adapter.renderBlock(unknownBlock, {});

      assert(result !== null, 'Must return placeholder, not null');
      assert(isPlaceholder(result), 'Must be a placeholder');
    },
  },

  {
    id: 'CONF-R-003',
    name: 'renders empty state for null data',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const block: Block = createSampleBlock('kpi');

      const result = adapter.renderBlock(block, null);

      assert(result !== null, 'Must return empty state, not null');
      assert(isEmptyState(result), 'Must be an empty state');
    },
  },

  {
    id: 'CONF-R-004',
    name: 'renders empty state for mismatched data shape',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const tableBlock: Block = createSampleBlock('data-table');
      const scalarData = { value: 100 }; // Should be array

      const result = adapter.renderBlock(tableBlock, scalarData);

      assert(result !== null, 'Must handle gracefully');
      assert(isEmptyState(result) || isPlaceholder(result), 'Must show empty or error state');
    },
  },

  {
    id: 'CONF-R-005',
    name: 'block count matches schema',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const schema: LiquidSchema = createSampleSchema(5); // 5 blocks
      const data = createSampleData('overview');

      const result = adapter.render(schema, data);

      const renderedBlockCount = countRenderedBlocks(result);
      assert(renderedBlockCount === 5, `Expected 5 blocks, got ${renderedBlockCount}`);
    },
  },
];
```

#### 18.4.2 Error Handling Tests (5 tests)

```typescript
const ERROR_HANDLING_TESTS = [
  {
    id: 'CONF-E-001',
    name: 'does not throw on malformed binding',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const block: Block = {
        uid: 'b_test123456',
        type: 'kpi',
        binding: {
          source: 'data',
          fields: [
            { target: 'value', field: 'NONEXISTENT_FIELD' }
          ],
        },
      };

      await assert.doesNotThrow(async () => {
        adapter.renderBlock(block, {});
      });
    },
  },

  {
    id: 'CONF-E-002',
    name: 'does not throw on invalid signal reference',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const schema: LiquidSchema = createSchemaWithInvalidSignal();
      const data = {};

      await assert.doesNotThrow(async () => {
        adapter.render(schema, data);
      });
    },
  },

  {
    id: 'CONF-E-003',
    name: 'completes within timeout for large data',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const block: Block = createSampleBlock('data-table');
      const largeData = createLargeDataset(10000); // 10K rows

      const startTime = Date.now();
      await adapter.renderBlock(block, largeData);
      const elapsed = Date.now() - startTime;

      const timeout = adapter.metadata.renderTimeout || 5000;
      assert(elapsed < timeout, `Render took ${elapsed}ms, timeout is ${timeout}ms`);
    },
  },

  {
    id: 'CONF-E-004',
    name: 'recovers from partial data fetch failure',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const schema: LiquidSchema = createSampleSchema(3);
      const partialData = { block1: { value: 100 } }; // Only 1 of 3 blocks has data

      const result = await adapter.render(schema, partialData);

      assert(result !== null, 'Must render partial result');
      // Should show data for block1, empty state for block2/3
    },
  },

  {
    id: 'CONF-E-005',
    name: 'provides meaningful error messages',
    severity: 'RECOMMENDED',
    test: async (adapter: LiquidAdapter) => {
      const block: Block = createSampleBlock('kpi');
      const invalidData = { value: 'NOT_A_NUMBER' };

      const result = adapter.renderBlock(block, invalidData);

      if (isErrorState(result)) {
        assert(result.message.length > 10, 'Error message too short');
        assert(result.message.includes('value'), 'Error message should mention field');
      }
    },
  },
];
```

#### 18.4.3 Degradation Tests (4 tests)

```typescript
const DEGRADATION_TESTS = [
  {
    id: 'CONF-D-001',
    name: 'shows placeholder with reason for unsupported features',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const block: Block = {
        uid: 'b_test123456',
        type: 'custom:experimental' as BlockType,
      };

      const result = adapter.renderPlaceholder(block, 'Block type not supported');

      assert(isPlaceholder(result), 'Must be a placeholder');
      assert(getPlaceholderMessage(result).includes('not supported'), 'Must show reason');
    },
  },

  {
    id: 'CONF-D-002',
    name: 'maintains layout when some blocks fail',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const schema: LiquidSchema = createGridSchema(2, 2); // 2x2 grid
      schema.blocks[1].type = 'custom:unsupported' as BlockType;

      const result = await adapter.render(schema, {});

      // Grid should still be 2x2, with placeholder in [0,1]
      assert(getGridDimensions(result).rows === 2, 'Grid rows preserved');
      assert(getGridDimensions(result).cols === 2, 'Grid cols preserved');
    },
  },

  {
    id: 'CONF-D-003',
    name: 'provides fallback for entire schema failure',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const corruptSchema: LiquidSchema = createCorruptSchema();

      const result = await adapter.render(corruptSchema, {});

      assert(result !== null, 'Must return fallback, not null');
      assert(isFallbackTemplate(result), 'Must be fallback template');
    },
  },

  {
    id: 'CONF-D-004',
    name: 'gracefully degrades on missing dependencies',
    severity: 'RECOMMENDED',
    test: async (adapter: LiquidAdapter) => {
      // Simulate missing chart library
      const originalChartLib = global.ChartJS;
      delete global.ChartJS;

      try {
        const block: Block = createSampleBlock('line-chart');
        const result = adapter.renderBlock(block, {});

        assert(result !== null, 'Should render placeholder instead of crashing');
      } finally {
        global.ChartJS = originalChartLib;
      }
    },
  },
];
```

#### 18.4.4 Signal Tests (5 tests)

```typescript
const SIGNAL_TESTS = [
  {
    id: 'CONF-S-001',
    name: 'handles signal with no subscribers',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const registry: SignalRegistry = {
        dateRange: { type: 'dateRange', default: null },
      };

      const runtime = adapter.createSignalRuntime(registry);

      await assert.doesNotThrow(() => {
        runtime.set('dateRange', { start: new Date(), end: new Date() });
      });
    },
  },

  {
    id: 'CONF-S-002',
    name: 'handles signal emit during render',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const schema: LiquidSchema = createSchemaWithSignals();
      const data = {};

      // Emit signal during render lifecycle
      const runtime = adapter.createSignalRuntime(schema.signals!);

      await assert.doesNotThrow(async () => {
        const renderPromise = adapter.render(schema, data);
        runtime.set('filter', { category: 'A' });
        await renderPromise;
      });
    },
  },

  {
    id: 'CONF-S-003',
    name: 'does not deadlock on circular signal reference',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      // This should be caught at compile time, but test runtime safety
      const schema: LiquidSchema = createSchemaWithCircularSignals();

      await assert.doesNotThrow(async () => {
        const result = await Promise.race([
          adapter.render(schema, {}),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000)),
        ]);
      });
    },
  },

  {
    id: 'CONF-S-004',
    name: 'signals propagate within 100ms',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const schema: LiquidSchema = createSchemaWithSignals();
      const runtime = adapter.createSignalRuntime(schema.signals!);

      let callbackFired = false;
      runtime.subscribe('dateRange', () => { callbackFired = true; });

      const startTime = Date.now();
      runtime.set('dateRange', { start: new Date(), end: new Date() });

      await waitFor(() => callbackFired, 100);
      const elapsed = Date.now() - startTime;

      assert(elapsed < 100, `Signal propagation took ${elapsed}ms`);
    },
  },

  {
    id: 'CONF-S-005',
    name: 'persists and restores signals correctly',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const registry: SignalRegistry = {
        dateRange: { type: 'dateRange', persist: 'url' },
      };

      const runtime = adapter.createSignalRuntime(registry);

      const testValue = { start: new Date('2025-01-01'), end: new Date('2025-12-31') };
      runtime.set('dateRange', testValue);
      runtime.persist();

      // Simulate page reload
      const newRuntime = adapter.createSignalRuntime(registry);
      newRuntime.restore();

      const restored = newRuntime.get('dateRange');
      assert.deepEqual(restored, testValue, 'Signal value not restored correctly');
    },
  },
];
```

#### 18.4.5 Layout Tests (4 tests)

```typescript
const LAYOUT_TESTS = [
  {
    id: 'CONF-L-001',
    name: 'respects priority-based visibility at breakpoints',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      if (!adapter.metadata.supportsLayout) return; // Skip if not supported

      const schema: LiquidSchema = createSchemaWithPriorities();
      const compactContext: SlotContext = { width: 400, height: 800, breakpoint: 'compact' };

      const result = adapter.renderWithContext(schema, {}, compactContext);

      // Only hero blocks should be visible
      const visibleBlocks = getVisibleBlocks(result);
      assert(visibleBlocks.every(b => b.layout?.priority === 'hero'), 'Only hero blocks visible');
    },
  },

  {
    id: 'CONF-L-002',
    name: 'applies flexibility correctly',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      if (!adapter.metadata.supportsLayout) return;

      const block: Block = {
        uid: 'b_test123456',
        type: 'line-chart',
        layout: { flex: 'shrink' },
      };

      const smallContext: SlotContext = { width: 300, height: 200, breakpoint: 'compact' };
      const result = adapter.renderWithContext(
        createSchemaWithSingleBlock(block),
        {},
        smallContext
      );

      const dimensions = getRenderedDimensions(result);
      assert(dimensions.width <= 300, 'Block should shrink to fit');
    },
  },

  {
    id: 'CONF-L-003',
    name: 'maintains grid structure across breakpoints',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      if (!adapter.metadata.supportsLayout) return;

      const gridSchema: LiquidSchema = createGridSchema(3, 2); // 3x2 grid

      const contexts: SlotContext[] = [
        { width: 1400, height: 800, breakpoint: 'expanded' },
        { width: 900, height: 600, breakpoint: 'standard' },
        { width: 400, height: 800, breakpoint: 'compact' },
      ];

      for (const context of contexts) {
        const result = adapter.renderWithContext(gridSchema, {}, context);
        assert(hasGridStructure(result), `Grid structure lost at ${context.breakpoint}`);
      }
    },
  },

  {
    id: 'CONF-L-004',
    name: 'calculates layout within performance budget',
    severity: 'RECOMMENDED',
    test: async (adapter: LiquidAdapter) => {
      if (!adapter.metadata.supportsLayout) return;

      const complexSchema: LiquidSchema = createComplexLayoutSchema(20); // 20 blocks
      const context: SlotContext = { width: 1200, height: 800, breakpoint: 'standard' };

      const startTime = Date.now();
      const layout = adapter.calculateLayout(complexSchema, context);
      const elapsed = Date.now() - startTime;

      assert(elapsed < 50, `Layout calculation took ${elapsed}ms, expected <50ms`);
    },
  },
];
```

#### 18.4.6 Data Binding Tests (4 tests)

```typescript
const BINDING_TESTS = [
  {
    id: 'CONF-B-001',
    name: 'all bindings resolve to data',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const schema: LiquidSchema = createSampleSchema(3);
      const data = createMatchingData(schema);

      const result = adapter.render(schema, data);

      const unboundBlocks = getBlocksWithoutData(result);
      assert(unboundBlocks.length === 0, `${unboundBlocks.length} blocks have no data`);
    },
  },

  {
    id: 'CONF-B-002',
    name: 'handles transforms correctly',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const block: Block = {
        uid: 'b_test123456',
        type: 'kpi',
        binding: {
          source: 'data',
          fields: [
            { target: 'value', field: 'revenue', transform: 'currency($revenue, "$")' }
          ],
        },
      };

      const result = adapter.renderBlock(block, { revenue: 1234.56 });

      const displayValue = getDisplayValue(result);
      assert(displayValue === '$1,234.56', `Expected '$1,234.56', got '${displayValue}'`);
    },
  },

  {
    id: 'CONF-B-003',
    name: 'applies aggregations correctly',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const block: Block = {
        uid: 'b_test123456',
        type: 'kpi',
        binding: {
          source: 'data',
          fields: [{ target: 'value', field: 'revenue' }],
          aggregate: 'sum',
        },
      };

      const data = { revenue: [100, 200, 300] };
      const result = adapter.renderBlock(block, data);

      const displayValue = getDisplayValue(result);
      assert(displayValue === '600', `Expected '600', got '${displayValue}'`);
    },
  },

  {
    id: 'CONF-B-004',
    name: 'respects binding slot requirements',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const lineChart: Block = {
        uid: 'b_test123456',
        type: 'line-chart',
        binding: {
          source: 'data',
          fields: [
            { target: 'x', field: 'date' },
            { target: 'y', field: 'revenue' },
          ],
        },
      };

      const data = {
        date: ['2025-01', '2025-02', '2025-03'],
        revenue: [100, 200, 300],
      };

      const result = adapter.renderBlock(lineChart, data);

      assert(hasXAxis(result), 'X-axis not rendered');
      assert(hasYAxis(result), 'Y-axis not rendered');
    },
  },
];
```

#### 18.4.7 Metadata Tests (2 tests)

```typescript
const METADATA_TESTS = [
  {
    id: 'CONF-M-001',
    name: 'metadata is complete and valid',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const meta = adapter.metadata;

      assert(meta.name, 'Adapter name is required');
      assert(meta.version.match(/^\d+\.\d+\.\d+$/), 'Version must be semver');
      assert(meta.platform, 'Platform is required');
      assert(Array.isArray(meta.supportedSchemaVersions), 'Schema versions must be array');
      assert(Array.isArray(meta.supportedBlockTypes), 'Block types must be array');
    },
  },

  {
    id: 'CONF-M-002',
    name: 'supports method matches metadata',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      for (const blockType of adapter.metadata.supportedBlockTypes) {
        assert(adapter.supports(blockType), `supports() returns false for ${blockType} but it's in metadata`);
      }

      const unsupportedType = 'custom:nonexistent' as BlockType;
      if (!adapter.metadata.supportedBlockTypes.includes(unsupportedType)) {
        assert(!adapter.supports(unsupportedType), 'supports() should return false for unsupported type');
      }
    },
  },
];
```

#### 18.4.8 Integration Tests (3 tests)

```typescript
const INTEGRATION_TESTS = [
  {
    id: 'CONF-I-001',
    name: 'end-to-end render with signals and bindings',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const schema: LiquidSchema = createFullFeaturedSchema();
      const data = createSampleData('dashboard');

      const result = await adapter.render(schema, data);

      assert(result !== null, 'Render failed');
      assert(getBlockCount(result) === schema.blocks.length, 'Block count mismatch');
    },
  },

  {
    id: 'CONF-I-002',
    name: 'streaming render produces progressive output',
    severity: 'RECOMMENDED',
    test: async (adapter: LiquidAdapter) => {
      if (!adapter.metadata.supportsStreaming) return;

      const schema: LiquidSchema = createSampleSchema(5);
      const data = {};

      const renderStream = adapter.renderStream(schema, data);
      const chunks: any[] = [];

      for await (const chunk of renderStream) {
        chunks.push(chunk);
      }

      assert(chunks.length > 1, 'Should emit multiple chunks');
      assert(chunks.length <= 7, 'Should emit at most L0 + 5 blocks + L2');
    },
  },

  {
    id: 'CONF-I-003',
    name: 'adapter handles schema updates without re-initialization',
    severity: 'RECOMMENDED',
    test: async (adapter: LiquidAdapter) => {
      const schema1: LiquidSchema = createSampleSchema(3);
      const result1 = await adapter.render(schema1, {});

      // Mutate schema
      const schema2 = applyMutation(schema1, { type: 'add', block: createSampleBlock('kpi') });
      const result2 = await adapter.render(schema2, {});

      assert(getBlockCount(result2) === 4, 'Mutation not reflected');
    },
  },
];
```

#### 18.4.9 Performance Tests (2 tests)

```typescript
const PERFORMANCE_TESTS = [
  {
    id: 'CONF-P-001',
    name: 'renders within timeout for large schemas',
    severity: 'REQUIRED',
    test: async (adapter: LiquidAdapter) => {
      const largeSchema: LiquidSchema = createSampleSchema(50); // 50 blocks
      const data = {};

      const timeout = adapter.metadata.renderTimeout || 5000;
      const startTime = Date.now();

      await adapter.render(largeSchema, data);

      const elapsed = Date.now() - startTime;
      assert(elapsed < timeout, `Render took ${elapsed}ms, timeout is ${timeout}ms`);
    },
  },

  {
    id: 'CONF-P-002',
    name: 'memory usage stays within bounds',
    severity: 'RECOMMENDED',
    test: async (adapter: LiquidAdapter) => {
      const schema: LiquidSchema = createSampleSchema(20);
      const data = createLargeDataset(1000);

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 10; i++) {
        await adapter.render(schema, data);
      }

      // Force GC if available
      if (global.gc) global.gc();

      const finalMemory = process.memoryUsage().heapUsed;
      const leaked = finalMemory - initialMemory;

      assert(leaked < 10 * 1024 * 1024, `Memory leaked: ${leaked} bytes`);
    },
  },
];
```

#### 18.4.10 Accessibility Tests (2 tests)

```typescript
const ACCESSIBILITY_TESTS = [
  {
    id: 'CONF-A-001',
    name: 'renders semantic HTML (web adapters)',
    severity: 'RECOMMENDED',
    test: async (adapter: LiquidAdapter) => {
      if (adapter.metadata.platform !== 'web') return;

      const schema: LiquidSchema = createSampleSchema(3);
      const result = adapter.render(schema, {});

      const html = renderToHTML(result);

      assert(hasSemanticTags(html), 'Should use <section>, <article>, etc.');
      assert(hasARIALabels(html), 'Should include ARIA labels');
    },
  },

  {
    id: 'CONF-A-002',
    name: 'supports keyboard navigation',
    severity: 'RECOMMENDED',
    test: async (adapter: LiquidAdapter) => {
      if (adapter.metadata.platform !== 'web') return;

      const schema: LiquidSchema = createSchemaWithInteractiveBlocks();
      const result = adapter.render(schema, {});

      const html = renderToHTML(result);
      const interactiveElements = getInteractiveElements(html);

      for (const el of interactiveElements) {
        assert(el.hasAttribute('tabindex') || el.tagName === 'BUTTON', 'Interactive elements must be keyboard accessible');
      }
    },
  },
];
```

#### 18.4.11 Certification Criteria

An adapter is **certified** if it passes:

**Required:**
- 100% of CONF-R (Rendering) tests
- 100% of CONF-E (Error Handling) tests
- 100% of CONF-D (Degradation) tests
- 100% of CONF-S (Signal) tests
- 100% of CONF-L (Layout) tests (if `supportsLayout: true`)
- 100% of CONF-B (Binding) tests
- 100% of CONF-M (Metadata) tests
- 100% of CONF-I (Integration) tests

**Recommended:**
- ≥90% of CONF-P (Performance) tests
- ≥80% of CONF-A (Accessibility) tests

**Total:** 41 tests (29 required, 12 recommended)

#### 18.4.12 Test Execution

```typescript
import { runConformanceTests } from '@liquidcode/conformance';

const adapter = new MyLiquidAdapter();

const results = await runConformanceTests(adapter, {
  strictMode: true,          // Fail on first error
  includeRecommended: true,  // Run recommended tests
  timeout: 30000,            // 30s per test
});

console.log(`Passed: ${results.passed}/${results.total}`);
console.log(`Certification: ${results.certified ? 'PASS' : 'FAIL'}`);

if (!results.certified) {
  console.error('Failed tests:');
  for (const failure of results.failures) {
    console.error(`  ${failure.id}: ${failure.error}`);
  }
}
```

### 18.5 Rendering Context (NEW)

```typescript
interface RenderContext {
  slotContext?: SlotContext;
  theme?: ThemeConfig;
  locale?: string;
  timezone?: string;
  userPreferences?: UserPreferences;
}

interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  fontFamily?: string;
  spacing?: 'compact' | 'normal' | 'relaxed';
}

interface UserPreferences {
  reducedMotion?: boolean;
  highContrast?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
}
```

### 18.6 Snapshot History Bounds (ISS-102)

Adapters rendering interfaces with Digital Twin state management MUST handle snapshot addressing edge cases gracefully:

**Required Behaviors:**
1. **Out-of-bounds negative indices:** Return null or fallback, never crash
2. **Out-of-bounds positive indices:** Return null or fallback, never crash
3. **Snapshot 0 (initial):** Always available, never pruned
4. **Error messaging:** Indicate available snapshot range when out of bounds

**Example Integration:**
```typescript
interface LiquidAdapter<RenderOutput> {
  // ... existing methods

  // NEW: Render interface at specific snapshot
  renderSnapshot?(
    sessionId: string,
    snapshotIndex: number,
    data: any,
    fallback?: SnapshotFallback
  ): RenderOutput | null;
}
```

See §8.5 (Snapshot Addressing) and §16.2 (Operation History) for complete specification.

---

## 19. Error Handling & Degradation

### 19.1 Enhanced Error Taxonomy (ISS-014)

#### 19.1.1 Error Code Format

LiquidCode uses structured error codes for precise error identification and handling:

**Format:** `LC-[CATEGORY]-[SUBCATEGORY]-[NUMBER]`

**Examples:**
- `LC-PARSE-TOKEN-001`: Tokenization error
- `LC-VAL-SCHEMA-003`: Schema validation error
- `LC-BIND-FIELD-002`: Field binding error

#### 19.1.2 Error Code Hierarchy

```
LC (LiquidCode)
├── PARSE (Parsing)
│   ├── TOKEN (Tokenization)
│   ├── SYNTAX (Syntax)
│   └── GRAMMAR (Grammar)
├── VAL (Validation)
│   ├── SCHEMA (Schema)
│   ├── TYPE (Type)
│   └── REF (Reference)
├── RES (Resolution)
│   ├── ADDR (Addressing)
│   ├── CACHE (Cache)
│   └── TIER (Tier)
├── BIND (Binding)
│   ├── FIELD (Field)
│   ├── TYPE (Type)
│   └── AGGR (Aggregation)
├── SIG (Signal)
│   ├── DECL (Declaration)
│   ├── CYCLE (Cycle)
│   └── PROP (Propagation)
├── RENDER (Rendering)
│   ├── BLOCK (Block)
│   ├── LAYOUT (Layout)
│   └── ADAPT (Adapter)
├── MIG (Migration)
│   ├── VER (Version)
│   ├── COMPAT (Compatibility)
│   └── TRANS (Transformation)
└── RUNTIME (Runtime)
    ├── STATE (State)
    ├── MEM (Memory)
    └── PERF (Performance)
```

#### 19.1.3 Complete Error Code Registry (82 codes)

**PARSE Errors (LC-PARSE-*): 11 codes**

| Code | Message | Severity | Recoverable |
|------|---------|----------|-------------|
| LC-PARSE-TOKEN-001 | Unknown character '{char}' at position {pos} | Error | Yes (skip) |
| LC-PARSE-TOKEN-002 | Unexpected end of input | Error | No |
| LC-PARSE-TOKEN-003 | Invalid Unicode escape sequence | Error | Yes (replace) |
| LC-PARSE-SYNTAX-001 | Missing semicolon after {element} | Error | Yes (insert) |
| LC-PARSE-SYNTAX-002 | Unexpected token {token}, expected {expected} | Error | Yes (skip) |
| LC-PARSE-SYNTAX-003 | Unmatched bracket at position {pos} | Error | No |
| LC-PARSE-SYNTAX-004 | Invalid block type code '{code}' | Error | Yes (custom block) |
| LC-PARSE-GRAMMAR-001 | Malformed archetype declaration | Error | No |
| LC-PARSE-GRAMMAR-002 | Invalid layout specification '{spec}' | Error | Yes (default) |
| LC-PARSE-GRAMMAR-003 | Malformed binding syntax | Error | Yes (skip binding) |
| LC-PARSE-GRAMMAR-004 | Invalid signal declaration syntax | Error | Yes (skip signal) |

**VAL Errors (LC-VAL-*): 15 codes**

| Code | Message | Severity | Recoverable |
|------|---------|----------|-------------|
| LC-VAL-SCHEMA-001 | Schema validation failed: {details} | Error | No |
| LC-VAL-SCHEMA-002 | Missing required field '{field}' | Error | No |
| LC-VAL-SCHEMA-003 | Invalid schema version '{version}' | Error | No |
| LC-VAL-SCHEMA-004 | Schema exceeds size limit ({size} > {limit}) | Error | No |
| LC-VAL-TYPE-001 | Type mismatch: expected {expected}, got {actual} | Error | Yes (coerce) |
| LC-VAL-TYPE-002 | Invalid block type '{type}' | Error | Yes (placeholder) |
| LC-VAL-TYPE-003 | Invalid signal type '{type}' | Error | Yes (custom) |
| LC-VAL-TYPE-004 | Invalid binding slot '{slot}' for block type '{type}' | Error | Yes (skip slot) |
| LC-VAL-REF-001 | Undefined reference: {ref} | Error | Yes (fallback) |
| LC-VAL-REF-002 | Circular reference detected: {path} | Error | No |
| LC-VAL-REF-003 | Ambiguous reference: {ref} matches {count} blocks | Error | Yes (first match) |
| LC-VAL-REF-004 | Invalid UID format: {uid} | Error | No |
| LC-VAL-REF-005 | Duplicate UID: {uid} | Error | No |
| LC-VAL-REF-006 | Snapshot index {index} out of bounds | Error | Yes (fallback) |
| LC-VAL-REF-007 | Invalid address format: {address} | Error | Yes (ordinal) |

**RES Errors (LC-RES-*): 10 codes**

| Code | Message | Severity | Recoverable |
|------|---------|----------|-------------|
| LC-RES-ADDR-001 | Cannot resolve address '{address}' | Error | Yes (fallback) |
| LC-RES-ADDR-002 | Address resolution timeout after {ms}ms | Error | No |
| LC-RES-ADDR-003 | Wildcard selector '{selector}' matched 0 blocks | Warning | Yes (empty) |
| LC-RES-CACHE-001 | Cache miss for intent '{intent}' | Info | Yes (tier 2) |
| LC-RES-CACHE-002 | Cache corruption detected, rebuilding | Warning | Yes (rebuild) |
| LC-RES-CACHE-003 | Cache size limit exceeded ({size} > {limit}) | Warning | Yes (evict) |
| LC-RES-TIER-001 | Tier 1 (cache) failed, trying tier 2 | Info | Yes |
| LC-RES-TIER-002 | Tier 2 (semantic) failed, trying tier 3 | Info | Yes |
| LC-RES-TIER-003 | Tier 3 (composition) failed, trying tier 4 | Info | Yes |
| LC-RES-TIER-004 | All resolution tiers failed | Error | No |

**BIND Errors (LC-BIND-*): 10 codes**

| Code | Message | Severity | Recoverable |
|------|---------|----------|-------------|
| LC-BIND-FIELD-001 | Field '{field}' not found in data | Error | Yes (substitute) |
| LC-BIND-FIELD-002 | Field '{field}' exists but is null | Warning | Yes (empty state) |
| LC-BIND-FIELD-003 | Field name contains invalid characters | Error | Yes (encode) |
| LC-BIND-TYPE-001 | Field '{field}' type mismatch: expected {expected}, got {actual} | Error | Yes (coerce) |
| LC-BIND-TYPE-002 | Cannot coerce '{value}' to type {type} | Error | Yes (null) |
| LC-BIND-TYPE-003 | Required slot '{slot}' has no binding | Error | No |
| LC-BIND-AGGR-001 | Invalid aggregation '{aggr}' for field type {type} | Error | Yes (remove aggr) |
| LC-BIND-AGGR-002 | Aggregation requires array data, got scalar | Error | Yes (wrap array) |
| LC-BIND-AGGR-003 | Empty array for aggregation | Warning | Yes (default) |
| LC-BIND-AGGR-004 | Aggregation limit exceeded ({count} > {limit}) | Warning | Yes (truncate) |

**SIG Errors (LC-SIG-*): 9 codes**

| Code | Message | Severity | Recoverable |
|------|---------|----------|-------------|
| LC-SIG-DECL-001 | Signal '{signal}' not declared in registry | Error | Yes (auto-declare) |
| LC-SIG-DECL-002 | Duplicate signal declaration: {signal} | Error | No |
| LC-SIG-DECL-003 | Invalid signal type '{type}' | Error | Yes (custom) |
| LC-SIG-CYCLE-001 | Circular signal dependency: {path} | Error | No |
| LC-SIG-CYCLE-002 | Signal propagation depth exceeded ({depth} > {limit}) | Error | Yes (halt) |
| LC-SIG-PROP-001 | Signal propagation timeout after {ms}ms | Error | Yes (halt) |
| LC-SIG-PROP-002 | Signal value validation failed: {details} | Warning | Yes (default) |
| LC-SIG-PROP-003 | Signal persistence failed: {reason} | Warning | Yes (continue) |
| LC-SIG-PROP-004 | Signal deserialization failed: {reason} | Warning | Yes (default) |

**RENDER Errors (LC-RENDER-*): 10 codes**

| Code | Message | Severity | Recoverable |
|------|---------|----------|-------------|
| LC-RENDER-BLOCK-001 | Block rendering failed: {reason} | Error | Yes (placeholder) |
| LC-RENDER-BLOCK-002 | Unsupported block type '{type}' | Warning | Yes (placeholder) |
| LC-RENDER-BLOCK-003 | Block render timeout after {ms}ms | Error | Yes (placeholder) |
| LC-RENDER-LAYOUT-001 | Layout constraint solver failed: {reason} | Error | Yes (fallback) |
| LC-RENDER-LAYOUT-002 | Grid position out of bounds: {pos} | Error | Yes (reposition) |
| LC-RENDER-LAYOUT-003 | Layout calculation timeout | Error | Yes (default layout) |
| LC-RENDER-ADAPT-001 | Adapter not found for platform '{platform}' | Error | No |
| LC-RENDER-ADAPT-002 | Adapter version mismatch: {actual} vs {expected} | Error | No |
| LC-RENDER-ADAPT-003 | Adapter initialization failed: {reason} | Error | No |
| LC-RENDER-ADAPT-004 | Adapter crashed during render: {error} | Error | Yes (fallback) |

**MIG Errors (LC-MIG-*): 9 codes**

| Code | Message | Severity | Recoverable |
|------|---------|----------|-------------|
| LC-MIG-VER-001 | Unsupported schema version: {version} | Error | No |
| LC-MIG-VER-002 | Migration path not found: {from} → {to} | Error | No |
| LC-MIG-VER-003 | Schema version downgrade not supported | Error | No |
| LC-MIG-COMPAT-001 | Incompatible schema format | Error | No |
| LC-MIG-COMPAT-002 | Breaking changes detected, manual migration required | Error | No |
| LC-MIG-COMPAT-003 | Deprecated feature used: {feature} | Warning | Yes (migrate) |
| LC-MIG-TRANS-001 | Migration transformation failed: {reason} | Error | No |
| LC-MIG-TRANS-002 | Migration validation failed: {details} | Error | No |
| LC-MIG-TRANS-003 | Migration produced invalid schema | Error | No |

**RUNTIME Errors (LC-RUNTIME-*): 8 codes**

| Code | Message | Severity | Recoverable |
|------|---------|----------|-------------|
| LC-RUNTIME-STATE-001 | State corruption detected | Error | Yes (rebuild) |
| LC-RUNTIME-STATE-002 | Undo stack empty | Warning | Yes (no-op) |
| LC-RUNTIME-STATE-003 | Redo stack empty | Warning | Yes (no-op) |
| LC-RUNTIME-MEM-001 | Memory limit exceeded ({used} > {limit}) | Error | Yes (evict) |
| LC-RUNTIME-MEM-002 | Session evicted due to inactivity | Info | Yes (restore) |
| LC-RUNTIME-MEM-003 | Heap size critical ({percent}% used) | Warning | Yes (GC) |
| LC-RUNTIME-PERF-001 | Operation timeout after {ms}ms | Error | Yes (abort) |
| LC-RUNTIME-PERF-002 | Performance degraded: {metric} below threshold | Warning | No |

#### 19.1.4 Error Factory

```typescript
class LiquidError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public severity: 'error' | 'warning' | 'info',
    public recoverable: boolean,
    public context?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'LiquidError';
  }
}

// Factory functions
const LiquidErrors = {
  parse: {
    unknownCharacter: (char: string, pos: number) =>
      new LiquidError(
        'LC-PARSE-TOKEN-001',
        `Unknown character '${char}' at position ${pos}`,
        'error',
        true,
        { char, pos }
      ),

    missingSemicolon: (element: string) =>
      new LiquidError(
        'LC-PARSE-SYNTAX-001',
        `Missing semicolon after ${element}`,
        'error',
        true,
        { element }
      ),
  },

  validation: {
    fieldNotFound: (field: string) =>
      new LiquidError(
        'LC-BIND-FIELD-001',
        `Field '${field}' not found in data`,
        'error',
        true,
        { field }
      ),

    signalCycle: (path: string[]) =>
      new LiquidError(
        'LC-SIG-CYCLE-001',
        `Circular signal dependency: ${path.join(' → ')}`,
        'error',
        false,
        { path }
      ),
  },

  // ... other categories
};
```

#### 19.1.5 Error Usage Examples

```typescript
// Throwing errors
if (!dataFingerprint.hasField(field)) {
  throw LiquidErrors.validation.fieldNotFound(field);
}

// Catching and recovering
try {
  resolveAddress(selector, schema);
} catch (err) {
  if (err instanceof LiquidError && err.recoverable) {
    console.warn(`Recovered from error: ${err.message}`);
    // Apply recovery strategy
    return fallbackResolution(selector);
  }
  throw err;
}

// Logging with context
const err = LiquidErrors.parse.unknownCharacter('©', 42);
logger.error(err.message, {
  code: err.code,
  severity: err.severity,
  context: err.context,
});
```

#### 19.1.6 Error Response Format

```typescript
interface ErrorResponse {
  code: ErrorCode;
  message: string;
  severity: 'error' | 'warning' | 'info';
  recoverable: boolean;
  context?: Record<string, unknown>;
  suggestion?: string;
  timestamp: string;
  requestId?: string;
}

// Example
{
  "code": "LC-BIND-FIELD-001",
  "message": "Field 'revenu' not found in data",
  "severity": "error",
  "recoverable": true,
  "context": {
    "field": "revenu",
    "availableFields": ["revenue", "orders", "profit"]
  },
  "suggestion": "Did you mean 'revenue'? (Levenshtein distance: 1)",
  "timestamp": "2025-12-22T10:30:00Z",
  "requestId": "req_abc123"
}
```

### 19.2 Graceful Degradation

```
Level 1: Perfect render (everything works)
Level 2: Partial render (some blocks as placeholders)
Level 3: Fallback template (safe default layout)
Level 4: Host crash (NEVER acceptable - see B.3.1)
```

### 19.3 Never-Broken Guarantee

**Claim:** Any valid LiquidSchema renders successfully.

**Mechanism:**
1. Compilation validates all references
2. Unknown block types render as placeholders
3. Missing data shows "No data" state
4. Signal failures fall back to defaults

**Result:** 100% render success rate for validated schemas.

### 19.4 Block Type Fallback (ISS-110)

**Problem:** What happens when an adapter encounters a block type it doesn't recognize?

**Solution: Graceful Degradation with Informative Placeholders**

#### 19.4.1 Block Type Support Detection

```typescript
interface LiquidAdapter<T> {
  supports(blockType: BlockType): boolean;
  getSupportedBlockTypes(): BlockType[];
  getUnsupportedReason(blockType: BlockType): string | null;
}
```

#### 19.4.2 Fallback Strategy

```typescript
enum FallbackStrategy {
  PLACEHOLDER = 'placeholder',      // Show placeholder with message
  CLOSEST_TYPE = 'closest_type',    // Use most similar supported type
  CUSTOM_HANDLER = 'custom_handler',// User-defined fallback
  FAIL = 'fail',                    // Throw error (strict mode)
}

interface FallbackOptions {
  strategy: FallbackStrategy;
  customHandler?: (block: Block) => RenderOutput;
  showReason: boolean;              // Show why block couldn't render
  allowPartial: boolean;            // Allow partial schema render
}
```

#### 19.4.3 Placeholder Rendering

```typescript
interface Placeholder {
  blockType: string;
  reason: string;
  suggestions?: string[];
  canEdit?: boolean;
  fallbackData?: unknown;
}

function renderPlaceholder(
  adapter: LiquidAdapter,
  block: Block,
  reason: string
): Placeholder {
  return {
    blockType: block.type,
    reason,
    suggestions: findSimilarBlockTypes(adapter, block.type),
    canEdit: true,
    fallbackData: block.binding ? extractFallbackData(block.binding) : null,
  };
}

function findSimilarBlockTypes(
  adapter: LiquidAdapter,
  unsupportedType: BlockType
): string[] {
  const supported = adapter.getSupportedBlockTypes();

  // Match by category
  const category = getBlockCategory(unsupportedType);
  const categoryMatches = supported.filter(t => getBlockCategory(t) === category);

  if (categoryMatches.length > 0) {
    return categoryMatches.slice(0, 3);
  }

  // Match by name similarity
  return supported
    .map(t => ({ type: t, distance: levenshteinDistance(unsupportedType, t) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(x => x.type);
}
```

#### 19.4.4 Closest Type Fallback

```typescript
function renderWithClosestType(
  adapter: LiquidAdapter,
  block: Block
): RenderOutput {
  const category = getBlockCategory(block.type);

  const fallbackMap: Record<BlockCategory, BlockType> = {
    'Atomic Data': 'text',        // Unknown chart → text
    'Layout': 'stack',            // Unknown layout → stack
    'Interactive': 'text',        // Unknown filter → text (read-only)
    'Composite': 'grid',          // Unknown composite → grid
  };

  const fallbackType = fallbackMap[category] || 'text';

  const fallbackBlock: Block = {
    ...block,
    type: fallbackType,
    // Preserve binding if compatible
    binding: isBindingCompatible(block.binding, fallbackType)
      ? block.binding
      : undefined,
  };

  return adapter.renderBlock(fallbackBlock, {});
}
```

#### 19.4.5 User Notification

```typescript
interface UnsupportedBlockNotification {
  blockUid: string;
  blockType: BlockType;
  reason: string;
  fallbackUsed: BlockType | 'placeholder';
  actionable: boolean;
  actions?: UserAction[];
}

interface UserAction {
  label: string;
  action: 'replace' | 'remove' | 'upgrade_adapter' | 'ignore';
  target?: BlockType;
}

// Example notification
{
  "blockUid": "b_abc123",
  "blockType": "custom:heatmap",
  "reason": "Block type 'custom:heatmap' not supported by react-adapter v1.2.0",
  "fallbackUsed": "placeholder",
  "actionable": true,
  "actions": [
    {
      "label": "Replace with pie-chart",
      "action": "replace",
      "target": "pie-chart"
    },
    {
      "label": "Remove block",
      "action": "remove"
    },
    {
      "label": "Upgrade adapter (v1.3.0 adds heatmap)",
      "action": "upgrade_adapter"
    }
  ]
}
```

#### 19.4.6 Versioned Block Type Support

```typescript
interface BlockTypeRegistry {
  getMinimumAdapterVersion(blockType: BlockType): string | null;
  isDeprecated(blockType: BlockType): boolean;
  getDeprecationInfo(blockType: BlockType): DeprecationInfo | null;
}

interface DeprecationInfo {
  deprecatedIn: string;     // Version
  removedIn?: string;       // Version (if scheduled)
  replacement: BlockType;
  migrationGuide?: string;
}

// Example
{
  "custom:legacy-table": {
    "deprecatedIn": "2.0.0",
    "removedIn": "3.0.0",
    "replacement": "data-table",
    "migrationGuide": "https://docs.liquidcode.dev/migration/legacy-table"
  }
}
```

#### 19.4.7 Adapter Capability Negotiation

```typescript
interface AdapterCapabilities {
  blockTypes: {
    supported: BlockType[];
    experimental: BlockType[];
    deprecated: BlockType[];
  };
  features: {
    signals: boolean;
    streaming: boolean;
    layout: boolean;
  };
  version: string;
}

function negotiateCapabilities(
  schema: LiquidSchema,
  adapter: LiquidAdapter
): NegotiationResult {
  const requiredTypes = extractBlockTypes(schema);
  const unsupported = requiredTypes.filter(t => !adapter.supports(t));

  if (unsupported.length === 0) {
    return { compatible: true };
  }

  return {
    compatible: false,
    unsupportedTypes: unsupported,
    suggestions: [
      `Upgrade adapter to v${getMinimumVersion(unsupported)}`,
      `Replace unsupported blocks with: ${getSuggestedReplacements(unsupported).join(', ')}`,
      `Use fallback rendering (some blocks will be placeholders)`,
    ],
  };
}
```

### 19.5 Additional Edge Cases (ISS-111)

#### 19.5.1 Empty Collections in Aggregations

**Problem:** What happens when aggregating an empty array?

**Solution:**
```typescript
interface AggregateResult {
  value: number | null;
  isEmpty: boolean;
  count: number;
}

function aggregate(
  data: unknown[],
  fn: AggregateFunction
): AggregateResult {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      value: getAggregateDefault(fn),
      isEmpty: true,
      count: 0,
    };
  }

  return {
    value: fn(data),
    isEmpty: false,
    count: data.length,
  };
}

function getAggregateDefault(fn: AggregateFunction): number | null {
  const defaults: Record<AggregateSpec, number | null> = {
    sum: 0,          // Empty sum = 0
    count: 0,        // Empty count = 0
    avg: null,       // Empty average = null (undefined)
    min: null,       // Empty min = null
    max: null,       // Empty max = null
    first: null,     // Empty first = null
    last: null,      // Empty last = null
  };

  return defaults[fn.name];
}
```

**Rendering:**
```typescript
if (aggregateResult.isEmpty) {
  return renderEmptyState({
    message: 'No data available for aggregation',
    icon: 'empty-chart',
    actions: ['Adjust filters', 'Select different date range'],
  });
}
```

#### 19.5.2 Deeply Nested Null Checks

**Problem:** Accessing `data.a.b.c.d` when `a.b` is null.

**Solution: Safe Navigation**
```typescript
function safeGet(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current == null) return null;
    current = current[part];
  }

  return current;
}

// In binding resolution
const value = safeGet(data, binding.field);
if (value === null || value === undefined) {
  return renderEmptyState({ message: 'Data not available' });
}
```

#### 19.5.3 Malformed Data Structures

**Problem:** Expected array, got object; expected object, got string.

**Solution: Type Guards with Coercion**
```typescript
function coerceToExpectedShape(
  value: unknown,
  expected: 'scalar' | 'array' | 'object'
): unknown {
  switch (expected) {
    case 'scalar':
      if (Array.isArray(value)) return value[0] ?? null;
      if (typeof value === 'object') return null;
      return value;

    case 'array':
      if (Array.isArray(value)) return value;
      if (value == null) return [];
      return [value]; // Wrap scalar in array

    case 'object':
      if (typeof value === 'object' && !Array.isArray(value)) return value;
      return {}; // Cannot coerce to object
  }
}

// Usage in block rendering
const tableData = coerceToExpectedShape(data, 'array') as unknown[];
if (tableData.length === 0) {
  return renderEmptyState({ message: 'No rows to display' });
}
```

#### 19.5.4 Infinite/NaN in Numeric Calculations

**Problem:** Division by zero, log of negative, etc.

**Solution: Math Safety**
```typescript
function safeDivide(a: number, b: number): number | null {
  if (b === 0) return null;
  const result = a / b;
  return Number.isFinite(result) ? result : null;
}

function safeLog(x: number): number | null {
  if (x <= 0) return null;
  const result = Math.log(x);
  return Number.isFinite(result) ? result : null;
}

// In transform execution
const result = safeDivide(revenue, orders);
if (result === null) {
  return renderPlaceholder({
    message: 'Cannot compute average (division by zero)',
    value: '—',
  });
}
```

#### 19.5.5 Unicode Handling in String Operations

**Problem:** Field name `"Montant (€)"` has special characters.

**Solution: Normalization + Encoding (see §6.6)**
```typescript
function normalizeFieldName(name: string): string {
  // Already specified in §6.6.2
  return name.normalize('NFC');
}

function quoteFieldName(name: string): string {
  // Already specified in §6.6.3
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return name; // No quoting needed
  }
  return `"${name.replace(/"/g, '\\"')}"`;
}
```

#### 19.5.6 Concurrent Mutations to Same Block

**Problem:** User and auto-correction both modify same block simultaneously.

**Solution: Last-Write-Wins with Conflict Detection**
```typescript
interface MutationContext {
  userId?: string;
  source: 'user' | 'auto' | 'llm';
  timestamp: number;
  baseSnapshotIndex: number;
}

function applyMutationWithConflictDetection(
  twin: DigitalTwin,
  mutation: Operation,
  context: MutationContext
): MutationResult {
  const currentIndex = twin.history.getCurrentIndex();

  if (context.baseSnapshotIndex < currentIndex) {
    // Mutation based on old state - check for conflicts
    const intermediateOps = twin.history.listOperations(
      context.baseSnapshotIndex + 1,
      currentIndex
    );

    const conflicting = intermediateOps.find(op =>
      op.operation.targetUid === mutation.targetUid &&
      op.timestamp > context.timestamp - 1000 // Within 1s
    );

    if (conflicting) {
      return {
        success: false,
        error: LiquidErrors.runtime.conflict(mutation.targetUid),
        suggestion: 'Refresh and retry',
      };
    }
  }

  return applyMutation(twin, mutation);
}
```

#### 19.5.7 Schema Size Limits

**Problem:** User generates 10,000-block interface.

**Solution: Size Limits with Graceful Handling**
```typescript
const SCHEMA_LIMITS = {
  maxBlocks: 100,
  maxSignals: 50,
  maxNestingDepth: 10,
  maxSchemaSize: 1024 * 1024, // 1MB
};

function validateSchemaSize(schema: LiquidSchema): ValidationResult {
  const errors: string[] = [];

  if (schema.blocks.length > SCHEMA_LIMITS.maxBlocks) {
    errors.push(`Schema has ${schema.blocks.length} blocks, limit is ${SCHEMA_LIMITS.maxBlocks}`);
  }

  const depth = calculateNestingDepth(schema);
  if (depth > SCHEMA_LIMITS.maxNestingDepth) {
    errors.push(`Nesting depth ${depth} exceeds limit ${SCHEMA_LIMITS.maxNestingDepth}`);
  }

  const size = JSON.stringify(schema).length;
  if (size > SCHEMA_LIMITS.maxSchemaSize) {
    errors.push(`Schema size ${size} bytes exceeds limit ${SCHEMA_LIMITS.maxSchemaSize}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## 20. Versioning & Migration

### 20.1 Schema Versioning

```typescript
interface LiquidSchema {
  version: "2.0";  // Schema version
  // ...
}
```

### 20.2 Version Compatibility

| Schema Version | Engine Version | Compatibility |
|----------------|----------------|---------------|
| 1.x | 2.x | Read-only (migration available) |
| 2.x | 2.x | Full support |
| 3.x | 2.x | Forward-compatible fields ignored |

### 20.3 Enhanced Migration Algorithms (ISS-013, ISS-036)

#### 20.3.1 Version Detection

```typescript
function detectSchemaVersion(schema: unknown): string {
  if (typeof schema !== 'object' || schema === null) {
    throw new Error('Invalid schema: not an object');
  }

  const s = schema as Record<string, unknown>;

  // Explicit version field (v2+)
  if (typeof s.version === 'string') {
    return s.version;
  }

  // Heuristic detection for v1
  if ('layout' in s && 'blocks' in s && !('scope' in s)) {
    return '1.0';
  }

  throw new Error('Cannot detect schema version');
}
```

#### 20.3.2 Migration Interface

```typescript
/**
 * Migration Interface
 *
 * Provides transformation between LiquidSchema versions.
 * All migrations MUST be:
 * - Deterministic (same input → same output)
 * - Total (never throw for valid input schema)
 * - Documented (provide change log)
 */

interface Migration {
  // Version identification
  from: string;                      // Source version (e.g., "1.0")
  to: string;                        // Target version (e.g., "2.0")

  // Metadata
  id: string;                        // Unique migration ID
  description: string;               // Human-readable description
  breaking: boolean;                 // Whether migration is breaking

  // Core transformation
  migrate(schema: unknown): MigrationResult;

  // Validation
  canMigrate(schema: unknown): boolean;

  // Utilities
  getChangelog(): ChangelogEntry[];
  estimateComplexity(schema: unknown): MigrationComplexity;
}

interface MigrationResult {
  success: boolean;
  schema?: LiquidSchema;             // Migrated schema (if success)
  errors?: MigrationError[];         // Errors (if failure)
  warnings?: MigrationWarning[];     // Non-fatal issues
  metadata: MigrationMetadata;
}

interface MigrationError {
  code: string;
  message: string;
  path?: string;                     // JSONPath to problematic field
  fixable: boolean;
  suggestion?: string;
}

interface MigrationWarning {
  code: string;
  message: string;
  path?: string;
  impact: 'low' | 'medium' | 'high';
}

interface MigrationMetadata {
  migratedAt: string;                // ISO timestamp
  fromVersion: string;
  toVersion: string;
  changeCount: number;               // Number of transformations applied
  duration: number;                  // Migration time in ms
}

interface ChangelogEntry {
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed';
  description: string;
  breaking: boolean;
  affectedFields?: string[];
}

type MigrationComplexity = 'simple' | 'moderate' | 'complex';
```

#### 20.3.3 Migration Registry

```typescript
interface MigrationRegistry {
  register(migration: Migration): void;
  get(from: string, to: string): Migration | null;
  findPath(from: string, to: string): Migration[] | null;
  listAvailable(): MigrationInfo[];
}

interface MigrationInfo {
  from: string;
  to: string;
  id: string;
  description: string;
  breaking: boolean;
}

class DefaultMigrationRegistry implements MigrationRegistry {
  private migrations = new Map<string, Migration>();

  register(migration: Migration): void {
    const key = `${migration.from}->${migration.to}`;
    if (this.migrations.has(key)) {
      throw new Error(`Migration ${key} already registered`);
    }
    this.migrations.set(key, migration);
  }

  get(from: string, to: string): Migration | null {
    return this.migrations.get(`${from}->${to}`) || null;
  }

  findPath(from: string, to: string): Migration[] | null {
    // BFS to find shortest migration path
    const queue: { version: string; path: Migration[] }[] = [
      { version: from, path: [] },
    ];
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const { version, path } = queue.shift()!;

      if (version === to) {
        return path;
      }

      // Find all migrations from current version
      for (const [key, migration] of this.migrations) {
        if (migration.from === version && !visited.has(migration.to)) {
          visited.add(migration.to);
          queue.push({
            version: migration.to,
            path: [...path, migration],
          });
        }
      }
    }

    return null; // No path found
  }

  listAvailable(): MigrationInfo[] {
    return Array.from(this.migrations.values()).map(m => ({
      from: m.from,
      to: m.to,
      id: m.id,
      description: m.description,
      breaking: m.breaking,
    }));
  }
}
```

#### 20.3.4 Migration Executor

```typescript
interface MigrationExecutor {
  execute(schema: unknown, targetVersion: string): MigrationResult;
  validateMigration(schema: unknown, migration: Migration): ValidationResult;
}

class DefaultMigrationExecutor implements MigrationExecutor {
  constructor(private registry: MigrationRegistry) {}

  execute(schema: unknown, targetVersion: string): MigrationResult {
    const currentVersion = detectSchemaVersion(schema);

    if (currentVersion === targetVersion) {
      return {
        success: true,
        schema: schema as LiquidSchema,
        metadata: {
          migratedAt: new Date().toISOString(),
          fromVersion: currentVersion,
          toVersion: targetVersion,
          changeCount: 0,
          duration: 0,
        },
      };
    }

    const path = this.registry.findPath(currentVersion, targetVersion);

    if (!path) {
      return {
        success: false,
        errors: [
          {
            code: 'LC-MIG-VER-002',
            message: `No migration path from ${currentVersion} to ${targetVersion}`,
            fixable: false,
          },
        ],
        metadata: {
          migratedAt: new Date().toISOString(),
          fromVersion: currentVersion,
          toVersion: targetVersion,
          changeCount: 0,
          duration: 0,
        },
      };
    }

    // Execute migration path
    const startTime = Date.now();
    let current = schema;
    let totalChanges = 0;
    const allWarnings: MigrationWarning[] = [];

    for (const migration of path) {
      const result = migration.migrate(current);

      if (!result.success) {
        return {
          ...result,
          metadata: {
            ...result.metadata,
            duration: Date.now() - startTime,
          },
        };
      }

      current = result.schema!;
      totalChanges += result.metadata.changeCount;
      if (result.warnings) {
        allWarnings.push(...result.warnings);
      }
    }

    return {
      success: true,
      schema: current as LiquidSchema,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
      metadata: {
        migratedAt: new Date().toISOString(),
        fromVersion: currentVersion,
        toVersion: targetVersion,
        changeCount: totalChanges,
        duration: Date.now() - startTime,
      },
    };
  }

  validateMigration(schema: unknown, migration: Migration): ValidationResult {
    if (!migration.canMigrate(schema)) {
      return {
        valid: false,
        errors: [
          {
            code: 'LC-MIG-COMPAT-001',
            message: `Schema cannot be migrated with ${migration.id}`,
            fixable: false,
          },
        ],
      };
    }

    return { valid: true };
  }
}
```

#### 20.3.5 V1 to V2 Migration Algorithm

**Complete Implementation:**

```typescript
const Migration_v1_to_v2: Migration = {
  from: '1.0',
  to: '2.0',
  id: 'v1-to-v2',
  description: 'Migrate LiquidSchema v1.0 to v2.0',
  breaking: true,

  canMigrate(schema: unknown): boolean {
    if (typeof schema !== 'object' || schema === null) return false;
    const s = schema as Record<string, unknown>;
    return !('version' in s) && 'layout' in s && 'blocks' in s;
  },

  migrate(schema: unknown): MigrationResult {
    const startTime = Date.now();
    const errors: MigrationError[] = [];
    const warnings: MigrationWarning[] = [];
    let changeCount = 0;

    try {
      const v1 = schema as V1Schema;

      // Generate UIDs for all blocks
      const blockUidMap = new Map<string, string>();
      const blocks = migrateBlocks(v1.blocks, blockUidMap, warnings);
      changeCount += blocks.length;

      // Migrate layout
      const layout = migrateLayout(v1.layout);
      changeCount++;

      // Migrate signals (if present)
      const signals = migrateSignals(v1.signals, blockUidMap, warnings);
      if (signals) changeCount++;

      // Construct v2 schema
      const v2: LiquidSchema = {
        version: '2.0',
        scope: 'interface',
        uid: generateSchemaUID(),
        title: v1.title || 'Untitled Interface',
        description: v1.description,
        generatedAt: new Date().toISOString(),
        layout,
        blocks,
        signals,
      };

      // Validate migrated schema
      const validation = validateSchema(v2);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors.map(e => ({
            code: 'LC-MIG-TRANS-003',
            message: e,
            fixable: false,
          })),
          metadata: {
            migratedAt: new Date().toISOString(),
            fromVersion: '1.0',
            toVersion: '2.0',
            changeCount,
            duration: Date.now() - startTime,
          },
        };
      }

      return {
        success: true,
        schema: v2,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          migratedAt: new Date().toISOString(),
          fromVersion: '1.0',
          toVersion: '2.0',
          changeCount,
          duration: Date.now() - startTime,
        },
      };
    } catch (err) {
      return {
        success: false,
        errors: [
          {
            code: 'LC-MIG-TRANS-001',
            message: `Migration failed: ${err.message}`,
            fixable: false,
          },
        ],
        metadata: {
          migratedAt: new Date().toISOString(),
          fromVersion: '1.0',
          toVersion: '2.0',
          changeCount,
          duration: Date.now() - startTime,
        },
      };
    }
  },

  getChangelog(): ChangelogEntry[] {
    return [
      {
        type: 'added',
        description: 'Added required "version" field',
        breaking: true,
        affectedFields: ['version'],
      },
      {
        type: 'added',
        description: 'Added required "scope" field',
        breaking: true,
        affectedFields: ['scope'],
      },
      {
        type: 'added',
        description: 'Added "uid" field to all blocks',
        breaking: true,
        affectedFields: ['blocks[*].uid'],
      },
      {
        type: 'changed',
        description: 'Renamed "SlotMap" type to inline Record<string, Block[]>',
        breaking: false,
        affectedFields: ['blocks[*].slots'],
      },
      {
        type: 'changed',
        description: 'Signal persistence now includes "url" | "session" | "local" | "none"',
        breaking: false,
        affectedFields: ['signals[*].persist'],
      },
      {
        type: 'added',
        description: 'Added layout and constraints fields to blocks',
        breaking: false,
        affectedFields: ['blocks[*].layout', 'blocks[*].constraints'],
      },
    ];
  },

  estimateComplexity(schema: unknown): MigrationComplexity {
    const s = schema as V1Schema;
    const blockCount = s.blocks?.length || 0;
    const signalCount = Object.keys(s.signals || {}).length;

    if (blockCount > 50 || signalCount > 20) return 'complex';
    if (blockCount > 20 || signalCount > 10) return 'moderate';
    return 'simple';
  },
};

// Helper functions
function migrateBlocks(
  v1Blocks: V1Block[],
  uidMap: Map<string, string>,
  warnings: MigrationWarning[]
): Block[] {
  return v1Blocks.map((v1Block, index) => {
    const uid = generateBlockUID();
    uidMap.set(v1Block.id || `block_${index}`, uid);

    const block: Block = {
      uid,
      type: v1Block.type,
      id: v1Block.id,
      binding: v1Block.binding,
      slots: v1Block.slots ? migrateSlots(v1Block.slots, uidMap, warnings) : undefined,
      signals: v1Block.signals,
    };

    return block;
  });
}

function migrateLayout(v1Layout: V1Layout): LayoutBlock {
  // V1 layouts were simpler; upgrade to v2 structure
  return {
    type: v1Layout.type || 'grid',
    // ... additional layout fields
  };
}

function migrateSignals(
  v1Signals: V1SignalRegistry | undefined,
  uidMap: Map<string, string>,
  warnings: MigrationWarning[]
): SignalRegistry | undefined {
  if (!v1Signals) return undefined;

  const v2Signals: SignalRegistry = {};

  for (const [name, v1Signal] of Object.entries(v1Signals)) {
    v2Signals[name] = {
      type: v1Signal.type,
      default: v1Signal.default,
      persist: v1Signal.persist || 'none', // Default to none if not specified
    };
  }

  return v2Signals;
}

function generateSchemaUID(): string {
  return `s_${randomString(12)}`;
}

function generateBlockUID(): string {
  return `b_${randomString(12)}`;
}

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
```

#### 20.3.6 Usage Example

```typescript
const registry = new DefaultMigrationRegistry();
registry.register(Migration_v1_to_v2);

const executor = new DefaultMigrationExecutor(registry);

// Migrate a v1 schema
const v1Schema = loadV1Schema();
const result = executor.execute(v1Schema, '2.0');

if (result.success) {
  console.log('Migration successful!');
  console.log(`Applied ${result.metadata.changeCount} changes in ${result.metadata.duration}ms`);

  if (result.warnings) {
    console.warn('Warnings:');
    result.warnings.forEach(w => console.warn(`  - ${w.message}`));
  }

  saveSchema(result.schema);
} else {
  console.error('Migration failed:');
  result.errors?.forEach(e => console.error(`  - ${e.message}`));
}
```

#### 20.3.7 Backward Compatibility (Optional)

For read-only backward compatibility, adapters MAY provide v2→v1 migration:

```typescript
const Migration_v2_to_v1: Migration = {
  from: '2.0',
  to: '1.0',
  id: 'v2-to-v1-readonly',
  description: 'Export v2 schema as v1 (read-only)',
  breaking: true, // Loses v2 features

  migrate(schema: unknown): MigrationResult {
    const v2 = schema as LiquidSchema;

    // Remove v2-only fields
    const v1: V1Schema = {
      title: v2.title,
      description: v2.description,
      layout: downgradeLayout(v2.layout),
      blocks: downgradeBlocks(v2.blocks),
      signals: downgradeSignals(v2.signals),
    };

    return {
      success: true,
      schema: v1 as any,
      warnings: [
        {
          code: 'LC-MIG-COMPAT-003',
          message: 'UIDs removed (not supported in v1)',
          impact: 'high',
        },
        {
          code: 'LC-MIG-COMPAT-003',
          message: 'Layout constraints removed (not supported in v1)',
          impact: 'medium',
        },
      ],
      metadata: {
        migratedAt: new Date().toISOString(),
        fromVersion: '2.0',
        toVersion: '1.0',
        changeCount: v2.blocks.length + 1,
        duration: 0,
      },
    };
  },

  // ... other methods
};
```

#### 20.3.8 Migration Testing

```typescript
describe('Migration v1 to v2', () => {
  it('should migrate valid v1 schema', () => {
    const v1: V1Schema = createSampleV1Schema();
    const result = Migration_v1_to_v2.migrate(v1);

    expect(result.success).toBe(true);
    expect(result.schema.version).toBe('2.0');
    expect(result.schema.blocks.every(b => b.uid)).toBe(true);
  });

  it('should handle missing optional fields', () => {
    const v1: V1Schema = {
      layout: { type: 'grid' },
      blocks: [{ type: 'kpi' }],
    };

    const result = Migration_v1_to_v2.migrate(v1);

    expect(result.success).toBe(true);
    expect(result.schema.title).toBe('Untitled Interface');
  });

  it('should generate unique UIDs', () => {
    const v1: V1Schema = createSchemaWithManyBlocks(100);
    const result = Migration_v1_to_v2.migrate(v1);

    const uids = result.schema.blocks.map(b => b.uid);
    const uniqueUids = new Set(uids);

    expect(uniqueUids.size).toBe(uids.length);
  });

  it('should validate migrated schema', () => {
    const v1: V1Schema = createInvalidV1Schema(); // Missing required fields
    const result = Migration_v1_to_v2.migrate(v1);

    // Migration should detect validation errors
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });
});
```

### 20.4 Adapter Version Matching

Adapters declare supported schema versions:

```typescript
metadata.supportedSchemaVersions = ["2.x"];
```

Engine selects compatible adapter or provides migration.

---

**End of LiquidCode Specification v2.1 - Part 3**
