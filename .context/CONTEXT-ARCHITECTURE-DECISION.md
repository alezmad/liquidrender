# Context Architecture Decision

**Date:** 2024-12-27
**Status:** Proposed
**Scope:** AI context management for software projects

---

## The Problem

AI agents need context to work effectively. Current approaches fail:

| Approach | Problem |
|----------|---------|
| Read all files | Token explosion, slow, expensive |
| Documentation folders | Manual maintenance, gets stale, duplicates code |
| RAG/Vector search | Disconnected chunks, loses structure and relationships |
| Pre-built prompts | Static, doesn't adapt to task |

---

## The Decision

### Three-Layer Context Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   LAYER 1: INTERNAL          LAYER 2: EXTERNAL         LAYER 3: RULES  │
│   ══════════════════         ════════════════════      ═══════════════  │
│                                                                         │
│   Auto-generated             On-demand + cached        Human-curated    │
│   from YOUR code             from library docs         project rules    │
│                                                                         │
│   ┌─────────────┐           ┌─────────────┐           ┌─────────────┐  │
│   │ knowledge   │           │  library    │           │   rules     │  │
│   │   .yaml     │           │  .index     │           │   .yaml     │  │
│   └─────────────┘           └─────────────┘           └─────────────┘  │
│         │                         │                         │          │
│         │    Entities             │    Summaries            │  Must/   │
│         │    Relations            │    Entry points         │  Never   │
│         │    Facts                │    Fetch URLs           │  Always  │
│         │                         │                         │          │
│   FROM: TypeScript         FROM: package.json         FROM: Human      │
│         Git history              MCP servers                 input     │
│         File structure           llms.txt files                        │
│                                  Curated summaries                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Internal Knowledge (Auto-Generated)

**Source:** Your codebase
**Output:** `knowledge.yaml`
**Maintenance:** Fully automated

### What Gets Extracted

```yaml
# knowledge.yaml - AUTO-GENERATED, DO NOT EDIT

generated: "2024-12-27T10:30:00Z"
project: "liquidrender"

entities:
  # From TypeScript analysis
  components:
    Button:
      path: src/renderer/components/button.tsx
      props: [variant, size, disabled, onClick]
      uses: [designTokens]

    DataTable:
      path: src/renderer/components/data-table.tsx
      props: [columns, data, pagination]
      uses: [designTokens, formatting]

  # From file structure
  modules:
    compiler:
      path: src/compiler/
      exports: [parse, emit, compile]

    renderer:
      path: src/renderer/
      exports: [LiquidUI, components]

  # From Drizzle/Prisma schemas
  schemas:
    user:
      fields: [id, email, name, role, createdAt]
      relations: [organizations, sessions]

  # From API routes
  endpoints:
    - path: /api/users
      methods: [GET, POST]
      auth: required

relationships:
  - [DataTable, uses, designTokens]
  - [compiler, outputs_to, renderer]
  - [user, has_many, organizations]

facts:
  # From code analysis
  - "47 components in renderer"
  - "24 API endpoints"
  - "Design tokens in utils.ts"

  # From git (recent significant commits)
  - "2024-12-26: Added list/repeater support"
  - "2024-12-25: Completed dashboard components"
```

### Generation Scripts

```bash
# Run on commit hook or manually
python .claude/knowledge/generate.py

# What it does:
# 1. Parse TypeScript AST → extract types, exports, imports
# 2. Read package.json → list dependencies
# 3. Scan file structure → map modules
# 4. Parse schemas → extract models
# 5. Read git log → extract recent decisions
# 6. Output → knowledge.yaml
```

---

## Layer 2: External Libraries (On-Demand)

**Source:** Dependencies in package.json
**Output:** `libraries.index`
**Maintenance:** Semi-automated

### The Challenge

Libraries like React, Drizzle, Hono have massive docs. We can't embed them all.

### The Solution: Tiered Access

```yaml
# libraries.index

dependencies:
  react:
    version: "19.2.3"
    tier: core  # Always have summary available
    summary: |
      React 19 with Server Components.
      Key hooks: useState, useEffect, useMemo, useCallback
      New: use() hook, Server Actions, useOptimistic
    fetch_docs:
      - mcp: null  # No MCP, use web
      - url: "https://react.dev/reference"
    patterns:
      - "Prefer Server Components for data fetching"
      - "Use 'use client' directive for interactivity"

  drizzle-orm:
    version: "0.30.0"
    tier: core
    summary: |
      TypeScript ORM with type-safe queries.
      Schema in schema.ts, migrations via drizzle-kit.
      Query patterns: select(), insert(), update(), delete()
    fetch_docs:
      - mcp: null
      - url: "https://orm.drizzle.team/docs"
    local_schema: src/db/schema.ts  # We have this!

  hono:
    version: "4.0.0"
    tier: core
    summary: |
      Fast web framework. Middleware-based.
      Routes: app.get(), app.post(), etc.
      Validation: Zod middleware
    fetch_docs:
      - mcp: null
      - url: "https://hono.dev/docs"
    patterns:
      - "Use Zod for request validation"
      - "Middleware for auth"

  recharts:
    version: "2.15.4"
    tier: utility
    summary: "React charting library. Components: LineChart, BarChart, PieChart"
    fetch_docs:
      - mcp: recharts_Docs  # We have MCP for this!
      - fallback: "https://recharts.org/api"

  radix-ui:
    version: "various"
    tier: utility
    summary: "Headless UI primitives. Unstyled, accessible."
    fetch_docs:
      - mcp: null
      - url: "https://www.radix-ui.com/primitives/docs"

  # Dependencies we rarely need docs for
  lodash:
    tier: skip
    reason: "Well-known utility, AI has training knowledge"
```

