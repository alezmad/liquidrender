#!/usr/bin/env python3
"""
Validate YAML frontmatter in component documentation files.

Usage:
  python validate-frontmatter.py <file_or_directory>
  python validate-frontmatter.py docs/components/
  python validate-frontmatter.py docs/components/button.component.md

Returns exit code 0 if all valid, 1 if any invalid.
"""
import sys
from pathlib import Path

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


# Required fields in frontmatter
REQUIRED_FIELDS = ['name', 'code', 'status']
OPTIONAL_FIELDS = ['tests_passed', 'tests_total', 'dependencies', 'signals', 'modifiers', 'complexity']
VALID_STATUS = ['pending', 'in_progress', 'completed', 'failed']
VALID_COMPLEXITY = ['S', 'M', 'L']


def parse_frontmatter(content: str) -> tuple[dict, list[str]]:
    """Parse YAML frontmatter and return (data, errors)."""
    errors = []

    if not content.startswith('---'):
        return {}, ["Missing YAML frontmatter (file must start with ---)"]

    try:
        end_idx = content.index('---', 3)
        frontmatter_str = content[3:end_idx].strip()
    except ValueError:
        return {}, ["Unclosed frontmatter (missing closing ---)"]

    if not HAS_YAML:
        return {}, ["PyYAML not installed - cannot validate"]

    try:
        data = yaml.safe_load(frontmatter_str) or {}
    except yaml.YAMLError as e:
        return {}, [f"Invalid YAML syntax: {e}"]

    return data, errors


def validate_frontmatter(data: dict) -> list[str]:
    """Validate frontmatter content and return list of errors."""
    errors = []

    # Check required fields
    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"Missing required field: {field}")

    # Validate status
    if 'status' in data and data['status'] not in VALID_STATUS:
        errors.append(f"Invalid status '{data['status']}'. Must be one of: {VALID_STATUS}")

    # Validate complexity
    if 'complexity' in data and data['complexity'] not in VALID_COMPLEXITY:
        errors.append(f"Invalid complexity '{data['complexity']}'. Must be one of: {VALID_COMPLEXITY}")

    # Validate test counts
    if 'tests_passed' in data and 'tests_total' in data:
        try:
            passed = int(data['tests_passed'])
            total = int(data['tests_total'])
            if passed > total:
                errors.append(f"tests_passed ({passed}) > tests_total ({total})")
            if passed < 0 or total < 0:
                errors.append("Test counts cannot be negative")
        except (ValueError, TypeError):
            errors.append("tests_passed and tests_total must be integers")

    # Validate arrays
    for field in ['dependencies', 'signals', 'modifiers']:
        if field in data and not isinstance(data[field], list):
            errors.append(f"{field} must be a list")

    return errors


def validate_file(path: Path) -> tuple[bool, list[str]]:
    """Validate a single file. Returns (is_valid, errors)."""
    try:
        content = path.read_text()
    except Exception as e:
        return False, [f"Could not read file: {e}"]

    data, parse_errors = parse_frontmatter(content)
    if parse_errors:
        return False, parse_errors

    validation_errors = validate_frontmatter(data)
    return len(validation_errors) == 0, validation_errors


def main():
    if len(sys.argv) < 2:
        print("Usage: python validate-frontmatter.py <file_or_directory>")
        print("Example: python validate-frontmatter.py docs/components/")
        sys.exit(1)

    target = Path(sys.argv[1])

    if not target.exists():
        print(f"Error: Path not found: {target}", file=sys.stderr)
        sys.exit(1)

    # Collect files to validate
    if target.is_file():
        files = [target]
    else:
        files = sorted(target.glob("*.component.md"))

    if not files:
        print(f"No .component.md files found in {target}")
        sys.exit(0)

    # Validate each file
    all_valid = True
    for file in files:
        is_valid, errors = validate_file(file)

        if is_valid:
            print(f"✓ {file.name}")
        else:
            all_valid = False
            print(f"✗ {file.name}")
            for error in errors:
                print(f"    - {error}")

    # Summary
    print()
    print(f"Validated {len(files)} file(s)")

    if all_valid:
        print("All files valid ✓")
        sys.exit(0)
    else:
        print("Some files have errors ✗")
        sys.exit(1)


if __name__ == "__main__":
    main()
