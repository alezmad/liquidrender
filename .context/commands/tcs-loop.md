# TCS Loop - Full Triangulated Compiler Synthesis

Run the complete TCS loop using Claude CLI (Opus 4.5) - NO API COSTS.

## Arguments
- $ARGUMENTS: Number of iterations (default: 5)

## Instructions

You ARE the pipeline. Generate, validate, fix, and loop - all within this session.

### For each iteration (1 to $ARGUMENTS or 5):

**PHASE 1: Generate Sample**

Pick a random prompt from:
- "Create a KPI card showing revenue with trend indicator"
- "Build a data table with sortable columns"
- "Design a tabbed interface with 3 tabs"
- "Create a modal dialog with a form"
- "Build a selectable list component"

Then generate all three representations yourself:

1. **Generate JSX**: Write clean React JSX with Tailwind for the prompt
2. **Extract Schema**: Convert your JSX to LiquidSchema JSON
3. **Write LiquidCode**: Convert your Schema to LiquidCode v3 DSL

Use the spec at: `.mydocs/autodev/specs/LIQUID-SPEC.md`

**PHASE 2: Cross-Validate**

Compare your three representations:
- Are they semantically equivalent?
- What's missing or inconsistent?
- Rate: consistent (true/false)
- List findings with type (gap/inconsistency/error) and severity

**PHASE 3: Self-Correct**

If inconsistent:
- Identify the root cause
- Fix the representations to be consistent
- OR note spec gaps that need addressing

**PHASE 4: Accumulate**

After each iteration, append to `.mydocs/autodev/output/samples.jsonl`:
```json
{"iteration": N, "prompt": "...", "jsx": "...", "schema": {...}, "liquidcode": "...", "consistent": bool, "findings": [...]}
```

Print summary:
```
[Iter N] ✓ consistent | 0 findings
[Iter N] ✗ inconsistent | 3 findings (1 critical)
```

**PHASE 5: Review Checkpoint**

Every 5 iterations OR when critical findings accumulate:
- Analyze all findings patterns
- Propose spec improvements
- Ask user to approve changes
- Update spec if approved

### After all iterations:

Show final summary:
- Total samples generated
- Consistency rate
- Key spec gaps identified
- Recommended spec changes
