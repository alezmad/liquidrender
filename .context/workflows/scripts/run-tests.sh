#!/bin/bash
# Run tests for specific files or patterns
# Usage: ./run-tests.sh [test_pattern] [workspace]
# Examples:
#   ./run-tests.sh "button"                    # Run tests matching "button"
#   ./run-tests.sh "button.test.ts"            # Run specific test file
#   ./run-tests.sh "" @repo/liquid-render      # Run all tests in workspace

set -e

PATTERN="${1:-}"
WORKSPACE="${2:-}"

echo "🧪 Running Tests"
echo "================"

if [ -n "$PATTERN" ]; then
    echo "Pattern: $PATTERN"
fi

if [ -n "$WORKSPACE" ]; then
    echo "Workspace: $WORKSPACE"
    if [ -n "$PATTERN" ]; then
        pnpm --filter "$WORKSPACE" test -- "$PATTERN"
    else
        pnpm --filter "$WORKSPACE" test
    fi
else
    if [ -n "$PATTERN" ]; then
        pnpm test -- "$PATTERN"
    else
        pnpm test
    fi
fi

echo ""
echo "✅ Tests completed"
