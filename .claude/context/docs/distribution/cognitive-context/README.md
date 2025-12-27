# Cognitive Context Framework

> **Version:** 3.0
> **Compatibility:** Cursor, Claude Code, Continue.dev, Aider, Copilot, Windsurf
> **License:** MIT

A **tool-agnostic** cognitive architecture for AI coding assistants. Give your AI agent persistent memory, crystallized wisdom, and structured context across sessions — in **any AI coding tool**.

---

## What Is This?

The Cognitive Context Framework treats context as **externalized cognition** — not just files to read, but a structured way for AI to think about your codebase.

### The Problem

Every time you start a new AI session:
- AI forgets your project structure
- AI forgets your coding patterns
- AI forgets decisions you've made
- You repeat the same instructions

**And if you use multiple tools (Cursor + Claude Code + Copilot), each has its own format.**

### The Solution

One universal knowledge layer (`.cognitive/`) that syncs to all your AI tools:

```
.cognitive/                    ← Universal source of truth
├── SUMMARY.md                 ← Identity & orientation
├── capabilities.yaml          ← What already exists (CHECK FIRST)
├── rules.yaml                 ← Human conventions
├── knowledge.json             ← Auto-generated entity map
├── cache/answers/             ← Cached wisdom
├── commands/                  ← Portable slash commands
└── adapters/                  ← Tool-specific installers
         │
         ├──→ .cursor/rules/           (Cursor)
         ├──→ CLAUDE.md + .claude/     (Claude Code)
         ├──→ .continue/               (Continue.dev)
         ├──→ .aider.conf.yml          (Aider)
         ├──→ .github/copilot-*        (Copilot)
         └──→ .windsurfrules           (Windsurf)
```

---

## Three-Layer Architecture

| Layer | What | Where |
|-------|------|-------|
| **Knowledge** | Universal source of truth | `.cognitive/` |
| **Capabilities** | Portable commands | `.cognitive/commands/` |
| **Integration** | Tool-specific adapters | `.cursor/`, `CLAUDE.md`, etc. |

**Key insight:** Edit `.cognitive/`, run `sync-all.sh`, all tools update.

---

## Setup: Agentic Onboarding (Recommended)

Let an AI agent analyze your codebase and set up tailored context through conversation.

### For Cursor:

1. Copy files to your project:
   ```bash
   cp ONBOARDING-AGENT.md your-project/
   mkdir -p your-project/.cursor/rules
   cp cursor-rules/setup-cognitive-context.mdc your-project/.cursor/rules/
   ```

2. Open your project in Cursor

3. Type in chat:
   ```
   @setup-cognitive-context
   ```

4. The AI will:
   - Analyze your codebase exhaustively
   - Ask which AI tools you use
   - Generate `.cognitive/` with complete inventory
   - Install integrations for each tool

### For Claude Code:

1. Copy files to your project:
   ```bash
   cp ONBOARDING-AGENT.md your-project/
   ```

2. Start Claude Code in your project

3. Say:
   ```
   Read ONBOARDING-AGENT.md and set up the Cognitive Context Framework
   ```

### Why Agentic is Better:

- AI actually reads your code, doesn't just pattern match
- Questions are specific: "I see you have 47 components..." not "What's your stack?"
- `capabilities.yaml` lists **every** component, not just examples
- Works across all your AI tools

---

## Setup: Script (Quick)

Automated setup with interactive prompts.

```bash
# Copy to your project root
cp setup.sh your-project/
cd your-project

# Run interactive setup
./setup.sh

# Or non-interactive with auto-detection
./setup.sh --non-interactive
```

---

## File Structure After Setup

