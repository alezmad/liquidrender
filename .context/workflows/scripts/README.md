# Workflow Scripts

Reusable scripts for the Master Workflow Generator system.

## Prerequisites

```bash
pip install pyyaml
```

## Scripts Overview

### Documentation Scripts (Python)
| Script | Purpose |
|--------|---------|
| `init-workflow.py` | Initialize new workflow directory |
| `validate-frontmatter.py` | Validate YAML frontmatter in component docs |
| `collect-docs.py` | Gather docs from project to workflow folder |
| `aggregate-module.py` | Generate MODULE.md from component docs |
| `aggregate-overview.py` | Generate ephemeral OVERVIEW.md |

### TypeScript/TSX Validation Scripts (Shell)
| Script | Purpose |
|--------|---------|
| `validate-typescript.sh` | Run tsc + ESLint + Prettier |
| `validate-wave.sh` | Full checkpoint validation (build + typecheck + test + lint) |
| `run-tests.sh` | Run tests with optional pattern filtering |

### Code Generation Scripts (Python)
| Script | Purpose |
|--------|---------|
| `check-exports.py` | Verify all components exported from barrel |
| `generate-barrel.py` | Auto-generate index.ts with all exports |

---

## Documentation Scripts

### `init-workflow.py`
Initialize a new workflow directory structure.

```bash
python init-workflow.py WF-0001 "UI Components"
```

Creates:
```
.workflows/active/WF-0001-ui-components/
├── STATUS.yaml
├── config.yaml
├── WORKFLOW.md
├── docs/components/
├── agents/
└── checkpoints/
```

---

### `validate-frontmatter.py`
Validate YAML frontmatter in component documentation.

```bash
# Validate single file
python validate-frontmatter.py docs/components/button.component.md

# Validate all files in directory
python validate-frontmatter.py docs/components/
```

Returns exit code 0 if all valid, 1 if any invalid.

---

### `collect-docs.py`
Collect component docs from project paths to workflow docs folder.

```bash
# Collect from specific pattern
python collect-docs.py .workflows/active/WF-0001 "src/**/*.component.md"

# Skip validation
python collect-docs.py .workflows/active/WF-0001 "src/**/*.component.md" --no-validate
```

---

### `aggregate-module.py`
Aggregate component docs into MODULE.md.

```bash
python aggregate-module.py docs/components docs/MODULE.md
```

Parses YAML frontmatter for rich metadata in the index table.

---

### `aggregate-overview.py`
Generate workflow overview from STATUS.yaml and MODULE.md.

```bash
# Print to stdout (ephemeral - default)
python aggregate-overview.py .workflows/active/WF-0001

# Save to file (rare)
python aggregate-overview.py .workflows/active/WF-0001 --save
```

---

## TypeScript/TSX Validation Scripts

### `validate-typescript.sh`
Run TypeScript type checking, ESLint, and Prettier format check.

```bash
# Validate entire project
./validate-typescript.sh

# Validate specific workspace
./validate-typescript.sh @repo/liquid-render
```

---

### `validate-wave.sh`
Full checkpoint validation for wave completion. Runs:
1. `pnpm build` - TypeScript compilation
2. `pnpm typecheck` - Strict type checking
3. `pnpm test` - Unit tests
4. `pnpm lint` - ESLint (warnings only)

```bash
# Validate entire project
./validate-wave.sh

# Validate specific workspace
./validate-wave.sh @repo/liquid-render
```

Returns exit code 0 if passed, 1 if failed.

---

### `run-tests.sh`
Run tests with optional pattern filtering.

```bash
# Run all tests
./run-tests.sh

# Run tests matching pattern
./run-tests.sh "button"

# Run specific test file
./run-tests.sh "button.test.ts"

# Run tests in specific workspace
./run-tests.sh "" @repo/liquid-render
```

---

## Code Generation Scripts

### `check-exports.py`
Verify all component files are exported from barrel file (index.ts).

```bash
python check-exports.py src/renderer/components/index.ts src/renderer/components/
```

Shows:
- ✓ Properly exported components
- ✗ Missing exports (with fix suggestions)
- ⚠ Orphaned exports (exported but file not found)

---

### `generate-barrel.py`
Auto-generate index.ts barrel export file.

```bash
# Preview what would be generated
python generate-barrel.py src/renderer/components/ --dry-run

# Generate/overwrite index.ts
python generate-barrel.py src/renderer/components/
```

Excludes: `index.ts`, `utils.ts`, `types.ts`, files starting with `_`

---

## Typical Workflow Usage

```bash
# 1. Initialize new workflow
python scripts/init-workflow.py WF-0001 "Dashboard Components"

# 2. After agents complete tasks, validate TypeScript
./scripts/validate-wave.sh @repo/liquid-render

# 3. Check all components are exported
python scripts/check-exports.py src/components/index.ts src/components/

# 4. Collect component docs
python scripts/collect-docs.py .workflows/active/WF-0001-dashboard-components \
  "packages/liquid-render/src/renderer/components/*.component.md"

# 5. Validate frontmatter and aggregate
python scripts/validate-frontmatter.py docs/components/
python scripts/aggregate-module.py docs/components docs/MODULE.md

# 6. View overview (ephemeral)
python scripts/aggregate-overview.py .workflows/active/WF-0001-dashboard-components
```

---

## Component Doc Template

Each component should have a `.component.md` file with this structure:

```markdown
---
name: Button
code: Bt
status: completed
tests_passed: 12
tests_total: 12
dependencies: []
signals:
  - "@onClick"
modifiers:
  - "#primary"
  - "^disabled"
complexity: S
---

# Button

A clickable button component.

## DSL Pattern
\`\`\`
Bt "Click me" #primary
\`\`\`

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | string | - | Button text |

## Examples
...
```
