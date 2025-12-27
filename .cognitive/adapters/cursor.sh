#!/bin/bash
# Install Cognitive Context for Cursor

set -e
cd "$(dirname "$0")/../.."

mkdir -p .cursor/rules

# Sync orientation
cat > .cursor/rules/orientation.mdc << 'EOF'
---
description: Cognitive orientation - project identity and constraints
alwaysApply: true
---

EOF
cat .cognitive/SUMMARY.md >> .cursor/rules/orientation.mdc

# Sync wisdom files
for f in .cognitive/cache/answers/*.md; do
  [ -f "$f" ] || continue
  name=$(basename "$f" .md)
  {
    echo "---"
    echo "description: $(head -1 "$f" | sed 's/# //')"
    echo "---"
    echo ""
    cat "$f"
  } > ".cursor/rules/wisdom-${name}.mdc"
done

echo "✓ Cursor integration installed"
