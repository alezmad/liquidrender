# Context Architecture

## The One Thing That Matters Most

**Cache the answers, not just the data.**

Every session, I re-derive the same knowledge:
- "How do I create a component here?"
- "What's the project structure?"
- "What patterns does this codebase use?"

This is wasteful. The answer to "how do I create a component" doesn't change between sessions. Cache it once, read it forever.

```
.claude/knowledge/cache/answers/
├── how-to-create-component.md     ← Read this, don't re-explore
├── project-architecture.md        ← The 30-second orientation
└── common-patterns.md             ← What I keep needing to know
```

This is the highest-leverage optimization. Everything else is secondary.

---

## The Summary That's Always There

300 tokens. Loaded every session. Tells me:
- What this project is
- Where things live
- What to read next

```markdown
# SUMMARY.md

LiquidRender: DSL-to-React rendering engine.

src/compiler/     → Parses DSL
src/renderer/     → React components
packages/         → Monorepo modules

Core file: LiquidUI.tsx
Tokens: utils.ts

When implementing: read cache/answers/how-to-create-component.md
When debugging: read knowledge.json for entity map
```

That's it. Orientation in 10 seconds.

---

## Code Is Truth

Don't write documentation. Extract knowledge.

```
TypeScript AST  →  Components, types, exports
File structure  →  Module boundaries
Git history     →  What changed, who owns what
Import graph    →  Dependencies, relationships
```

A script runs on commit. Outputs `knowledge.json`. No human maintenance.

If the docs say X but the code says Y, the code wins. Always.

---

## Lazy Loading

Don't load everything. Load summaries. Expand on demand.

```
Tier 0: SUMMARY.md          Always loaded         ~300 tokens
Tier 1: knowledge.json      On task start         ~2000 tokens
Tier 2: details/*.json      When I need them      Variable
Tier 3: cache/answers/*     When question matches Variable
```

Total per-task context: ~800-2000 tokens instead of 10,000+.

---

## External Libraries: Fetch, Don't Embed

React docs are massive. Drizzle docs change weekly. Don't embed them.

```yaml
# libraries.json
react:
  summary: "React 19. Hooks: useState, useEffect. Server Components."
  fetch: mcp__react_docs OR https://react.dev

recharts:
  summary: "Chart components. LineChart, BarChart, PieChart."
  fetch: mcp__recharts_Docs
```

Summary is ~50 tokens. Fetch full docs only when the task needs them.

---

## Human Rules: Small and Stable

Some things can't be extracted from code:
- "We use design tokens, never hardcode colors"
- "All components need data-liquid-type attribute"
- "Auth is JWT with 24h expiry"

This lives in `rules.yaml`. ~50 lines. Updated rarely.

---

## The File Structure

```
.claude/knowledge/
├── generate.py              # Run on commit hook
├── SUMMARY.md               # Always loaded
├── knowledge.json           # Entities and relationships
├── libraries.json           # External dep summaries
├── rules.yaml               # Human conventions
├── details/                 # Expanded entity info
│   ├── components/
│   └── schemas/
└── cache/
    └── answers/             # THE MOST VALUABLE PART
        └── *.md
```

---

## No Infrastructure

Files. That's it.

- No database (files are fast enough)
- No services (nothing to maintain)
- No vector store (keyword matching works)
- Git hooks for regeneration

SQLite becomes worth it at 5000+ entities. Most projects never get there.

---

## What Makes This Work

1. **Answers persist** - Knowledge I derive gets saved
2. **Summary is tiny** - Orientation without token bloat
3. **Code is source** - No stale docs to maintain
4. **Lazy by default** - Only load what the task needs
5. **External on-demand** - MCP fetches library docs when needed
6. **Zero maintenance** - Scripts do the work

---

## The Flow

```
Session starts
    │
    ▼
Load SUMMARY.md (300 tokens)
    │
    ▼
Parse task → What entities involved?
    │
    ▼
Check cache/answers/ → Already answered?
    │
    ├── Yes → Read cached answer, done
    │
    └── No → Load relevant knowledge.json sections
             Load rules.yaml if conventions needed
             Fetch external docs via MCP if library involved
             │
             ▼
          Do the work
             │
             ▼
          Cache the answer for next time
```

---

## Implementation Priority

1. **cache/answers/** - Start caching derived knowledge now
2. **SUMMARY.md** - Write the 300-token orientation
3. **generate.py** - Auto-extract from code
4. **libraries.json** - Index dependencies with summaries
5. **rules.yaml** - Capture the human knowledge

The first two can be done in an hour. The payoff is immediate.
