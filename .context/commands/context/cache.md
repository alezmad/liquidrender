# /context cache

Cache derived knowledge for reuse across sessions.

## Usage

```
/context cache <topic>
```

Examples:
- `/context cache how-to-add-api-endpoint`
- `/context cache project-architecture`
- `/context cache testing-patterns`

## Steps

1. Parse the topic into a filename:
   - Lowercase, hyphens instead of spaces
   - Prefix with "how-to-" if it's a how-to guide

2. Check if it already exists:
   ```bash
   ls .claude/knowledge/cache/answers/
   ```

3. If new, create the cached answer:
   - Research the codebase for the answer
   - Write clear, actionable content
   - Include code examples from actual project files
   - Save to `.claude/knowledge/cache/answers/<topic>.md`

4. Confirm creation:
   - Show the file path
   - Show first few lines as preview

## Good candidates for caching

- How-to guides that get asked repeatedly
- Architecture overviews
- Common patterns specific to this project
- Debugging workflows
- Testing strategies

## Format

```markdown
# Topic Title

Brief description.

## Key Points

- Point 1
- Point 2

## Example

[Code from actual project files]

## Checklist (if applicable)

- [ ] Step 1
- [ ] Step 2
```
