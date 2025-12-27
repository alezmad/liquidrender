#!/bin/bash
# generate-knowledge-file.sh
# Creates uploadable knowledge files for Claude Projects
#
# Usage: ./generate-knowledge-file.sh [output-dir]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Find project root
PROJECT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CLAUDE_DIR="$PROJECT_DIR/.claude/context"
OUTPUT_DIR="${1:-$PROJECT_DIR}"

# Output files
KNOWLEDGE_FILE="$OUTPUT_DIR/PROJECT-KNOWLEDGE.md"
INSTRUCTIONS_FILE="$OUTPUT_DIR/PROJECT-INSTRUCTIONS.txt"

echo -e "${GREEN}Generating Claude Projects knowledge files${NC}"
echo "Source: $CLAUDE_DIR"
echo "Output: $OUTPUT_DIR"
echo ""

# Check source exists
if [[ ! -d "$CLAUDE_DIR" ]]; then
    echo "Error: .claude/context/ not found"
    exit 1
fi

# ============================================
# Generate PROJECT-INSTRUCTIONS.txt
# ============================================

echo "Creating PROJECT-INSTRUCTIONS.txt..."

cat > "$INSTRUCTIONS_FILE" << 'EOF'
# Project Context

## Identity

{{PROJECT_NAME}} - {{PROJECT_DESCRIPTION}}

## Key Constraints

1. {{CONSTRAINT_1}}
2. {{CONSTRAINT_2}}
3. {{CONSTRAINT_3}}

## Knowledge Files

This project has uploaded knowledge files. Reference them for:

- **PROJECT-KNOWLEDGE.md** - Full project context including:
  - Orientation (project structure, mental model)
  - Wisdom files (cached patterns, best practices)
  - Entity index (components, functions, classes)
  - Concept graph (features, patterns, domains)

## Working Style

- Check knowledge files before implementing
- Follow existing patterns from wisdom files
- Reference entity index for existing components
- Ask for clarification when uncertain

EOF

# Try to extract project info from existing ORIENTATION.md
if [[ -f "$CLAUDE_DIR/ORIENTATION.md" ]]; then
    # Extract project name from first heading
    project_name=$(grep -m1 '^#' "$CLAUDE_DIR/ORIENTATION.md" | sed 's/^#* *//' | cut -d'-' -f1 | xargs)
    if [[ -n "$project_name" ]]; then
        sed -i '' "s/{{PROJECT_NAME}}/$project_name/g" "$INSTRUCTIONS_FILE" 2>/dev/null || \
        sed -i "s/{{PROJECT_NAME}}/$project_name/g" "$INSTRUCTIONS_FILE"
    fi
fi

echo -e "  ${GREEN}Created${NC}: PROJECT-INSTRUCTIONS.txt"
echo -e "  ${YELLOW}Note${NC}: Edit placeholders ({{...}}) before using"

# ============================================
# Generate PROJECT-KNOWLEDGE.md
# ============================================

echo "Creating PROJECT-KNOWLEDGE.md..."

cat > "$KNOWLEDGE_FILE" << 'EOF'
# Project Knowledge Base

> This file is auto-generated from `.claude/context/`. Do not edit directly.
> Regenerate with: `./generate-knowledge-file.sh`

---

EOF

# Add ORIENTATION.md
if [[ -f "$CLAUDE_DIR/ORIENTATION.md" ]]; then
    echo "## Orientation" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    cat "$CLAUDE_DIR/ORIENTATION.md" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    echo "---" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    echo "  Added: ORIENTATION.md"
fi

