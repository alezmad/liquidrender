# LLM Context Framework Vision

> A lean context framework for software development, optimized for LLM cognition.

---

## Core Philosophy

### The Fundamental Insight

**Context is not storage. Context is externalized cognition.**

A senior developer doesn't carry the entire codebase in their head. They carry:
- **Wisdom**: What patterns work, what to avoid
- **Orientation**: Where things are, how they connect
- **Judgment**: When to dig deeper, when to trust

The goal isn't to give an LLM more data. It's to give it **crystallized intelligence** — the kind that takes humans years to develop.

### The Five Laws

1. **Cache the wisdom, not the data**
   - Derived answers > raw files
   - Compute once, read forever

2. **Stable = important**
   - What changes rarely is foundational
   - What changes often is noise

3. **Trust is earned, not assumed**
   - Code > Specs > Intentions > Explorations
   - Runtime truth > Written intentions

4. **Compress ruthlessly**
   - Every token must earn its place
   - Expand on demand, never preemptively

5. **Shape for the task**
   - Context is assembled per-task, not per-project
   - Different tasks need different views

---

## The Confidence Hierarchy

Not all context is equally trustworthy. The framework assigns confidence levels to all sources.

### Trust Levels

| Level | Source | Confidence | Notes |
|-------|--------|------------|-------|
| **Verified Runtime** | Test results, compiler output, actual behavior | 1.0 | Cannot lie |
| **Committed Code** | Type definitions, implementations, schemas | 0.95 | Git is truth |
| **Curated Framework** | CLAUDE.md, rules.yaml, ORIENTATION.md | 0.85 | Intentionally stable |
| **Architecture Decisions** | _bmad-output/architecture.md, ADRs | 0.80 | Changes rarely |
| **Specifications (fresh)** | PRD, vision, specs < 30 days aligned | 0.75 | Intent documents |
| **Cached Wisdom** | wisdom/*.md (AI-derived) | 0.70 | Verified when created |
| **External Docs (authoritative)** | MCP-fetched, official docs | 0.65 | May be version-mismatched |
| **User Instructions (clear)** | Explicit, specific requests | 0.60 | May not be optimal path |
| **Specifications (stale)** | Specs with code divergence | 0.50 | Check code first |
| **User Instructions (vague)** | Incomplete, ambiguous intent | 0.45 | Clarify before acting |
| **External Docs (unverified)** | Web fetches, local folders | 0.40 | Verify applicability |
| **Uncommitted Code** | WIP changes, experimental | 0.30 | May be reverted |
| **Exploration** | .scratch/, hypotheticals | 0.20 | Never authoritative |

### Conflict Resolution

```
RULE 1: Higher confidence wins (with exceptions)
RULE 2: User intent can override, but flag the conflict
RULE 3: When uncertain, CLARIFY don't ASSUME
```

**Examples:**

| Conflict | Resolution |
|----------|------------|
| Spec says REST, code uses GraphQL | Code wins. Flag: "Update spec?" |
| User says Redux, architecture says React Query | Flag conflict. Ask: "Proceed anyway?" |
| Cached wisdom outdated by new code | Code wins. Update wisdom. |
| User instruction is vague | Clarify. Don't assume. |

---

## The Decay Model

### Core Principle

**Decay measures DRIFT, not TIME.**

- Time is a proxy for drift
- If no one's working, there's no drift
- Calendar time alone does NOT trigger decay

### What Triggers Decay

| Source | Decay Triggers | Does NOT Trigger |
|--------|----------------|------------------|
| **Specifications** | Code commits without spec update, dependency changes, architecture changes | Calendar time alone |
| **Cached Wisdom** | Source files modified, patterns diverged, related entities changed | Calendar time alone |
| **External Docs** | Dependency version changed, known breaking changes | Calendar time alone |

### What Resets Decay

| Source | Reset Triggers |
|--------|----------------|
| **Specifications** | Explicitly verified, updated with code, resume verification passed |
| **Cached Wisdom** | Re-verified accurate, regenerated from current code |
| **External Docs** | Re-fetched, version compatibility verified |

### The Resume Protocol

When a project resumes after a pause:

```
1. Check: commits since last_session?
   │
   ├── 0 commits → ALL CONFIDENCE PRESERVED
   │               "Nothing changed while you were away"
   │
   └── N commits → Check affected areas
                   │
                   ├── Changed files affect specs? → Verify alignment
                   ├── Changed files affect wisdom? → Re-verify
                   └── Report: "X items need verification"
```

**Key insight:** A 6-month-old spec that matches code is VALID. A 1-day-old spec that contradicts code is INVALID.

---

## User Intent Handling

### The Intent Hierarchy

| Layer | Description |
|-------|-------------|
| What user SAYS | May be incomplete |
| What user WANTS | May be unclear to them |
| What user NEEDS | May differ from wants |
| What is OPTIMAL | May require expertise to see |

### Behaviors

| Situation | Action |
|-----------|--------|
| Clear instruction, aligns with architecture | Execute |
| Clear instruction, conflicts with architecture | Flag conflict, ask |
| Vague instruction | Clarify before acting |
| Instruction seems suboptimal | Suggest alternative, let user decide |

### Examples

```
User: "Add Redux for state management"
Code: React Query handles all state
→ CLARIFY: "React Query already handles this. Still want Redux?"

User: "Fix the bug"
Context: Bug location unclear
→ CLARIFY: "Which bug? Where are you seeing it?"

User: "Make it faster"
Context: No profiling data
→ INVESTIGATE: "Let me profile to find the bottleneck first"
```

---

## External Documentation Sources

### Priority Order

1. **MCP Servers** (live, structured, authoritative)
2. **Local Markdown** (in-repo, version-matched)
3. **Web Fetch** (last resort, verify applicability)

### Source Configuration

| Source | Confidence | Freshness | Use When |
|--------|------------|-----------|----------|
| MCP servers | 0.65 | Live fetch | Need authoritative library docs |
| Local markdown | 0.55 | Check file mtime | Embedded documentation |
| Web fetch | 0.40 | Unknown | No MCP available |

### Available MCP Servers

- `mcp__recharts_Docs` - Charts library
- `mcp__shadcn-ui` - UI components
- `mcp__mastra` - AI framework
- `mcp__github` - Repository operations
- `mcp__postgres` - Database operations

---

## Framework Structure

### File Layout

```
.claude/context/
├── ORIENTATION.md              # Always loaded (~300 tokens)
├── entities.json               # Code-extracted index (~2000 tokens)
├── trust.yaml                  # Confidence hierarchy config
├── state.json                  # Session bridge, decay tracking
├── wisdom/                     # Cached answers (the gold)
│   ├── how-to-create-component.md
│   ├── architecture-mental-model.md
│   └── common-patterns.md
└── scripts/
    ├── extract.py              # Code → entities.json
    ├── assemble.py             # Task → context bundle
    └── verify.py               # Check alignment, reset decay
```

### External Context (Tracked, Not Contained)

```
_bmad-output/                   # Specifications (0.75-0.50)
├── PRD.md
├── architecture.md
└── vision.md

.context/                       # Framework docs (0.55)
└── turbostarter-framework-context/

MCP / Web                       # On-demand (0.65-0.40)
```

---

## The Files

### ORIENTATION.md (~300 tokens)

Always loaded. The 30-second cognitive reload.

```markdown
# [Project Name]

[One sentence: what this is]

## Structure
[5-line map of where things live]

## Patterns
[3 critical conventions]

## When stuck
→ wisdom/how-to-X.md
→ entities.json for locations
```

### entities.json (~2000 tokens)

Maximally compressed. Short keys. No prose.

```json
{
  "v": 1,
  "generated": "2025-12-27",
  "from_commit": "abc123",
  "components": {
    "DataTable": { "p": "ui/data-table.tsx", "props": ["data", "columns"] }
  },
  "schemas": {
    "user": { "p": "db/schema/user.ts", "cols": ["id", "email", "name"] }
  },
  "endpoints": [
    { "m": "GET", "p": "/api/users", "f": "api/users/route.ts" }
  ]
}
```

### trust.yaml

Confidence hierarchy configuration.

```yaml
levels:
  verified_runtime: 1.0
  committed_code: 0.95
  curated_framework: 0.85
  architecture: 0.80
  specifications_fresh: 0.75
  cached_wisdom: 0.70
  external_authoritative: 0.65
  user_clear: 0.60
  specifications_stale: 0.50
  user_vague: 0.45
  external_unverified: 0.40
  uncommitted: 0.30
  exploration: 0.20

decay:
  trigger: divergence  # not calendar
  verify_on_resume: true
```

### state.json

Session bridge and decay tracking.

```json
{
  "last_session": "2025-12-27T10:00:00Z",
  "last_commit_seen": "abc123",

  "confidence_state": {
    "specifications": {
      "_bmad-output/architecture.md": {
        "confidence": 0.80,
        "verified_at": "2025-12-27",
        "verified_against": "abc123"
      }
    },
    "wisdom": {
      "how-to-create-component.md": {
        "confidence": 0.70,
        "derived_from": "abc123",
        "source_hash": "xyz789"
      }
    }
  }
}
```

### wisdom/*.md

Cached answers. The highest-value asset.

```markdown
# How to Create a Component

[Step-by-step, already derived, never re-compute]
[Verified against commit: abc123]
```

---

## The Scripts

### extract.py

Extracts entities from code into entities.json.

```python
# Run: python .claude/context/scripts/extract.py
# Trigger: commit hook, /context:generate

# Extracts:
#   - Components (exports, props)
#   - Schemas (tables, columns)
#   - Endpoints (routes, methods)
#   - Modules (packages, exports)

# Output: entities.json (compressed)
```

### assemble.py

Assembles task-specific context with confidence awareness.

```python
# Run: python .claude/context/scripts/assemble.py "create a component"

# Returns:
#   - ORIENTATION.md (always)
#   - Matched wisdom/*.md
#   - Relevant entities (filtered)
#   - Confidence annotations
#   - Token count

def assemble(task: str, budget: int = 8000) -> ContextBundle:
    ctx = ContextBundle()

    # Always: orientation
    ctx.add(load("ORIENTATION.md"), confidence=0.85)

    # Match wisdom by task keywords
    for w in match_wisdom(task):
        ctx.add(load(w), confidence=get_confidence(w))

    # Filter entities by relevance
    relevant = filter_entities(task)
    ctx.add(compress(relevant), confidence=0.95)

    # Respect budget
    return ctx.trim_to_budget(budget)
```

### verify.py

Checks alignment and resets decay on verification.

```python
# Run: python .claude/context/scripts/verify.py
# Trigger: /context:verify, project resume

# Checks:
#   - Commits since last verification
#   - Spec alignment with code
#   - Wisdom source file changes

# Updates: state.json confidence levels
```

---

## The Commands

| Command | Purpose |
|---------|---------|
| `/context:generate` | Run extract.py, refresh entities.json |
| `/context:status` | Show confidence levels, decay states, last verification |
| `/context:verify` | Check alignment, reset decay clocks |
| `/context:cache [name]` | Save current answer to wisdom/ |

---

## The Flow

### Session Start

```
Load ORIENTATION.md (300 tokens)
    │
    ▼
Load state.json
    │
    ├── Commits since last session?
    │   ├── 0 → All confidence preserved
    │   └── N → Flag items for verification
    │
    ▼
Ready for task
```

### Task Execution

```
Task arrives
    │
    ▼
python assemble.py "[task]"
    │
    ├── Wisdom match? → Load cached answer
    │
    └── No match? → Load relevant entities
                    │
                    ▼
                 Do the work
                    │
                    ▼
                 Reusable pattern?
                    │
                    └── YES → /context:cache "how-to-X"
```

### Project Resume

```
Resume after pause
    │
    ▼
Check commits since last_session
    │
    ├── 0 commits
    │   └── All confidence preserved
    │       "Nothing changed"
    │
    └── N commits
        │
        ▼
     Affected areas?
        │
        ├── Specs affected → Verify alignment
        ├── Wisdom sources changed → Re-verify
        └── Generate resume report
```

---

## Token Budget

| Layer | Tokens | When |
|-------|--------|------|
| ORIENTATION.md | ~300 | Always |
| state.json | ~100 | Always |
| wisdom/*.md (matched) | ~200-1000 | Per match |
| entities.json (filtered) | ~500-1500 | Per task |
| **Total per task** | **~1500-3000** | |

**Compare to loading files directly: 10,000-50,000 tokens.**

---

## Integration with Existing Systems

### Workflow System

The workflow system already implements key patterns:
- `CONTEXT-LIBRARY.yaml` → Task-shaped assembly
- `WORKFLOW-LAUNCHER.md` → Cached decisions
- `STATUS.yaml` → Session bridging

The context framework generalizes these beyond workflows.

### Resume Report

`/resume-report` generates cognitive reload on demand. With this framework:
- Cache the report for instant session start
- Only regenerate delta (what changed)
- Verification step preserves confidence

---

## Implementation Priority

1. **ORIENTATION.md** - Write the 300-token orientation
2. **extract.py** - Auto-extract entities from code
3. **wisdom/** - Start caching derived answers
4. **state.json** - Track confidence and decay
5. **assemble.py** - Task-aware context assembly
6. **verify.py** - Alignment verification

---

## Success Metrics

```
Not: "How much context can I load?"
But: "How little context do I need?"

Not: "Did I find the right file?"
But: "Did I already know the answer?"

Not: "Is the documentation complete?"
But: "Is the wisdom crystallized?"
```

---

## The Essence

```
ORIENTATION  → Where am I? (300 tokens, always)
ENTITIES     → What exists? (compressed index)
WISDOM       → What do I already know? (cached answers)
STATE        → What's the confidence? (trust + decay)
ASSEMBLE     → What do I need for THIS task? (dynamic)
VERIFY       → Is everything still aligned? (on resume)
```

The framework doesn't HOLD all context — it ORCHESTRATES context from multiple sources with confidence awareness.

---

## Lazy Loading & Tree Hierarchy

### The Core Problem

```
LOADING EVERYTHING = TOKEN EXPLOSION
════════════════════════════════════

Project has:
  - 47 components (avg 200 lines each)
  - 10 schemas
  - 25 endpoints
  - 15 specs
  - 8 wisdom files

Full load: ~150,000 tokens
Budget: ~8,000 tokens

SOLUTION: Load pointers → Expand on demand
```

### The Tree Hierarchy

```
CONTEXT TREE (Progressive Expansion)
════════════════════════════════════

TIER 0: ROOT INDEX (~100 tokens)
└── Just category counts and entry points
    "47 components, 10 schemas, 25 endpoints"
    "→ entities.json for details"

    │
    ▼ [Expand when: task mentions category]

TIER 1: CATEGORY INDEX (~500 tokens)
└── Names and one-line purposes
    components:
      DataTable: "Sortable, filterable table"
      LineChart: "Time series visualization"
      ...

    │
    ▼ [Expand when: task mentions specific entity]

TIER 2: ENTITY SUMMARY (~100 tokens each)
└── Interface, key props, location
    DataTable:
      path: ui/data-table.tsx
      props: [data, columns, onSort, onFilter]
      uses: [Radix Table, design tokens]

    │
    ▼ [Expand when: modifying or debugging]

TIER 3: FULL SOURCE (variable)
└── Actual file contents
    [Read file from disk]
```

### Tree Structure in entities.json

```json
{
  "v": 1,
  "meta": {
    "components": 47,
    "schemas": 10,
    "endpoints": 25
  },

  "components": {
    "_index": ["DataTable", "LineChart", "BarChart", "..."],

    "DataTable": {
      "tier1": "Sortable, filterable table with pagination",
      "tier2": {
        "path": "ui/data-table.tsx",
        "props": ["data", "columns", "onSort", "onFilter", "pagination"],
        "deps": ["@radix-ui/react-table", "tokens"],
        "exports": ["DataTable", "StaticDataTable"]
      },
      "tier3": "READ_FROM_DISK"
    }
  }
}
```

### Expansion Triggers

```yaml
expansion_rules:

  tier0_to_tier1:
    trigger:
      - Task mentions category keyword ("component", "schema", "api")
      - User asks "what components exist?"
      - Searching for something in category
    load: Category index from entities.json

  tier1_to_tier2:
    trigger:
      - Task mentions specific entity name
      - Entity matched by keyword search
      - Following dependency chain
    load: Entity summary from entities.json

  tier2_to_tier3:
    trigger:
      - Task requires modification ("add", "change", "fix")
      - Debugging ("why", "error", "broken")
      - User explicitly requests source
    load: Read file from disk

  wisdom_loading:
    trigger:
      - Task matches wisdom file keywords
      - User asks "how do I..."
      - Pattern matches wisdom depends_on
    load: Full wisdom file (already compressed)
```

### The Loading Algorithm

```python
def lazy_load(task: str, budget: int = 8000) -> Context:
    ctx = Context()
    used = 0

    # ALWAYS: Orientation (tier 0)
    ctx.add(load("ORIENTATION.md"))  # ~300 tokens
    used += 300

    # TIER 0: Root index
    meta = load("entities.json")["meta"]
    ctx.add(f"Available: {meta}")  # ~50 tokens
    used += 50

    # Detect what categories task needs
    categories = detect_categories(task)  # ["components", "schemas"]

    for cat in categories:
        if used >= budget * 0.7:
            ctx.add(f"[{cat}: load on demand]")
            continue

        # TIER 1: Category index
        index = load_category_index(cat)
        ctx.add(index)  # ~100-300 tokens
        used += len(index)

        # Detect specific entities
        entities = detect_entities(task, cat)

        for entity in entities:
            if used >= budget * 0.85:
                ctx.add(f"[{entity}: available at tier2]")
                continue

            # TIER 2: Entity summary
            summary = load_entity_summary(entity)
            ctx.add(summary)  # ~50-100 tokens
            used += len(summary)

            # TIER 3: Only if modifying
            if task_requires_source(task, entity):
                if used + estimate_source_size(entity) <= budget:
                    source = load_source(entity)
                    ctx.add(source)
                    used += len(source)
                else:
                    ctx.add(f"[{entity} source: over budget, use Read tool]")

    # WISDOM: Match and load
    matched_wisdom = match_wisdom(task)
    for w in matched_wisdom:
        if used + estimate_wisdom_size(w) <= budget:
            ctx.add(load_wisdom(w))
            used += len(w)

    ctx.set_budget_used(used)
    return ctx
```

### Hierarchy Visualization

```
.claude/context/
│
├── ORIENTATION.md                    ◄── TIER 0 (always loaded)
│   └── 300 tokens, project identity
│
├── entities.json                     ◄── TIER 0-2 (progressive)
│   ├── meta: {counts}                    ◄── TIER 0
│   ├── components:
│   │   ├── _index: [names...]            ◄── TIER 1
│   │   ├── DataTable:
│   │   │   ├── tier1: "one-liner"        ◄── TIER 1
│   │   │   ├── tier2: {props, deps}      ◄── TIER 2
│   │   │   └── tier3: READ_FROM_DISK     ◄── TIER 3 (deferred)
│   │   └── ...
│   ├── schemas: {...}
│   └── endpoints: {...}
│
├── wisdom/                           ◄── LOADED ON MATCH
│   ├── how-to-create-component.md
│   └── architecture-mental-model.md
│
└── state.json                        ◄── ALWAYS (session bridge)
```

### External Context Tree

```
EXTERNAL SOURCES (also lazy loaded)
═══════════════════════════════════

_bmad-output/                         ◄── TIER 1: Index on demand
├── _index.yaml                           "PRD, architecture, vision exist"
├── PRD.md                            ◄── TIER 2: Summary in index
├── architecture.md                   ◄── TIER 3: Full on request
└── vision.md

.context/turbostarter-framework/      ◄── TIER 1: Index exists
├── index.md                              "222 pages indexed"
├── sections/                         ◄── TIER 2: Section summaries
│   └── auth/                         ◄── TIER 3: Full on request
└── framework.md

MCP Servers                           ◄── ALWAYS TIER 3 (live fetch)
└── Fetch only when explicitly needed
```

### Budget Allocation Strategy

```yaml
budget_allocation:
  total: 8000

  reserved:
    orientation: 300      # Always
    state: 100            # Always
    headroom: 600         # For unexpected expansion

  available: 7000

  priority_order:
    1. matched_wisdom     # Highest value per token
    2. tier2_entities     # What task directly needs
    3. tier1_indices      # Context for discovery
    4. tier3_source       # Only if modifying

  overflow_strategy:
    - Defer tier3 to disk read
    - Truncate tier1 indices
    - Add "[X more available]" pointers
```

### Lazy Loading Commands

| Command | Effect |
|---------|--------|
| `/context:expand [entity]` | Load tier2 → tier3 for entity |
| `/context:index [category]` | Load tier1 for category |
| `/context:budget` | Show current allocation |

---

## Advanced: Verification Economics

### Verification Cost Accounting

Not all verification is equally expensive. The framework should optimize for confidence gain per verification cost.

```yaml
verification_cost:
  low:      # Seconds, automated
    - lint
    - typecheck
    - schema_diff
    confidence_gain: 0.05-0.10

  medium:   # Minutes, automated
    - unit_tests
    - integration_tests
    - entity_extraction
    confidence_gain: 0.10-0.20

  high:     # Minutes-hours, may need human
    - runtime_repro
    - load_tests
    - manual_review
    confidence_gain: 0.20-0.40
```

### Verification Priority

```
Priority = (Current Confidence Gap) × (Impact) / (Verification Cost)

EXAMPLE:
  Spec at 0.50 (stale), HIGH impact, LOW verification cost
  → Priority = 0.30 × HIGH / LOW = VERIFY FIRST

  Wisdom at 0.65, LOW impact, HIGH verification cost
  → Priority = 0.05 × LOW / HIGH = DEFER
```

---

## Advanced: Semantic Dependencies

### Wisdom Invalidation Granularity

Wisdom files track semantic dependencies, not just source files.

```yaml
# wisdom/how-to-create-component.md frontmatter
---
depends_on:
  entities:
    - DataTable
    - LiquidComponentProps
  schemas:
    - user
  patterns:
    - design_tokens
    - data_liquid_type_attribute
  files:
    - packages/liquid-render/src/renderer/components/utils.ts
---
```

### Invalidation Rules

```
INVALIDATION TRIGGERS:
  - Depended entity renamed/moved → INVALIDATE
  - Depended schema columns changed → INVALIDATE
  - Depended pattern deprecated → INVALIDATE
  - Depended file significantly changed → FLAG FOR REVIEW

NOT INVALIDATION:
  - Unrelated file changed
  - Cosmetic refactor (formatting, comments)
  - Addition of new entities (doesn't break existing)
```

---

## Advanced: Decision Checkpoints

### Intent vs Optimization Boundary

When framework recommendation differs from user instruction, require explicit decision.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DECISION REQUIRED                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User wants:      Add Redux for state management                            │
│  Framework says:  React Query already handles server state                  │
│  Impact:          Duplicate tooling, increased bundle size                  │
│                                                                              │
│  Options:                                                                    │
│  [U] Proceed with USER choice (Redux)                                       │
│  [F] Follow FRAMEWORK recommendation (React Query)                          │
│  [D] DISCUSS alternatives                                                   │
│                                                                              │
│  Choosing U will log: "User override: Redux despite React Query"            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Decision Log

All significant decisions are logged to `state.json`:

```json
{
  "decisions": [
    {
      "timestamp": "2025-12-27T10:30:00Z",
      "type": "user_override",
      "context": "State management choice",
      "user_choice": "Redux",
      "framework_recommendation": "React Query",
      "rationale": "User prefers familiar tooling"
    }
  ]
}
```

---

## Advanced: Provenance Tracking

### Multi-Agent Contamination Prevention

When multiple LLMs or tools modify the repository, track provenance.

```yaml
# wisdom/how-to-create-component.md frontmatter
---
generated_by:
  agent: "claude-opus-4"
  mode: "analysis"
  session: "abc123"
  date: "2025-12-27"

verified_by:
  agent: "claude-opus-4"
  date: "2025-12-27"
  against_commit: "def456"
---
```

### Provenance Rules

```
TRUST HIERARCHY BY AGENT:

  Same agent, same session:     Trust fully
  Same agent, different session: Trust, verify on conflict
  Different agent:               Lower confidence by 0.10
  Unknown agent:                 Treat as exploration (0.20)

EXAMPLE:
  Wisdom generated by claude-3.5
  Current agent is claude-opus-4
  → Confidence = base - 0.10 = 0.60
  → Flag: "Generated by different model, verify before relying"
```

---

## Strategic Vision

### Where This Framework Can Go

#### 1. Context as Compiled Artifact

The framework is essentially a **context compiler**.

```
Source Files  →  extract.py  →  entities.json
Task + State  →  assemble.py →  context.bundle

Future:
  - Context bundles are diffable
  - Context bundles are cacheable
  - Context bundles are testable
  - CI/CD for context: "Did this change break any wisdom?"
```

#### 2. Confidence-Aware Prompting

Prompts explicitly consume confidence metadata:

```markdown
## Context (Confidence-Weighted)

**HIGH CONFIDENCE (≥0.80) - Trust directly:**
- DataTable component uses props: data, columns, onSort
- User schema has columns: id, email, name, created_at

**MEDIUM CONFIDENCE (0.60-0.79) - Validate before decisions:**
- Architecture recommends React Query for server state
- Component patterns may have evolved since last verification

**LOW CONFIDENCE (<0.60) - Verify before using:**
- Old spec mentions REST API (code shows GraphQL)
```

#### 3. Wisdom Unit Tests

Wisdom files should have executable assertions:

```markdown
# How to Create a Component

## Assertions
```yaml
assertions:
  - check: "file_exists"
    path: "packages/liquid-render/src/renderer/components/utils.ts"

  - check: "export_exists"
    file: "utils.ts"
    export: "tokens"

  - check: "pattern_matches"
    file: "*.tsx"
    pattern: "data-liquid-type"
    min_occurrences: 10
```

## Steps
[The actual how-to content...]
```

Run on CI: `python verify_wisdom.py` → All assertions pass = wisdom valid.

#### 4. Human-LLM Parity

This framework serves **both** humans and LLMs:

```
FOR LLMs:
  - Compressed tokens
  - Confidence metadata
  - Task-shaped assembly

FOR HUMANS:
  - Same wisdom files are readable docs
  - Same orientation is onboarding
  - Same verification is code review aid

SHARED:
  - Institutional memory
  - Decision rationale
  - Pattern catalog
```

---

## One-Sentence Summary

> This is not a documentation system or an LLM helper—it's an **operating system for institutional engineering memory**.

The remaining work is:
- **Economic pressure**: Cost of verification vs confidence gain
- **Governance**: Decision checkpoints and provenance tracking
- **Tooling**: Scripts that implement the vision

The fundamentals are sound.

---

*Generated: 2025-12-27*
*Framework Version: 1.1*
*Reviewed and enhanced based on high-signal feedback*
