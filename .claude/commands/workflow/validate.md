---
description: 'Run validation scripts on current wave or full project'
---

# Workflow Validate

Run checkpoint validation.

## Arguments
- $ARGUMENTS: "wave" | "full" | "exports" | "docs" (default: wave)

## Instructions

### wave (default)
Full wave checkpoint:
```bash
.context/workflows/scripts/validate-wave.sh @repo/liquid-render
```

### full
TypeScript + lint + format:
```bash
.context/workflows/scripts/validate-typescript.sh @repo/liquid-render
```

### exports
Check barrel exports:
```bash
python .context/workflows/scripts/check-exports.py \
  packages/liquid-render/src/renderer/components/index.ts \
  packages/liquid-render/src/renderer/components/
```

### docs
Validate component documentation:
```bash
python .context/workflows/scripts/validate-frontmatter.py \
  .workflows/active/*/docs/components/
```

### Present Results

```
## Validation Results

### Build
[PASS/FAIL] pnpm build

### Type Check
[PASS/FAIL] pnpm typecheck

### Tests
[PASS/FAIL] 142/142 tests passing

### Lint
[PASS/WARN] 3 warnings (non-blocking)

### Exports
[PASS/FAIL] 12/12 components exported

---
Overall: CHECKPOINT [PASSED/FAILED]
```
