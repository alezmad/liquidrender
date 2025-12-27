#!/bin/bash
# Context Refresh Hook
# Checks if entities.json needs refresh based on git commits
# Called on SessionStart and post-commit

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
CONTEXT_DIR="$PROJECT_DIR/.claude/context"
INDICES_DIR="$CONTEXT_DIR/indices"
ENTITIES_FILE="$INDICES_DIR/entities.json"
EXTRACT_SCRIPT="$CONTEXT_DIR/scripts/extract.py"

# Get current commit hash
CURRENT_COMMIT=$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Check if entities.json exists
if [[ ! -f "$ENTITIES_FILE" ]]; then
    echo "context-refresh: entities.json missing, extracting..."
    python "$EXTRACT_SCRIPT" --quiet 2>/dev/null || python "$EXTRACT_SCRIPT"
    exit 0
fi

# Get commit hash from entities.json
CACHED_COMMIT=$(grep -o '"from_commit": *"[^"]*"' "$ENTITIES_FILE" 2>/dev/null | cut -d'"' -f4 || echo "none")

# Compare commits
if [[ "$CURRENT_COMMIT" != "$CACHED_COMMIT" ]]; then
    # Check if component files changed since cached commit
    CHANGED_COMPONENTS=$(git -C "$PROJECT_DIR" diff --name-only "$CACHED_COMMIT" HEAD -- "packages/liquid-render/src/renderer/components/*.tsx" 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$CHANGED_COMPONENTS" -gt 0 ]]; then
        echo "context-refresh: $CHANGED_COMPONENTS component(s) changed, extracting..."
        python "$EXTRACT_SCRIPT" --quiet 2>/dev/null || python "$EXTRACT_SCRIPT"
    else
        echo "context-refresh: No component changes, index still valid"
    fi
else
    echo "context-refresh: entities.json is current (commit: $CURRENT_COMMIT)"
fi
