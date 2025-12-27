#!/usr/bin/env python3
"""
Entity Extraction Script

Scans the codebase and generates/updates .claude/context/indices/entities.json
following the schema defined in .claude/context/schemas/entities.yaml

Usage:
    python .claude/context/scripts/extract.py
    python .claude/context/scripts/extract.py --output custom-path.json
"""

import argparse
import json
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

# ============================================================================
# Configuration
# ============================================================================

# Project root (relative to script location)
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent

# Paths to scan
COMPONENTS_DIR = PROJECT_ROOT / "packages" / "liquid-render" / "src" / "renderer" / "components"

# Default output path
DEFAULT_OUTPUT = PROJECT_ROOT / ".claude" / "context" / "indices" / "entities.json"


# ============================================================================
# Git Utilities
# ============================================================================

def get_git_commit_hash() -> str:
    """Get the current git commit hash (short form)."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return "unknown"


# ============================================================================
# Component Extraction
# ============================================================================

def extract_component_comment(content: str) -> str | None:
    """Extract the first-line comment describing the component."""
    # Match: // ComponentName - Description
    match = re.match(r'^// ([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*) - (.+?)$', content, re.MULTILINE)
    if match:
        return match.group(2).strip()

    # Fallback: just extract first line comment
    match = re.match(r'^// (.+?)$', content, re.MULTILINE)
    if match:
        return match.group(1).strip()

    return None


def extract_exports(content: str) -> list[str]:
    """Extract exported function/const names from a TypeScript file."""
    exports = []

    # Match: export function Name
    for match in re.finditer(r'export\s+function\s+([A-Z][a-zA-Z0-9]*)', content):
        exports.append(match.group(1))

    # Match: export const Name
    for match in re.finditer(r'export\s+const\s+([A-Z][a-zA-Z0-9]*)', content):
        exports.append(match.group(1))

    # Match: export { Name }
    for match in re.finditer(r'export\s*\{\s*([^}]+)\s*\}', content):
        names = match.group(1).split(',')
        for name in names:
            # Handle "Name as Alias" syntax
            name = name.strip().split(' as ')[0].strip()
            if name and name[0].isupper():
                exports.append(name)

    # Match: export default Name
    for match in re.finditer(r'export\s+default\s+([A-Z][a-zA-Z0-9]*)', content):
        name = match.group(1)
        if name not in exports:
            exports.append(name)

    return list(set(exports))


def extract_imports(content: str) -> list[str]:
    """Extract import dependencies from a TypeScript file."""
    deps = []

    # Match: import ... from 'package'
    for match in re.finditer(r"from\s+['\"]([^'\"]+)['\"]", content):
        module = match.group(1)
        # Only include external packages (not relative imports)
        if not module.startswith('.') and not module.startswith('@/'):
            # Get the package name (first part of scoped or regular package)
            if module.startswith('@'):
                # Scoped package: @scope/name
                parts = module.split('/')
                if len(parts) >= 2:
                    deps.append(f"{parts[0]}/{parts[1]}")
            else:
                # Regular package
                deps.append(module.split('/')[0])

    return list(set(deps))


def extract_props(content: str, component_name: str) -> list[str]:
    """Extract prop names from component props interface or inline types."""
    props = []

    # Look for interface with Props suffix
    interface_pattern = rf'interface\s+{component_name}Props\s*\{{\s*([^}}]+)\}}'
    match = re.search(interface_pattern, content, re.DOTALL)
    if match:
        interface_body = match.group(1)
        # Extract property names
        for prop_match in re.finditer(r'(\w+)\s*[?:]', interface_body):
            props.append(prop_match.group(1))
        return props

    # Look for type with Props suffix
    type_pattern = rf'type\s+{component_name}Props\s*=\s*\{{\s*([^}}]+)\}}'
    match = re.search(type_pattern, content, re.DOTALL)
    if match:
        type_body = match.group(1)
        for prop_match in re.finditer(r'(\w+)\s*[?:]', type_body):
            props.append(prop_match.group(1))
        return props

    # Look for Static* Props interface
    static_pattern = rf'interface\s+Static{component_name}Props\s*(?:<[^>]+>)?\s*\{{\s*([^}}]+)\}}'
    match = re.search(static_pattern, content, re.DOTALL)
    if match:
        interface_body = match.group(1)
        for prop_match in re.finditer(r'(\w+)\s*[?:]', interface_body):
            props.append(prop_match.group(1))
        return props

    return props


def infer_purpose_from_name(name: str) -> str:
    """Infer a basic purpose description from the component name."""
    # Common component type mappings
    purposes = {
        'button': 'Interactive button with variants',
        'card': 'Container card with styling',
        'table': 'Sortable data table with columns',
        'chart': 'Data visualization chart',
        'form': 'Form container with validation',
        'input': 'Text input field',
        'modal': 'Modal dialog overlay',
        'text': 'Text display element',
        'heading': 'Section heading element',
        'list': 'List container element',
        'select': 'Dropdown select control',
        'checkbox': 'Checkbox toggle control',
        'switch': 'Toggle switch control',
        'radio': 'Radio button group',
        'tabs': 'Tabbed content container',
        'accordion': 'Collapsible content sections',
        'drawer': 'Slide-out panel',
        'tooltip': 'Hover tooltip display',
        'popover': 'Click popover content',
        'badge': 'Status badge indicator',
        'avatar': 'User avatar display',
        'progress': 'Progress indicator bar',
        'nav': 'Navigation menu',
        'sidebar': 'Side navigation panel',
        'header': 'Page header section',
        'breadcrumb': 'Navigation breadcrumb trail',
        'icon': 'Icon display element',
        'image': 'Image display element',
        'container': 'Layout container wrapper',
        'stack': 'Vertical/horizontal stack layout',
        'grid': 'Grid layout container',
        'tag': 'Label tag element',
        'date': 'Date picker input',
        'daterange': 'Date range picker',
        'range': 'Range slider input',
        'textarea': 'Multi-line text input',
        'stepper': 'Step indicator/wizard',
        'kpi': 'Key metric display card',
        'sheet': 'Bottom sheet panel',
    }

    name_lower = name.lower()

    # Check for direct matches
    for key, purpose in purposes.items():
        if key in name_lower:
            return purpose

    return f"{name} component"


def process_component_file(file_path: Path) -> dict[str, Any] | None:
    """Process a single component file and extract entity info."""
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception:
        return None

    # Get relative path from project root
    rel_path = file_path.relative_to(PROJECT_ROOT)

    # Extract exports to find main component name
    exports = extract_exports(content)
    if not exports:
        return None

    # Use first export as the main component name
    main_component = exports[0]

    # Extract comment-based description or infer from name
    comment_desc = extract_component_comment(content)
    tier1 = comment_desc if comment_desc else infer_purpose_from_name(main_component)

    # Extract dependencies
    deps = extract_imports(content)

    # Extract props (try main component first, then Static version)
    props = extract_props(content, main_component)
    if not props and len(exports) > 1:
        # Try Static variant
        for exp in exports:
            if exp.startswith('Static'):
                props = extract_props(content, exp.replace('Static', ''))
                break

    return {
        'name': main_component,
        'tier1': tier1[:80] if len(tier1) > 80 else tier1,  # Limit to ~15 tokens
        'tier2': {
            'path': str(rel_path),
            'props': props[:10] if props else [],  # Limit props
            'deps': deps[:5] if deps else [],      # Limit deps
            'exports': exports[:5],                 # Limit exports
        }
    }


def extract_components() -> tuple[list[str], dict[str, dict]]:
    """Extract all components from the components directory."""
    if not COMPONENTS_DIR.exists():
        print(f"Warning: Components directory not found: {COMPONENTS_DIR}")
        return [], {}

    index = []
    entities = {}

    for file_path in sorted(COMPONENTS_DIR.glob("*.tsx")):
        # Skip utility files
        if file_path.name.startswith('_') or file_path.name == 'utils.tsx':
            continue

        result = process_component_file(file_path)
        if result:
            name = result['name']
            index.append(name)
            entities[name] = {
                'tier1': result['tier1'],
                'tier2': result['tier2'],
            }

    return index, entities


# ============================================================================
# Main
# ============================================================================

def generate_entities_json(output_path: Path) -> dict[str, Any]:
    """Generate the complete entities.json structure."""
    # Extract all entity types
    component_index, component_entities = extract_components()

    # Build the output structure matching the schema
    output = {
        'meta': {
            'components': len(component_index),
            'schemas': 0,      # Future: add schema extraction
            'endpoints': 0,    # Future: add endpoint extraction
            'generated': datetime.now().strftime('%Y-%m-%d'),
            'from_commit': get_git_commit_hash(),
        },
        'categories': {
            'components': {
                '_index': component_index,
                **component_entities,
            },
            # Future categories
            'schemas': {
                '_index': [],
            },
            'endpoints': {
                '_index': [],
            },
        },
    }

    return output


def main():
    parser = argparse.ArgumentParser(
        description='Extract code entities and generate entities.json'
    )
    parser.add_argument(
        '--output', '-o',
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f'Output path for entities.json (default: {DEFAULT_OUTPUT})'
    )
    args = parser.parse_args()

    output_path = args.output
    if not output_path.is_absolute():
        output_path = PROJECT_ROOT / output_path

    # Create output directory if needed
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Extracting entities from: {PROJECT_ROOT}")
    print(f"Output path: {output_path}")

    # Generate entities
    entities = generate_entities_json(output_path)

    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(entities, f, indent=2)

    # Print summary
    meta = entities['meta']
    print(f"\nGenerated entities.json:")
    print(f"  Components: {meta['components']}")
    print(f"  Schemas: {meta['schemas']}")
    print(f"  Endpoints: {meta['endpoints']}")
    print(f"  From commit: {meta['from_commit']}")
    print(f"  Generated: {meta['generated']}")


if __name__ == '__main__':
    main()