```
your-project/
├── .cognitive/                        ← UNIVERSAL (edit here)
│   ├── SUMMARY.md                     ← ~300 tokens, always loaded
│   ├── capabilities.yaml              ← Complete inventory
│   ├── rules.yaml                     ← Human conventions
│   ├── knowledge.json                 ← Auto-generated entities
│   ├── cache/answers/                 ← Derived wisdom
│   │   └── how-to-create-component.md
│   ├── commands/                      ← Portable commands
│   │   ├── context/status.md
│   │   ├── context/generate.md
│   │   ├── context/cache.md
│   │   └── resume-report.md
│   ├── scripts/
│   │   └── generate.py
│   └── adapters/
│       ├── cursor.sh
│       ├── claude-code.sh
│       └── sync-all.sh
│
├── .cursor/rules/                     ← Cursor integration
│   ├── orientation.mdc                ← alwaysApply: true
│   └── wisdom-*.mdc
│
├── .claude/commands/                  ← Claude Code integration
│   ├── context/
│   │   ├── status.md
│   │   ├── generate.md
│   │   └── cache.md
│   └── resume-report.md
│
└── CLAUDE.md                          ← Claude Code orientation
```

---

## Commands (Work in Any Tool)

| Command | Purpose |
|---------|---------|
| `/context status` | Check knowledge health, detect staleness |
| `/context generate` | Regenerate knowledge.json from code |
| `/context cache <topic>` | Save derived wisdom for reuse |
| `/resume-report` | Cognitive reload after time away |

These commands are defined in `.cognitive/commands/` and copied to each tool's command location.

---

## Syncing Workflow

```bash
# Edit the source of truth
vim .cognitive/SUMMARY.md
vim .cognitive/capabilities.yaml

# Sync to all installed tools
bash .cognitive/adapters/sync-all.sh
```

This updates:
- `.cursor/rules/` (Cursor)
- `CLAUDE.md` + `.claude/commands/` (Claude Code)
- Any other installed adapters

---

## Quality: Completeness Matters

The framework is only useful if `capabilities.yaml` is **exhaustive**:

```yaml
# BAD - incomplete
ui_components:
  buttons: components/button.tsx
  tables: components/data-table.tsx

# GOOD - every component listed
ui_components:
  buttons: components/button.tsx
  tables: components/data-table.tsx
  charts:
    line: components/line-chart.tsx
    bar: components/bar-chart.tsx
    area: components/area-chart.tsx
    pie: components/pie-chart.tsx
  forms:
    radio: components/radio.tsx
    switch: components/switch.tsx
    date: components/date.tsx
    # ... ALL 47 components
```

**If the AI rebuilds something that already exists, your capabilities.yaml is incomplete.**

---

## Tool-Specific Notes

### Cursor
- Uses `.mdc` files with YAML frontmatter
- `alwaysApply: true` for orientation
- `description: "..."` for AI-requested wisdom

### Claude Code
- Uses `CLAUDE.md` at project root
- Commands in `.claude/commands/*.md`
- Reads `.cognitive/` directly for deep context

### Continue.dev
- Uses `.continue/config.json`
- System prompt from SUMMARY.md
- Commands via custom slash commands

### Aider
- Uses `.aider.conf.yml`
- Convention files for patterns
- `/run` scripts for commands

---

## FAQ

**Q: Which tools are supported?**
A: Cursor, Claude Code, Continue.dev, Aider, GitHub Copilot, Windsurf. Adding more is just writing an adapter script.

**Q: Do I commit `.cognitive/`?**
A: Yes! It's the source of truth. Team members get the same context.

**Q: Do I commit `.cursor/rules/`?**
A: Yes. It's derived from `.cognitive/` but should be committed for Cursor users.

**Q: How do I update context?**
A: Edit `.cognitive/`, run `bash .cognitive/adapters/sync-all.sh`.

**Q: What if I only use one tool?**
A: That's fine. The framework still works. You just won't need other adapters.

---

## Support

- **Docs:** See `docs/` folder for MANIFESTO.md and SPECIFICATION.md
- **Philosophy:** Read `docs/MANIFESTO.md` for the cognitive approach

---

## Credits

Cognitive Context Framework

Inspired by:
- [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)
- [agent-rules](https://github.com/steipete/agent-rules)

---

*Version 3.0 | MIT License | Tool-Agnostic Cognitive Architecture*
