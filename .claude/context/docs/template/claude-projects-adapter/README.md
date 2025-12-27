# Claude Projects Adapter for Cognitive Context Framework

This adapter creates uploadable knowledge files for Claude Projects (claude.ai web interface).

## Quick Setup

1. Run the generator script:
   ```bash
   ./generate-knowledge-file.sh
   ```

2. Upload `PROJECT-KNOWLEDGE.md` to your Claude Project as a knowledge file

3. Add the project instructions from `PROJECT-INSTRUCTIONS.txt` to your project settings

## How It Works

Claude Projects has two context mechanisms:

| Feature | Purpose | Limit |
|---------|---------|-------|
| **Project Instructions** | Always-on rules (like CLAUDE.md) | ~1,500 words |
| **Knowledge Files** | Reference material (uploaded files) | ~200K tokens total |

### Mapping Strategy

| Cognitive Context | Claude Projects Equivalent |
|-------------------|---------------------------|
| `ORIENTATION.md` | Project Instructions |
| `wisdom/*.md` | Knowledge file (combined) |
| `indices/*.json` | Knowledge file (formatted) |
| `COGNITIVE-CONTEXT-FRAMEWORK.md` | Knowledge file |

## Generated Files

### `PROJECT-INSTRUCTIONS.txt`

Short, always-on instructions (~500 words). This goes in the project's "Custom Instructions" field.

Contents:
- Project identity
- Key constraints
- Quick pointers to knowledge files

### `PROJECT-KNOWLEDGE.md`

Consolidated knowledge file combining:
- Full orientation
- All wisdom files
- Entity and concept indices (formatted as markdown)
- Framework reference

## Limitations

| Feature | Claude Code | Claude Projects |
|---------|-------------|-----------------|
| File system access | Yes | No |
| Auto-refresh | Via hooks | Manual re-upload |
| Index updates | Automatic | Manual export |
| Inline code context | Automatic | Must paste code |

## Best Practices

1. **Keep instructions short** - Project instructions have limited space
2. **Combine related wisdom** - Fewer, larger knowledge files are easier to manage
3. **Re-upload after changes** - No auto-sync; regenerate and upload manually
4. **Include examples** - Claude Projects benefits from concrete code examples

## Workflow

```
[Local Development]          [Claude Projects]
       |                            |
.claude/context/  ──generate──> PROJECT-KNOWLEDGE.md
       |                            |
   (edit files)                 (upload)
       |                            |
  (git commit)              (use in conversations)
       |                            |
   (re-generate)  ─────────────> (re-upload)
```

## When to Use Claude Projects

- **Design discussions** without IDE
- **Architecture planning** with team
- **Code review** (paste diffs)
- **Documentation writing**
- **Research and exploration**

For actual coding, use Claude Code or Cursor with the full framework.
