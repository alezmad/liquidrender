#!/bin/bash
# Context Refresh Hook
# Checks if entities.json needs refresh based on git commits
# Called on SessionStart and post-commit

set -e

# ============================================================
# CONFIGURATION - Customize these for your project
# ============================================================

# Project directory (auto-detected, can be overridden)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

# Context directory location
CONTEXT_DIR="$PROJECT_DIR/.claude/context"

# Indices directory (where entities.json lives)
INDICES_DIR="$CONTEXT_DIR/indices"

# Entity index file
ENTITIES_FILE="$INDICES_DIR/entities.json"

# Extraction script location
EXTRACT_SCRIPT="$CONTEXT_DIR/scripts/extract.py"

# File pattern for detecting relevant changes
# Replace with your project's source file pattern
# Examples:
#   - "packages/*/src/**/*.tsx"      (monorepo components)
#   - "src/components/*.tsx"          (standard React)
#   - "app/**/*.ts"                   (Next.js app router)
#   - "lib/**/*.py"                   (Python library)
SOURCE_GLOB="{{SOURCE_GLOB}}"

# ============================================================
# LOGIC - Generally no changes needed below
# ============================================================

# Get current commit hash
CURRENT_COMMIT=$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Check if entities.json exists
if [[ ! -f "$ENTITIES_FILE" ]]; then
    echo "context-refresh: entities.json missing, extracting..."
    python "$EXTRACT_SCRIPT" --quiet 2>/dev/null || python "$EXTRACT_SCRIPT"
    exit 0
fi

# Get commit hash from entities.json
# Expects format: "from_commit": "abc123"
CACHED_COMMIT=$(grep -o '"from_commit": *"[^"]*"' "$ENTITIES_FILE" 2>/dev/null | cut -d'"' -f4 || echo "none")

# Compare commits
if [[ "$CURRENT_COMMIT" != "$CACHED_COMMIT" ]]; then
    # Check if relevant source files changed since cached commit
    CHANGED_FILES=$(git -C "$PROJECT_DIR" diff --name-only "$CACHED_COMMIT" HEAD -- "$SOURCE_GLOB" 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$CHANGED_FILES" -gt 0 ]]; then
        echo "context-refresh: $CHANGED_FILES file(s) changed, extracting..."
        python "$EXTRACT_SCRIPT" --quiet 2>/dev/null || python "$EXTRACT_SCRIPT"
    else
        echo "context-refresh: No relevant changes, index still valid"
    fi
else
    echo "context-refresh: entities.json is current (commit: $CURRENT_COMMIT)"
fi

# ============================================================
# SETUP INSTRUCTIONS
# ============================================================
#
# 1. Replace {{SOURCE_GLOB}} with your file pattern
#
# 2. Make this script executable:
#    chmod +x .claude/hooks/context-refresh.sh
#
# 3. (Optional) Set up as git post-commit hook:
#
#    # Option A: Direct symlink
#    ln -sf ../../.claude/hooks/context-refresh.sh .git/hooks/post-commit
#
#    # Option B: Add to existing hook
#    echo '.claude/hooks/context-refresh.sh' >> .git/hooks/post-commit
#
#    # Option C: Use Husky (if installed)
#    # Add to package.json:
#    # "husky": {
#    #   "hooks": {
#    #     "post-commit": ".claude/hooks/context-refresh.sh"
#    #   }
#    # }
#
# 4. Test manually:
#    .claude/hooks/context-refresh.sh
#
# ============================================================
