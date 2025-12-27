#!/bin/bash
# sync-to-cursor.sh
# Converts .claude/context/ files to .cursor/rules/*.mdc format
#
# Usage: ./sync-to-cursor.sh [--force]
#   --force: Overwrite existing .cursor/rules files

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
FORCE=false
[[ "$1" == "--force" ]] && FORCE=true

# Find project root
PROJECT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CLAUDE_DIR="$PROJECT_DIR/.claude/context"
CURSOR_DIR="$PROJECT_DIR/.cursor/rules"

echo -e "${GREEN}Syncing Cognitive Context to Cursor rules${NC}"
echo "Source: $CLAUDE_DIR"
echo "Target: $CURSOR_DIR"
echo ""

# Check source exists
if [[ ! -d "$CLAUDE_DIR" ]]; then
    echo -e "${RED}Error: .claude/context/ not found${NC}"
    echo "Run the Cognitive Context Framework setup first."
    exit 1
fi

# Create target directory
mkdir -p "$CURSOR_DIR"

# Track counts
synced=0
skipped=0

# Function to convert a file
convert_file() {
    local source="$1"
    local target="$2"
    local description="$3"
    local always_apply="${4:-false}"

    if [[ -f "$target" ]] && [[ "$FORCE" != "true" ]]; then
        echo -e "  ${YELLOW}Skipped${NC}: $(basename "$target") (exists, use --force)"
        ((skipped++))
        return
    fi

    # Build frontmatter
    if [[ "$always_apply" == "true" ]]; then
        cat > "$target" << FRONTMATTER
---
description: $description
alwaysApply: true
---
FRONTMATTER
    else
        cat > "$target" << FRONTMATTER
---
description: $description
---
FRONTMATTER
    fi

    # Append content
    cat "$source" >> "$target"

    echo -e "  ${GREEN}Synced${NC}: $(basename "$target")"
    ((synced++))
}

# 1. Convert ORIENTATION.md → orientation.mdc
echo "Processing ORIENTATION.md..."
if [[ -f "$CLAUDE_DIR/ORIENTATION.md" ]]; then
    convert_file \
        "$CLAUDE_DIR/ORIENTATION.md" \
        "$CURSOR_DIR/orientation.mdc" \
        "Cognitive orientation - project identity, structure, and constraints" \
        "true"
else
    echo -e "  ${YELLOW}Not found${NC}: ORIENTATION.md"
fi

# 2. Convert wisdom files → wisdom-*.mdc
echo "Processing wisdom files..."
if [[ -d "$CLAUDE_DIR/wisdom" ]]; then
    for wisdom_file in "$CLAUDE_DIR/wisdom"/*.md; do
        [[ -f "$wisdom_file" ]] || continue

        name=$(basename "$wisdom_file" .md)

        # Extract description from first heading or first line
        first_heading=$(grep -m1 '^#' "$wisdom_file" 2>/dev/null | sed 's/^#* *//' || echo "$name")

        convert_file \
            "$wisdom_file" \
            "$CURSOR_DIR/wisdom-$name.mdc" \
            "$first_heading - cached patterns and reusable answers"
    done
else
    echo -e "  ${YELLOW}No wisdom directory${NC}"
fi

# 3. Create context-index.mdc (reference to indices)
echo "Creating context index..."
if [[ -d "$CLAUDE_DIR/indices" ]]; then
    cat > "$CURSOR_DIR/context-index.mdc" << 'EOF'
---
description: Entity and concept indices for quick lookups. Type @context-index to reference.
---

# Context Index

## Available Indices

EOF

    # List available indices
    for index_file in "$CLAUDE_DIR/indices"/*.json; do
        [[ -f "$index_file" ]] || continue
        name=$(basename "$index_file")
        count=$(jq -r '.meta.total_entities // .meta.total_concepts // "?"' "$index_file" 2>/dev/null || echo "?")
        echo "- **$name**: $count entries" >> "$CURSOR_DIR/context-index.mdc"
    done

    cat >> "$CURSOR_DIR/context-index.mdc" << 'EOF'

## Usage

Reference indices when you need to:
- Look up existing entities before creating new ones
- Understand concept relationships
- Find file locations for specific components

Indices are located at `.claude/context/indices/`.

## Refresh

```bash
python .claude/context/scripts/extract.py
```
EOF

    echo -e "  ${GREEN}Created${NC}: context-index.mdc"
    ((synced++))
fi

# 4. Copy the framework vision if it exists
if [[ -f "$CLAUDE_DIR/COGNITIVE-CONTEXT-FRAMEWORK.md" ]]; then
    convert_file \
        "$CLAUDE_DIR/COGNITIVE-CONTEXT-FRAMEWORK.md" \
        "$CURSOR_DIR/cognitive-framework.mdc" \
        "Cognitive Context Framework philosophy and architecture"
fi

echo ""
echo -e "${GREEN}Sync complete!${NC}"
echo "  Synced: $synced files"
echo "  Skipped: $skipped files"
echo ""
echo "Cursor will now use these rules. Test with:"
echo "  - Chat: Rules load automatically"
echo "  - @mention: Type @orientation or @wisdom-* to reference"
