#!/bin/bash
# Install Cognitive Context for Claude Code

set -e
cd "$(dirname "$0")/../.."

# Copy commands if they exist
mkdir -p .claude/commands/context
[ -d .cognitive/commands/context ] && cp .cognitive/commands/context/*.md .claude/commands/context/ 2>/dev/null || true
[ -f .cognitive/commands/resume-report.md ] && cp .cognitive/commands/resume-report.md .claude/commands/

# Update CLAUDE.md header with cognitive pointer
if [ -f CLAUDE.md ]; then
  if ! grep -q ".cognitive/" CLAUDE.md; then
    echo "Note: CLAUDE.md exists but doesn't reference .cognitive/"
    echo "Consider adding: Read \`.cognitive/SUMMARY.md\` for project orientation."
  fi
fi

echo "✓ Claude Code integration synced"
