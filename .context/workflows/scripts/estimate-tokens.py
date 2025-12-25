#!/usr/bin/env python3
"""
Estimate token count for files to support context budget management.

Uses a simple heuristic: ~4 characters per token (works well for code/prose).
More accurate than character count, faster than tokenizer libraries.

Usage:
  python estimate-tokens.py <file_or_dir> [--detailed]
  python estimate-tokens.py specs/LIQUID-RENDER-SPEC.md
  python estimate-tokens.py src/components/ --detailed

Examples:
  # Single file
  $ python estimate-tokens.py README.md
  README.md: ~1,200 tokens

  # Directory with details
  $ python estimate-tokens.py src/ --detailed
  src/index.ts: ~150 tokens
  src/utils.ts: ~800 tokens
  Total: ~950 tokens (2 files)
"""
import sys
import os
from pathlib import Path
from typing import List, Tuple, Dict
import hashlib

# Token estimation constant
# Based on OpenAI's observation: ~4 chars per token for English/code
CHARS_PER_TOKEN = 4

# File extensions to include
CODE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.yaml', '.yml',
    '.json', '.css', '.scss', '.html', '.sql', '.sh', '.bash'
}


def estimate_tokens(content: str) -> int:
    """Estimate token count from string content."""
    return len(content) // CHARS_PER_TOKEN


def file_hash(content: str) -> str:
    """Generate truncated SHA-256 hash for drift detection."""
    full_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
    return f"sha256:{full_hash[:12]}"


def analyze_file(path: Path) -> Dict:
    """Analyze a single file for token count and hash."""
    try:
        content = path.read_text(encoding='utf-8', errors='ignore')
        tokens = estimate_tokens(content)
        lines = len(content.splitlines())
        return {
            'path': str(path),
            'tokens': tokens,
            'lines': lines,
            'hash': file_hash(content),
            'size_bytes': len(content.encode('utf-8'))
        }
    except Exception as e:
        return {
            'path': str(path),
            'error': str(e)
        }


def analyze_directory(dir_path: Path, extensions: set = None) -> List[Dict]:
    """Recursively analyze all matching files in directory."""
    if extensions is None:
        extensions = CODE_EXTENSIONS

    results = []
    for path in sorted(dir_path.rglob('*')):
        if path.is_file() and path.suffix in extensions:
            # Skip common non-essential paths
            path_str = str(path)
            if any(skip in path_str for skip in [
                'node_modules', '.git', 'dist', 'build', '.next',
                '__pycache__', '.pytest_cache', 'coverage'
            ]):
                continue
            results.append(analyze_file(path))

    return results


def format_tokens(tokens: int) -> str:
    """Format token count with thousands separator."""
    if tokens >= 1000:
        return f"~{tokens:,}"
    return f"~{tokens}"


def print_budget_analysis(results: List[Dict], budget: int = 20000):
    """Print analysis with budget context."""
    total_tokens = sum(r.get('tokens', 0) for r in results if 'error' not in r)
    file_count = len([r for r in results if 'error' not in r])

    print(f"\n{'='*60}")
    print(f"CONTEXT BUDGET ANALYSIS")
    print(f"{'='*60}")
    print(f"Files analyzed: {file_count}")
    print(f"Total tokens: {format_tokens(total_tokens)}")
    print(f"Budget: {format_tokens(budget)}")

    if total_tokens <= budget:
        remaining = budget - total_tokens
        print(f"Status: ✓ WITHIN BUDGET ({format_tokens(remaining)} remaining)")
    else:
        over = total_tokens - budget
        print(f"Status: ⚠ OVER BUDGET by {format_tokens(over)} tokens")

        # Suggest files to defer
        sorted_files = sorted(
            [r for r in results if 'error' not in r],
            key=lambda x: x['tokens'],
            reverse=True
        )
        print(f"\nLargest files (consider deferring):")
        for f in sorted_files[:5]:
            print(f"  - {f['path']}: {format_tokens(f['tokens'])}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    target = Path(sys.argv[1])
    detailed = '--detailed' in sys.argv
    json_output = '--json' in sys.argv

    if not target.exists():
        print(f"Error: {target} does not exist", file=sys.stderr)
        sys.exit(1)

    if target.is_file():
        result = analyze_file(target)
        if 'error' in result:
            print(f"Error: {result['error']}", file=sys.stderr)
            sys.exit(1)

        if json_output:
            import json
            print(json.dumps(result, indent=2))
        else:
            print(f"{result['path']}: {format_tokens(result['tokens'])} tokens")
            print(f"  Hash: {result['hash']}")
            print(f"  Lines: {result['lines']}")

    elif target.is_dir():
        results = analyze_directory(target)

        if not results:
            print(f"No matching files found in {target}")
            sys.exit(0)

        if json_output:
            import json
            print(json.dumps(results, indent=2))
        elif detailed:
            # Sort by tokens descending
            sorted_results = sorted(
                results,
                key=lambda x: x.get('tokens', 0),
                reverse=True
            )
            for r in sorted_results:
                if 'error' in r:
                    print(f"  [ERROR] {r['path']}: {r['error']}")
                else:
                    print(f"  {r['path']}: {format_tokens(r['tokens'])}")

            print_budget_analysis(results)
        else:
            total = sum(r.get('tokens', 0) for r in results if 'error' not in r)
            file_count = len([r for r in results if 'error' not in r])
            print(f"Total: {format_tokens(total)} tokens ({file_count} files)")

    else:
        print(f"Error: {target} is neither a file nor directory", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
