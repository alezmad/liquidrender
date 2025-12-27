# Cognitive Context Framework for Cursor

> **Version:** 1.0
> **Compatibility:** Cursor 2.0+
> **License:** MIT

A cognitive architecture for AI coding assistants. Give your AI agent persistent memory, crystallized wisdom, and structured context across sessions.

---

## What Is This?

The Cognitive Context Framework treats context as **externalized cognition** — not just files to read, but a structured way for AI to think about your codebase.

### The Problem

Every time you start a new Cursor session:
- AI forgets your project structure
- AI forgets your coding patterns
- AI forgets decisions you've made
- You repeat the same instructions

### The Solution

This framework provides:

| Component | Purpose | Example |
|-----------|---------|---------|
| **Orientation** | Identity & constraints | "This is a React app. Never use Redux." |
| **Wisdom** | Cached patterns | "Here's how we create components..." |
| **Entity Index** | What exists | 42 components, their files, their props |
| **Concept Graph** | How things relate | "Auth uses JWT, connects to User..." |

---

## Quick Start (5 Minutes)

### 1. Extract the ZIP

```bash
unzip cognitive-context-cursor.zip
cd cognitive-context-cursor
```

### 2. Run Setup

```bash
# Interactive setup (recommended)
./setup.sh

# Or non-interactive with defaults
./setup.sh --non-interactive
```

### 3. Customize Your Orientation

Edit `.cursor/rules/orientation.mdc`:

```yaml
---
description: Cognitive orientation for AI agent
alwaysApply: true
---

# MyProject - Cognitive Orientation

## Identity
You are working on **MyProject** — a [describe your project].

## Mental Model
Think of this codebase as [your mental model].

## Structure
[Your key directories]

## Hard Constraints
1. NEVER [thing to avoid]
2. ALWAYS [thing to do]
3. [More constraints]
```

### 4. Start Using Cursor

Open your project in Cursor. The AI now has your context loaded automatically.

---

## File Structure After Setup

```
your-project/
├── .cursor/
│   └── rules/
│       ├── orientation.mdc        # Always loaded (your project identity)
│       ├── wisdom-*.mdc           # Agent-requested (cached patterns)
│       └── context-index.mdc      # Manual @mention (entity lookup)
│
├── .cognitive/                    # Source of truth (portable)
│   ├── ORIENTATION.md             # Canonical orientation
│   ├── wisdom/                    # Wisdom files
│   │   └── *.md
│   ├── indices/                   # Pre-computed indices
│   │   ├── entities.json
│   │   └── concepts.json
│   ├── schemas/                   # Structure definitions
│   └── scripts/
│       └── extract.py             # Entity extraction
│
├── .git/hooks/
│   └── post-commit                # Auto-refresh on commits
│
└── sync-cursor.sh                 # Sync .cognitive/ → .cursor/rules/
```

---

## How It Works

### Rule Types in Cursor

| Type | Frontmatter | When Loaded |
|------|-------------|-------------|
| **Always** | `alwaysApply: true` | Every session |
| **Auto-Attached** | `globs: ["*.tsx"]` | When file matches |
| **Agent-Requested** | `description: "..."` | AI decides |
| **Manual** | (none) | You type `@rulename` |

### The Framework Uses

1. **orientation.mdc** → `alwaysApply: true`
   Loaded in every chat. Contains identity, constraints, pointers.

2. **wisdom-*.mdc** → `description: "..."`
   AI reads description, decides if relevant to your task.

3. **context-index.mdc** → Manual
   Type `@context-index` to load entity/concept lookups.

---

## Creating Wisdom Files

Wisdom files are cached answers to common questions.

### Create a New Wisdom File

```bash
# Copy the template
cp .cognitive/templates/wisdom.template.md .cognitive/wisdom/how-to-X.md

# Edit it
# Then sync to Cursor
./sync-cursor.sh
```

### Wisdom File Structure

