# /workflow - Autonomous Task Executor (Parallel Agents)

> Single prompt → Plan with waves → Parallel agent execution → Done report

---

## TRIGGER

User says anything like:
- "implement the components"
- "build the API endpoints"
- "fix all the failing tests"
- "refactor the auth system"

---

## PHASE 1: AMPLIFY INTENT (30 sec, no tools yet)

Take the user's vague request and expand it:

1. **Scan context**: Read relevant files to understand scope
2. **Identify tasks**: What specific things need to be built?
3. **Group into waves**: Sequential vs parallel execution
4. **Surface assumptions**: What am I assuming they want?

Output format:
```
## I understood: [one sentence]

## Execution Plan (Waves)

| Wave | Type | Tasks | Files |
|------|------|-------|-------|
| 0 | Sequential | Bootstrap types | types.ts |
| 1 | Parallel (3) | Parser, Emitter, Renderer | parser.ts, emitter.ts, renderer.tsx |
| 2 | Sequential | Integration + tests | index.ts, tests/ |

## Task Details

| ID | Name | Wave | Output | Owner |
|----|------|------|--------|-------|
| T1 | Types | 0 | types.ts | main |
| T2 | Parser | 1 | parser.ts | agent-1 |
| T3 | Emitter | 1 | emitter.ts | agent-2 |
| T4 | Renderer | 1 | renderer.tsx | agent-3 |
| T5 | Integration | 2 | index.ts | main |

## File Ownership (No Conflicts!)
Each parallel agent owns exclusive files to prevent merge conflicts.

## Estimated: [X waves, Y parallel agents max, ~Z minutes]

**Proceed?** (yes / no / modify: "...")
```

---

## PHASE 2: CONFIRMATION GATE

Wait for user response:

- **"yes" / "y" / "go" / "approved"** → Proceed to execution
- **"no" / "n" / "stop"** → Abort, ask what they actually want
- **"modify: ..."** → Incorporate feedback, show updated plan, ask again

**NEVER proceed without explicit confirmation.**

---

## PHASE 3: AUTONOMOUS EXECUTION (Using Task Tool)

### CRITICAL: Parallel Agent Execution Pattern

For waves with parallel tasks, you MUST use the Task tool to spawn multiple agents
**in a single message**. This is how parallel execution works:

```typescript
// Wave 1: Parallel execution - Launch ALL agents in ONE message
// You MUST send all Task tool calls together, not sequentially!

// Example: 3 parallel agents for Wave 1
Task({
  description: "T2: Update parser",
  subagent_type: "general-purpose",
  prompt: `You are Agent-1 for WF-XXXX Wave 1.

YOUR EXCLUSIVE FILES (only you can modify):
- src/compiler/parser.ts

YOUR TASK:
Add componentId parsing for Custom blocks...

CONSTRAINTS:
- DO NOT modify any file outside your ownership
- Report completion with summary of changes`
})

Task({
  description: "T3: Update emitter",
  subagent_type: "general-purpose",
  prompt: `You are Agent-2 for WF-XXXX Wave 1.

YOUR EXCLUSIVE FILES:
- src/compiler/emitter.ts

YOUR TASK:
Add componentId emission for Custom blocks...`
})

Task({
  description: "T4: Update renderer",
  subagent_type: "general-purpose",
  prompt: `You are Agent-3 for WF-XXXX Wave 1.

YOUR EXCLUSIVE FILES:
- src/renderer/LiquidUI.tsx

YOUR TASK:
Add customComponents prop handling...`
})
```

### 3.1 Wave Execution Flow

```
Wave 0: Sequential (main thread)
├── Execute T1 directly (no agent spawn)
├── Validate: pnpm test
└── Continue to Wave 1

Wave 1: Parallel (spawn agents)
├── Launch Agent-1, Agent-2, Agent-3 simultaneously
├── Wait for all agents to complete
├── Collect results
├── Validate: pnpm test
└── Continue to Wave 2

Wave 2: Sequential (main thread)
├── Execute T5 directly
├── Final validation: pnpm test && pnpm build
└── Generate done report
```

### 3.2 Agent Prompt Template

Each spawned agent gets a prompt with:

1. **Identity**: "You are Agent-X for WF-YYYY Wave Z"
2. **Exclusive files**: List of files ONLY this agent can modify
3. **Task description**: Detailed instructions
4. **Constraints**: No touching other files
5. **Success criteria**: What "done" looks like

### 3.3 Validation Between Waves

After each wave completes:
```bash
pnpm test   # Must pass before next wave
```

If validation fails:
1. Identify which agent's changes caused failure
2. Resume that agent with error context
3. Retry up to 3 times
4. If still failing, note in report and continue

---

## PHASE 4: DONE REPORT

```
═══════════════════════════════════════════════════════
✅ WORKFLOW COMPLETE: WF-XXXX
═══════════════════════════════════════════════════════

Duration: 12 minutes
Waves: 3 executed (1 sequential, 1 parallel with 3 agents, 1 sequential)
Tasks: 5/5 completed
Tests: 200 passing

📁 FILES CREATED/MODIFIED
────────────────────────
src/types/custom.ts          # Wave 0: Type definitions
src/compiler/parser.ts       # Wave 1, Agent-1: Parser updates
src/compiler/emitter.ts      # Wave 1, Agent-2: Emitter updates
src/renderer/LiquidUI.tsx    # Wave 1, Agent-3: Renderer updates
src/index.ts                 # Wave 2: Exports
tests/custom.test.ts         # Wave 2: Integration tests

═══════════════════════════════════════════════════════
```

---

## RULES

1. **Parallel = Task tool in single message** - All parallel agents spawn together
2. **File ownership is sacred** - No two agents touch same file
3. **Validate between waves** - Tests must pass before continuing
4. **One confirmation, then silent execution** - Don't ask mid-flow
5. **Fail gracefully** - Complete what you can, report what you couldn't

---

## EXAMPLE: WF-0005 CustomBlock (How It Should Execute)

**Wave 0** (Sequential - main thread):
- Add `Custom: 'custom'` to constants.ts
- Create types/custom-component.ts

**Wave 1** (Parallel - spawn 2 agents):
```
Agent-1: Parser updates (ui-parser.ts)
Agent-2: Emitter updates (ui-emitter.ts)
```
Both agents work simultaneously on their exclusive files.

**Wave 2** (Parallel - spawn 2 agents):
```
Agent-3: Renderer updates (LiquidUI.tsx)
Agent-4: Registry updates (component-registry.ts)
```

**Wave 3** (Sequential - main thread):
- Create example sparkline component
- Create integration tests
- Final validation

---

## WHY PARALLEL AGENTS MATTER

- **Speed**: 3 agents working simultaneously = 3x faster
- **Focus**: Each agent has single responsibility
- **No conflicts**: Exclusive file ownership prevents merge issues
- **Isolation**: One agent's failure doesn't block others
