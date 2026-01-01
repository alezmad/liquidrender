#!/usr/bin/env python3
"""
Knosia TODO Parser
Extracts all KNOSIA:TODO, KNOSIA:PARTIAL, and KNOSIA:DONE tags from checklist files.
Generates prioritized task lists for implementation tracking.

Usage:
    python parse_todos.py                    # Full report
    python parse_todos.py --priority=high    # Filter by priority
    python parse_todos.py --category=api     # Filter by category
    python parse_todos.py --format=csv       # Output as CSV
"""

import re
import os
import sys
import argparse
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
from collections import defaultdict

# Tag patterns
TAG_PATTERN = re.compile(
    r'<!--\s*KNOSIA:(DONE|TODO|PARTIAL)'
    r'(?:\s+priority=(\w+))?'
    r'(?:\s+category=(\w+))?'
    r'(?:\s+notes="([^"]*)")?'
    r'\s*-->'
)

# Line pattern to extract the checkbox item text
ITEM_PATTERN = re.compile(r'^-\s*\[[ x~]\]\s*(.+?)(?:\s*<!--|$)')


@dataclass
class KnosiaItem:
    """Represents a single checklist item with its status and metadata."""
    file: str
    line_number: int
    text: str
    status: str  # DONE, TODO, PARTIAL
    priority: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            'file': self.file,
            'line': self.line_number,
            'text': self.text,
            'status': self.status,
            'priority': self.priority or 'medium',
            'category': self.category or 'general',
            'notes': self.notes or ''
        }


def parse_file(filepath: Path) -> list[KnosiaItem]:
    """Parse a single markdown file for KNOSIA tags."""
    items = []

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for i, line in enumerate(lines, 1):
        tag_match = TAG_PATTERN.search(line)
        if tag_match:
            status = tag_match.group(1)
            priority = tag_match.group(2)
            category = tag_match.group(3)
            notes = tag_match.group(4)

            # Extract the item text
            item_match = ITEM_PATTERN.match(line)
            text = item_match.group(1).strip() if item_match else line.strip()

            items.append(KnosiaItem(
                file=filepath.name,
                line_number=i,
                text=text,
                status=status,
                priority=priority,
                category=category,
                notes=notes
            ))

    return items


def parse_all_files(directory: Path) -> list[KnosiaItem]:
    """Parse all markdown files in the directory."""
    all_items = []

    for filepath in sorted(directory.glob('*.md')):
        if filepath.name.startswith('00-'):  # Skip index
            continue
        items = parse_file(filepath)
        all_items.extend(items)

    return all_items


def filter_items(
    items: list[KnosiaItem],
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None
) -> list[KnosiaItem]:
    """Filter items by status, priority, or category."""
    filtered = items

    if status:
        filtered = [i for i in filtered if i.status.upper() == status.upper()]
    if priority:
        filtered = [i for i in filtered if (i.priority or 'medium').lower() == priority.lower()]
    if category:
        filtered = [i for i in filtered if (i.category or '').lower() == category.lower()]

    return filtered


def sort_by_priority(items: list[KnosiaItem]) -> list[KnosiaItem]:
    """Sort items by priority (high > medium > low)."""
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    return sorted(items, key=lambda x: priority_order.get((x.priority or 'medium').lower(), 1))


def generate_summary(items: list[KnosiaItem]) -> dict:
    """Generate summary statistics."""
    by_status = defaultdict(int)
    by_priority = defaultdict(int)
    by_category = defaultdict(int)
    by_file = defaultdict(lambda: defaultdict(int))

    for item in items:
        by_status[item.status] += 1
        by_priority[item.priority or 'medium'] += 1
        by_category[item.category or 'general'] += 1
        by_file[item.file][item.status] += 1

    return {
        'total': len(items),
        'by_status': dict(by_status),
        'by_priority': dict(by_priority),
        'by_category': dict(by_category),
        'by_file': {k: dict(v) for k, v in by_file.items()}
    }


