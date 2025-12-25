#!/usr/bin/env python3
"""
Initialize a new workflow directory structure.

Usage:
  python init-workflow.py <workflow_id> <workflow_name>

Example:
  python init-workflow.py WF-0001 "UI Components"

Creates:
  .workflows/active/WF-0001-ui-components/
  ├── STATUS.yaml
  ├── config.yaml
  ├── WORKFLOW.md (empty template)
  └── docs/
      └── components/
"""
import sys
from pathlib import Path
from datetime import datetime
import re

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


def slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    return text


def create_status_yaml(workflow_id: str, workflow_name: str) -> str:
    """Generate initial STATUS.yaml content."""
    return f"""workflow: {workflow_name}
workflow_id: {workflow_id}
started_at: {datetime.now().isoformat()}
current_wave: 0
overall_status: pending

dependencies_installed: false

waves:
  wave_0:
    name: "Bootstrap"
    status: pending
    tasks: {{}}

test_results:
  total: 0
  passed: 0
  failed: 0

errors: []

checkpoints: []
"""


def create_config_yaml(workflow_id: str, workflow_name: str) -> str:
    """Generate initial config.yaml content."""
    return f"""# Workflow Configuration: {workflow_id}

workflow_id: {workflow_id}
workflow_name: {workflow_name}
created_at: {datetime.now().isoformat()}

# Execution settings
config:
  max_parallel_agents: 4
  auto_retry: 2
  test_command: "pnpm test"
  build_command: "pnpm build"

# Dependencies to install (modify as needed)
dependencies:
  runtime: []
  dev: []

# Aggregation settings
aggregation:
  strategy: auto  # auto | always | never
  threshold: 3    # Skip per-wave aggregation for workflows <= threshold tasks
"""


def create_workflow_template(workflow_id: str, workflow_name: str) -> str:
    """Generate WORKFLOW.md template."""
    return f"""# {workflow_name}

## 1. CONTEXT ANCHOR

### Working Environment
```yaml
base_path: [BASE_DIRECTORY]
language: typescript
framework: react
styling: tailwind
testing: vitest
package_manager: pnpm
```

### Required Reading
```yaml
required_reading:
  - path: "docs/COMPONENT-GUIDE.md"
    purpose: "File structure and conventions"
```

---

## 2. DEPENDENCY MANIFEST

### Runtime Dependencies
```yaml
dependencies: []
```

### Dev Dependencies
```yaml
dev_dependencies: []
```

---

## 3. TASK DECOMPOSITION

### Task Matrix

| ID | Task Name | Output File(s) | Dependencies | Priority | Complexity |
|----|-----------|----------------|--------------|----------|------------|
| T1 | [NAME] | [FILE] | none | P0 | S |

---

## 4. INTERFACE CONTRACTS

### Shared Types
```typescript
// Define shared interfaces here
```

---

## 5. EXECUTION WAVES

### Wave 0: Bootstrap (SEQUENTIAL)
- Install dependencies
- Create shared types
- Initialize STATUS.yaml

### Wave 1: Foundation (PARALLEL)
- Tasks: [T1, ...]
- Checkpoint: pnpm test && pnpm build

---

## 6. SUCCESS CRITERIA

- [ ] All tasks completed
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Documentation generated
"""


def init_workflow(workflow_id: str, workflow_name: str, base_path: Path = None):
    """Initialize workflow directory structure."""
    if base_path is None:
        base_path = Path(".workflows/active")

    # Create directory name
    slug = slugify(workflow_name)
    dir_name = f"{workflow_id}-{slug}"
    workflow_dir = base_path / dir_name

    if workflow_dir.exists():
        print(f"Error: Workflow directory already exists: {workflow_dir}", file=sys.stderr)
        return False

    # Create directories
    (workflow_dir / "docs" / "components").mkdir(parents=True, exist_ok=True)
    (workflow_dir / "agents").mkdir(exist_ok=True)
    (workflow_dir / "checkpoints").mkdir(exist_ok=True)

    # Create files
    (workflow_dir / "STATUS.yaml").write_text(create_status_yaml(workflow_id, workflow_name))
    (workflow_dir / "config.yaml").write_text(create_config_yaml(workflow_id, workflow_name))
    (workflow_dir / "WORKFLOW.md").write_text(create_workflow_template(workflow_id, workflow_name))

    print(f"✓ Created workflow: {workflow_dir}")
    print(f"  ├── STATUS.yaml")
    print(f"  ├── config.yaml")
    print(f"  ├── WORKFLOW.md")
    print(f"  ├── docs/components/")
    print(f"  ├── agents/")
    print(f"  └── checkpoints/")
    print()
    print(f"Next steps:")
    print(f"  1. Edit WORKFLOW.md to define tasks")
    print(f"  2. Run: claude 'Show workflow proposal for {workflow_id}'")

    return True


def main():
    if len(sys.argv) < 3:
        print("Usage: python init-workflow.py <workflow_id> <workflow_name>")
        print('Example: python init-workflow.py WF-0001 "UI Components"')
        sys.exit(1)

    workflow_id = sys.argv[1]
    workflow_name = " ".join(sys.argv[2:])

    # Validate workflow_id format
    if not re.match(r'^WF-\d{4}$', workflow_id):
        print(f"Warning: workflow_id '{workflow_id}' doesn't match expected format WF-XXXX", file=sys.stderr)

    success = init_workflow(workflow_id, workflow_name)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
