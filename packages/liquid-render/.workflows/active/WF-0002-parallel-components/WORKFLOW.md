# WF-0002: Parallel Component Development

Automated workflow for developing LiquidCode components in parallel with zero/low human intervention.

## Overview

- **Objective**: Implement remaining 40+ components using parallel Task agents
- **Testing**: Playwright visual + functional tests per component
- **Automation**: Each component follows a strict template; tests auto-validate

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR                                  │
│   Reads batch → Spawns 8 parallel agents → Collects results         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
   ┌───────┬───────┬───────┼───────┬───────┬───────┬───────┐
   ▼       ▼       ▼       ▼       ▼       ▼       ▼       ▼
 ┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐
 │ 1 │   │ 2 │   │ 3 │   │ 4 │   │ 5 │   │ 6 │   │ 7 │   │ 8 │
 └─┬─┘   └─┬─┘   └─┬─┘   └─┬─┘   └─┬─┘   └─┬─┘   └─┬─┘   └─┬─┘
   │       │       │       │       │       │       │       │
   ▼       ▼       ▼       ▼       ▼       ▼       ▼       ▼
 [Implement + Unit Test]  ────────────────────────────────────
   │       │       │       │       │       │       │       │
   └───────┴───────┴───────┼───────┴───────┴───────┴───────┘
                           ▼
                  ┌────────────────┐
                  │ Playwright Run │
                  │ (all at once)  │
                  └────────────────┘
```

---

## Batches

### Wave 1: 8 components (P0 + P1 start)
All P0 critical + first 2 P1 display components

| Agent | Code | Component | Complexity |
|-------|------|-----------|------------|
| 1     | Sw   | switch    | Low        |
| 2     | Ck   | checkbox  | Low        |
| 3     | Tg   | tag       | Low        |
| 4     | Pg   | progress  | Low        |
| 5     | Se   | select    | Medium     |
| 6     | Lt   | list      | Medium     |
| 7     | Hd   | heading   | Low        |
| 8     | Ic   | icon      | Low        |

### Wave 2: 8 components (P1 continued)

| Agent | Code | Component | Complexity |
|-------|------|-----------|------------|
| 1     | Av   | avatar    | Low        |
| 2     | Rd   | radio     | Low        |
| 3     | Rg   | range     | Medium     |
| 4     | Ac   | accordion | Medium     |
| 5     | Pp   | popover   | Medium     |
| 6     | Tl   | tooltip   | Low        |
| 7     | Dw   | drawer    | Medium     |
| 8     | St   | stepper   | Medium     |

---

## Agent Prompt Template

Each agent receives this prompt:

```
You are implementing the {COMPONENT_NAME} component for LiquidCode.

## Files to Create/Modify
1. `src/renderer/components/{component-name}.tsx` - Component implementation
2. `tests/{component-name}.test.ts` - Unit tests (Vitest)
3. `e2e/components.spec.ts` - Add component to test list (if not present)

## Requirements
READ FIRST: `docs/COMPONENT-GUIDE.md`

### DSL Syntax
Code: {CODE}
Pattern: {DSL_PATTERN}
Example: {DSL_EXAMPLE}

### Component Behavior
{BEHAVIOR_SPEC}

### Checklist
- [ ] File follows standard structure (Types → Styles → Helpers → Main → Static)
- [ ] Uses tokens from utils.ts (no hardcoded values)
- [ ] Has data-liquid-type="{type}" attribute
- [ ] Handles empty/null states
- [ ] Both dynamic + static variants exported
- [ ] Registered in liquidComponents map in index.ts
- [ ] Unit tests pass: pnpm test {component-name}

When done, output:
COMPONENT_COMPLETE: {component-name}
FILES_MODIFIED: [list of files]
TESTS_ADDED: [count]
```

---

## Execution Commands

### Start Batch (run from liquid-render package)
```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install chromium

# Run all e2e tests
pnpm exec playwright test

# Run specific component test
pnpm exec playwright test -g "switch"

# Run with UI
pnpm exec playwright test --ui
```

### Parallel Agent Invocation
```
# From Claude Code, spawn 8 agents in parallel (single message with 8 Task calls):
Task(subagent_type=general-purpose, prompt="Implement Switch...", run_in_background=true)
Task(subagent_type=general-purpose, prompt="Implement Checkbox...", run_in_background=true)
Task(subagent_type=general-purpose, prompt="Implement Tag...", run_in_background=true)
Task(subagent_type=general-purpose, prompt="Implement Progress...", run_in_background=true)
Task(subagent_type=general-purpose, prompt="Implement Select...", run_in_background=true)
Task(subagent_type=general-purpose, prompt="Implement List...", run_in_background=true)
Task(subagent_type=general-purpose, prompt="Implement Heading...", run_in_background=true)
Task(subagent_type=general-purpose, prompt="Implement Icon...", run_in_background=true)
```

---

## Status Tracking

See `STATUS.yaml` for current progress.

### Component States
- `pending` - Not started
- `in_progress` - Agent working
- `testing` - Implementation done, tests running
- `completed` - All tests pass
- `blocked` - Needs human intervention

---

## Human Intervention Points

Only needed when:
1. **Design decision required** - Multiple valid approaches
2. **Test failure** - After 2 retry attempts
3. **Dependency conflict** - Package issues
4. **Spec unclear** - DSL syntax ambiguous

All other cases should auto-resolve or skip to next component.
