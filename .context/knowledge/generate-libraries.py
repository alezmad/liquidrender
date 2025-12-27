#!/usr/bin/env python3
"""
Generate libraries.json from package.json dependencies.
Provides summaries and fetch URLs for external libraries.

Usage: python .claude/knowledge/generate-libraries.py
"""

import json
from pathlib import Path

# Known library summaries (curated for common dependencies)
KNOWN_LIBRARIES = {
    # React ecosystem
    "react": {
        "summary": "React 19. Hooks: useState, useEffect, useMemo, useCallback. Server Components with 'use client' directive.",
        "importance": "critical",
        "fetch": "https://react.dev/reference"
    },
    "react-dom": {
        "summary": "React DOM renderer. createRoot for client, renderToString for SSR.",
        "importance": "critical",
        "fetch": None
    },
    "next": {
        "summary": "Next.js App Router. Server Components default. Route handlers in app/api/. Metadata API for SEO.",
        "importance": "critical",
        "fetch": "https://nextjs.org/docs"
    },

    # State & Data
    "@tanstack/react-query": {
        "summary": "Server state management. useQuery for fetching, useMutation for updates. Automatic caching.",
        "importance": "high",
        "fetch": "https://tanstack.com/query/latest"
    },

    # Database
    "drizzle-orm": {
        "summary": "TypeScript ORM. Schema in schema.ts. select(), insert(), update(), delete(). Migrations via drizzle-kit.",
        "importance": "high",
        "fetch": "https://orm.drizzle.team/docs"
    },

    # API
    "hono": {
        "summary": "Fast web framework. app.get/post/put/delete. Middleware for auth, validation. Zod integration.",
        "importance": "high",
        "fetch": "https://hono.dev/docs"
    },
    "zod": {
        "summary": "Schema validation. z.object(), z.string(), z.number(). Use .parse() or .safeParse().",
        "importance": "high",
        "fetch": None  # Well-known, training data sufficient
    },

    # UI Components
    "recharts": {
        "summary": "React charts. LineChart, BarChart, PieChart, AreaChart. Wrap in ResponsiveContainer.",
        "importance": "moderate",
        "fetch": "mcp__recharts_Docs"
    },
    "@radix-ui/react-popover": {
        "summary": "Headless popover. Root, Trigger, Content components. Accessible by default.",
        "importance": "moderate",
        "fetch": "https://www.radix-ui.com/primitives/docs/components/popover"
    },
    "@radix-ui/react-select": {
        "summary": "Headless select. Root, Trigger, Content, Item. Keyboard navigation built-in.",
        "importance": "moderate",
        "fetch": "https://www.radix-ui.com/primitives/docs/components/select"
    },
    "@radix-ui/react-tooltip": {
        "summary": "Headless tooltip. Provider, Root, Trigger, Content. Delay props available.",
        "importance": "low",
        "fetch": None
    },
    "@radix-ui/react-radio-group": {
        "summary": "Headless radio group. Root, Item, Indicator. Accessible.",
        "importance": "low",
        "fetch": None
    },

    # Auth
    "better-auth": {
        "summary": "Auth library. Session-based. Supports OAuth, magic link, credentials.",
        "importance": "high",
        "fetch": "https://www.better-auth.com/docs"
    },

    # Forms
    "react-hook-form": {
        "summary": "Form state. useForm(), register, handleSubmit. Integrates with Zod via resolver.",
        "importance": "moderate",
        "fetch": "https://react-hook-form.com/docs"
    },

    # Mobile
    "expo": {
        "summary": "React Native framework. expo-router for navigation. EAS for builds.",
        "importance": "high",
        "fetch": "https://docs.expo.dev"
    },
    "expo-router": {
        "summary": "File-based routing for Expo. app/ directory. Stack, Tabs, Drawer navigators.",
        "importance": "high",
        "fetch": "https://docs.expo.dev/router/introduction"
    },

    # Utilities (skip - well known)
    "lodash": {"importance": "skip", "summary": "Utility library. Well-known."},
    "date-fns": {"importance": "skip", "summary": "Date utilities. Well-known."},
    "clsx": {"importance": "skip", "summary": "Class name utility. clsx('a', condition && 'b')."},
    "tailwind-merge": {"importance": "skip", "summary": "Merge Tailwind classes. twMerge()."},
}


def collect_dependencies(root: Path) -> dict:
    """Collect all dependencies from package.json files."""
    all_deps = {}

    # Root package.json
    root_pkg = root / "package.json"
    if root_pkg.exists():
        data = json.loads(root_pkg.read_text())
        all_deps.update(data.get("dependencies", {}))
        all_deps.update(data.get("devDependencies", {}))

    # Package.json files in packages/
    packages_dir = root / "packages"
    if packages_dir.exists():
        for pkg_json in packages_dir.rglob("package.json"):
            if "node_modules" in str(pkg_json):
                continue
            try:
                data = json.loads(pkg_json.read_text())
                all_deps.update(data.get("dependencies", {}))
            except:
                pass

    # Package.json files in apps/
    apps_dir = root / "apps"
    if apps_dir.exists():
        for pkg_json in apps_dir.rglob("package.json"):
            if "node_modules" in str(pkg_json):
                continue
            try:
                data = json.loads(pkg_json.read_text())
                all_deps.update(data.get("dependencies", {}))
            except:
                pass

    return all_deps


def generate_libraries(root: Path) -> dict:
    """Generate libraries.json structure."""
    deps = collect_dependencies(root)

    libraries = {
        "generated": True,
        "dependencies": {}
    }

    for name, version in sorted(deps.items()):
        # Skip workspace references
        if version.startswith("workspace:"):
            continue

        # Skip internal packages
        if name.startswith("@repo/") or name.startswith("@turbostarter/"):
            continue

        # Skip type packages
        if name.startswith("@types/"):
            continue

        # Look up known info or create basic entry
        if name in KNOWN_LIBRARIES:
            info = KNOWN_LIBRARIES[name]
            libraries["dependencies"][name] = {
                "version": version.replace("^", "").replace("~", ""),
                "importance": info.get("importance", "moderate"),
                "summary": info.get("summary", ""),
                "fetch": info.get("fetch"),
            }
        else:
            # Unknown library - basic entry
            libraries["dependencies"][name] = {
                "version": version.replace("^", "").replace("~", ""),
                "importance": "unknown",
                "summary": None,
                "fetch": None,
            }

    return libraries


def main():
    root = Path.cwd()
    libraries = generate_libraries(root)

    output_path = root / ".claude" / "knowledge" / "libraries.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(libraries, f, indent=2)

    # Stats
    deps = libraries["dependencies"]
    critical = len([d for d in deps.values() if d["importance"] == "critical"])
    high = len([d for d in deps.values() if d["importance"] == "high"])
    moderate = len([d for d in deps.values() if d["importance"] == "moderate"])
    skip = len([d for d in deps.values() if d["importance"] == "skip"])
    unknown = len([d for d in deps.values() if d["importance"] == "unknown"])

    print(f"Generated: {output_path}")
    print(f"  Total: {len(deps)}")
    print(f"  Critical: {critical}, High: {high}, Moderate: {moderate}")
    print(f"  Skip: {skip}, Unknown: {unknown}")


if __name__ == "__main__":
    main()
