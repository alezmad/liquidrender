# TCS Diagnose Failures

Diagnose and fix pipeline failures.

## Instructions

1. Read the most recent iteration result:
```bash
ls /Users/agutierrez/Desktop/liquidrender/.mydocs/autodev/output/iteration-*.json | tail -1 | xargs cat
```

2. For each failed sample, analyze:
   - What step failed (JSX generation, schema extraction, LiquidCode writing, validation)?
   - What was the error message?
   - What was the input that caused the failure?

3. Identify the root cause:
   - Prompt issues (unclear, too complex, missing context)
   - JSON parsing issues (malformed output from LLM)
   - Schema issues (spec doesn't cover this case)
   - Model capability issues (task too complex for Haiku)

4. Propose fixes:
   - Prompt improvements
   - Better JSON extraction logic
   - Spec clarifications
   - Model upgrades for specific tasks

5. If fixes require code changes, show the exact edits needed.

6. Ask for approval before making changes.
