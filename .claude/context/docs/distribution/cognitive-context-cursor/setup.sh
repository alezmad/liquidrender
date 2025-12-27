#!/bin/bash
#
# Cognitive Context Framework - Cursor Setup
# Version: 1.0
#
# Usage:
#   ./setup.sh                  # Interactive mode
#   ./setup.sh --non-interactive # Use defaults
#   ./setup.sh --help           # Show help
#

set -e

# ============================================
# Configuration
# ============================================

VERSION="1.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors (disabled if not terminal)
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    BOLD='\033[1m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' BOLD='' NC=''
fi

# ============================================
# Functions
# ============================================

print_header() {
    echo ""
    echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║     Cognitive Context Framework for Cursor - Setup         ║${NC}"
    echo -e "${BOLD}║                      Version $VERSION                           ║${NC}"
    echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

show_help() {
    echo "Cognitive Context Framework - Cursor Setup"
    echo ""
    echo "Usage: ./setup.sh [options]"
    echo ""
    echo "Options:"
    echo "  --non-interactive, -n    Run with defaults (no prompts)"
    echo "  --help, -h               Show this help message"
    echo ""
    echo "This script will:"
    echo "  1. Create .cognitive/ directory structure"
    echo "  2. Create .cursor/rules/ with MDC files"
    echo "  3. Set up entity extraction script"
    echo "  4. Install git post-commit hook"
    echo "  5. Create sync script"
    echo ""
}

# ============================================
# Parse Arguments
# ============================================

INTERACTIVE=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --non-interactive|-n)
            INTERACTIVE=false
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# ============================================
# Main Setup
# ============================================

print_header

# Detect project root
if git rev-parse --show-toplevel &>/dev/null; then
    PROJECT_DIR=$(git rev-parse --show-toplevel)
    print_success "Git repository detected: $PROJECT_DIR"
else
    PROJECT_DIR=$(pwd)
    print_warning "Not a git repository. Using current directory."
fi

cd "$PROJECT_DIR"

# ============================================
# Gather Information
# ============================================

if $INTERACTIVE; then
    echo -e "${BOLD}Project Information${NC}"
    echo ""

    # Project name
    default_name=$(basename "$PROJECT_DIR")
    read -p "Project name [$default_name]: " PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-$default_name}

    # Project description
    read -p "One-line description: " PROJECT_DESC
    PROJECT_DESC=${PROJECT_DESC:-"A software project"}

    # Key constraint
    read -p "Most important constraint (e.g., 'Never use Redux'): " CONSTRAINT
    CONSTRAINT=${CONSTRAINT:-"Follow existing patterns"}

    # Source directory
    read -p "Main source directory [src]: " SOURCE_DIR
    SOURCE_DIR=${SOURCE_DIR:-"src"}

    echo ""
else
    PROJECT_NAME=$(basename "$PROJECT_DIR")
    PROJECT_DESC="A software project"
    CONSTRAINT="Follow existing patterns in the codebase"
    SOURCE_DIR="src"
fi

# ============================================
# Create Directory Structure
# ============================================

print_step "Creating directory structure..."

# .cognitive/ (source of truth)
mkdir -p .cognitive/{wisdom,indices,schemas,scripts,templates}

# .cursor/rules/ (Cursor reads from here)
mkdir -p .cursor/rules

print_success "Created .cognitive/ and .cursor/rules/"

# ============================================
# Create ORIENTATION.md
# ============================================

print_step "Creating ORIENTATION.md..."

cat > .cognitive/ORIENTATION.md << EOF
# $PROJECT_NAME - Cognitive Orientation

> **Read time:** ~30 seconds | **Token budget:** ~300 tokens

## Identity

You are working on **$PROJECT_NAME**.

$PROJECT_DESC

## Mental Model

Think of this codebase as a well-organized system where:
- Each module has a single responsibility
- Patterns are consistent across similar components
- Existing code is the best reference for new code

## Structure

