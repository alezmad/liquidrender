# Cognitive Context Framework - Agentic Onboarding

> **For AI Agent**: Follow this protocol to set up the Cognitive Context Framework for this project.

---

## Your Mission

You are helping a developer set up the Cognitive Context Framework - a **tool-agnostic** system that gives AI coding assistants persistent memory and structured understanding of their codebase.

**Your goal**: Through conversation and code analysis, create a tailored cognitive architecture that works across **any AI coding tool** (Cursor, Claude Code, Continue.dev, Aider, Copilot, etc.).

---

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: INTEGRATION (Tool-specific adapters)                  │
│  Cursor: .cursor/rules/*.mdc                                    │
│  Claude Code: CLAUDE.md + .claude/commands/                     │
│  Continue: .continue/config.json                                │
│  Aider: .aider.conf.yml                                         │
│  Copilot: .github/copilot-instructions.md                       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: CAPABILITIES (Portable commands)                      │
│  /context status   → Check knowledge health                     │
│  /context generate → Regenerate from code                       │
│  /context cache    → Save derived wisdom                        │
│  /resume-report    → Cognitive reload after time away           │
└─────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: KNOWLEDGE (Universal source of truth)                 │
│  .cognitive/SUMMARY.md         ← Identity + orientation         │
│  .cognitive/capabilities.yaml  ← What exists (CHECK FIRST)      │
│  .cognitive/rules.yaml         ← Human conventions              │
│  .cognitive/knowledge.json     ← Auto-generated entity map      │
│  .cognitive/cache/answers/     ← Derived wisdom                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight**: `.cognitive/` is tool-agnostic. Each AI tool gets its own adapter that reads from this universal source.

---

## Quality Bar

**The output must be exhaustive, not illustrative.**

❌ **Wrong**: Generic templates with placeholders
✅ **Right**: Every component, every table, every package inventoried

### Completeness Requirements

| File | Quality Requirement |
|------|---------------------|
| `SUMMARY.md` | Real counts ("47 components"), actual paths, specific conventions |
| `capabilities.yaml` | **EVERY** UI component, **ALL** framework features, **ALL** installed packages |
| `rules.yaml` | Project-specific conventions discovered from code/conversation |
| `cache/answers/` | Real code snippets from THIS codebase, not generic examples |
| `knowledge.json` | Complete entity extraction - every exported component/type |

### Anti-Patterns

- Using `{placeholder}` syntax in output files
- Listing "example" components instead of ALL components
- Generic conventions that could apply to any project
- Code examples from documentation instead of this codebase

**If capabilities.yaml doesn't list every reusable component, you've failed.** The whole point is preventing duplicate work - that only works with complete inventory.

---

## Expected Output

After onboarding, the project should have:

```
.cognitive/                           ← LAYER 1: KNOWLEDGE (universal)
├── SUMMARY.md                        ← Always-loaded orientation (~300 tokens)
├── capabilities.yaml                 ← What exists (CHECK BEFORE BUILDING)
├── rules.yaml                        ← Human conventions
├── knowledge.json                    ← Auto-generated entity map
├── cache/
│   └── answers/                      ← Derived wisdom
│       └── *.md
├── commands/                         ← LAYER 2: CAPABILITIES (portable)
│   ├── context/
│   │   ├── status.md                 ← /context status
│   │   ├── generate.md               ← /context generate
│   │   └── cache.md                  ← /context cache <topic>
│   └── resume-report.md              ← /resume-report
├── scripts/
│   └── generate.py                   ← Code → knowledge extraction
└── adapters/                         ← LAYER 3: INTEGRATION (installers)
    ├── cursor.sh                     ← Install for Cursor
    ├── claude-code.sh                ← Install for Claude Code
    └── sync-all.sh                   ← Sync to all installed tools

# After running adapters:

.cursor/rules/                        ← Cursor integration
├── orientation.mdc                   ← alwaysApply: true
└── wisdom-*.mdc

.claude/commands/                     ← Claude Code integration
├── context/
│   ├── status.md
│   ├── generate.md
│   └── cache.md
└── resume-report.md

CLAUDE.md                             ← Claude Code orientation
```

---

## Phase 1: Safety First

Before making any changes:

1. **Check git status**
   ```bash
   git status
   ```

2. **If uncommitted changes exist**, ask user:
   > "I found uncommitted changes. Should I commit them first with message 'pre-cognitive-context-setup', or would you prefer to handle that?"

3. **Create checkpoint**
   ```bash
   git tag cognitive-pre-setup-$(date +%Y%m%d-%H%M%S)
   ```
   Tell user: "Created rollback checkpoint. If anything goes wrong: `git checkout <tag-name>`"

4. **Backup existing files** if they exist:
   - `.cursor/rules/` → `.cursor-backup-<timestamp>/`
   - `.cursorrules` → `.cursorrules.backup`

---

## Phase 2: Deep Discovery

Analyze the codebase thoroughly. Read files, don't just pattern match.

### 2.1 Project Identity

Read these files (if they exist):
- `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`
- `README.md`
- `CLAUDE.md`, `AGENTS.md`, `.cursorrules`

Extract and synthesize:
- Project name and purpose
- What problem does it solve?
- Who is it for?

### 2.2 Architecture Analysis

Explore the codebase structure:
```bash
find . -type d -maxdepth 3 | grep -v node_modules | grep -v .git
```

Read key files to understand:
- **Entry points**: Where does execution start?
- **Core abstractions**: What are the main concepts/entities?
- **Data flow**: How does data move through the system?
- **Boundaries**: What are the module/package boundaries?

### 2.3 Technology Stack

Don't just check if React exists - understand HOW it's used:
- Which React patterns? (hooks, server components, etc.)
- State management approach?
- Styling solution?
- API layer design?

### 2.4 Exhaustive Inventory (CRITICAL)

**Don't sample - inventory EVERYTHING.**

This is the most important phase. You must create a complete inventory for `capabilities.yaml`.

#### Component Inventory
```bash
# Find ALL component files
find . -name "*.tsx" -path "*/components/*" | grep -v node_modules | wc -l
# List them all
find . -name "*.tsx" -path "*/components/*" | grep -v node_modules
```

For each component directory, extract:
- Component name
- File path
- What it does (from reading the file)

**Example output you should produce:**
```
Found 47 components in packages/liquid-render/src/renderer/components/:
- data-table.tsx → DataTable (sortable, paginated tables)
- line-chart.tsx → LineChart (time series)
- bar-chart.tsx → BarChart (categorical)
- area-chart.tsx → AreaChart (filled line)
- pie-chart.tsx → PieChart (proportional)
- radio.tsx → Radio (form input)
- switch.tsx → Switch (toggle)
... (list ALL 47)
```

#### Package Inventory
```bash
# Extract all dependencies
cat package.json | jq '.dependencies, .devDependencies'
```

Map each package to its purpose:
```
recharts → charts
react-hook-form → forms
zod → validation
lucide-react → icons
```

#### Schema Inventory
```bash
# Find all Drizzle/Prisma schemas
find . -name "schema*.ts" -o -name "*.prisma" | grep -v node_modules
```

Extract every table/model name.

#### Framework Feature Inventory

If using a framework (TurboStarter, T3, etc.), list EVERY feature it provides:
- Authentication
- Billing
- Database
- API
- Email
- Storage
- etc.

**Mark these as "DO NOT REBUILD" in capabilities.yaml.**

### 2.5 Pattern Extraction

Read 3-5 representative files of each type to understand patterns:
- Components
- API handlers
- Data models
- Utilities

Identify:
- Naming conventions
- File organization patterns
- Error handling approaches
- Testing patterns

### 2.5 Existing AI Context

Read any existing AI instructions:
- `.cursorrules` - What rules exist?
- `.cursor/rules/*.mdc` - What patterns are documented?
- `CLAUDE.md` - What instructions for Claude?
- `AGENTS.md` - Multi-agent instructions?

---

## Phase 3: Conversational Interview

Based on your analysis, have a conversation with the user. Don't ask generic questions - ask SPECIFIC questions based on what you found.

### Good questions (specific, based on analysis):

> "I see you have a `src/components/` with 47 components and a separate `src/ui/` with primitives. Is `ui/` your design system base that `components/` builds on?"

> "Your Prisma schema has User, Organization, and Membership models. Is this a multi-tenant SaaS? Should I document the tenancy patterns?"

> "I found three different API patterns: tRPC in `/api/trpc`, REST in `/api/v1`, and webhooks in `/api/webhooks`. Should I create wisdom files for each, or is there a preferred pattern for new endpoints?"

### Bad questions (generic, could ask without reading code):

> "What's your project about?"
> "What technology stack do you use?"
> "What are your coding conventions?"

### Key things to understand through conversation:

1. **Constraints**: What should NEVER happen?
   - "I notice you're not using Redux anywhere. Is that a deliberate choice I should enforce?"

2. **Preferences**: What approaches are preferred?
   - "You have both REST and tRPC. For new features, which should I default to?"

3. **Context**: What's not in the code?
   - "Is there a design system or Figma file I should know about?"
   - "Are there external services or APIs the code integrates with?"

4. **Pain points**: What causes friction?
   - "What mistakes do you find yourself correcting in AI suggestions?"

---

## Phase 4: Generate Cognitive Architecture

Based on your analysis and conversation, create these files:

### 4.1 Directory Structure

```bash
mkdir -p .cognitive/{cache/answers,scripts,templates}
mkdir -p .cursor/rules
```

### 4.2 SUMMARY.md (Required - Always Loaded)

Create `.cognitive/SUMMARY.md` - the always-loaded orientation (~300 tokens max).

```markdown
# {ProjectName}

{One-line description of what this is.}

## What This Is

{2-3 sentences: what problem it solves, who it's for.}

## Structure

```
{ASCII tree of KEY directories only - max 10 lines}
```

## Core Files

| What | Where |
|------|-------|
| {Main entry} | `{actual/path}` |
| {Key config} | `{actual/path}` |
| {Important file} | `{actual/path}` |

## Before Building Anything

**Read `capabilities.yaml` first.** Most things already exist.

## Conventions

- {Key convention 1 from rules.yaml}
- {Key convention 2}
- {Key convention 3}

## Expand

- {Task} → `cache/answers/{file}.md`
- Full entity map → `knowledge.json`
```

### 4.3 capabilities.yaml (Required - EXHAUSTIVE INVENTORY)

**This is the most important file.** Create `.cognitive/capabilities.yaml` - a complete map of what already exists.

⚠️ **COMPLETENESS REQUIRED**: List EVERY component, EVERY framework feature, EVERY package.

```yaml
# capabilities.yaml - What already exists
# CHECK HERE BEFORE BUILDING ANYTHING NEW

# Format: what_you_need → use_this

ui_components:
  # List EVERY reusable component by category
  tables: path/to/data-table.tsx
  charts:
    line: path/to/line-chart.tsx
    bar: path/to/bar-chart.tsx
    # ... list ALL chart components
  forms:
    # ... list ALL form components
  layout:
    # ... list ALL layout components
  feedback:
    # ... list ALL feedback components
  display:
    # ... list ALL display components

framework:  # Features that should NOT be rebuilt - list ALL
  auth: "{package}"
  billing: "{package}"
  database: "{package}"
  api: "{package}"
  email: "{package}"
  storage: "{package}"
  # ... list ALL framework features
  _docs: "{path to framework docs}"

data_models:  # List ALL database tables by domain
  auth:
    - user
    - session
    - account
    # ... ALL auth tables
  core:
    # ... ALL core tables

patterns:  # Already configured patterns
  forms: "{form library + validation}"
  queries: "{data fetching library}"
  styling: "{styling approach}"

packages_available:  # From package.json - list ALL relevant packages
  charts: recharts
  ui_primitives: "@radix-ui/*"
  forms: react-hook-form
  validation: zod
  # ... ALL installed utility packages

# RULE: Search this file before creating anything new
# RULE: Don't add packages that duplicate what's already available
```

**Reference: Real capabilities.yaml (36 components, 15 framework features, 14 packages):**

```yaml
ui_components:
  tables: liquid-render/components/data-table.tsx
  charts:
    line: liquid-render/components/line-chart.tsx
    bar: liquid-render/components/bar-chart.tsx
    area: liquid-render/components/area-chart.tsx
    pie: liquid-render/components/pie-chart.tsx
  forms:
    radio: liquid-render/components/radio.tsx
    switch: liquid-render/components/switch.tsx
    date: liquid-render/components/date.tsx
    daterange: liquid-render/components/daterange.tsx
  layout:
    card: liquid-render/components/card.tsx
    grid: liquid-render/components/grid.tsx
    stack: liquid-render/components/stack.tsx
    container: liquid-render/components/container.tsx
    tabs: liquid-render/components/tabs.tsx
    accordion: liquid-render/components/accordion.tsx
  feedback:
    tooltip: liquid-render/components/tooltip.tsx
    popover: liquid-render/components/popover.tsx
    sheet: liquid-render/components/sheet.tsx
    drawer: liquid-render/components/drawer.tsx
  display:
    heading: liquid-render/components/heading.tsx
    icon: liquid-render/components/icon.tsx
    avatar: liquid-render/components/avatar.tsx
    tag: liquid-render/components/tag.tsx
    progress: liquid-render/components/progress.tsx
    kpi: liquid-render/components/kpi-card.tsx

framework:  # TurboStarter - DO NOT REBUILD
  auth: "@turbostarter/auth"
  billing: "@turbostarter/billing"
  database: "@turbostarter/db (Drizzle)"
  api: "@turbostarter/api (Hono)"
  email: "@turbostarter/email"
  storage: "@turbostarter/storage"
  i18n: "@turbostarter/i18n"
  cms: "@turbostarter/cms"
  analytics: packages/analytics
  ai: "Built-in AI (OpenAI, Anthropic, Google, agents, chatbot, TTS)"
  admin: "Super Admin dashboard"
  organizations: "Multi-tenancy, RBAC, invitations"
  background_tasks: "trigger.dev, Upstash QStash"
  monitoring: "Sentry, PostHog"
  deployment: "Vercel, Railway, Fly.io, Docker configs"
  push_notifications: "Mobile push (Expo)"
  _docs: ".context/turbostarter-framework-context/index.md"

data_models:
  auth:
    - user
    - session
    - account
    - verification
    - passkey
    - two_factor
  organizations:
    - organization
    - member
    - invitation
  billing:
    - customer

packages_available:
  charts: recharts
  ui_primitives: "@radix-ui/* (popover, select, tooltip, radio-group)"
  forms: react-hook-form
  validation: zod
  data_fetching: "@tanstack/react-query"
  dates: date-fns
  icons: lucide-react
  classnames: clsx + tailwind-merge
  http: hono (server)
  database: drizzle-orm
  auth: better-auth
  mobile: expo + expo-router
  testing: vitest + playwright + testing-library

# RULE: Search this file before creating anything new
# RULE: Don't add packages that duplicate what's already available
```

**Your output should have similar density.** If you only list 5 components when there are 47, you've failed.

### 4.4 rules.yaml (Required - Human Conventions)

Create `.cognitive/rules.yaml` - conventions that can't be extracted from code.

```yaml
# rules.yaml - Human-curated project conventions
# This file captures knowledge that can't be extracted from code

project:
  name: {ProjectName}
  description: {Short description}

conventions:
  reuse_first:
    - CHECK capabilities.yaml BEFORE creating anything new
    - Extend existing components, don't duplicate
    - {Framework} features are NOT to be rebuilt

  components:
    - {Convention 1 discovered from code/conversation}
    - {Convention 2}
    - {Convention 3}

  code_style:
    - {Style rule 1}
    - {Style rule 2}

  database:
    - {DB convention if applicable}

folders:
  read_freely:
    - {safe folders}
  ask_first:
    - {sensitive folders}
  do_not_read:
    - {deprecated folders}

conflict_resolution:
  # In order of priority (highest first)
  - User's explicit instruction
  - Root CLAUDE.md (if exists)
  - .cognitive/SUMMARY.md
  - capabilities.yaml
  - Framework docs

reference_files:
  {purpose}: {path/to/file}
  {purpose}: {path/to/file}
```

### 4.5 knowledge.json (Auto-generated Entity Map)

Create `.cognitive/knowledge.json` OR generate with script:

```json
{
  "generated": "{ISO timestamp}",
  "project": "{project name}",
  "entities": {
    "components": {
      "{ComponentName}": {
        "path": "{relative/path.tsx}",
        "exports": ["{export1}", "{export2}"],
        "props": ["{prop1}", "{prop2}"]
      }
    },
    "modules": {},
    "schemas": {},
    "endpoints": [],
    "types": {}
  },
  "facts": [
    "{N} React components",
    "{N} database tables",
    "{N} API endpoints"
  ]
}
```

### 4.6 cache/answers/*.md (Derived Wisdom)

Create `.cognitive/cache/answers/` files for patterns discovered.

**Only create for things that are:**
- Non-obvious from reading code
- Frequently needed
- Easy to get wrong

⚠️ **CODE MUST BE FROM THIS PROJECT** - not generic examples.

**Structure:**
```markdown
# How to {Do Something}

## Location

`{actual/path/in/this/project/}`

## Pattern

```{language}
// COPY-PASTE from an actual file in this project
// Include the real variable names, real imports
```

## Required Patterns

### {Pattern Name}

```{language}
// YES - actual code from a component that does it right
{real code from this project}

// NO - actual anti-pattern you found
{real bad code you saw}
```

## Reference

- {actual-file}.tsx - {what it demonstrates}
- {actual-file}.tsx - {what it demonstrates}

## Checklist

- [ ] {Project-specific check}
- [ ] {Project-specific check}
```

**Reference: Real wisdom file (from how-to-create-component.md):**

```markdown
# How to Create a LiquidRender Component

## Location

`packages/liquid-render/src/renderer/components/`

## File Structure

Follow this order in every component file:

\`\`\`typescript
// 1. Imports
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles } from './utils';
import { resolveBinding } from '../data-context';

// 2. Types
interface MyComponentProps extends LiquidComponentProps {
  // additional props
}

// 3. Styles (using tokens, never hardcode)
const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
  }),
};

// 6. Main Component
export function MyComponent({ block, data }: LiquidComponentProps) {
  const items = resolveBinding(block.props?.data, data);

  if (!items || items.length === 0) {
    return <div style={styles.empty}>No data available</div>;
  }

  return (
    <div
      data-liquid-type="my-component"
      style={styles.wrapper}
    >
      {/* content */}
    </div>
  );
}
\`\`\`

## Required Patterns

### Use Design Tokens

\`\`\`typescript
// YES
color: tokens.colors.foreground
padding: tokens.spacing.md

// NO
color: '#333'
padding: '16px'
\`\`\`

## Reference Components

- Simple: `icon.tsx`, `heading.tsx`
- With data: `data-table.tsx`
- With charts: `line-chart.tsx`, `bar-chart.tsx`

## Checklist

- [ ] File in `components/` directory
- [ ] Uses `LiquidComponentProps` interface
- [ ] All styles use `tokens`
- [ ] Has `data-liquid-type` attribute
- [ ] Handles null/empty states
```