### Tiered Strategy

| Tier | Strategy | Token Cost |
|------|----------|------------|
| **core** | Summary always loaded (~200 tokens each) | ~800 total |
| **utility** | Summary on-demand | 0 unless needed |
| **skip** | Never load, rely on training | 0 |

### Fetch On-Demand

```
Query: "Add a pie chart with custom colors"

1. Detect: involves recharts
2. Check: MCP available? → Yes, recharts_Docs
3. Fetch: mcp__recharts_Docs__search_recharts_documentation("pie chart colors")
4. Get: Specific documentation chunk
5. Combine: with internal knowledge + rules
```

---

## Layer 3: Rules (Human-Curated)

**Source:** Human knowledge, project conventions
**Output:** `rules.yaml`
**Maintenance:** Manual (but small, stable)

### What Rules Capture

Things that can't be extracted from code:

```yaml
# rules.yaml - HUMAN MAINTAINED

project:
  name: "LiquidRender"
  description: "DSL-to-UI rendering system"

conventions:
  components:
    - "Use design tokens from utils.ts, never hardcode colors"
    - "Include data-liquid-type attribute on root element"
    - "Handle empty/null states gracefully"
    - "Provide both dynamic and static variants"

  api:
    - "All routes require auth except /health"
    - "Use Zod for validation"
    - "Return consistent error format"

  database:
    - "Always create migration for schema changes"
    - "Use soft deletes for user data"

  code_style:
    - "No any types"
    - "Prefer const over let"
    - "Async functions for I/O"

patterns:
  new_component:
    location: "src/renderer/components/"
    must_include:
      - "Types interface at top"
      - "Styles using design tokens"
      - "data-liquid-type attribute"
    template: |
      // 1. Types
      interface ${Name}Props { ... }

      // 2. Styles (using tokens)
      const styles = { ... }

      // 3. Component
      export function ${Name}({ ...props }: ${Name}Props) {
        return <div data-liquid-type="${name}">...</div>
      }

  new_api_route:
    location: "src/api/routes/"
    must_include:
      - "Auth middleware"
      - "Zod validation"
      - "Error handling"

decisions:
  # Important decisions that affect development
  - date: "2024-01-15"
    topic: "Authentication"
    decision: "JWT with 24h expiry"
    rationale: "Stateless for multi-region deployment"

  - date: "2024-06-01"
    topic: "Styling"
    decision: "Design tokens, no Tailwind"
    rationale: "DSL needs programmatic style control"
```

---

## How It Works Together

```
┌─────────────────────────────────────────────────────────────────────────┐
│  QUERY: "Add a pie chart component to the renderer"                     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ STEP 1: Parse Intent                                             │   │
│  │ Action: create                                                   │   │
│  │ Entity: component (pie chart)                                    │   │
│  │ Location: renderer                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: Gather from Layer 1 (Internal)                          │   │
│  │                                                                  │   │
│  │ FROM knowledge.yaml:                                             │   │
│  │ • renderer module: src/renderer/                                 │   │
│  │ • existing components: [Button, DataTable, LineChart...]        │   │
│  │ • design tokens: utils.ts                                        │   │
│  │ • similar: LineChart, BarChart (same pattern)                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ STEP 3: Gather from Layer 2 (External)                          │   │
│  │                                                                  │   │
│  │ Detected: recharts dependency                                    │   │
│  │ Action: Query MCP for PieChart docs                             │   │
│  │ Result: PieChart API, props, examples (~500 tokens)             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ STEP 4: Apply Layer 3 (Rules)                                    │   │
│  │                                                                  │   │
│  │ Pattern: new_component                                           │   │
│  │ • Location: src/renderer/components/                            │   │
│  │ • Must: design tokens, data-liquid-type, handle empty states    │   │
│  │ • Template: [component template]                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ STEP 5: Generate Minimal Context                                 │   │
│  │                                                                  │   │
│  │ ```                                                              │   │
│  │ Task: Create PieChart component                                  │   │
│  │                                                                  │   │
│  │ Location: src/renderer/components/pie-chart.tsx                 │   │
│  │                                                                  │   │
│  │ Reference: Existing LineChart at line-chart.tsx                 │   │
│  │                                                                  │   │
│  │ Recharts API:                                                    │   │
│  │ <PieChart><Pie data={data} dataKey="value" /></PieChart>       │   │
│  │                                                                  │   │
│  │ Rules:                                                           │   │
│  │ - Use design tokens from utils.ts                               │   │
│  │ - Add data-liquid-type="pie-chart"                              │   │
│  │ - Handle empty data state                                        │   │
│  │ ```                                                              │   │
│  │                                                                  │   │
│  │ Total: ~600 tokens (vs ~5000 reading files)                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
.claude/
└── knowledge/
    ├── generate.py         # Extracts internal knowledge
    ├── query.py            # Builds context per-request
    ├── knowledge.yaml      # AUTO-GENERATED - internal entities
    ├── libraries.index     # SEMI-AUTO - library summaries + fetch URLs
    └── rules.yaml          # HUMAN - conventions, patterns, decisions
```

