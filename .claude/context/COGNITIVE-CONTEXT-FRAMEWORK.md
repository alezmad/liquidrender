---
title: Cognitive Context Framework
purpose: Understanding and implementing the context management system for AI agents
answers:
  - What is the philosophy behind this context system?
  - How do the two graphs (concepts + entities) work together?
  - What is progressive document structure?
  - How does wisdom differ from knowledge?
read_when: Designing or extending the context system
depends_on:
  files:
    - .claude/context/schemas/entities.yaml
    - .claude/context/schemas/concepts.yaml
    - .claude/context/schemas/wisdom.yaml
confidence: 0.90
verified_at: 2025-12-27
---

# Cognitive Context Framework

> **Read when:** Designing, extending, or understanding the context system

## Sections

| Section | Summary |
|---------|---------|
| [Philosophy](#philosophy) | Context as externalized cognition, not storage |
| [The Wisdom Hierarchy](#the-wisdom-hierarchy) | Wisdom > Knowledge > Information > Data |
| [Two Graphs Model](#two-graphs-model) | Concepts for understanding, entities for implementation |
| [Progressive Documents](#progressive-documents) | 5-tier structure for LLM-efficient reading |
| [Confidence & Trust](#confidence--trust) | Trust levels from exploration to verified runtime |
| [The Decay Model](#the-decay-model) | Drift-based, not calendar-based invalidation |
| [Architecture](#architecture) | Filesystem + JSON indices, LLM as query engine |
| [Navigation Flow](#navigation-flow) | How an agent finds what it needs |

---

## Philosophy

> **TL;DR:** Context is externalized cognition. We cache crystallized intelligence, not raw data.

### The Fundamental Insight

**Context is not storage. Context is externalized cognition.**

A senior developer doesn't carry the entire codebase in their head. They carry:
- **Wisdom** — What patterns work, what to avoid
- **Orientation** — Where things are, how they connect
- **Judgment** — When to dig deeper, when to trust

The goal isn't to give an LLM more data. It's to give it **crystallized intelligence** — the kind that takes humans years to develop.

### The Core Laws

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

## The Wisdom Hierarchy

> **TL;DR:** Transform data into wisdom. Don't re-derive what someone already figured out.

```
WISDOM    (crystallized answer)     ← Cache this
   ↑
KNOWLEDGE (structured understanding)
   ↑
INFORMATION (organized data)
   ↑
DATA      (raw facts)               ← Don't load this
```

### What This Means Practically

| Instead of Loading... | Load This |
|----------------------|-----------|
| 47 component source files | entities.json index + expand on demand |
| Full PRD + architecture docs | Orientation + matched wisdom files |
| Every schema definition | Category counts + drill down |
| Raw documentation pages | Progressive summaries first |

### Wisdom = Cached Traversal

Someone already navigated the codebase.
Someone already read the files.
Someone already figured out the pattern.

**Wisdom files ARE the answer they found.**

When a future agent asks "how do I create a component?":
- DON'T: Read utils.ts + COMPONENT-GUIDE.md + 5 example files + figure it out
- DO: Read `wisdom/how-to-create-component.md` (already derived)

---

## Two Graphs Model

> **TL;DR:** Concept graph for understanding, entity graph for implementation. Both are needed.

### The Problem with One Graph

Entity-only indexing answers "where is it?" but not "what is it for?"

```
User: "I need to understand organizations"

Entity Graph Only:
  → organization table (db/schema/organization.ts)
  → member table (db/schema/member.ts)
  → invitation table (db/schema/invitation.ts)

  Missing: WHY these exist, HOW they relate, WHAT patterns apply
```

### The Two-Graph Solution

```
┌─────────────────────────────────────────────────────────────┐
│                    CONCEPT GRAPH                             │
│              (Understanding-level knowledge)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  organizations                                               │
│  └── "Multi-tenancy via Better Auth"                        │
│       ├── data-model (org/user/member/invitation)           │
│       ├── rbac (roles, permissions)                         │
│       └── active-org (workspace switching)                  │
│                                                              │
│  design-tokens                                               │
│  └── "Consistent theming via utils.ts"                      │
│       ├── spacing (xs, sm, md, lg, xl)                      │
│       ├── colors (semantic, chart palette)                  │
│       └── typography (font sizes, weights)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         │ implements
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    ENTITY GRAPH                              │
│             (Implementation-level knowledge)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  components:                                                 │
│    DataTable → ui/data-table.tsx                            │
│    LineChart → ui/line-chart.tsx                            │
│                                                              │
│  schemas:                                                    │
│    organization → db/schema/organization.ts                 │
│    member → db/schema/member.ts                             │
│                                                              │
│  endpoints:                                                  │
│    /api/orgs → api/orgs/route.ts                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### When to Use Each

| Task Type | Primary Graph | Secondary |
|-----------|--------------|-----------|
| "How does X work?" | Concept | Entity for specifics |
| "Where is X implemented?" | Entity | Concept for context |
| "Add a feature like Y" | Concept (patterns) | Entity (locations) |
| "Fix bug in Z" | Entity (source) | Concept (understanding) |

### Schema Locations

- **Concept graph schema:** `.claude/context/schemas/concepts.yaml`
- **Entity graph schema:** `.claude/context/schemas/entities.yaml`

---

## Progressive Documents

> **TL;DR:** Documents should be WRITTEN in layers. Readers stop when they have enough.

### The 5-Tier Structure

Every document has 5 implicit tiers. Readers can stop at any tier:

```
TIER 1: Identity (~30 tokens)
  └── Title + frontmatter
  └── Answer: "Is this what I'm looking for?"

TIER 2: Purpose (~50 tokens)
  └── Read when / Skip when callouts
  └── Answer: "Should I read this now?"

TIER 3: Structure (~100 tokens)
  └── Sections table with summaries
  └── Answer: "What section has my answer?"

TIER 4: TL;DRs (~200 tokens)
  └── One-liner per section
  └── Answer: "What's the key insight?"

TIER 5: Full Content (variable)
  └── Complete explanations, examples, edge cases
  └── Answer: "Give me all the details"
```

### Progressive Reading in Practice

```
Agent receives task: "Create a new chart component"

1. Scan wisdom/ filenames
   → "how-to-create-component.md" matches

2. Read TIER 1 (frontmatter)
   → title: "How to Create a LiquidRender Component"
   → Relevant? YES

3. Read TIER 3 (sections table)
   → See: File Structure, Design Tokens, Static Variants...
   → Need: File Structure, Design Tokens, Static Variants

4. Read TIER 4 (TL;DRs for those sections)
   → "Follow strict section order: Types, Styles, Helpers..."
   → "Import tokens from utils.ts. Never hardcode colors..."
   → Maybe this is enough?

5. Read TIER 5 only if TL;DR insufficient
   → Full examples, edge cases
```

### Template Location

Progressive document template: `.claude/context/templates/progressive-doc.md`

---

## Confidence & Trust

> **TL;DR:** Not all context is equally trustworthy. Track confidence from 0.20 to 1.0.

### The Trust Hierarchy

| Level | Source | Confidence | Notes |
|-------|--------|------------|-------|
| **Verified Runtime** | Test results, compiler output | 1.0 | Cannot lie |
| **Committed Code** | Type definitions, implementations | 0.95 | Git is truth |
| **Curated Framework** | CLAUDE.md, ORIENTATION.md | 0.85 | Intentionally stable |
| **Architecture Decisions** | ADRs, architecture.md | 0.80 | Changes rarely |
| **Specifications (fresh)** | PRD, specs < 30 days aligned | 0.75 | Intent documents |
| **Cached Wisdom** | wisdom/*.md | 0.70 | Verified when created |
| **External Docs** | MCP-fetched, official docs | 0.65 | May be version-mismatched |
| **User Instructions (clear)** | Explicit requests | 0.60 | May not be optimal |
| **Specifications (stale)** | Specs with code divergence | 0.50 | Check code first |
| **User Instructions (vague)** | Incomplete intent | 0.45 | Clarify before acting |
| **External (unverified)** | Web fetches | 0.40 | Verify applicability |
| **Uncommitted Code** | WIP changes | 0.30 | May be reverted |
| **Exploration** | .scratch/, hypotheticals | 0.20 | Never authoritative |

### Conflict Resolution

```
RULE 1: Higher confidence wins (with exceptions)
RULE 2: User intent can override, but flag the conflict
RULE 3: When uncertain, CLARIFY don't ASSUME
```

---

## The Decay Model

> **TL;DR:** Decay measures DRIFT, not TIME. A 6-month-old spec that matches code is valid.

### Core Principle

Time is a proxy for drift. If no one's working, there's no drift.

**Calendar time alone does NOT trigger decay.**

### What Triggers Decay

| Source | Decay Triggers | Does NOT Trigger |
|--------|----------------|------------------|
| Specifications | Code commits without spec update | Calendar time alone |
| Cached Wisdom | Source files modified | Calendar time alone |
| External Docs | Dependency version changed | Calendar time alone |

### What Resets Decay

| Source | Reset Triggers |
|--------|----------------|
| Specifications | Explicitly verified, updated with code |
| Cached Wisdom | Re-verified accurate, regenerated |
| External Docs | Re-fetched, version verified |

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

## Architecture

> **TL;DR:** Filesystem is storage, JSON is index, LLM is query engine. No database.

### Why No Database?

The LLM IS the query engine:
- Semantic matching is what LLMs do
- JSON files are version-controllable
- Filesystem is universally accessible
- No additional infrastructure

### Structure

```
.claude/context/
├── ORIENTATION.md              # Always loaded (~300 tokens)
├── schemas/                    # Structure definitions
│   ├── entities.yaml           # Entity index schema
│   ├── concepts.yaml           # Concept graph schema
│   └── wisdom.yaml             # Wisdom file schema
├── wisdom/                     # Cached answers (the gold)
│   └── how-to-create-component.md
├── templates/                  # For creating new content
│   └── progressive-doc.md
└── [future: indices/]
    ├── entities.json           # Auto-extracted entity index
    └── concepts.json           # Curated concept graph
```

### Token Budget

| Layer | Tokens | When |
|-------|--------|------|
| ORIENTATION.md | ~300 | Always |
| Matched wisdom | ~200-1000 | Per match |
| Entity summaries | ~50-100 | Per entity |
| Full source | Variable | On demand |

**Compare:** Loading files directly = 10,000-50,000 tokens.

---

## Navigation Flow

> **TL;DR:** Start at ORIENTATION, follow pointers, expand progressively.

### Session Start

```
Load ORIENTATION.md (300 tokens)
    │
    ▼
What's the task?
    │
    ├── Matches wisdom file?
    │   └── Load wisdom (cached answer)
    │
    ├── Mentions concept?
    │   └── Concept graph → entity graph → source
    │
    └── Mentions entity?
        └── Entity index → summary → source on demand
```

### Task Execution

```
Task: "Create a chart component"
    │
    ▼
Check wisdom/
    │
    └── how-to-create-component.md matches
        │
        ▼
    Read TIER 1-4 (frontmatter → TL;DRs)
        │
        ├── Enough? → Execute
        │
        └── Need more? → Read TIER 5
                           │
                           └── Follow depends_on links
```

### Expansion Pattern

```
TIER 0: Root counts
  "47 components, 10 schemas"
        │
        ▼ [task mentions "component"]

TIER 1: Category index
  "DataTable, LineChart, BarChart..."
        │
        ▼ [task mentions "DataTable"]

TIER 2: Entity summary
  "path: ui/data-table.tsx, props: [data, columns...]"
        │
        ▼ [task requires modification]

TIER 3: Full source
  [Read from disk]
```

---

## See Also

- [ORIENTATION.md](./ORIENTATION.md) - The 300-token cognitive reload
- [Wisdom Schema](./schemas/wisdom.yaml) - Structure for cached answers
- [Concepts Schema](./schemas/concepts.yaml) - Understanding-level graph
- [Entities Schema](./schemas/entities.yaml) - Implementation-level graph
- [Progressive Template](./templates/progressive-doc.md) - Document authoring guide

---

## The Essence

```
ORIENTATION  → Where am I? (300 tokens, always)
CONCEPTS     → What is this for? (understanding graph)
ENTITIES     → What exists? (implementation index)
WISDOM       → What do I already know? (cached answers)
PROGRESSIVE  → How deep should I read? (5-tier structure)
CONFIDENCE   → How much should I trust? (0.20-1.0)
DECAY        → Is this still valid? (drift, not time)
```

**The framework doesn't HOLD all context — it ORCHESTRATES context with progressive disclosure and confidence awareness.**

---

*Version: 2.0*
*Framework: Cognitive Context Framework*
*Generated: 2025-12-27*
