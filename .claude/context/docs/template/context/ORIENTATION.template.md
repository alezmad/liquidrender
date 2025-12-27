# ORIENTATION

## Identity

{{PROJECT_DESCRIPTION}}

<!--
  INSTRUCTIONS:
  Replace {{PROJECT_DESCRIPTION}} with a single paragraph (2-4 sentences) that answers:
  - What is this project?
  - What problem does it solve?
  - Who is it for?

  Example:
  "LiquidRender is a DSL-to-React rendering engine that compiles JSON specifications
  into interactive UI components. It enables declarative dashboard creation without
  writing React code directly."

  BUDGET: ~50 tokens
-->

## Cognitive Stance

{{COGNITIVE_STANCE}}

<!--
  INSTRUCTIONS:
  Replace {{COGNITIVE_STANCE}} with the mental model for approaching this codebase.
  This should tell an AI agent HOW to think about the project.

  Example:
  "Think of this as a compiler pipeline: DSL -> AST -> React. Every component is a
  render target, every style decision flows from design tokens. When in doubt,
  trace data flow from spec to screen."

  Other examples:
  - "This is a layered architecture. Data flows up, commands flow down."
  - "Everything is a plugin. Core is minimal, extensions provide features."
  - "Event-sourced system. State is derived from the event log."

  BUDGET: ~40 tokens
-->

## Structure

```
{{STRUCTURE}}
```

<!--
  INSTRUCTIONS:
  Replace {{STRUCTURE}} with an ASCII tree of key directories.
  Only include directories an AI agent needs to know about.
  Add brief annotations for important files/dirs.

  Example:
  src/
  ├── compiler/          → DSL parsing & AST generation
  ├── renderer/          → React component output
  │   └── components/    → Individual render targets
  ├── core/
  │   └── tokens.ts      → Design tokens (THE source of truth)
  └── types/             → TypeScript definitions

  BUDGET: ~100 tokens
-->

## Constraints

- **NEVER** {{CONSTRAINT_1}}
- **NEVER** {{CONSTRAINT_2}}
- **NEVER** {{CONSTRAINT_3}}
- **NEVER** read `.archived/` without explicit permission

<!--
  INSTRUCTIONS:
  Replace {{CONSTRAINT_N}} with things that must NEVER happen.
  These are the project's hard rules that should never be violated.

  Examples:
  - "NEVER hardcode colors, spacing, or typography—use design tokens"
  - "NEVER commit API keys or secrets to the repository"
  - "NEVER modify database schema without migration"
  - "NEVER bypass the validation layer"
  - "NEVER use any state outside React hooks"

  Keep to 3-5 critical constraints.

  BUDGET: ~60 tokens
-->

## Pointers

- **{{TASK_TYPE_1}}?** → {{LOCATION_1}}
- **{{TASK_TYPE_2}}?** → {{LOCATION_2}}
- **{{TASK_TYPE_3}}?** → {{LOCATION_3}}

<!--
  INSTRUCTIONS:
  Replace {{TASK_TYPE_N}} with common task categories and {{LOCATION_N}} with where to look.
  These help the AI agent navigate to the right place quickly.

  Examples:
  - "Building a component?" → Read `docs/COMPONENT-GUIDE.md` first
  - "Changing API endpoints?" → Check `src/api/` and update OpenAPI spec
  - "Database changes?" → See `db/migrations/` for migration patterns
  - "Authentication issues?" → Start with `src/auth/README.md`
  - "Project decisions?" → `_bmad-output/` holds PRD, architecture, epics

  Keep to 3-5 common scenarios.

  BUDGET: ~50 tokens
-->

<!--
  TOTAL BUDGET: ~300 tokens

  After filling in all placeholders:
  1. Delete all HTML comments
  2. Verify total is under 300 tokens
  3. Rename file from ORIENTATION.template.md to ORIENTATION.md
-->
