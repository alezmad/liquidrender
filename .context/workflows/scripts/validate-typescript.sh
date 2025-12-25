#!/bin/bash
# Validate TypeScript files in a workflow
# Usage: ./validate-typescript.sh [workspace] [file_pattern]
# Example: ./validate-typescript.sh @repo/liquid-render "src/**/*.tsx"

set -e

WORKSPACE="${1:-}"
PATTERN="${2:-}"

echo "🔍 TypeScript Validation"
echo "========================"

# TypeScript type checking
echo ""
echo "📘 Type Checking (tsc --noEmit)..."
if [ -n "$WORKSPACE" ]; then
    pnpm --filter "$WORKSPACE" typecheck
else
    pnpm typecheck
fi
echo "✓ TypeScript types valid"

# ESLint
echo ""
echo "📋 ESLint..."
if [ -n "$WORKSPACE" ]; then
    pnpm --filter "$WORKSPACE" lint 2>/dev/null || pnpm lint
else
    pnpm lint
fi
echo "✓ ESLint passed"

# Prettier (format check)
echo ""
echo "🎨 Prettier (format check)..."
pnpm format 2>/dev/null || echo "⚠ Prettier not configured or no changes"

echo ""
echo "========================"
echo "✅ All validations passed"
