# /context status

Check health of the knowledge system.

## Steps

1. Run status check (JIT - don't cache this):

```bash
# Check what exists
ls -la .claude/knowledge/

# Check ages
stat -f "%Sm %N" .claude/knowledge/*.json .claude/knowledge/*.yaml .claude/knowledge/*.md 2>/dev/null

# Count cached answers
ls .claude/knowledge/cache/answers/ 2>/dev/null | wc -l
```

2. Report status:

| File | Status | Age |
|------|--------|-----|
| knowledge.json | exists/missing | X days |
| libraries.json | exists/missing | X days |
| SUMMARY.md | exists/missing | X days |
| rules.yaml | exists/missing | X days |
| capabilities.yaml | exists/missing | X days |
| cache/answers/ | N files | - |

3. Suggest actions if needed:
   - "knowledge.json is 7+ days old - run `/context generate`"
   - "No cached answers yet - consider caching common patterns"
   - "capabilities.yaml missing - check if deleted"

## JIT checks (don't pre-generate)
- Git status (run `git status` if relevant)
- Project tree (run `tree -L 2` if asked)
- Recent commits (run `git log --oneline -5` if relevant)
