# /workflow:create - Generate Parallel Workflow Proposal

Generate a workflow proposal with wave-based execution for parallel multi-agent work.

## Arguments
- $ARGUMENTS: Task description (e.g., "implement custom component system")

## Instructions

### 1. Analyze Task

Break down "$ARGUMENTS" into:
- Individual tasks (what needs to be built)
- Dependencies between tasks (what blocks what)
- File ownership (no two parallel tasks touch same file)
- Shared resources (types, utilities that must be created first)

### 2. Generate Proposal

Present this structure for approval:

```markdown
## Workflow Proposal: WF-[ID] - [NAME]

### Overview
- **Tasks**: [N] components to implement
- **Waves**: [M] parallel execution groups
- **Max parallel agents**: [X] simultaneous
- **Files to create/modify**: [list]

### Execution Plan

| Wave | Type | Tasks | Agents | Files |
|------|------|-------|--------|-------|
| 0 | Sequential | Bootstrap types | 0 (main) | types.ts |
| 1 | Parallel | T2, T3 | 2 | parser.ts, emitter.ts |
| 2 | Parallel | T4, T5 | 2 | renderer.tsx, registry.ts |
| 3 | Sequential | Integration | 0 (main) | tests/, index.ts |

### Task Details

| ID | Name | Wave | Output | Agent | Dependencies |
|----|------|------|--------|-------|--------------|
| T1 | Types | 0 | types.ts | main | none |
| T2 | Parser | 1 | parser.ts | agent-1 | T1 |
| T3 | Emitter | 1 | emitter.ts | agent-2 | T1 |
| T4 | Renderer | 2 | renderer.tsx | agent-3 | T2, T3 |
| T5 | Registry | 2 | registry.ts | agent-4 | T2, T3 |
| T6 | Tests | 3 | tests/*.ts | main | T4, T5 |

### File Ownership Matrix

| File | Wave 0 | Wave 1 | Wave 2 | Wave 3 |
|------|--------|--------|--------|--------|
| types.ts | OWNER | read | read | read |
| parser.ts | - | OWNER(A1) | read | read |
| emitter.ts | - | OWNER(A2) | read | read |
| renderer.tsx | - | - | OWNER(A3) | read |
| registry.ts | - | - | OWNER(A4) | read |

### Dependency Graph

```
T1 (types) ─┬─► T2 (parser)  ─┬─► T4 (renderer) ─┐
            │                 │                   │
            └─► T3 (emitter) ─┴─► T5 (registry) ──┴─► T6 (tests)
```

---
**Approve?** Reply:
- "approved" to start execution
- Describe changes to modify
- "cancel" to abort
```

### 3. Wave Rules

- **Wave 0**: Bootstrap (types, interfaces, directory structure)
  - Always sequential (main thread)
  - Creates shared dependencies for parallel waves

- **Wave 1-N**: Parallel tasks
  - Each task gets dedicated agent via Task tool
  - Exclusive file ownership (no conflicts)
  - All agents in wave launch in SINGLE message

- **Final Wave**: Integration
  - Sequential (main thread)
  - Wire exports, run tests, final validation

### 4. Parallel Execution Requirements

For each parallel wave, you MUST:

1. Identify tasks that can run simultaneously
2. Ensure NO file conflicts (each agent owns exclusive files)
3. Write detailed prompts for each agent including:
   - Agent identity
   - Exclusive file list
   - Full task description
   - Constraints (don't touch other files)
4. Launch ALL agents in that wave in a SINGLE message

### 5. Validation Scripts

After each wave, run:
```bash
pnpm test   # All tests must pass
```

After final wave:
```bash
pnpm test && pnpm build   # Full validation
```

### 6. On Approval

1. Create `.workflows/active/WF-[ID]-[name]/STATUS.yaml`
2. Begin Wave 0 bootstrap (main thread)
3. Launch parallel agents for Wave 1 (all in single message)
4. Wait for completion, validate, continue to next wave
5. Generate done report

## Example

User: "/workflow:create implement custom component LLM integration"

Response:
```
## Workflow Proposal: WF-0005 - CustomBlock LLM Integration

### Overview
- **Tasks**: 6 implementation tasks
- **Waves**: 4 (2 parallel waves)
- **Max parallel agents**: 2 simultaneous
- **Files**: 6 to create/modify

### Execution Plan

| Wave | Type | Tasks | Agents | Files |
|------|------|-------|--------|-------|
| 0 | Sequential | T1: Types | 0 | types/, constants.ts |
| 1 | Parallel | T2: Parser, T3: Emitter | 2 | ui-parser.ts, ui-emitter.ts |
| 2 | Parallel | T4: Renderer, T5: Registry | 2 | LiquidUI.tsx, registry.ts |
| 3 | Sequential | T6: Example + Tests | 0 | custom/, tests/ |

...
```