\`\`\`
$SOURCE_DIR/
├── components/     # UI components
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── types/          # TypeScript types
└── api/            # API layer
\`\`\`

## Hard Constraints

1. $CONSTRAINT
2. Check existing patterns before creating new ones
3. Keep functions focused and under 50 lines

## Quick Pointers

| Task | First Read |
|------|------------|
| Creating component | @wisdom-components |
| API integration | Check existing API patterns |
| Styling | Use existing design tokens |

---

*This orientation loads automatically. Check wisdom files for specific patterns.*
EOF

print_success "Created .cognitive/ORIENTATION.md"

# ============================================
# Create Cursor Rules
# ============================================

print_step "Creating Cursor rules..."

# orientation.mdc (Always Apply)
cat > .cursor/rules/orientation.mdc << EOF
---
description: Cognitive orientation - project identity, structure, and constraints
alwaysApply: true
---

EOF
cat .cognitive/ORIENTATION.md >> .cursor/rules/orientation.mdc

# wisdom-components.mdc (Agent Requested)
cat > .cursor/rules/wisdom-components.mdc << 'EOF'
---
description: Patterns for creating components in this project
---

# Component Creation Patterns

## TL;DR

Follow existing component patterns. Check similar components before creating new ones.

## Pattern

```tsx
interface Props {
  // Define all props with TypeScript
}

