# MCP vs TurboStarter - When to Use What

This guide helps decide between using MCP servers or TurboStarter built-in features.

## Cross-Reference

| Need | TurboStarter (Foundation) | MCP (Extended) |
|------|---------------------------|----------------|
| **UI Components** | `@turbostarter/ui-web` | `shadcn-ui` for generation |
| **Database** | Drizzle ORM | `postgres` for debugging |
| **Billing** | `@turbostarter/billing` | `stripe` for direct API |
| **Charts** | — | `recharts` |
| **AI Agents** | — | `mastra` |
| **E2E Testing** | — | `playwright` |

## Decision Rule

**Use TurboStarter first** for:
- Existing patterns in codebase
- Auth, billing, email, storage
- Standard CRUD via API

**Use MCP when**:
- Need library-specific docs (recharts, dnd-kit)
- Debugging (postgres direct access)
- Capabilities not in framework (mastra AI)
- E2E browser testing (playwright)