**Notice:** Every path, every import, every pattern is from the actual project.

### 4.7 generate.py (Extraction Script)

Create `.cognitive/scripts/generate.py` - regenerate knowledge.json from code.

The script should:
1. Scan source directories for components, schemas, endpoints
2. Extract exports, props, dependencies
3. Generate knowledge.json
4. Be runnable via `python .cognitive/scripts/generate.py`

### 4.8 Portable Commands

Create `.cognitive/commands/` with tool-agnostic command definitions:

**context/status.md**:
```markdown
# /context status

Check health of the knowledge system.

## Steps

1. Check what exists:
   ```bash
   ls -la .cognitive/
   stat -f "%Sm %N" .cognitive/*.json .cognitive/*.yaml .cognitive/*.md 2>/dev/null
   ls .cognitive/cache/answers/ 2>/dev/null | wc -l
   ```

2. Report status table with file ages
3. Suggest actions if files are stale (7+ days)
```

**context/generate.md**:
```markdown
# /context generate

Regenerate knowledge.json from code.

## Steps
1. Run: `python .cognitive/scripts/generate.py`
2. Report what was generated
3. Check if SUMMARY.md needs updating

## Do NOT regenerate
- rules.yaml (human-maintained)
- capabilities.yaml (human-curated)
- cache/answers/* (preserved wisdom)
```

**context/cache.md**:
```markdown
# /context cache <topic>

Cache derived knowledge for reuse.

## Steps
1. Parse topic into filename (lowercase, hyphens)
2. Research the codebase for the answer
3. Write to .cognitive/cache/answers/<topic>.md
4. Include real code examples from THIS project
```

**resume-report.md**:
```markdown
# /resume-report

Generate cognitive reload report after time away.

[Include full resume-report template here -
executive snapshot, narrative, recent files, recommended actions]
```

### 4.9 Adapter Scripts

Create `.cognitive/adapters/` with installer scripts:

**cursor.sh**:
```bash
#!/bin/bash
# Install Cognitive Context for Cursor

mkdir -p .cursor/rules

# Sync orientation
cat > .cursor/rules/orientation.mdc << 'EOF'
---
description: Cognitive orientation - project identity and constraints
alwaysApply: true
---

EOF
cat .cognitive/SUMMARY.md >> .cursor/rules/orientation.mdc

# Sync wisdom files
for f in .cognitive/cache/answers/*.md; do
  name=$(basename "$f" .md)
  echo "---" > ".cursor/rules/wisdom-${name}.mdc"
  echo "description: $(head -1 "$f" | sed 's/# //')" >> ".cursor/rules/wisdom-${name}.mdc"
  echo "---" >> ".cursor/rules/wisdom-${name}.mdc"
  cat "$f" >> ".cursor/rules/wisdom-${name}.mdc"
done

echo "✓ Cursor integration installed"
```

**claude-code.sh**:
```bash
#!/bin/bash
# Install Cognitive Context for Claude Code

# Copy commands
mkdir -p .claude/commands/context
cp .cognitive/commands/context/*.md .claude/commands/context/
cp .cognitive/commands/resume-report.md .claude/commands/

# Generate CLAUDE.md
cat > CLAUDE.md << 'EOF'
# CLAUDE.md

Read `.cognitive/SUMMARY.md` for project orientation.

## Context Location
- `.cognitive/` - Knowledge layer (SUMMARY, capabilities, rules)
- `.cognitive/cache/answers/` - Cached wisdom

## Before Building Anything
**Read `.cognitive/capabilities.yaml` first.** Most things already exist.

## Commands
- `/context status` - Check knowledge health
- `/context generate` - Regenerate from code
- `/context cache <topic>` - Cache derived wisdom
- `/resume-report` - Cognitive reload
EOF

cat .cognitive/SUMMARY.md >> CLAUDE.md

echo "✓ Claude Code integration installed"
```

**sync-all.sh**:
```bash
#!/bin/bash
# Sync cognitive context to all installed tools

[ -d .cursor ] && bash .cognitive/adapters/cursor.sh
[ -f CLAUDE.md ] && bash .cognitive/adapters/claude-code.sh

echo "✓ All integrations synced"
```

---

## Phase 5: Tool Selection & Installation

After generating the knowledge layer, ask the user which tools they use:

### 5.1 Ask Tool Preferences

> "Which AI coding tools do you use? I'll install the Cognitive Context integration for each."
>
> - [ ] **Cursor** - Will create `.cursor/rules/` with MDC files
> - [ ] **Claude Code** - Will create `CLAUDE.md` and `.claude/commands/`
> - [ ] **Continue.dev** - Will create `.continue/config.json`
> - [ ] **Aider** - Will create `.aider.conf.yml`
> - [ ] **GitHub Copilot** - Will create `.github/copilot-instructions.md`
> - [ ] **Windsurf** - Will create `.windsurfrules`

### 5.2 Install Selected Tools

For each selected tool, run the appropriate adapter:

| Tool | Adapter | What it creates |
|------|---------|-----------------|
| Cursor | `cursor.sh` | `.cursor/rules/orientation.mdc`, `wisdom-*.mdc` |
| Claude Code | `claude-code.sh` | `CLAUDE.md`, `.claude/commands/*` |
| Continue | `continue.sh` | `.continue/config.json` |
| Aider | `aider.sh` | `.aider.conf.yml`, `CONVENTIONS.md` |
| Copilot | `copilot.sh` | `.github/copilot-instructions.md` |
| Windsurf | `windsurf.sh` | `.windsurfrules` |

### 5.3 Explain Multi-Tool Setup

> "Your Cognitive Context is now installed for [tools]. The knowledge lives in `.cognitive/` - this is the source of truth. Each tool reads from this universal layer.
>
> When you update `.cognitive/`, run `bash .cognitive/adapters/sync-all.sh` to sync changes to all tools."

---

## Phase 6: Validate and Explain

After generating everything:

1. **Show what was created**:
   ```
   Created:
   ├── .cognitive/                        ← Universal knowledge layer
   │   ├── SUMMARY.md (X tokens)
   │   ├── capabilities.yaml (X components, Y packages)
   │   ├── rules.yaml
   │   ├── knowledge.json (X entities)
   │   ├── cache/answers/ (X wisdom files)
   │   ├── commands/ (4 portable commands)
   │   └── adapters/ (X tool installers)
   │
   ├── .cursor/rules/                     ← Cursor integration
   │   ├── orientation.mdc (always loaded)
   │   └── wisdom-*.mdc (X files)
   │
   ├── .claude/commands/                  ← Claude Code integration
   │   ├── context/status.md
   │   ├── context/generate.md
   │   ├── context/cache.md
   │   └── resume-report.md
   │
   └── CLAUDE.md                          ← Claude Code orientation
   ```

2. **Report completeness**:
   ```
   Inventory:
   - Components: X listed in capabilities.yaml (Y in filesystem) ✓
   - Packages: X listed (Y in package.json) ✓
   - Tables: X listed (Y in schemas) ✓
   ```

3. **Explain key decisions**:
   > "I created a wisdom file for component patterns because you have a specific structure with the design tokens in utils.ts..."

4. **Invite refinement**:
   > "Take a look at SUMMARY.md and capabilities.yaml - do they capture your codebase accurately? Anything to add or change?"

5. **Confirm ready**:
   > "Your Cognitive Context is set up for [Cursor, Claude Code]. The knowledge lives in `.cognitive/` - edit there, then run `sync-all.sh` to update all tools. You're ready to go!"

---

## Quality Checklist

Before finishing, verify **completeness**:

### Structure
- [ ] SUMMARY.md is under 300 tokens
- [ ] All file paths in documentation actually exist
- [ ] .cursor/rules/orientation.mdc has `alwaysApply: true`

### Completeness (CRITICAL)
- [ ] `capabilities.yaml` lists **every** reusable component (compare count to filesystem)
- [ ] `capabilities.yaml` lists **every** framework feature
- [ ] `capabilities.yaml` lists **every** relevant package from package.json
- [ ] `data_models` lists **every** database table
- [ ] `knowledge.json` has **all** exported types/components

### Quality
- [ ] SUMMARY.md has real counts ("47 components" not "{N} components")
- [ ] Rules are project-specific, not generic ("use tokens from utils.ts" not "use consistent styling")
- [ ] Wisdom files have code copy-pasted from THIS project, not generic examples
- [ ] No `{placeholder}` syntax in any output file

### Verification Commands
```bash
# Count components in filesystem
find . -name "*.tsx" -path "*/components/*" | grep -v node_modules | wc -l

# Count components in capabilities.yaml (should match)
grep -c "\.tsx" .cognitive/capabilities.yaml

# Verify all paths exist
grep -oP "[\w-]+\.tsx" .cognitive/capabilities.yaml | while read f; do
  find . -name "$f" | grep -q . || echo "Missing: $f"
done
```

**If counts don't match, the onboarding is incomplete.**

---

## Rollback Instructions

If something went wrong:

```bash
# Restore from checkpoint
git checkout cognitive-pre-setup-{timestamp}

# Or restore backups
cp -r .cursor-backup-{timestamp}/* .cursor/rules/
```

---

*Cognitive Context Framework - Agentic Onboarding Protocol v1.0*
