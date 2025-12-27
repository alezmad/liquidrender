#!/bin/bash
# Sync cognitive context to all installed tools

set -e
cd "$(dirname "$0")/../.."

echo "Syncing cognitive context..."

[ -d .cursor ] && bash .cognitive/adapters/cursor.sh
[ -f CLAUDE.md ] && bash .cognitive/adapters/claude-code.sh

echo ""
echo "✓ All integrations synced"