export function ComponentName({ prop1, prop2 }: Props) {
  // Component logic
  return (
    <div data-testid="component-name">
      {/* JSX */}
    </div>
  );
}
```

## Key Points

1. Use TypeScript interfaces for props
2. Include data-testid for testing
3. Handle loading and error states
4. Follow existing naming conventions

## Anti-Patterns

- Don't use `any` type
- Don't hardcode colors or spacing
- Don't create god components (>200 lines)
EOF

# context-index.mdc (Manual)
cat > .cursor/rules/context-index.mdc << 'EOF'
---
description: Entity and concept indices - type @context-index to load
---

# Context Index

## Entity Index

Check `.cognitive/indices/entities.json` for:
- Existing components and their files
- Available utilities and helpers
- API endpoints and schemas

## Concept Index

Check `.cognitive/indices/concepts.json` for:
- Feature relationships
- Pattern definitions
- Domain mappings

## Refresh

```bash
python .cognitive/scripts/extract.py
./sync-cursor.sh
```
EOF

print_success "Created Cursor rules (orientation.mdc, wisdom-components.mdc, context-index.mdc)"

# ============================================
# Create Schemas
# ============================================

print_step "Creating schemas..."

cat > .cognitive/schemas/entities.yaml << 'EOF'
# Entity Index Schema
type: object
required: [meta, entities]
properties:
  meta:
    type: object
    properties:
      generated_at: { type: string, format: date-time }
      from_commit: { type: string }
      total_entities: { type: integer }
  entities:
    type: object
    properties:
      tier1: { type: object, additionalProperties: { $ref: "#/$defs/entity" } }
      tier2: { type: object, additionalProperties: { $ref: "#/$defs/entity" } }
$defs:
  entity:
    type: object
    properties:
      file: { type: string }
      type: { type: string, enum: [component, function, class, schema, endpoint] }
      exports: { type: array, items: { type: string } }
      description: { type: string }
EOF

cat > .cognitive/schemas/concepts.yaml << 'EOF'
# Concept Index Schema
type: object
required: [meta, concepts]
properties:
  meta:
    type: object
    properties:
      generated_at: { type: string, format: date-time }
      total_concepts: { type: integer }
  concepts:
    type: object
    properties:
      features: { type: object }
      patterns: { type: object }
      domains: { type: object }
EOF

cat > .cognitive/schemas/wisdom.yaml << 'EOF'
# Wisdom File Schema (Frontmatter)
type: object
properties:
  description: { type: string, maxLength: 100 }
  confidence: { type: integer, minimum: 0, maximum: 100 }
  verified_at: { type: string, format: date }
  depends_on: { type: array, items: { type: string } }
  related: { type: array, items: { type: string } }
EOF

print_success "Created schemas"

# ============================================
# Create Extraction Script
# ============================================

print_step "Creating extraction script..."

cat > .cognitive/scripts/extract.py << 'PYTHON'
#!/usr/bin/env python3
"""
Entity Extraction Script
Generates entities.json from source code.
"""

import json
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path

# ============================================
# CONFIGURATION - Edit these for your project
# ============================================

SOURCE_DIRS = ["src/components", "src/hooks", "src/utils"]
FILE_PATTERNS = ["*.tsx", "*.ts"]
OUTPUT_PATH = ".cognitive/indices/entities.json"

# ============================================
# Extraction Logic
# ============================================

def get_git_commit():
    """Get current git commit hash."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except:
        return "unknown"

def extract_exports(file_path):
    """Extract named exports from a TypeScript file."""
    exports = []
    try:
        with open(file_path, 'r') as f:
            content = f.read()

        # Match: export function Name, export const Name, export class Name
        patterns = [
            r'export\s+(?:async\s+)?function\s+(\w+)',
            r'export\s+const\s+(\w+)',
            r'export\s+class\s+(\w+)',
            r'export\s+interface\s+(\w+)',
            r'export\s+type\s+(\w+)',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, content)
            exports.extend(matches)

        # Match: export { Name }
        brace_exports = re.findall(r'export\s*\{([^}]+)\}', content)
        for match in brace_exports:
            names = [n.strip().split(' as ')[0] for n in match.split(',')]
            exports.extend(names)

    except Exception as e:
        print(f"  Warning: Could not read {file_path}: {e}")

    return list(set(exports))

def classify_tier(file_path, exports):
    """Classify entity as tier1 or tier2."""
    # Tier 1: Core components (in main directories, heavily exported)
    if len(exports) > 0 and ('components' in file_path or 'hooks' in file_path):
        return 'tier1'
    return 'tier2'

def detect_type(file_path, exports):
    """Detect entity type from file path and exports."""
    if 'components' in file_path:
        return 'component'
    if 'hooks' in file_path:
        return 'function'
    if 'api' in file_path:
        return 'endpoint'
    if 'types' in file_path or 'schemas' in file_path:
        return 'schema'
    return 'function'

def main():
    project_root = Path(__file__).parent.parent.parent
    os.chdir(project_root)

    print("Extracting entities...")

    entities = {"tier1": {}, "tier2": {}}
    total = 0

    for source_dir in SOURCE_DIRS:
        source_path = Path(source_dir)
        if not source_path.exists():
            print(f"  Skipping {source_dir} (not found)")
            continue

        for pattern in FILE_PATTERNS:
            for file_path in source_path.rglob(pattern):
                # Skip test files and index files
                if '.test.' in str(file_path) or '.spec.' in str(file_path):
                    continue
                if file_path.name == 'index.ts' or file_path.name == 'index.tsx':
                    continue

                exports = extract_exports(file_path)
                if not exports:
                    continue

                # Use first export as entity name
                entity_name = exports[0]
                tier = classify_tier(str(file_path), exports)
                entity_type = detect_type(str(file_path), exports)

                entities[tier][entity_name] = {
                    "file": str(file_path),
                    "type": entity_type,
                    "exports": exports
                }
                total += 1
                print(f"  Found: {entity_name} ({tier})")

    # Build output
    output = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
            "from_commit": get_git_commit(),
            "total_entities": total
        },
        "entities": entities
    }

    # Write output
    output_path = Path(OUTPUT_PATH)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nGenerated {OUTPUT_PATH}")
    print(f"Total entities: {total}")

if __name__ == "__main__":
    main()
PYTHON

chmod +x .cognitive/scripts/extract.py

print_success "Created extraction script"

# ============================================
# Create Initial Indices
# ============================================

print_step "Creating initial indices..."

COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "initial")

cat > .cognitive/indices/entities.json << EOF
{
  "meta": {
    "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "from_commit": "$COMMIT",
    "total_entities": 0
  },
  "entities": {
    "tier1": {},
    "tier2": {}
  }
}
EOF

cat > .cognitive/indices/concepts.json << EOF
{
  "meta": {
    "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "total_concepts": 0
  },
  "concepts": {
    "features": {},
    "patterns": {},
    "domains": {}
  }
}
EOF

print_success "Created initial indices"

# ============================================
# Create Templates
# ============================================

print_step "Creating templates..."

cat > .cognitive/templates/wisdom.template.md << 'EOF'
---
description: {{DESCRIPTION}}
confidence: 80
verified_at: {{DATE}}
---

# {{TITLE}}

## TL;DR

{{SUMMARY}}

## When to Use

- {{USE_CASE_1}}
- {{USE_CASE_2}}

## Pattern

```{{LANGUAGE}}
{{CODE_PATTERN}}
```

## Key Points

1. {{POINT_1}}
2. {{POINT_2}}
3. {{POINT_3}}

## Anti-Patterns

- {{ANTI_1}}
- {{ANTI_2}}

## Related

- @wisdom-{{RELATED_1}}
EOF

print_success "Created templates"

# ============================================
# Create Sync Script
# ============================================

print_step "Creating sync script..."

cat > sync-cursor.sh << 'BASH'
#!/bin/bash
# Sync .cognitive/ to .cursor/rules/
# Run after editing .cognitive/ files

set -e

QUIET=false
[[ "$1" == "--quiet" ]] && QUIET=true

log() {
    $QUIET || echo "$1"
}

PROJECT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_DIR"

log "Syncing .cognitive/ → .cursor/rules/"

# Sync ORIENTATION.md → orientation.mdc
if [[ -f .cognitive/ORIENTATION.md ]]; then
    cat > .cursor/rules/orientation.mdc << 'FRONT'
---
description: Cognitive orientation - project identity, structure, and constraints
alwaysApply: true
---

FRONT
    cat .cognitive/ORIENTATION.md >> .cursor/rules/orientation.mdc
    log "  ✓ orientation.mdc"
fi

# Sync wisdom files → wisdom-*.mdc
for file in .cognitive/wisdom/*.md; do
    [[ -f "$file" ]] || continue
    name=$(basename "$file" .md)

    # Extract description from frontmatter or first heading
    desc=$(grep -m1 'description:' "$file" 2>/dev/null | sed 's/description: *//' || \
           grep -m1 '^#' "$file" | sed 's/^#* *//')
    desc=${desc:-"Wisdom file: $name"}

    cat > ".cursor/rules/wisdom-$name.mdc" << FRONT
---
description: $desc
---

FRONT
    # Strip frontmatter and append content
    sed -n '/^---$/,/^---$/!p' "$file" >> ".cursor/rules/wisdom-$name.mdc"
    log "  ✓ wisdom-$name.mdc"
done

log "Sync complete!"
BASH

chmod +x sync-cursor.sh

print_success "Created sync-cursor.sh"

# ============================================
# Setup Git Hook
# ============================================

if [[ -d .git ]]; then
    print_step "Setting up git hook..."

    mkdir -p .git/hooks

    # Create or append to post-commit hook
    HOOK_FILE=".git/hooks/post-commit"
    HOOK_MARKER="# cognitive-context-sync"

    if [[ -f "$HOOK_FILE" ]] && grep -q "$HOOK_MARKER" "$HOOK_FILE"; then
        print_warning "Git hook already configured"
    else
        cat >> "$HOOK_FILE" << 'HOOK'

# cognitive-context-sync
# Auto-sync cognitive context after commits
if [[ -x ./sync-cursor.sh ]]; then
    ./sync-cursor.sh --quiet &
fi
HOOK
        chmod +x "$HOOK_FILE"
        print_success "Installed git post-commit hook"
    fi
else
    print_warning "Not a git repository. Skipping hook setup."
fi

# ============================================
# Try Initial Extraction
# ============================================

if [[ -d "$SOURCE_DIR" ]]; then
    print_step "Running initial entity extraction..."
    if python3 .cognitive/scripts/extract.py 2>/dev/null; then
        print_success "Entity extraction complete"
    else
        print_warning "Extraction failed. Edit .cognitive/scripts/extract.py for your project."
    fi
else
    print_warning "Source directory '$SOURCE_DIR' not found. Skipping extraction."
fi

# ============================================
# Summary
# ============================================

echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                    Setup Complete!                         ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Created:"
echo "  .cognitive/           → Source of truth (portable)"
echo "  .cursor/rules/        → Cursor reads from here"
echo "  sync-cursor.sh        → Sync script"
echo ""
echo "Next steps:"
echo "  1. Edit .cognitive/ORIENTATION.md for your project"
echo "  2. Edit .cognitive/scripts/extract.py for your paths"
echo "  3. Run: python .cognitive/scripts/extract.py"
echo "  4. Run: ./sync-cursor.sh"
echo "  5. Open project in Cursor"
echo ""
echo "Documentation: See README.md"
echo ""
