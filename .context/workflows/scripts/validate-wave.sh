#!/bin/bash
# Validate a completed wave (checkpoint validation)
# Usage: ./validate-wave.sh [workspace]
# Example: ./validate-wave.sh @repo/liquid-render

set -e

WORKSPACE="${1:-}"
FAILED=0

echo "🔒 Wave Checkpoint Validation"
echo "=============================="

# 1. TypeScript compilation
echo ""
echo "Step 1/4: TypeScript compilation..."
if [ -n "$WORKSPACE" ]; then
    if pnpm --filter "$WORKSPACE" build 2>&1; then
        echo "✓ Build passed"
    else
        echo "✗ Build failed"
        FAILED=1
    fi
else
    if pnpm build 2>&1; then
        echo "✓ Build passed"
    else
        echo "✗ Build failed"
        FAILED=1
    fi
fi

# 2. Type checking (stricter than build)
echo ""
echo "Step 2/4: Type checking (strict)..."
if [ -n "$WORKSPACE" ]; then
    if pnpm --filter "$WORKSPACE" typecheck 2>&1; then
        echo "✓ Type check passed"
    else
        echo "✗ Type check failed"
        FAILED=1
    fi
else
    if pnpm typecheck 2>&1; then
        echo "✓ Type check passed"
    else
        echo "✗ Type check failed"
        FAILED=1
    fi
fi

# 3. Tests
echo ""
echo "Step 3/4: Running tests..."
if [ -n "$WORKSPACE" ]; then
    if pnpm --filter "$WORKSPACE" test 2>&1; then
        echo "✓ Tests passed"
    else
        echo "✗ Tests failed"
        FAILED=1
    fi
else
    if pnpm test 2>&1; then
        echo "✓ Tests passed"
    else
        echo "✗ Tests failed"
        FAILED=1
    fi
fi

# 4. Lint (non-blocking warning)
echo ""
echo "Step 4/4: Linting..."
if pnpm lint 2>&1; then
    echo "✓ Lint passed"
else
    echo "⚠ Lint warnings (non-blocking)"
fi

# Summary
echo ""
echo "=============================="
if [ $FAILED -eq 0 ]; then
    echo "✅ CHECKPOINT PASSED"
    exit 0
else
    echo "❌ CHECKPOINT FAILED"
    exit 1
fi
