#!/bin/bash
#
# Cognitive Context Framework - Intelligent Bootstrap
# Version: 2.0
#
# This script doesn't just create templates - it discovers your project,
# imports existing context, and generates pre-filled cognitive architecture.
#
# Usage:
#   ./setup.sh                  # Interactive mode (recommended)
#   ./setup.sh --non-interactive # Use defaults and auto-detection
#   ./setup.sh --help           # Show help
#

set -e

# ============================================
# Configuration
# ============================================

VERSION="2.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors (disabled if not terminal)
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    MAGENTA='\033[0;35m'
    BOLD='\033[1m'
    DIM='\033[2m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' CYAN='' MAGENTA='' BOLD='' DIM='' NC=''
fi

# ============================================
# Discovery Results (populated during scan)
# ============================================

declare -A DETECTED
declare -a FOUND_DOCS
declare -a FOUND_SCHEMAS
declare -a IMPORT_CHOICES

# Project info
PROJECT_NAME=""
PROJECT_DESC=""
PROJECT_STACK=""
PROJECT_TYPE=""

# Architecture
ARCH_PATTERN=""
ARCH_DOMAINS=""
ARCH_INTEGRATIONS=""

# Constraints
declare -a CONSTRAINTS

# ============================================
# Utility Functions
# ============================================

print_header() {
    clear
    echo ""
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║          Cognitive Context Framework - Intelligent Bootstrap      ║${NC}"
    echo -e "${BOLD}${CYAN}║                           Version $VERSION                             ║${NC}"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_phase() {
    echo ""
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${MAGENTA}  Phase $1: $2${NC}"
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_found() {
    echo -e "${GREEN}  ✓${NC} $1"
}

print_not_found() {
    echo -e "${DIM}  ○ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

prompt_yn() {
    local prompt="$1"
    local default="${2:-y}"
    local result

    if [[ "$default" == "y" ]]; then
        read -p "$prompt [Y/n]: " result
        result=${result:-y}
    else
        read -p "$prompt [y/N]: " result
        result=${result:-n}
    fi

    [[ "${result,,}" == "y" ]]
}

prompt_choice() {
    local prompt="$1"
    local default="$2"
    local result

    read -p "$prompt [$default]: " result
    echo "${result:-$default}"
}

prompt_multiline() {
    local prompt="$1"
    local results=()

    echo "$prompt"
    echo -e "${DIM}  (Enter each item on a new line, empty line to finish)${NC}"

    while true; do
        read -p "  > " line
        [[ -z "$line" ]] && break
        results+=("$line")
    done

    printf '%s\n' "${results[@]}"
}

show_help() {
    echo "Cognitive Context Framework - Intelligent Bootstrap v$VERSION"
    echo ""
    echo "Usage: ./setup.sh [options]"
    echo ""
    echo "Options:"
    echo "  --non-interactive, -n    Auto-detect and use defaults"
    echo "  --help, -h               Show this help message"
    echo ""
    echo "This script will:"
    echo "  1. DISCOVER - Scan for existing project context"
    echo "  2. IMPORT   - Offer to migrate existing AI rules and docs"
    echo "  3. INTERVIEW - Ask about what couldn't be detected"
    echo "  4. GENERATE  - Create pre-filled cognitive architecture"
    echo ""
}

# ============================================
# Pre-Flight Checks
# ============================================

preflight_check_git() {
    print_step "Checking git repository..."

    if ! git rev-parse --show-toplevel &>/dev/null; then
        print_warning "Not a git repository"
        echo ""
        echo "  The Cognitive Context Framework works best with git:"
        echo "  - Creates checkpoint before changes"
        echo "  - Enables rollback if something goes wrong"
        echo "  - Auto-syncs on commits via hooks"
        echo ""

        if $INTERACTIVE; then
            if prompt_yn "  Initialize git repository?" "y"; then
                git init
                print_success "Initialized git repository"
            else
                print_warning "Continuing without git (no rollback available)"
                return
            fi
        fi
    fi

    print_found "Git repository"
}

preflight_check_uncommitted() {
    if ! git rev-parse --show-toplevel &>/dev/null; then
        return
    fi

    print_step "Checking for uncommitted changes..."

    local status=$(git status --porcelain 2>/dev/null)

    if [[ -n "$status" ]]; then
        local changed=$(echo "$status" | wc -l | tr -d ' ')
        print_warning "Found $changed uncommitted changes"

        if $INTERACTIVE; then
            echo ""
            echo "  Options:"
            echo "    [1] Commit changes now (recommended)"
            echo "    [2] Stash changes temporarily"
            echo "    [3] Continue anyway (risky)"
            echo ""
            read -p "  Select [1-3, default=1]: " choice

            case "$choice" in
                2)
                    git stash push -m "cognitive-context-setup-stash"
                    print_success "Stashed changes (restore with: git stash pop)"
                    DETECTED[stashed]=1
                    ;;
                3)
                    print_warning "Continuing with uncommitted changes"
                    ;;
                *)
                    echo ""
                    read -p "  Commit message [pre-cognitive-context-setup]: " msg
                    msg=${msg:-"pre-cognitive-context-setup"}
                    git add -A
                    git commit -m "$msg"
                    print_success "Committed changes"
                    ;;
            esac
        else
            # Non-interactive: auto-commit
            git add -A
            git commit -m "chore: pre-cognitive-context-setup checkpoint" 2>/dev/null || true
            print_success "Auto-committed changes"
        fi
    else
        print_found "Working directory clean"
    fi
}

preflight_create_checkpoint() {
    if ! git rev-parse --show-toplevel &>/dev/null; then
        return
    fi

    print_step "Creating rollback checkpoint..."

    local timestamp=$(date +%Y%m%d-%H%M%S)
    local tag_name="cognitive-pre-setup-$timestamp"

    # Create lightweight tag
    git tag "$tag_name" 2>/dev/null

    if [[ $? -eq 0 ]]; then
        print_success "Created checkpoint: $tag_name"
        echo ""
        echo -e "  ${DIM}To rollback: git checkout $tag_name${NC}"
        echo ""
        DETECTED[checkpoint_tag]="$tag_name"
    else
        print_warning "Could not create checkpoint tag"
    fi
}

preflight_backup_existing() {
    print_step "Checking for existing files to backup..."

    local backed_up=0

    # Backup existing .cursor/rules/
    if [[ -d ".cursor/rules" ]]; then
        local rule_count=$(find .cursor/rules -name "*.mdc" 2>/dev/null | wc -l | tr -d ' ')
        if [[ "$rule_count" -gt 0 ]]; then
            local backup_dir=".cursor-backup-$(date +%Y%m%d-%H%M%S)"
            cp -r .cursor/rules "$backup_dir"
            print_found "Backed up $rule_count rules → $backup_dir/"
            DETECTED[cursor_backup]="$backup_dir"
            ((backed_up++))
        fi
    fi

    # Backup existing .cognitive/
    if [[ -d ".cognitive" ]]; then
        local backup_dir=".cognitive-backup-$(date +%Y%m%d-%H%M%S)"
        cp -r .cognitive "$backup_dir"
        print_found "Backed up .cognitive/ → $backup_dir/"
        DETECTED[cognitive_backup]="$backup_dir"
        ((backed_up++))
    fi

    # Backup .cursorrules
    if [[ -f ".cursorrules" ]]; then
        cp .cursorrules ".cursorrules.backup"
        print_found "Backed up .cursorrules"
        ((backed_up++))
    fi

    if [[ "$backed_up" -eq 0 ]]; then
        print_found "No existing files to backup"
    fi
}

