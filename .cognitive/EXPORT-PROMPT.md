# Export Cognitive Context Distribution

Create a distributable zip of the cognitive-context system for installation in other projects.

## Include in zip:

1. **Package**: `packages/cognitive-context/` (full npm package)
2. **Onboarding**: `.claude/context/docs/distribution/cognitive-context/ONBOARDING-AGENT.md`
3. **Templates**:
   - `.cognitive/` directory structure template
   - `cognitive.config.yaml` example
   - Adapter scripts (cursor.sh, claude-code.sh, sync-all.sh)

## Commands:

```bash
mkdir -p /tmp/cognitive-context-dist

# Copy package
cp -r packages/cognitive-context /tmp/cognitive-context-dist/

# Copy onboarding
cp .claude/context/docs/distribution/cognitive-context/ONBOARDING-AGENT.md /tmp/cognitive-context-dist/

# Copy adapter templates
mkdir -p /tmp/cognitive-context-dist/templates/adapters
cp .cognitive/adapters/*.sh /tmp/cognitive-context-dist/templates/adapters/

# Copy config template
cp cognitive.config.yaml /tmp/cognitive-context-dist/templates/

# Create install script
cat > /tmp/cognitive-context-dist/install.sh << 'EOF'
#!/bin/bash
# Install cognitive-context in a project
set -e
echo "Installing cognitive-context..."
pnpm add ./cognitive-context
echo "Run: cognitive init"
EOF
chmod +x /tmp/cognitive-context-dist/install.sh

# Create zip
cd /tmp && zip -r cognitive-context-dist.zip cognitive-context-dist/
mv /tmp/cognitive-context-dist.zip ~/Desktop/

echo "Created: ~/Desktop/cognitive-context-dist.zip"
```

## Output:
`~/Desktop/cognitive-context-dist.zip` ready to unzip and install in any project.
