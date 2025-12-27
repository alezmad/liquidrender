# Cursor Adapter for Cognitive Context Framework

This adapter maps the Cognitive Context Framework to Cursor's rule system.

## Quick Setup

```bash
# From your project root
mkdir -p .cursor/rules
cp -r cursor-adapter/rules/* .cursor/rules/
```

## How It Maps

| Cognitive Context | Cursor Equivalent |
|-------------------|-------------------|
| `ORIENTATION.md` | `orientation.mdc` (`alwaysApply: true`) |
| `wisdom/*.md` | `wisdom-*.mdc` (`description:` for agent selection) |
| `indices/*.json` | Referenced in rules via `@indices/` |
| Extraction scripts | Stay in `.claude/` (run manually or via git hooks) |

## File Structure

```
.cursor/
└── rules/
    ├── orientation.mdc          # Always applied (cognitive reload)
    ├── wisdom-components.mdc    # Agent-requested (component patterns)
    ├── wisdom-charts.mdc        # Agent-requested (chart patterns)
    └── context-index.mdc        # Manual @mention for indices
```

## Rule Types Explained

### Always Apply (`alwaysApply: true`)
```yaml
---
description: Cognitive orientation for AI agent
alwaysApply: true
---
```
Loaded into every chat/agent session automatically.

### Agent-Requested (`description:` only)
```yaml
---
description: Patterns for creating React components with TypeScript
---
```
AI decides when relevant based on the description.

### Auto-Attached (`globs:`)
```yaml
---
description: Chart component patterns
globs: ["**/charts/**/*.tsx", "**/Chart*.tsx"]
---
```
Loaded when user references matching files.

### Manual (@mention)
```yaml
---
description: Full entity and concept indices
---
```
Only loaded when user types `@context-index`.

## Cross-Tool Compatibility

The `.mdc` format works with both Cursor and Claude Code:
- **Cursor**: Parses YAML frontmatter for intelligent rule application
- **Claude Code**: Ignores frontmatter, reads only markdown content

This means the same files can serve both tools.

## Recommended Workflow

1. **Keep source of truth in `.claude/context/`** - Primary location
2. **Generate `.cursor/rules/` from source** - Use the sync script
3. **Run extraction scripts** - Same as Claude Code (git hooks work)

## Sync Script

```bash
# sync-to-cursor.sh
#!/bin/bash
# Converts .claude/context/ files to .cursor/rules/*.mdc

PROJECT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CLAUDE_DIR="$PROJECT_DIR/.claude/context"
CURSOR_DIR="$PROJECT_DIR/.cursor/rules"

mkdir -p "$CURSOR_DIR"

# Convert ORIENTATION.md → orientation.mdc
if [[ -f "$CLAUDE_DIR/ORIENTATION.md" ]]; then
    cat > "$CURSOR_DIR/orientation.mdc" << 'FRONTMATTER'
---
description: Cognitive orientation - identity, structure, constraints
alwaysApply: true
---
FRONTMATTER
    cat "$CLAUDE_DIR/ORIENTATION.md" >> "$CURSOR_DIR/orientation.mdc"
fi

# Convert wisdom files → wisdom-*.mdc
for wisdom_file in "$CLAUDE_DIR/wisdom"/*.md; do
    [[ -f "$wisdom_file" ]] || continue
    name=$(basename "$wisdom_file" .md)

    # Extract first line as description
    first_line=$(head -1 "$wisdom_file" | sed 's/^#* *//')

    cat > "$CURSOR_DIR/wisdom-$name.mdc" << FRONTMATTER
---
description: $first_line
---
FRONTMATTER
    cat "$wisdom_file" >> "$CURSOR_DIR/wisdom-$name.mdc"
done

echo "Synced .claude/context/ → .cursor/rules/"
```

## Limitations

| Feature | Claude Code | Cursor |
|---------|-------------|--------|
| SessionStart hooks | Yes | No (use git hooks) |
| Inline hooks | PreToolUse, etc. | No |
| Automatic extraction | Via hooks | Manual/git hooks only |
| Memories | No | Yes (built-in) |

## Sources

- [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)
- [agent-rules](https://github.com/steipete/agent-rules)