**Total human maintenance:** Just `rules.yaml` (~50 lines)

---

## Comparison

| Aspect | .context/ Folder | Knowledge Graph |
|--------|------------------|-----------------|
| **Files to maintain** | 10-50 markdown files | 1 rules.yaml |
| **Auto-generated** | No | Yes (knowledge.yaml) |
| **Tokens per task** | 2000-4000 | 400-800 |
| **External libs** | Copy docs in | Fetch on-demand |
| **Staleness risk** | High | None (auto-generated) |
| **Hierarchy** | Manual folders | Computed relationships |
| **Human effort** | Write docs | Write rules once |

---

## Migration Path

From current `.context/` to this system:

```
Phase 1: Generate knowledge.yaml from code
         └── Run extraction scripts

Phase 2: Create libraries.index from package.json
         └── Add summaries for core deps

Phase 3: Extract rules.yaml from existing .context/
         └── Pull conventions, patterns

Phase 4: Deprecate .context/ folder
         └── Keep as archive, stop maintaining

Phase 5: Update commands
         └── /context commands use new system
```

---

## What Gets Deleted

The `.context/` folder becomes unnecessary:

| Before | After |
|--------|-------|
| `.context/CLAUDE.md` | knowledge.yaml serves as entry |
| `.context/specs/*.md` | Extracted from TypeScript types |
| `.context/decisions/*.md` | rules.yaml + git history |
| `.context/guides/*.md` | Patterns in rules.yaml |
| `.context/references/*.md` | Computed from code |
| `docs/*.md` (for humans) | **Keep** - humans still need docs |

---

## The Final Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                        CONTEXT GENERATION FLOW                          │
│                                                                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                         │
│   │   CODE   │    │  DEPS    │    │  HUMAN   │                         │
│   │  (src/)  │    │(pkg.json)│    │ (rules)  │                         │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘                         │
│        │               │               │                                │
│        ▼               ▼               │                                │
│   ┌─────────┐    ┌──────────┐          │                               │
│   │ Extract │    │ Index +  │          │                               │
│   │  (AST)  │    │ Summary  │          │                               │
│   └────┬────┘    └────┬─────┘          │                               │
│        │              │                │                                │
│        ▼              ▼                ▼                                │
│   ┌─────────────────────────────────────────┐                          │
│   │            knowledge.yaml               │ ← Auto                   │
│   │            libraries.index              │ ← Semi-auto              │
│   │            rules.yaml                   │ ← Manual                 │
│   └─────────────────┬───────────────────────┘                          │
│                     │                                                   │
│                     ▼                                                   │
│   ┌─────────────────────────────────────────┐                          │
│   │              QUERY ENGINE               │                          │
│   │                                         │                          │
│   │  Input: "Add feature X"                 │                          │
│   │  Process: Parse → Traverse → Fetch      │                          │
│   │  Output: Minimal context (~500 tokens)  │                          │
│   └─────────────────────────────────────────┘                          │
│                                                                         │
│   NO DOCUMENTATION FOLDER.                                             │
│   KNOWLEDGE IS COMPUTED, NOT WRITTEN.                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Decision

**Adopt the three-layer knowledge architecture:**

1. **Layer 1 (Internal):** Auto-extract from code → `knowledge.yaml`
2. **Layer 2 (External):** Index + on-demand fetch → `libraries.index`
3. **Layer 3 (Rules):** Human-maintained conventions → `rules.yaml`

**Deprecate:** The `.context/` folder approach (keep temporarily as fallback)

**Build:** Generation scripts, query engine, minimal infrastructure

---

## Next Steps

1. [ ] Build `generate.py` - TypeScript AST extraction
2. [ ] Build `libraries.index` generator from package.json
3. [ ] Extract `rules.yaml` from existing context
4. [ ] Build `query.py` - context assembly engine
5. [ ] Update `/context` commands to use new system
6. [ ] Deprecate `.context/` folder maintenance

---

*This is how AI should handle context. Not by reading documentation, but by understanding code.*
