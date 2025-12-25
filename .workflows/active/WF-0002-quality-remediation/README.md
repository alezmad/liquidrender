# WF-0002: Quality Remediation

**Status**: Pending
**Created**: 2025-12-25
**Based on**: WF-0001 Quality Audit findings

## Objective

Address all P0/P1 issues from the component quality audit to achieve shadcn/ui parity.

## Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Avg Score | 28.5/50 | 42/50 |
| P0 Issues | 7 | 0 |
| Untested Components | 7 | 0 |
| Radix-based | 0 | 4 |
| Focus Ring Coverage | ~40% | 100% |

## Waves Overview

| Wave | Name | Tasks | Agents |
|------|------|-------|--------|
| 0 | Bootstrap | Install deps, create stubs | 1 |
| 1 | P0 Critical Tests | Add test files | 7 |
| 2 | Chart Accessibility | Fix a11y for charts | 3 |
| 3 | Radix Migration | Migrate 4 components | 4 |
| 4 | Focus Rings + ARIA | Fix 8 components | 8 |
| 5 | UX Polish | Animations, gestures | 4 |
| 6 | Integration | Final validation | 1 |

## Key Instructions

All agents MUST use shadcn MCP tools:
- `mcp__shadcn-ui__get_component` - Get component source code
- `mcp__shadcn-ui__get_component_demo` - Get usage examples

## Files

- `STATUS.yaml` - Current workflow state
- `AGENT-PROMPTS.md` - Prompt templates for each task
- `logs/` - Agent execution logs (created during run)

## Commands

```bash
# Resume workflow
/workflow:resume WF-0002

# Check status
/workflow:status

# Validate after wave
.context/workflows/scripts/validate-wave.sh @repo/liquid-render
```

## Dependencies to Install

```bash
pnpm add @radix-ui/react-select @radix-ui/react-radio-group @radix-ui/react-popover @radix-ui/react-tooltip --filter @repo/liquid-render
```