preflight_check_tools() {
    print_step "Checking required tools..."

    local missing=()

    # Check jq (optional but helpful)
    if command -v jq &>/dev/null; then
        print_found "jq (JSON parser)"
    else
        print_not_found "jq (optional - some features disabled)"
    fi

    # Check python3
    if command -v python3 &>/dev/null; then
        print_found "python3 (entity extraction)"
    elif command -v python &>/dev/null; then
        print_found "python (entity extraction)"
    else
        print_warning "python not found (entity extraction disabled)"
    fi

    # Check write permissions
    if [[ -w "." ]]; then
        print_found "Write permissions"
    else
        print_error "No write permission in current directory"
        exit 1
    fi
}

preflight_analyze_existing_mdc() {
    if [[ ! -d ".cursor/rules" ]]; then
        return
    fi

    local mdc_files=($(find .cursor/rules -name "*.mdc" 2>/dev/null))

    if [[ ${#mdc_files[@]} -eq 0 ]]; then
        return
    fi

    print_step "Analyzing existing Cursor rules for migration..."
    echo ""

    declare -g -a MDC_MIGRATIONS=()
    local index=1

    for mdc_file in "${mdc_files[@]}"; do
        local filename=$(basename "$mdc_file" .mdc)
        local always_apply=$(grep -m1 'alwaysApply:' "$mdc_file" 2>/dev/null | grep -q 'true' && echo "true" || echo "false")
        local has_globs=$(grep -q 'globs:' "$mdc_file" 2>/dev/null && echo "true" || echo "false")
        local has_desc=$(grep -q 'description:' "$mdc_file" 2>/dev/null && echo "true" || echo "false")
        local lines=$(wc -l < "$mdc_file" | tr -d ' ')

        echo -e "  ${GREEN}[$index]${NC} $filename.mdc ($lines lines)"

        # Determine migration strategy
        local strategy=""
        local note=""

        if [[ "$always_apply" == "true" ]]; then
            if [[ "$filename" == "orientation" ]] || [[ "$filename" == *"identity"* ]] || [[ "$filename" == *"project"* ]]; then
                strategy="orientation"
                note="Will merge into ORIENTATION.md"
            else
                strategy="wisdom-demote"
                note="⚠️  Demoting from always-apply to agent-requested"
            fi
        elif [[ "$has_globs" == "true" ]]; then
            strategy="wisdom-glob"
            note="Preserving glob pattern as wisdom"
        else
            strategy="wisdom"
            note="Converting to wisdom file"
        fi

        echo -e "      ${DIM}→ Strategy: $strategy${NC}"
        echo -e "      ${DIM}→ $note${NC}"
        echo ""

        MDC_MIGRATIONS+=("$mdc_file|$filename|$strategy|$always_apply|$has_globs")
        ((index++))
    done

    if $INTERACTIVE && [[ ${#MDC_MIGRATIONS[@]} -gt 0 ]]; then
        echo -e "${BOLD}Migration options:${NC}"
        echo "  [1] Migrate all to Cognitive Context (recommended)"
        echo "  [2] Keep existing rules, add Cognitive Context alongside"
        echo "  [3] Skip migration, start fresh"
        echo ""
        read -p "  Select [1-3, default=1]: " migration_choice

        case "$migration_choice" in
            2) DETECTED[migration_mode]="alongside" ;;
            3) DETECTED[migration_mode]="fresh"; MDC_MIGRATIONS=() ;;
            *) DETECTED[migration_mode]="migrate" ;;
        esac
    fi
}

run_preflight() {
    print_phase "0" "Pre-Flight Checks"

    echo "Running safety checks before making changes..."
    echo ""

    preflight_check_git
    echo ""
    preflight_check_uncommitted
    echo ""
    preflight_create_checkpoint
    preflight_backup_existing
    echo ""
    preflight_check_tools
    echo ""
    preflight_analyze_existing_mdc

    echo ""
    echo -e "${BOLD}${GREEN}Pre-flight checks complete.${NC}"

    if [[ -n "${DETECTED[checkpoint_tag]}" ]]; then
        echo ""
        echo -e "  ${DIM}Rollback command: git checkout ${DETECTED[checkpoint_tag]}${NC}"
    fi

    if $INTERACTIVE; then
        echo ""
        if ! prompt_yn "Proceed with setup?" "y"; then
            echo ""
            echo "Setup cancelled. No changes were made."
            if [[ -n "${DETECTED[stashed]}" ]]; then
                echo "  Don't forget to restore stashed changes: git stash pop"
            fi
            exit 0
        fi
    fi
}

# ============================================
# MDC Migration (file-by-file processing)
# ============================================

migrate_mdc_files() {
    if [[ ${#MDC_MIGRATIONS[@]} -eq 0 ]]; then
        return
    fi

    local mode="${DETECTED[migration_mode]:-migrate}"

    if [[ "$mode" == "fresh" ]]; then
        print_info "Skipping migration - starting fresh"
        return
    fi

    if [[ "$mode" == "alongside" ]]; then
        print_info "Keeping existing rules alongside Cognitive Context"
        return
    fi

    echo ""
    echo -e "${BOLD}Migrating Cursor rules to Cognitive Context...${NC}"
    echo ""

    local migrated=0
    local merged_orientation=""

    for entry in "${MDC_MIGRATIONS[@]}"; do
        IFS='|' read -r mdc_file filename strategy always_apply has_globs <<< "$entry"

        echo -e "  ${CYAN}Processing:${NC} $filename.mdc"

        # Read file content (skip frontmatter)
        local content=$(sed '1{/^---$/d}; /^---$/,/^---$/d' "$mdc_file")
        local frontmatter_desc=$(grep -m1 'description:' "$mdc_file" 2>/dev/null | sed 's/description: *//' || echo "")

        case "$strategy" in
            orientation)
                echo -e "    ${DIM}→ Strategy: Merge into ORIENTATION.md${NC}"
                echo -e "    ${DIM}→ Reason: alwaysApply rule detected - this is identity/core content${NC}"

                # Store for merging into orientation later
                merged_orientation+="

## Migrated from $filename.mdc

$content
"
                ((migrated++))
                echo -e "    ${GREEN}✓ Queued for orientation merge${NC}"
                ;;

            wisdom-demote)
                echo -e "    ${YELLOW}→ Strategy: Demote to agent-requested wisdom${NC}"
                echo -e "    ${DIM}→ Reason: alwaysApply=true is token-heavy; now loads only when relevant${NC}"

                local desc="${frontmatter_desc:-Migrated from $filename - check for relevance}"

                # Create wisdom file
                cat > ".cognitive/wisdom/$filename.md" << EOF
---
description: $desc
confidence: 80
verified_at: $(date +%Y-%m-%d)
migrated_from: .cursor/rules/$filename.mdc
note: Was alwaysApply - demoted to agent-requested for token efficiency
---

# $filename (Migrated)

$content
EOF

                # Create new mdc with just description (agent-requested)
                cat > ".cursor/rules/wisdom-$filename.mdc" << EOF
---
description: $desc (migrated, was always-apply)
---

$content
EOF
                ((migrated++))
                echo -e "    ${GREEN}✓ Created wisdom-$filename.mdc (now agent-requested)${NC}"
                ;;

            wisdom-glob)
                echo -e "    ${DIM}→ Strategy: Convert to wisdom, preserve glob${NC}"
                echo -e "    ${DIM}→ Reason: Has file pattern globs - auto-attaches to matching files${NC}"

                local globs=$(grep -A10 'globs:' "$mdc_file" 2>/dev/null | grep -E '^\s*-\s*' | sed 's/^\s*-\s*//' | head -5 | tr '\n' ', ' | sed 's/, $//')
                local desc="${frontmatter_desc:-File-specific rules for $globs}"

                # Create wisdom file
                cat > ".cognitive/wisdom/$filename.md" << EOF
---
description: $desc
confidence: 85
verified_at: $(date +%Y-%m-%d)
migrated_from: .cursor/rules/$filename.mdc
globs: [$globs]
---

# $filename

Auto-attaches to files matching: $globs

$content
EOF

                # Create mdc preserving globs
                local glob_yaml=$(grep -A10 'globs:' "$mdc_file" 2>/dev/null | sed -n '/globs:/,/^[a-z]/p' | grep -v '^[a-z]' || echo "")

                cat > ".cursor/rules/wisdom-$filename.mdc" << EOF
---
description: $desc
$glob_yaml
---

$content
EOF
                ((migrated++))
                echo -e "    ${GREEN}✓ Created wisdom-$filename.mdc (preserving globs)${NC}"
                ;;

            wisdom)
                echo -e "    ${DIM}→ Strategy: Convert to standard wisdom${NC}"
                echo -e "    ${DIM}→ Reason: Agent-requested rule - AI decides when to load${NC}"

                local desc="${frontmatter_desc:-Wisdom from $filename}"

                # Create wisdom file
                cat > ".cognitive/wisdom/$filename.md" << EOF
---
description: $desc
confidence: 85
verified_at: $(date +%Y-%m-%d)
migrated_from: .cursor/rules/$filename.mdc
---

# $filename

$content
EOF

                # Create mdc
                cat > ".cursor/rules/wisdom-$filename.mdc" << EOF
---
description: $desc
---

$content
EOF
                ((migrated++))
                echo -e "    ${GREEN}✓ Created wisdom-$filename.mdc${NC}"
                ;;
        esac

        echo ""
    done

    # Store merged orientation content for use during generation
    if [[ -n "$merged_orientation" ]]; then
        DETECTED[merged_orientation]="$merged_orientation"
        print_info "Orientation content queued for merge ($(($(echo "$merged_orientation" | wc -l))) lines)"
    fi

    echo ""
    print_success "Migrated $migrated Cursor rules to Cognitive Context"

    if [[ "$migrated" -gt 0 ]]; then
        echo ""
        echo -e "  ${DIM}Original files preserved in backup: ${DETECTED[cursor_backup]:-N/A}${NC}"
        echo -e "  ${DIM}To restore: cp -r ${DETECTED[cursor_backup]:-backup}/* .cursor/rules/${NC}"
    fi
}

# ============================================
# Phase 1: Discovery
# ============================================

discover_project_identity() {
    print_step "Scanning for project identity..."

    # Package.json (Node/JS projects)
    if [[ -f "package.json" ]]; then
        DETECTED[package_json]=1
        PROJECT_NAME=$(jq -r '.name // empty' package.json 2>/dev/null)
        PROJECT_DESC=$(jq -r '.description // empty' package.json 2>/dev/null)
        print_found "package.json → $PROJECT_NAME"
    fi

    # Cargo.toml (Rust projects)
    if [[ -f "Cargo.toml" ]]; then
        DETECTED[cargo_toml]=1
        PROJECT_NAME=${PROJECT_NAME:-$(grep -m1 '^name' Cargo.toml | cut -d'"' -f2)}
        print_found "Cargo.toml → $PROJECT_NAME"
    fi

    # pyproject.toml (Python projects)
    if [[ -f "pyproject.toml" ]]; then
        DETECTED[pyproject]=1
        PROJECT_NAME=${PROJECT_NAME:-$(grep -m1 '^name' pyproject.toml | cut -d'"' -f2)}
        print_found "pyproject.toml → $PROJECT_NAME"
    fi

    # go.mod (Go projects)
    if [[ -f "go.mod" ]]; then
        DETECTED[go_mod]=1
        PROJECT_NAME=${PROJECT_NAME:-$(head -1 go.mod | awk '{print $2}' | xargs basename)}
        print_found "go.mod → $PROJECT_NAME"
    fi

    # README.md
    if [[ -f "README.md" ]]; then
        DETECTED[readme]=1
        # Try to extract description from first paragraph
        if [[ -z "$PROJECT_DESC" ]]; then
            PROJECT_DESC=$(sed -n '/^[^#]/p' README.md | head -3 | tr '\n' ' ' | cut -c1-200)
        fi
        print_found "README.md"
    fi

    # Fallback to directory name
    PROJECT_NAME=${PROJECT_NAME:-$(basename "$(pwd)")}
}

discover_tech_stack() {
    print_step "Detecting technology stack..."

    local stack_parts=()

    # Frontend frameworks
    if [[ -f "package.json" ]]; then
        local deps=$(cat package.json)

        # React
        if echo "$deps" | grep -q '"react"'; then
            stack_parts+=("React")
            DETECTED[react]=1
            print_found "React"
        fi

        # Vue
        if echo "$deps" | grep -q '"vue"'; then
            stack_parts+=("Vue")
            DETECTED[vue]=1
            print_found "Vue"
        fi

        # Next.js
        if echo "$deps" | grep -q '"next"'; then
            stack_parts+=("Next.js")
            DETECTED[nextjs]=1
            print_found "Next.js"
        fi

        # TypeScript
        if echo "$deps" | grep -q '"typescript"'; then
            stack_parts+=("TypeScript")
            DETECTED[typescript]=1
            print_found "TypeScript"
        fi

        # Tailwind
        if echo "$deps" | grep -q '"tailwindcss"'; then
            stack_parts+=("Tailwind")
            DETECTED[tailwind]=1
            print_found "Tailwind CSS"
        fi

        # Prisma
        if echo "$deps" | grep -q '"prisma"'; then
            stack_parts+=("Prisma")
            DETECTED[prisma]=1
            print_found "Prisma ORM"
        fi

        # tRPC
        if echo "$deps" | grep -q '"@trpc"'; then
            stack_parts+=("tRPC")
            DETECTED[trpc]=1
            print_found "tRPC"
        fi
    fi

    # Rust
    if [[ -f "Cargo.toml" ]]; then
        stack_parts+=("Rust")
        DETECTED[rust]=1
        print_found "Rust"
    fi

    # Python
    if [[ -f "pyproject.toml" ]] || [[ -f "requirements.txt" ]]; then
        stack_parts+=("Python")
        DETECTED[python]=1
        print_found "Python"
    fi

    # Go
    if [[ -f "go.mod" ]]; then
        stack_parts+=("Go")
        DETECTED[go]=1
        print_found "Go"
    fi

    PROJECT_STACK=$(IFS=', '; echo "${stack_parts[*]}")
    [[ -z "$PROJECT_STACK" ]] && PROJECT_STACK="Unknown"
}

discover_project_type() {
    print_step "Detecting project structure..."

    # Monorepo detection
    if [[ -f "pnpm-workspace.yaml" ]] || [[ -f "lerna.json" ]] || [[ -d "packages" ]]; then
        PROJECT_TYPE="monorepo"
        local pkg_count=$(find packages -maxdepth 1 -type d 2>/dev/null | wc -l)
        print_found "Monorepo ($((pkg_count - 1)) packages)"
    # Library detection
    elif [[ -f "package.json" ]] && grep -q '"main"' package.json; then
        if grep -q '"private": *false' package.json 2>/dev/null || ! grep -q '"private"' package.json 2>/dev/null; then
            PROJECT_TYPE="library"
            print_found "Library/Package"
        fi
    fi

    # Default to application
    PROJECT_TYPE=${PROJECT_TYPE:-"application"}
    [[ "$PROJECT_TYPE" == "application" ]] && print_found "Application"
}

discover_existing_ai_context() {
    print_step "Scanning for existing AI context..."

    # .cursorrules (legacy)
    if [[ -f ".cursorrules" ]]; then
        DETECTED[cursorrules]=1
        local lines=$(wc -l < .cursorrules | tr -d ' ')
        print_found ".cursorrules ($lines lines) → Can migrate"
        FOUND_DOCS+=(".cursorrules|Legacy Cursor rules|$lines lines")
    else
        print_not_found ".cursorrules"
    fi

    # .cursor/rules/ (modern)
    if [[ -d ".cursor/rules" ]]; then
        DETECTED[cursor_rules_dir]=1
        local count=$(find .cursor/rules -name "*.mdc" 2>/dev/null | wc -l | tr -d ' ')
        print_found ".cursor/rules/ ($count rules)"
    fi

    # CLAUDE.md
    if [[ -f "CLAUDE.md" ]]; then
        DETECTED[claude_md]=1
        local lines=$(wc -l < CLAUDE.md | tr -d ' ')
        print_found "CLAUDE.md ($lines lines) → Can import"
        FOUND_DOCS+=("CLAUDE.md|Claude Code instructions|$lines lines")
    else
        print_not_found "CLAUDE.md"
    fi

    # AGENTS.md
    if [[ -f "AGENTS.md" ]]; then
        DETECTED[agents_md]=1
        print_found "AGENTS.md → Can import"
        FOUND_DOCS+=("AGENTS.md|Agent instructions|")
    fi

    # .github/copilot-instructions.md
    if [[ -f ".github/copilot-instructions.md" ]]; then
        DETECTED[copilot]=1
        print_found ".github/copilot-instructions.md → Can import"
        FOUND_DOCS+=(".github/copilot-instructions.md|Copilot instructions|")
    fi
}

discover_documentation() {
    print_step "Scanning for documentation sources..."

    # BMAD output
    if [[ -d "_bmad-output" ]]; then
        DETECTED[bmad]=1
        local files=$(find _bmad-output -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
        print_found "_bmad-output/ ($files documents) → Can import as wisdom"

        # List specific BMAD files
        for f in _bmad-output/*.md; do
            [[ -f "$f" ]] || continue
            local name=$(basename "$f")
            FOUND_DOCS+=("$f|BMAD: $name|")
        done
    else
        print_not_found "_bmad-output/"
    fi

    # docs/ directory
    if [[ -d "docs" ]]; then
        DETECTED[docs_dir]=1
        local count=$(find docs -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
        print_found "docs/ ($count markdown files)"

        for f in docs/*.md docs/**/*.md; do
            [[ -f "$f" ]] || continue
            FOUND_DOCS+=("$f|Doc: $(basename "$f")|")
        done
    fi

    # ADR (Architecture Decision Records)
    for adr_dir in "ADR" "adr" "docs/adr" "docs/ADR" "architecture/decisions"; do
        if [[ -d "$adr_dir" ]]; then
            DETECTED[adr]=1
            local count=$(find "$adr_dir" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
            print_found "$adr_dir/ ($count decisions) → Can index"
            break
        fi
    done

    # RFC
    if [[ -d "RFC" ]] || [[ -d "rfc" ]]; then
        DETECTED[rfc]=1
        print_found "RFC directory → Can index"
    fi

    # Specs
    if [[ -d "specs" ]] || [[ -d "spec" ]]; then
        DETECTED[specs]=1
        local dir=$(ls -d specs spec 2>/dev/null | head -1)
        local count=$(find "$dir" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
        print_found "$dir/ ($count specs) → Can import"

        for f in "$dir"/*.md; do
            [[ -f "$f" ]] || continue
            FOUND_DOCS+=("$f|Spec: $(basename "$f")|")
        done
    fi
}

discover_schemas() {
    print_step "Scanning for schema definitions..."

    # Prisma schema
    if [[ -f "prisma/schema.prisma" ]] || [[ -f "schema.prisma" ]]; then
        DETECTED[prisma_schema]=1
        local schema_file=$(ls prisma/schema.prisma schema.prisma 2>/dev/null | head -1)
        local models=$(grep -c "^model " "$schema_file" 2>/dev/null || echo "0")
        print_found "$schema_file ($models models) → Can index entities"
        FOUND_SCHEMAS+=("$schema_file|Prisma|$models models")
    fi

    # OpenAPI/Swagger
    for api_file in "openapi.yaml" "openapi.yml" "swagger.yaml" "swagger.yml" "api/openapi.yaml"; do
        if [[ -f "$api_file" ]]; then
            DETECTED[openapi]=1
            print_found "$api_file → Can index endpoints"
            FOUND_SCHEMAS+=("$api_file|OpenAPI|")
            break
        fi
    done

    # GraphQL
    if ls *.graphql **/*.graphql 2>/dev/null | head -1 > /dev/null; then
        DETECTED[graphql]=1
        local count=$(find . -name "*.graphql" 2>/dev/null | wc -l | tr -d ' ')
        print_found "GraphQL schemas ($count files) → Can index"
    fi

    # TypeScript types directory
    if [[ -d "src/types" ]] || [[ -d "types" ]]; then
        DETECTED[types_dir]=1
        local dir=$(ls -d src/types types 2>/dev/null | head -1)
        print_found "$dir/ → Can index type definitions"
    fi
}

discover_design_system() {
    print_step "Scanning for design system..."

    # Tailwind config
    if [[ -f "tailwind.config.js" ]] || [[ -f "tailwind.config.ts" ]]; then
        DETECTED[tailwind_config]=1
        print_found "Tailwind config → Can extract design tokens"
    fi

    # Design tokens
    for tokens_file in "tokens.json" "design-tokens.json" "src/tokens.ts" "theme.ts" "src/theme.ts"; do
        if [[ -f "$tokens_file" ]]; then
            DETECTED[design_tokens]=1
            print_found "$tokens_file → Design tokens"
            break
        fi
    done

    # Storybook
    if [[ -d ".storybook" ]]; then
        DETECTED[storybook]=1
        print_found ".storybook/ → Component documentation"
    fi
}

run_discovery() {
    print_phase "1" "Discovery"
    echo "Scanning your project to understand its structure..."
    echo ""

    discover_project_identity
    echo ""
    discover_tech_stack
    echo ""
    discover_project_type
    echo ""
    discover_existing_ai_context
    echo ""
    discover_documentation
    echo ""
    discover_schemas
    echo ""
    discover_design_system
}

# ============================================
# Phase 2: Import Decisions
# ============================================

show_discovery_summary() {
    print_phase "2" "Import Decisions"

    echo -e "${BOLD}Detected Project:${NC}"
    echo ""
    echo -e "  Name:        ${GREEN}$PROJECT_NAME${NC}"
    echo -e "  Description: ${DIM}${PROJECT_DESC:0:60}...${NC}"
    echo -e "  Stack:       ${CYAN}$PROJECT_STACK${NC}"
    echo -e "  Type:        ${CYAN}$PROJECT_TYPE${NC}"
    echo ""
}

prompt_imports() {
    if [[ ${#FOUND_DOCS[@]} -eq 0 ]] && [[ ${#FOUND_SCHEMAS[@]} -eq 0 ]]; then
        echo -e "${DIM}No existing documentation or schemas found to import.${NC}"
        return
    fi

    echo -e "${BOLD}Found existing context sources:${NC}"
    echo ""

    local index=1
    declare -A import_map

    # List documents
    for doc in "${FOUND_DOCS[@]}"; do
        IFS='|' read -r path desc detail <<< "$doc"
        printf "  ${GREEN}[%d]${NC} %-40s %s\n" "$index" "$desc" "$detail"
        import_map[$index]="$path"
        ((index++))
    done

    # List schemas
    for schema in "${FOUND_SCHEMAS[@]}"; do
        IFS='|' read -r path type detail <<< "$schema"
        printf "  ${CYAN}[%d]${NC} %-40s %s\n" "$index" "$type schema" "$detail"
        import_map[$index]="$path"
        ((index++))
    done

    echo ""
    echo -e "${DIM}Enter numbers to import (comma-separated), 'all', or 'none':${NC}"
    read -p "  > " import_selection

    if [[ "$import_selection" == "all" ]]; then
        IMPORT_CHOICES=("${FOUND_DOCS[@]}" "${FOUND_SCHEMAS[@]}")
    elif [[ "$import_selection" != "none" ]] && [[ -n "$import_selection" ]]; then
        IFS=',' read -ra selections <<< "$import_selection"
        for sel in "${selections[@]}"; do
            sel=$(echo "$sel" | tr -d ' ')
            if [[ -n "${import_map[$sel]}" ]]; then
                # Find the full entry
                for doc in "${FOUND_DOCS[@]}" "${FOUND_SCHEMAS[@]}"; do
                    if [[ "$doc" == "${import_map[$sel]}|"* ]]; then
                        IMPORT_CHOICES+=("$doc")
                        break
                    fi
                done
            fi
        done
    fi

    if [[ ${#IMPORT_CHOICES[@]} -gt 0 ]]; then
        echo ""
        print_success "Will import ${#IMPORT_CHOICES[@]} sources"
    fi
}

confirm_project_info() {
    echo ""
    echo -e "${BOLD}Confirm project information:${NC}"
    echo ""

    if $INTERACTIVE; then
        PROJECT_NAME=$(prompt_choice "  Project name" "$PROJECT_NAME")

        echo "  Description (one line):"
        read -p "  > " new_desc
        PROJECT_DESC=${new_desc:-$PROJECT_DESC}
    fi
}

# ============================================
# Phase 3: Interview
# ============================================

interview_architecture() {
    print_phase "3" "Architecture Interview"

    if ! $INTERACTIVE; then
        ARCH_PATTERN="standard"
        return
    fi

    echo "Let's capture what can't be auto-detected..."
    echo ""

    # Architecture pattern (if not detected)
    if [[ -z "$ARCH_PATTERN" ]]; then
        echo -e "${BOLD}Architecture pattern:${NC}"
        echo "  [1] Monolith - Single deployable unit"
        echo "  [2] Microservices - Multiple independent services"
        echo "  [3] Monorepo - Multiple packages, shared tooling"
        echo "  [4] Serverless - Functions as a service"
        echo "  [5] Library - Published package"
        echo ""
        read -p "  Select [1-5, default=1]: " arch_choice

        case "$arch_choice" in
            2) ARCH_PATTERN="microservices" ;;
            3) ARCH_PATTERN="monorepo" ;;
            4) ARCH_PATTERN="serverless" ;;
            5) ARCH_PATTERN="library" ;;
            *) ARCH_PATTERN="monolith" ;;
        esac
    fi

    echo ""

    # Key domains
    echo -e "${BOLD}Key domains/features in this project:${NC}"
    echo -e "${DIM}  e.g., auth, billing, dashboard, api, components${NC}"
    read -p "  > " ARCH_DOMAINS

    echo ""

    # External integrations
    echo -e "${BOLD}External services/integrations:${NC}"
    echo -e "${DIM}  e.g., Stripe, Auth0, PostgreSQL, Redis, S3${NC}"
    read -p "  > " ARCH_INTEGRATIONS
}

interview_constraints() {
    echo ""
    echo -e "${BOLD}What should NEVER happen in this codebase?${NC}"
    echo -e "${DIM}  These become hard constraints in your AI context.${NC}"
    echo ""
    echo "  Examples:"
    echo "    - Never use Redux, use Zustand instead"
    echo "    - Never hardcode colors, use design tokens"
    echo "    - Never commit .env files"
    echo "    - Never bypass TypeScript strict mode"
    echo ""

    if $INTERACTIVE; then
        echo -e "${DIM}  Enter constraints (one per line, empty to finish):${NC}"
        while true; do
            read -p "  > " constraint
            [[ -z "$constraint" ]] && break
            CONSTRAINTS+=("$constraint")
        done
    fi

    # Add some defaults if none provided
    if [[ ${#CONSTRAINTS[@]} -eq 0 ]]; then
        CONSTRAINTS+=("Follow existing patterns in the codebase")
        CONSTRAINTS+=("Check for existing solutions before creating new ones")
    fi
}

interview_workflow() {
    if ! $INTERACTIVE; then
        return
    fi

    echo ""
    echo -e "${BOLD}Development workflow:${NC}"
    echo "  [1] Solo developer"
    echo "  [2] Small team (2-5)"
    echo "  [3] Large team (5+)"
    echo ""
    read -p "  Select [1-3, default=1]: " team_size

    # Store for potential use in generation
    DETECTED[team_size]=${team_size:-1}
}

run_interview() {
    interview_architecture
    interview_constraints
    interview_workflow
}

# ============================================
# Phase 4: Generation
# ============================================

generate_directories() {
    print_step "Creating directory structure..."

    mkdir -p .cognitive/{wisdom,indices,schemas,scripts,templates}
    mkdir -p .cursor/rules

    print_success "Created .cognitive/ and .cursor/rules/"
}

generate_orientation() {
    print_step "Generating ORIENTATION.md..."

    local constraints_md=""
    local i=1
    for c in "${CONSTRAINTS[@]}"; do
        constraints_md+="$i. $c"$'\n'
        ((i++))
    done

    local domains_md=""
    if [[ -n "$ARCH_DOMAINS" ]]; then
        domains_md="Key domains: $ARCH_DOMAINS"
    fi

    local integrations_md=""
    if [[ -n "$ARCH_INTEGRATIONS" ]]; then
        integrations_md="Integrations: $ARCH_INTEGRATIONS"
    fi

    cat > .cognitive/ORIENTATION.md << EOF
# $PROJECT_NAME - Cognitive Orientation

> **Read time:** ~30 seconds | **Token budget:** ~300 tokens

## Identity

You are working on **$PROJECT_NAME**.

$PROJECT_DESC

## Mental Model

This is a **$PROJECT_TYPE** built with **$PROJECT_STACK**.

$domains_md
$integrations_md

Think of this codebase as a well-organized system where:
- Each module has a single responsibility
- Patterns are consistent across similar code
- Existing code is the best reference for new code

## Structure

\`\`\`
$(if [[ -d "src" ]]; then
    find src -type d -maxdepth 2 2>/dev/null | head -10 | sed 's/^//'
else
    echo "."
fi)
\`\`\`

## Hard Constraints

$constraints_md

## Quick Pointers

| Task | First Read |
|------|------------|
| Understanding architecture | @wisdom-architecture |
| Creating components | @wisdom-components |
| API patterns | Check existing endpoints |

---

*This orientation loads automatically. Check wisdom files for specific patterns.*
EOF

    # Append any merged content from MDC migration
    if [[ -n "${DETECTED[merged_orientation]}" ]]; then
        echo "" >> .cognitive/ORIENTATION.md
        echo "---" >> .cognitive/ORIENTATION.md
        echo "" >> .cognitive/ORIENTATION.md
        echo "# Migrated Content" >> .cognitive/ORIENTATION.md
        echo "" >> .cognitive/ORIENTATION.md
        echo "The following was imported from your existing Cursor rules:" >> .cognitive/ORIENTATION.md
        echo "${DETECTED[merged_orientation]}" >> .cognitive/ORIENTATION.md
        print_info "Appended migrated content to orientation"
    fi

    print_success "Generated .cognitive/ORIENTATION.md"
}

generate_cursor_orientation() {
    print_step "Generating Cursor orientation rule..."

    cat > .cursor/rules/orientation.mdc << 'FRONTMATTER'
---
description: Cognitive orientation - project identity, structure, and constraints
alwaysApply: true
---

FRONTMATTER

    cat .cognitive/ORIENTATION.md >> .cursor/rules/orientation.mdc

    print_success "Generated .cursor/rules/orientation.mdc"
}

import_cursorrules() {
    if [[ ! -f ".cursorrules" ]]; then
        return
    fi

    print_step "Migrating .cursorrules..."

    # Create wisdom file from cursorrules
    cat > .cognitive/wisdom/legacy-rules.md << EOF
---
description: Migrated rules from legacy .cursorrules file
confidence: 80
verified_at: $(date +%Y-%m-%d)
---

# Legacy Rules (Migrated)

The following rules were migrated from the original \`.cursorrules\` file.
Review and update as needed.

---

$(cat .cursorrules)
EOF

    # Also create mdc version
    cat > .cursor/rules/wisdom-legacy-rules.mdc << EOF
---
description: Migrated rules from legacy .cursorrules - coding standards and patterns
---

$(cat .cursorrules)
EOF

    print_success "Migrated .cursorrules → wisdom-legacy-rules.mdc"
}

import_bmad_docs() {
    if [[ ! -d "_bmad-output" ]]; then
        return
    fi

    print_step "Importing BMAD documents..."

    local imported=0

    # Import architecture as wisdom
    if [[ -f "_bmad-output/ARCHITECTURE.md" ]] || [[ -f "_bmad-output/architecture.md" ]]; then
        local arch_file=$(ls _bmad-output/[Aa]rchitecture.md 2>/dev/null | head -1)
        if [[ -f "$arch_file" ]]; then
            cat > .cognitive/wisdom/architecture.md << EOF
---
description: Architecture decisions and patterns from BMAD analysis
confidence: 90
verified_at: $(date +%Y-%m-%d)
source: $arch_file
---

# Architecture Decisions

$(cat "$arch_file")
EOF

            cat > .cursor/rules/wisdom-architecture.mdc << EOF
---
description: Architecture decisions, patterns, and technical constraints
---

$(cat "$arch_file")
EOF
            ((imported++))
            print_found "Architecture → wisdom-architecture.mdc"
        fi
    fi

    # Import PRD as wisdom
    if [[ -f "_bmad-output/PRD.md" ]] || [[ -f "_bmad-output/prd.md" ]]; then
        local prd_file=$(ls _bmad-output/[Pp][Rr][Dd].md 2>/dev/null | head -1)
        if [[ -f "$prd_file" ]]; then
            cat > .cognitive/wisdom/requirements.md << EOF
---
description: Product requirements from BMAD PRD
confidence: 85
verified_at: $(date +%Y-%m-%d)
source: $prd_file
---

# Product Requirements

$(cat "$prd_file")
EOF
            ((imported++))
            print_found "PRD → wisdom-requirements.md"
        fi
    fi

    print_success "Imported $imported BMAD documents"
}

import_prisma_schema() {
    local schema_file=""
    [[ -f "prisma/schema.prisma" ]] && schema_file="prisma/schema.prisma"
    [[ -f "schema.prisma" ]] && schema_file="schema.prisma"

    if [[ -z "$schema_file" ]]; then
        return
    fi

    print_step "Indexing Prisma schema..."

    # Extract models
    local models=$(grep "^model " "$schema_file" | awk '{print $2}')
    local model_count=$(echo "$models" | wc -l | tr -d ' ')

    # Generate entities.json with Prisma models
    cat > .cognitive/indices/entities.json << EOF
{
  "meta": {
    "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "from_commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'initial')",
    "total_entities": $model_count,
    "sources": ["prisma/schema.prisma"]
  },
  "entities": {
    "tier1": {
$(echo "$models" | while read model; do
    [[ -z "$model" ]] && continue
    echo "      \"$model\": {"
    echo "        \"file\": \"$schema_file\","
    echo "        \"type\": \"schema\","
    echo "        \"exports\": [\"$model\"]"
    echo "      },"
done | sed '$ s/,$//')
    },
    "tier2": {}
  }
}
EOF

    print_success "Indexed $model_count Prisma models"
}

generate_default_wisdom() {
    print_step "Generating default wisdom files..."

    # Components wisdom
    cat > .cognitive/wisdom/components.md << 'EOF'
---
description: Patterns for creating components in this project
confidence: 75
verified_at:
---

# Component Patterns

## TL;DR

Follow existing component patterns. Check similar components before creating new ones.

## Pattern

```tsx
interface Props {
  // Define all props with TypeScript
}

export function ComponentName({ prop1, prop2 }: Props) {
  return (
    <div data-testid="component-name">
      {/* Component content */}
    </div>
  );
}
```

## Key Points

1. Use TypeScript interfaces for all props
2. Include data-testid for testing
3. Handle loading and error states
4. Keep components focused (<200 lines)

## Anti-Patterns

- Don't use `any` type
- Don't hardcode colors or spacing
- Don't create god components
EOF

    # Create cursor version
    cat > .cursor/rules/wisdom-components.mdc << 'EOF'
---
description: Patterns for creating React/TypeScript components
---

# Component Patterns

## TL;DR

Follow existing component patterns. Check similar components before creating new ones.

## Pattern

```tsx
interface Props {
  // Define all props with TypeScript
}

export function ComponentName({ prop1, prop2 }: Props) {
  return (
    <div data-testid="component-name">
      {/* Component content */}
    </div>
  );
}
```

## Key Points

1. Use TypeScript interfaces for all props
2. Include data-testid for testing
3. Handle loading and error states
4. Keep components focused (<200 lines)
EOF

    print_success "Generated default wisdom files"
}

generate_extraction_script() {
    print_step "Generating extraction script..."

    cat > .cognitive/scripts/extract.py << 'PYTHON'
#!/usr/bin/env python3
"""
Entity Extraction Script
Generates entities.json from source code.

Customize SOURCE_DIRS and FILE_PATTERNS for your project.
"""

import json
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path

# ============================================
# CONFIGURATION - Edit for your project
# ============================================

SOURCE_DIRS = ["src/components", "src/hooks", "src/utils", "src/api"]
FILE_PATTERNS = ["*.tsx", "*.ts"]
OUTPUT_PATH = ".cognitive/indices/entities.json"
EXCLUDE_PATTERNS = [".test.", ".spec.", ".stories.", "__tests__"]

# ============================================
# Extraction Logic
# ============================================

def get_git_commit():
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except:
        return "unknown"

def should_skip(file_path):
    path_str = str(file_path)
    return any(pattern in path_str for pattern in EXCLUDE_PATTERNS)

def extract_exports(file_path):
    exports = []
    try:
        with open(file_path, 'r') as f:
            content = f.read()

        patterns = [
            r'export\s+(?:async\s+)?function\s+(\w+)',
            r'export\s+const\s+(\w+)',
            r'export\s+class\s+(\w+)',
            r'export\s+interface\s+(\w+)',
            r'export\s+type\s+(\w+)',
            r'export\s+default\s+(?:function\s+)?(\w+)',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, content)
            exports.extend(matches)

    except Exception as e:
        pass

    return list(set(exports))

def classify_tier(file_path, exports):
    if len(exports) > 2:
        return 'tier1'
    if 'components' in str(file_path) or 'hooks' in str(file_path):
        return 'tier1'
    return 'tier2'

def detect_type(file_path):
    path_str = str(file_path).lower()
    if 'component' in path_str:
        return 'component'
    if 'hook' in path_str:
        return 'hook'
    if 'api' in path_str or 'endpoint' in path_str:
        return 'endpoint'
    if 'type' in path_str or 'schema' in path_str:
        return 'schema'
    if 'util' in path_str or 'helper' in path_str:
        return 'utility'
    return 'module'

def main():
    project_root = Path(__file__).parent.parent.parent
    os.chdir(project_root)

    print("Extracting entities...")

    entities = {"tier1": {}, "tier2": {}}
    total = 0

    for source_dir in SOURCE_DIRS:
        source_path = Path(source_dir)
        if not source_path.exists():
            continue

        for pattern in FILE_PATTERNS:
            for file_path in source_path.rglob(pattern):
                if should_skip(file_path):
                    continue
                if file_path.name.startswith('index.'):
                    continue

                exports = extract_exports(file_path)
                if not exports:
                    continue

                entity_name = exports[0]
                tier = classify_tier(file_path, exports)
                entity_type = detect_type(file_path)

                entities[tier][entity_name] = {
                    "file": str(file_path),
                    "type": entity_type,
                    "exports": exports
                }
                total += 1

    output = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
            "from_commit": get_git_commit(),
            "total_entities": total
        },
        "entities": entities
    }

    output_path = Path(OUTPUT_PATH)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"Generated {OUTPUT_PATH} ({total} entities)")

if __name__ == "__main__":
    main()
PYTHON

    chmod +x .cognitive/scripts/extract.py

    print_success "Generated extraction script"
}

generate_sync_script() {
    print_step "Generating sync script..."

    cat > sync-cursor.sh << 'BASH'
#!/bin/bash
# Sync .cognitive/ → .cursor/rules/

set -e
QUIET=false
[[ "$1" == "--quiet" ]] && QUIET=true

log() { $QUIET || echo "$1"; }

PROJECT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_DIR"

log "Syncing .cognitive/ → .cursor/rules/"

# Sync ORIENTATION.md
if [[ -f .cognitive/ORIENTATION.md ]]; then
    cat > .cursor/rules/orientation.mdc << 'FRONT'
---
description: Cognitive orientation - project identity, structure, and constraints
alwaysApply: true
---

FRONT
    cat .cognitive/ORIENTATION.md >> .cursor/rules/orientation.mdc
    log "  ✓ orientation.mdc"
fi

# Sync wisdom files
for file in .cognitive/wisdom/*.md; do
    [[ -f "$file" ]] || continue
    name=$(basename "$file" .md)

    desc=$(grep -m1 'description:' "$file" 2>/dev/null | sed 's/description: *//' || \
           grep -m1 '^#' "$file" | sed 's/^#* *//')
    desc=${desc:-"Wisdom: $name"}

    cat > ".cursor/rules/wisdom-$name.mdc" << FRONT
---
description: $desc
---

FRONT
    sed '/^---$/,/^---$/d' "$file" >> ".cursor/rules/wisdom-$name.mdc"
    log "  ✓ wisdom-$name.mdc"
done

log "Sync complete!"
BASH

    chmod +x sync-cursor.sh

    print_success "Generated sync-cursor.sh"
}

generate_git_hook() {
    if [[ ! -d ".git" ]]; then
        print_warning "Not a git repository, skipping hook"
        return
    fi

    print_step "Setting up git hook..."

    mkdir -p .git/hooks

    local hook_file=".git/hooks/post-commit"
    local marker="# cognitive-context-sync"

    if [[ -f "$hook_file" ]] && grep -q "$marker" "$hook_file"; then
        print_warning "Git hook already configured"
        return
    fi

    cat >> "$hook_file" << 'HOOK'

# cognitive-context-sync
if [[ -x ./sync-cursor.sh ]]; then
    ./sync-cursor.sh --quiet &
fi
HOOK

    chmod +x "$hook_file"
    print_success "Installed git post-commit hook"
}

generate_initial_indices() {
    print_step "Generating initial indices..."

    # Only create if not already created by import
    if [[ ! -f ".cognitive/indices/entities.json" ]]; then
        cat > .cognitive/indices/entities.json << EOF
{
  "meta": {
    "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "from_commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'initial')",
    "total_entities": 0
  },
  "entities": {
    "tier1": {},
    "tier2": {}
  }
}
EOF
    fi

    cat > .cognitive/indices/concepts.json << EOF
{
  "meta": {
    "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "total_concepts": 0
  },
  "concepts": {
    "features": {},
    "patterns": {},
    "domains": {}
  }
}
EOF

    print_success "Generated initial indices"
}

generate_schemas() {
    print_step "Generating schemas..."

    cat > .cognitive/schemas/entities.yaml << 'EOF'
type: object
required: [meta, entities]
properties:
  meta:
    properties:
      generated_at: { type: string }
      from_commit: { type: string }
      total_entities: { type: integer }
  entities:
    properties:
      tier1: { type: object }
      tier2: { type: object }
EOF

    cat > .cognitive/schemas/wisdom.yaml << 'EOF'
type: object
properties:
  description: { type: string, maxLength: 100 }
  confidence: { type: integer, minimum: 0, maximum: 100 }
  verified_at: { type: string }
  depends_on: { type: array }
  related: { type: array }
EOF

    print_success "Generated schemas"
}

generate_templates() {
    print_step "Generating templates..."

    mkdir -p .cognitive/templates

    cat > .cognitive/templates/wisdom.template.md << 'EOF'
---
description: SHORT_DESCRIPTION (max 100 chars - AI uses this to decide relevance)
confidence: 80
verified_at: YYYY-MM-DD
depends_on: []
related: []
---

# TITLE

## TL;DR

One paragraph summary of when and why to use this pattern.

## When to Use

- Use case 1
- Use case 2

## Pattern

```language
// Code example here
```

## Key Points

1. Important thing 1
2. Important thing 2
3. Important thing 3

## Anti-Patterns

- What NOT to do
- Common mistakes to avoid
EOF

    print_success "Generated templates"
}

generate_context_index_rule() {
    print_step "Generating context index rule..."

    cat > .cursor/rules/context-index.mdc << 'EOF'
---
description: Entity and concept indices for quick lookups - type @context-index to load
---

# Context Index

Reference this when you need to look up existing entities or concepts.

## Entity Index

Location: `.cognitive/indices/entities.json`

Contains all indexed code entities (components, hooks, utilities, etc.)
organized by tier (tier1 = core, tier2 = secondary).

## Concept Index

Location: `.cognitive/indices/concepts.json`

Contains feature relationships, patterns, and domain mappings.

## Refresh Indices

```bash
python .cognitive/scripts/extract.py
./sync-cursor.sh
```
EOF

    print_success "Generated context-index.mdc"
}

run_generation() {
    print_phase "4" "Generation"

    generate_directories
    echo ""

    # Migrate existing MDC files BEFORE generating new orientation
    # (allows merging migrated content into orientation)
    migrate_mdc_files
    echo ""

    generate_orientation
    generate_cursor_orientation
    echo ""

    # Run imports
    import_cursorrules
    import_bmad_docs
    import_prisma_schema
    echo ""

    generate_default_wisdom
    generate_extraction_script
    generate_sync_script
    generate_git_hook
    generate_initial_indices
    generate_schemas
    generate_templates
    generate_context_index_rule

    # Auto-run extraction and sync so user is ready immediately
    finalize_setup
}

finalize_setup() {
    echo ""
    print_step "Finalizing setup..."

    # Run entity extraction if Python available
    if command -v python3 &>/dev/null || command -v python &>/dev/null; then
        print_step "Running entity extraction..."
        local python_cmd=$(command -v python3 || command -v python)
        if "$python_cmd" .cognitive/scripts/extract.py 2>/dev/null; then
            print_success "Entity extraction complete"
        else
            print_warning "Entity extraction had issues (you can run manually later)"
        fi
    fi

    # Sync to Cursor
    print_step "Syncing to Cursor..."
    if ./sync-cursor.sh --quiet 2>/dev/null; then
        print_success "Synced to .cursor/rules/"
    else
        print_warning "Sync had issues (run ./sync-cursor.sh manually)"
    fi

    # Verify files exist
    local orientation_ok=false
    local wisdom_count=0

    [[ -f ".cursor/rules/orientation.mdc" ]] && orientation_ok=true
    wisdom_count=$(find .cursor/rules -name "wisdom-*.mdc" 2>/dev/null | wc -l | tr -d ' ')

    if $orientation_ok; then
        echo ""
        print_success "Ready to use! Cursor will load your context automatically."
        echo ""
        echo -e "  ${GREEN}✓${NC} orientation.mdc (always loaded)"
        echo -e "  ${GREEN}✓${NC} $wisdom_count wisdom files (agent-requested)"
    fi
}

# ============================================
# Summary
# ============================================

show_summary() {
    echo ""
    echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║                     Setup Complete!                               ║${NC}"
    echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    echo -e "${BOLD}Created:${NC}"
    echo ""
    echo "  .cognitive/                    Source of truth (portable)"
    echo "  ├── ORIENTATION.md             Your project identity"
    echo "  ├── wisdom/                    Cached patterns"
    echo "  ├── indices/                   Entity & concept indices"
    echo "  ├── templates/                 For creating new wisdom"
    echo "  └── scripts/extract.py         Entity extraction"
    echo ""
    echo "  .cursor/rules/                 Cursor reads from here"
    echo "  ├── orientation.mdc            Always loaded"
    echo "  └── wisdom-*.mdc               Agent-requested"
    echo ""
    echo "  sync-cursor.sh                 Sync script"
    echo ""

    if [[ ${#IMPORT_CHOICES[@]} -gt 0 ]]; then
        echo -e "${BOLD}Imported:${NC}"
        for choice in "${IMPORT_CHOICES[@]}"; do
            IFS='|' read -r path desc detail <<< "$choice"
            echo "  ✓ $desc"
        done
        echo ""
    fi

    if [[ ${#MDC_MIGRATIONS[@]} -gt 0 ]]; then
        echo -e "${BOLD}Migrated:${NC}"
        echo "  ✓ ${#MDC_MIGRATIONS[@]} Cursor rules → Cognitive Context"
        echo ""
    fi

    if [[ -n "${DETECTED[checkpoint_tag]}" ]] || [[ -n "${DETECTED[cursor_backup]}" ]]; then
        echo -e "${BOLD}Safety:${NC}"
        [[ -n "${DETECTED[checkpoint_tag]}" ]] && echo "  ✓ Git checkpoint: ${DETECTED[checkpoint_tag]}"
        [[ -n "${DETECTED[cursor_backup]}" ]] && echo "  ✓ Backup: ${DETECTED[cursor_backup]}/"
        [[ -n "${DETECTED[cognitive_backup]}" ]] && echo "  ✓ Backup: ${DETECTED[cognitive_backup]}/"
        echo ""
        echo -e "  ${DIM}To rollback: git checkout ${DETECTED[checkpoint_tag]:-HEAD~1}${NC}"
        echo ""
    fi

    echo -e "${BOLD}${GREEN}You're all set! Just open Cursor and start coding.${NC}"
    echo ""
    echo -e "${DIM}Optional refinements:${NC}"
    echo ""
    echo "  • Edit orientation:    ${CYAN}vim .cognitive/ORIENTATION.md${NC}"
    echo "  • Add wisdom files:    ${CYAN}cp .cognitive/templates/wisdom.template.md .cognitive/wisdom/my-pattern.md${NC}"
    echo "  • Re-sync after edits: ${CYAN}./sync-cursor.sh${NC}"
    echo ""
    echo -e "${DIM}Documentation: README.md and docs/${NC}"
    echo ""
}

# ============================================
# Main
# ============================================

INTERACTIVE=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --non-interactive|-n)
            INTERACTIVE=false
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Detect project root
if git rev-parse --show-toplevel &>/dev/null; then
    PROJECT_DIR=$(git rev-parse --show-toplevel)
else
    PROJECT_DIR=$(pwd)
fi

cd "$PROJECT_DIR"

# Run all phases
print_header

# Phase 0: Pre-flight checks (safety, backups, migration analysis)
run_preflight

# Phase 1: Discovery
run_discovery

# Phase 2: Import decisions (if interactive)
if $INTERACTIVE; then
    show_discovery_summary
    prompt_imports
    confirm_project_info
    run_interview
fi

# Phase 3 & 4: Generation (includes MDC migration)
run_generation
show_summary
