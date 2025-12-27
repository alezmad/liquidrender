#!/usr/bin/env python3
"""
Knowledge Graph Generator
Extracts entities, relationships, and facts from codebase.
Output: knowledge.yaml

Usage: python .claude/knowledge/generate.py
"""

import os
import re
import json
import subprocess
from pathlib import Path
from datetime import datetime
from collections import defaultdict
import yaml


class KnowledgeExtractor:
    """Extract knowledge from TypeScript/React codebase."""

    def __init__(self, root: Path):
        self.root = root
        self.entities = {
            "components": {},
            "modules": {},
            "schemas": {},
            "endpoints": [],
            "types": {},
        }
        self.relationships = []
        self.facts = []

    def run(self) -> dict:
        """Run all extractors and return knowledge graph."""
        self.extract_components()
        self.extract_modules()
        self.extract_schemas()
        self.extract_endpoints()
        self.extract_types()
        self.extract_git_facts()
        self.extract_statistics()

        return {
            "generated": datetime.now().isoformat(),
            "project": self.get_project_name(),
            "entities": self.entities,
            "relationships": self.relationships,
            "facts": self.facts,
        }

    def get_project_name(self) -> str:
        """Get project name from package.json."""
        pkg_path = self.root / "package.json"
        if pkg_path.exists():
            try:
                data = json.loads(pkg_path.read_text())
                return data.get("name", self.root.name)
            except:
                pass
        return self.root.name

    def extract_components(self):
        """Extract React components from .tsx files."""
        patterns = [
            # export function ComponentName
            r"export\s+function\s+(\w+)",
            # export const ComponentName
            r"export\s+const\s+(\w+)",
            # export default function ComponentName
            r"export\s+default\s+function\s+(\w+)",
        ]

        # Find all .tsx files
        for tsx_path in self.root.rglob("*.tsx"):
            # Skip node_modules and common non-source dirs
            if "node_modules" in str(tsx_path):
                continue
            if ".next" in str(tsx_path):
                continue

            try:
                content = tsx_path.read_text(encoding="utf-8")
            except:
                continue

            rel_path = tsx_path.relative_to(self.root)
            exports = []

            for pattern in patterns:
                matches = re.findall(pattern, content)
                exports.extend(matches)

            # Extract props from interface
            props = self.extract_props(content)

            # Extract imports to find dependencies
            imports = self.extract_imports(content)

            # Skip if no exports found
            if not exports:
                continue

            # Use first export as primary component name
            component_name = exports[0]

            # Skip utility exports (lowercase)
            if component_name[0].islower():
                continue

            self.entities["components"][component_name] = {
                "path": str(rel_path),
                "exports": exports,
                "props": props[:10],  # Limit props
                "dependencies": [d for d in imports if d.startswith("@") or "/" not in d][:5],
            }

            # Add relationships
            for dep in imports:
                if dep.startswith("./") or dep.startswith("../"):
                    self.relationships.append({
                        "from": component_name,
                        "relation": "imports",
                        "to": dep,
                    })

    def extract_props(self, content: str) -> list:
        """Extract prop names from interface definitions."""
        props = []
        # Match interface XxxProps { ... }
        interface_match = re.search(r"interface\s+\w*Props\s*\{([^}]+)\}", content, re.DOTALL)
        if interface_match:
            interface_body = interface_match.group(1)
            # Extract property names
            prop_matches = re.findall(r"(\w+)\s*[?]?\s*:", interface_body)
            props.extend(prop_matches)
        return props

    def extract_imports(self, content: str) -> list:
        """Extract import paths from file."""
        imports = []
        # Match import ... from "..."
        import_matches = re.findall(r"import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]", content)
        imports.extend(import_matches)
        return imports

    def extract_modules(self):
        """Extract module structure from packages/ directory."""
        packages_dir = self.root / "packages"
        if not packages_dir.exists():
            return

        for pkg_dir in packages_dir.iterdir():
            if not pkg_dir.is_dir():
                continue

            pkg_json = pkg_dir / "package.json"
            if not pkg_json.exists():
                continue

            try:
                data = json.loads(pkg_json.read_text())
            except:
                continue

            module_name = data.get("name", pkg_dir.name)

            # Find exports from index.ts or main entry
            exports = []
            main = data.get("main", "src/index.ts")
            index_path = pkg_dir / "src" / "index.ts"
            if index_path.exists():
                try:
                    content = index_path.read_text()
                    # Find re-exports
                    export_matches = re.findall(r"export\s+\{([^}]+)\}", content)
                    for match in export_matches:
                        exports.extend([e.strip().split(" as ")[0] for e in match.split(",")])
                    # Find export * from
                    star_exports = re.findall(r"export\s+\*\s+from\s+['\"]([^'\"]+)['\"]", content)
                    exports.extend([f"*:{s}" for s in star_exports])
                except:
                    pass

            self.entities["modules"][module_name] = {
                "path": str(pkg_dir.relative_to(self.root)),
                "version": data.get("version", "0.0.0"),
                "exports": exports[:20],  # Limit
                "dependencies": list(data.get("dependencies", {}).keys())[:10],
            }

    def extract_schemas(self):
        """Extract database schemas (Drizzle/Prisma)."""
        schema_patterns = [
            "**/schema/*.ts",
            "**/schema.ts",
            "**/schema.prisma",
        ]

        for pattern in schema_patterns:
            for schema_path in self.root.glob(pattern):
                if "node_modules" in str(schema_path):
                    continue

                try:
                    content = schema_path.read_text()
                except:
                    continue

                rel_path = schema_path.relative_to(self.root)

                # Drizzle table definitions
                drizzle_tables = re.findall(
                    r"export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*['\"](\w+)['\"]",
                    content
                )

                for var_name, table_name in drizzle_tables:
                    # Extract columns
                    columns = re.findall(r"(\w+):\s*(?:varchar|text|integer|boolean|timestamp|uuid)", content)

                    self.entities["schemas"][table_name] = {
                        "path": str(rel_path),
                        "variable": var_name,
                        "columns": columns[:15],
                        "type": "drizzle",
                    }

                # Prisma models
                prisma_models = re.findall(r"model\s+(\w+)\s*\{", content)
                for model in prisma_models:
                    self.entities["schemas"][model] = {
                        "path": str(rel_path),
                        "type": "prisma",
                    }

    def extract_endpoints(self):
        """Extract API endpoints (Hono, Next.js API routes)."""
        # Hono routes
        for ts_path in self.root.rglob("*.ts"):
            if "node_modules" in str(ts_path):
                continue

            try:
                content = ts_path.read_text()
            except:
                continue

            # Skip if not a route file
            if "app.get" not in content and "app.post" not in content:
                if "GET" not in content and "POST" not in content:
                    continue

            rel_path = ts_path.relative_to(self.root)

            # Hono style: app.get("/path", ...)
            hono_routes = re.findall(r"app\.(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]", content)
            for method, path in hono_routes:
                self.entities["endpoints"].append({
                    "path": path,
                    "method": method.upper(),
                    "file": str(rel_path),
                    "type": "hono",
                })

            # Next.js style: export async function GET/POST
            nextjs_routes = re.findall(r"export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)", content)
            if nextjs_routes:
                # Derive path from file path
                api_path = "/" + str(rel_path).replace("app/", "").replace("/route.ts", "").replace("/route.tsx", "")
                for method in nextjs_routes:
                    self.entities["endpoints"].append({
                        "path": api_path,
                        "method": method,
                        "file": str(rel_path),
                        "type": "nextjs",
                    })

    def extract_types(self):
        """Extract key TypeScript types/interfaces."""
        for ts_path in self.root.rglob("*.ts"):
            if "node_modules" in str(ts_path):
                continue
            if ".d.ts" in str(ts_path):
                continue

            try:
                content = ts_path.read_text()
            except:
                continue

            rel_path = ts_path.relative_to(self.root)

            # Find exported types
            type_exports = re.findall(r"export\s+(?:type|interface)\s+(\w+)", content)
            for type_name in type_exports:
                # Skip Props interfaces (captured with components)
                if type_name.endswith("Props"):
                    continue
                self.entities["types"][type_name] = {
                    "path": str(rel_path),
                }

        # Limit to most important types
        if len(self.entities["types"]) > 50:
            self.entities["types"] = dict(list(self.entities["types"].items())[:50])

    def extract_git_facts(self):
        """Extract recent significant commits from git history."""
        try:
            result = subprocess.run(
                ["git", "log", "--oneline", "-20", "--format=%h|%s|%as"],
                cwd=self.root,
                capture_output=True,
                text=True,
            )
            if result.returncode == 0:
                for line in result.stdout.strip().split("\n"):
                    if not line:
                        continue
                    parts = line.split("|")
                    if len(parts) >= 3:
                        commit_hash, message, date = parts[0], parts[1], parts[2]
                        # Filter for significant commits (feat, fix, chore with substance)
                        if message.startswith(("feat", "fix", "refactor")):
                            self.facts.append(f"{date}: {message[:60]}")

                # Limit to 10 most recent significant commits
                self.facts = self.facts[:10]
        except:
            pass

    def extract_statistics(self):
        """Extract codebase statistics."""
        stats = defaultdict(int)

        for ext in ["ts", "tsx", "js", "jsx"]:
            for path in self.root.rglob(f"*.{ext}"):
                if "node_modules" in str(path):
                    continue
                stats[f"{ext}_files"] += 1

        self.facts.extend([
            f"{len(self.entities['components'])} React components",
            f"{len(self.entities['modules'])} modules/packages",
            f"{len(self.entities['schemas'])} database tables",
            f"{len(self.entities['endpoints'])} API endpoints",
            f"{stats['ts_files'] + stats['tsx_files']} TypeScript files",
        ])


def main():
    """Generate knowledge.yaml for the current project."""
    root = Path.cwd()

    # Create extractor and run
    extractor = KnowledgeExtractor(root)
    knowledge = extractor.run()

    # Output path
    output_dir = root / ".claude" / "knowledge"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "knowledge.yaml"

    # Write YAML
    header = """# knowledge.yaml - AUTO-GENERATED
# DO NOT EDIT - Regenerate with: python .claude/knowledge/generate.py
# This file is derived from source code analysis.

"""

    with open(output_path, "w") as f:
        f.write(header)
        yaml.dump(knowledge, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print(f"Generated: {output_path}")
    print(f"  Components: {len(knowledge['entities']['components'])}")
    print(f"  Modules: {len(knowledge['entities']['modules'])}")
    print(f"  Schemas: {len(knowledge['entities']['schemas'])}")
    print(f"  Endpoints: {len(knowledge['entities']['endpoints'])}")
    print(f"  Types: {len(knowledge['entities']['types'])}")
    print(f"  Facts: {len(knowledge['facts'])}")


if __name__ == "__main__":
    main()