```markdown
---
description: How to create React components in this project
confidence: 95
verified_at: 2025-01-15
---

# How to Create Components

## TL;DR
Use functional components with TypeScript. Props interface required.

## Pattern
\`\`\`tsx
interface Props {
  // ...
}

export function ComponentName({ prop }: Props) {
  return <div>...</div>
}
\`\`\`

## Key Points
1. Always use design tokens from utils.ts
2. Include data-testid attribute
3. Handle empty states
```

---

## Entity Index

The entity index tracks what exists in your codebase.

### Generate Index

```bash
python .cognitive/scripts/extract.py
```

### Index Structure

```json
{
  "meta": {
    "generated_at": "2025-01-15T10:00:00Z",
    "from_commit": "abc1234",
    "total_entities": 42
  },
  "entities": {
    "tier1": {
      "Button": {
        "file": "src/components/Button.tsx",
        "type": "component",
        "exports": ["Button", "ButtonProps"]
      }
    }
  }
}
```

### Customize Extraction

Edit `.cognitive/scripts/extract.py`:

```python
# Change these to match your project
SOURCE_DIRS = ["src/components", "src/api"]
FILE_PATTERNS = ["*.tsx", "*.ts"]
```

---

## Automatic Refresh

### Git Hook (Recommended)

The setup script installs a post-commit hook:

```bash
# .git/hooks/post-commit
#!/bin/bash
./sync-cursor.sh --quiet
```

This ensures `.cursor/rules/` stays in sync with `.cognitive/`.

### Manual Refresh

```bash
# Regenerate entity index
python .cognitive/scripts/extract.py

# Sync to Cursor rules
./sync-cursor.sh
```

---

## Syncing Workflow

```
.cognitive/  ────sync-cursor.sh────>  .cursor/rules/
   │                                       │
   │ (edit source)                         │ (Cursor reads)
   │                                       │
   ▼                                       ▼
ORIENTATION.md  ───────────────>  orientation.mdc
wisdom/*.md     ───────────────>  wisdom-*.mdc
indices/*.json  ───────────────>  context-index.mdc
```

**Rule:** Edit in `.cognitive/`, sync to `.cursor/rules/`.

---

## Best Practices

### Orientation

- Keep under 300 tokens (~400 words)
- Be specific about constraints
- Include actionable pointers

### Wisdom Files

- One topic per file
- Include TL;DR at top
- Add code examples
- Track confidence level

### Entity Index

- Run after major refactors
- Use git hooks for auto-refresh
- Tier entities by importance

---

## Migrating From .cursorrules

If you have an existing `.cursorrules` file:

```bash
# 1. Backup existing rules
mv .cursorrules .cursorrules.backup

# 2. Run setup
./setup.sh

# 3. Copy relevant content to orientation.mdc
# Edit .cursor/rules/orientation.mdc with your rules

# 4. Create wisdom files for patterns
# Split large rules into focused wisdom files
```

---

## Troubleshooting

### Rules Not Loading

1. Check file is in `.cursor/rules/`
2. Verify `.mdc` extension
3. Check frontmatter syntax (YAML)
4. Restart Cursor

### Sync Script Fails

```bash
# Make executable
chmod +x sync-cursor.sh

# Check paths
ls -la .cognitive/
```

### Entity Extraction Fails

```bash
# Check Python
python --version  # Needs 3.8+

# Check source directories exist
ls -la src/components/
```

---

## FAQ

**Q: Can I use this with Claude Code too?**
A: Yes! The `.cognitive/` directory is the portable source of truth. Claude Code reads it directly. Cursor needs the sync to `.cursor/rules/`.

**Q: Do I commit `.cursor/rules/`?**
A: Yes, commit it. Team members get the same context.

**Q: How often should I regenerate indices?**
A: After adding/removing components. Git hook handles this automatically.

**Q: Can I have project-specific AND global rules?**
A: Yes. Project rules go in `.cursor/rules/`. Global rules in Cursor Settings → Rules.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/your-repo/cognitive-context/issues)
- **Docs:** See `docs/` folder for detailed documentation
- **Examples:** Check `examples/` for sample configurations

---

## Credits

Cognitive Context Framework by [Your Name]

Inspired by:
- [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)
- [agent-rules](https://github.com/steipete/agent-rules)

---

*Version 1.0 | MIT License*