def print_report(items: list[KnosiaItem], summary: dict):
    """Print a formatted report."""
    print("=" * 70)
    print("KNOSIA IMPLEMENTATION STATUS REPORT")
    print("=" * 70)
    print()

    # Summary
    print("## Summary")
    print(f"Total items: {summary['total']}")
    print()

    print("By Status:")
    for status, count in sorted(summary['by_status'].items()):
        pct = (count / summary['total']) * 100
        print(f"  {status:10} {count:4} ({pct:.1f}%)")
    print()

    print("By Priority (TODOs only):")
    todos = [i for i in items if i.status == 'TODO']
    todo_priorities = defaultdict(int)
    for item in todos:
        todo_priorities[item.priority or 'medium'] += 1
    for priority in ['high', 'medium', 'low']:
        count = todo_priorities.get(priority, 0)
        print(f"  {priority:10} {count:4}")
    print()

    print("By Category:")
    for category, count in sorted(summary['by_category'].items(), key=lambda x: -x[1]):
        print(f"  {category:15} {count:4}")
    print()

    # High priority TODOs
    high_priority = [i for i in items if i.status == 'TODO' and (i.priority or '').lower() == 'high']
    if high_priority:
        print("=" * 70)
        print("HIGH PRIORITY TODOS")
        print("=" * 70)
        for item in high_priority:
            print(f"\n[{item.file}:{item.line_number}]")
            print(f"  {item.text}")
            if item.category:
                print(f"  Category: {item.category}")
            if item.notes:
                print(f"  Notes: {item.notes}")
    print()

    # Partials
    partials = [i for i in items if i.status == 'PARTIAL']
    if partials:
        print("=" * 70)
        print("PARTIAL IMPLEMENTATIONS (Need Completion)")
        print("=" * 70)
        for item in partials:
            print(f"\n[{item.file}:{item.line_number}]")
            print(f"  {item.text}")
            if item.notes:
                print(f"  Notes: {item.notes}")
    print()


def print_csv(items: list[KnosiaItem]):
    """Print items as CSV."""
    print("file,line,status,priority,category,text,notes")
    for item in items:
        text = item.text.replace('"', '""')
        notes = (item.notes or '').replace('"', '""')
        print(f'"{item.file}",{item.line_number},{item.status},{item.priority or "medium"},{item.category or "general"},"{text}","{notes}"')


def print_markdown_table(items: list[KnosiaItem], title: str = "Tasks"):
    """Print items as Markdown table."""
    print(f"## {title}")
    print()
    print("| File | Line | Priority | Category | Task | Notes |")
    print("|------|------|----------|----------|------|-------|")
    for item in items:
        notes = item.notes or ''
        if len(notes) > 50:
            notes = notes[:47] + '...'
        text = item.text
        if len(text) > 60:
            text = text[:57] + '...'
        print(f"| {item.file} | {item.line_number} | {item.priority or 'medium'} | {item.category or 'general'} | {text} | {notes} |")
    print()


def main():
    parser = argparse.ArgumentParser(description='Parse KNOSIA checklist tags')
    parser.add_argument('--status', choices=['done', 'todo', 'partial'], help='Filter by status')
    parser.add_argument('--priority', choices=['high', 'medium', 'low'], help='Filter by priority')
    parser.add_argument('--category', help='Filter by category')
    parser.add_argument('--format', choices=['text', 'csv', 'markdown'], default='text', help='Output format')
    parser.add_argument('--dir', default='.', help='Directory containing checklist files')
    args = parser.parse_args()

    # Parse all files
    directory = Path(args.dir)
    if not directory.exists():
        print(f"Error: Directory {directory} does not exist", file=sys.stderr)
        sys.exit(1)

    items = parse_all_files(directory)

    # Filter
    items = filter_items(items, args.status, args.priority, args.category)

    # Sort TODOs by priority
    if args.status == 'todo' or not args.status:
        items = sort_by_priority(items)

    # Output
    if args.format == 'csv':
        print_csv(items)
    elif args.format == 'markdown':
        if args.status:
            print_markdown_table(items, f"{args.status.upper()} Items")
        else:
            # Group by status
            for status in ['TODO', 'PARTIAL', 'DONE']:
                status_items = [i for i in items if i.status == status]
                if status_items:
                    print_markdown_table(status_items, f"{status} Items ({len(status_items)})")
    else:
        summary = generate_summary(items)
        print_report(items, summary)


if __name__ == '__main__':
    main()