# Add wisdom files
if [[ -d "$CLAUDE_DIR/wisdom" ]]; then
    wisdom_count=0
    for wisdom_file in "$CLAUDE_DIR/wisdom"/*.md; do
        [[ -f "$wisdom_file" ]] || continue

        name=$(basename "$wisdom_file" .md)

        echo "## Wisdom: $name" >> "$KNOWLEDGE_FILE"
        echo "" >> "$KNOWLEDGE_FILE"
        cat "$wisdom_file" >> "$KNOWLEDGE_FILE"
        echo "" >> "$KNOWLEDGE_FILE"
        echo "---" >> "$KNOWLEDGE_FILE"
        echo "" >> "$KNOWLEDGE_FILE"

        ((wisdom_count++))
    done
    echo "  Added: $wisdom_count wisdom files"
fi

# Add entity index (formatted as markdown)
if [[ -f "$CLAUDE_DIR/indices/entities.json" ]]; then
    echo "## Entity Index" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    echo "Pre-computed index of project entities." >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"

    # Extract metadata
    echo "### Metadata" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    echo '```json' >> "$KNOWLEDGE_FILE"
    jq '.meta' "$CLAUDE_DIR/indices/entities.json" >> "$KNOWLEDGE_FILE"
    echo '```' >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"

    # Extract tier1 entities as a table
    echo "### Tier 1 Entities (Core)" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    echo "| Name | Type | File |" >> "$KNOWLEDGE_FILE"
    echo "|------|------|------|" >> "$KNOWLEDGE_FILE"

    jq -r '.entities.tier1 | to_entries[] | "| \(.key) | \(.value.type // "unknown") | \(.value.file // "?") |"' \
        "$CLAUDE_DIR/indices/entities.json" >> "$KNOWLEDGE_FILE" 2>/dev/null || echo "| (none) | | |" >> "$KNOWLEDGE_FILE"

    echo "" >> "$KNOWLEDGE_FILE"
    echo "---" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    echo "  Added: entities.json"
fi

# Add concept index (formatted as markdown)
if [[ -f "$CLAUDE_DIR/indices/concepts.json" ]]; then
    echo "## Concept Index" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    echo "Pre-computed index of project concepts." >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"

    # Extract concepts by category
    for category in features patterns domains; do
        concepts=$(jq -r ".concepts.$category | keys[]" "$CLAUDE_DIR/indices/concepts.json" 2>/dev/null)
        if [[ -n "$concepts" ]]; then
            echo "### ${category^}" >> "$KNOWLEDGE_FILE"
            echo "" >> "$KNOWLEDGE_FILE"
            while IFS= read -r concept; do
                desc=$(jq -r ".concepts.$category[\"$concept\"].description // \"\"" "$CLAUDE_DIR/indices/concepts.json")
                echo "- **$concept**: $desc" >> "$KNOWLEDGE_FILE"
            done <<< "$concepts"
            echo "" >> "$KNOWLEDGE_FILE"
        fi
    done

    echo "---" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    echo "  Added: concepts.json"
fi

# Add framework reference if exists
if [[ -f "$CLAUDE_DIR/COGNITIVE-CONTEXT-FRAMEWORK.md" ]]; then
    echo "## Framework Reference" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    echo "<details>" >> "$KNOWLEDGE_FILE"
    echo "<summary>Cognitive Context Framework (click to expand)</summary>" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    cat "$CLAUDE_DIR/COGNITIVE-CONTEXT-FRAMEWORK.md" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    echo "</details>" >> "$KNOWLEDGE_FILE"
    echo "" >> "$KNOWLEDGE_FILE"
    echo "  Added: COGNITIVE-CONTEXT-FRAMEWORK.md"
fi

# Final stats
knowledge_size=$(wc -c < "$KNOWLEDGE_FILE" | xargs)
knowledge_words=$(wc -w < "$KNOWLEDGE_FILE" | xargs)

echo ""
echo -e "${GREEN}Generation complete!${NC}"
echo ""
echo "Files created:"
echo "  - PROJECT-INSTRUCTIONS.txt (paste into Project Instructions)"
echo "  - PROJECT-KNOWLEDGE.md ($knowledge_words words, ~$((knowledge_size / 4)) tokens)"
echo ""
echo "Next steps:"
echo "  1. Edit PROJECT-INSTRUCTIONS.txt to fill in placeholders"
echo "  2. Go to claude.ai → Projects → Your Project → Settings"
echo "  3. Paste PROJECT-INSTRUCTIONS.txt into Custom Instructions"
echo "  4. Upload PROJECT-KNOWLEDGE.md as a knowledge file"
