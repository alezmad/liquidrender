# Context Map

How AI agents load and traverse context in this project.

## Loading Algorithm

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CONTEXT LOADING ALGORITHM                          │
│                                                                         │
│   1. ALWAYS LOAD (on conversation start)                               │
│      └── CLAUDE.md (root) → .context/CLAUDE.md (hub)                   │
│          ~500 tokens, provides navigation                              │
│                                                                         │
│   2. LOAD ON DEMAND (based on task)                                    │
│      ┌─────────────────────────────────────────────────────────────┐   │
│      │  Task Signal              │  Load Path                      │   │
│      ├───────────────────────────┼─────────────────────────────────┤   │
│      │  "implement", "build"     │  specs/ → relevant spec         │   │
│      │  "why", "decision"        │  decisions/ → relevant ADR      │   │
│      │  "how to", "guide"        │  guides/ → relevant guide       │   │
│      │  "what is", "lookup"      │  references/ → specific section │   │
│      │  "framework", "existing"  │  turbostarter/ → index.md       │   │
│      │  "workflow", "process"    │  workflows/ → relevant workflow │   │
│      └───────────────────────────┴─────────────────────────────────┘   │
│                                                                         │
│   3. DEPTH STRATEGY                                                     │
│      └── Start shallow (hub), go deep only when needed                 │
│      └── Prefer pointers over inline content                           │
│      └── Load max 3-4 docs per task (~4000 tokens)                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Graph Structure

```yaml
# Nodes by role
nodes:
  hubs:        # Entry points, pure navigation
    - CLAUDE.md
    - .context/CLAUDE.md

  specs:       # Authoritative definitions (WHAT)
    - specs/ARCHITECTURE.md
    - specs/API.md
    - specs/DATA-MODEL.md

  decisions:   # Captured choices (WHY)
    - decisions/AUTH-APPROACH.md
    - decisions/API-DESIGN.md

  guides:      # Step-by-step (HOW)
    - guides/COMPONENT-GUIDE.md
    - guides/DEPLOYMENT.md

  references:  # Lookup tables (LOOKUP)
    - references/COMPONENT-STATUS.md
    - references/ERROR-CODES.md

# Edges (pointers)
edges:
  - from: CLAUDE.md
    to: .context/CLAUDE.md
    type: always

  - from: .context/CLAUDE.md
    to: specs/*
    type: on-demand
    trigger: ["implement", "build", "create"]

  - from: .context/CLAUDE.md
    to: decisions/*
    type: on-demand
    trigger: ["why", "decision", "chose", "rationale"]
```

## Token Budget

| Context Type | Target | Max | Notes |
|--------------|--------|-----|-------|
| Always loaded | 500 | 800 | Hubs only |
| Per-task context | 2000 | 4000 | 2-3 docs |
| Deep dive | 4000 | 8000 | Complex tasks |
| Full system | 8000 | 15000 | Rare, architecture reviews |

## Efficiency Rules

1. **Single Purpose Docs** — Each doc serves ONE role (spec OR decision OR guide)
2. **Pointers Over Content** — Hubs contain links, not information
3. **Frontmatter Metadata** — Every doc declares its role and load triggers
4. **Progressive Disclosure** — General → Specific, never load deep first
5. **Token Awareness** — Large docs split or summarized

## Document Frontmatter Standard

Every context doc should have:

```yaml
---
role: spec | decision | guide | reference | hub
load_when: ["keyword triggers"]
tokens: ~1200
pointers:
  - path/to/related.md
  - path/to/deeper.md
supersedes: old-doc.md  # if replacing another doc
---
```

## Maintenance Commands

| Command | Purpose | Frequency |
|---------|---------|-----------|
| `/context-audit` | Check graph health | Weekly |
| `/context-repair` | Fix broken pointers | As needed |
| `/context-optimize` | Reduce token paths | Monthly |
| `/context-prune` | Remove stale docs | Monthly |

## Traversal Example

```
User: "Add a new API endpoint for user preferences"

AI Traversal:
1. Read: CLAUDE.md (already loaded, 0 new tokens)
2. Read: .context/CLAUDE.md → sees "implement" → points to specs/
3. Read: specs/API.md (1200 tokens) → API patterns, conventions
4. Read: references/DATA-MODEL.md#users (400 tokens) → user schema
5. Optionally: turbostarter/index.md → search "api" → existing patterns

Total: ~1600-2000 tokens for full task context
```

## Anti-Patterns

❌ **Loading everything** — Never read all docs upfront
❌ **Huge hub files** — Hubs navigate, they don't contain info
❌ **Deep nesting** — Max 3 levels from hub to leaf
❌ **Duplicate content** — One source of truth per topic
❌ **Orphan docs** — Every doc reachable from hub
❌ **Broken pointers** — Links must resolve

## Health Indicators

```
✅ HEALTHY GRAPH
├── All docs reachable from hub (0 orphans)
├── All pointers resolve (0 broken edges)
├── Avg path depth < 3
├── Avg doc size < 2000 tokens
├── Single role per doc (no confusion)
└── Last audit < 7 days ago

⚠️ UNHEALTHY GRAPH
├── Orphan docs appearing outside .context
├── Broken pointers accumulating
├── Docs serving multiple roles
├── Token bloat in hub files
└── No recent maintenance
```
