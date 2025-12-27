# TCS Iterate

Run one iteration of the Triangulated Compiler Synthesis pipeline.

## Instructions

1. Run the iteration script:
```bash
cd /Users/agutierrez/Desktop/liquidrender/.mydocs/autodev && ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" npx tsx src/iteration.ts --samples=3
```

2. Parse the JSON output and analyze the results.

3. If `needsReview` is true, explain the review reasons and ask if you should:
   - Diagnose and fix issues
   - Evolve the spec based on findings
   - Continue with more iterations

4. If `needsReview` is false and consistency is good, ask if you should run more iterations.

5. After each iteration, provide a brief summary:
   - Samples: X/Y successful
   - Consistency: X%
   - New findings: N
   - Critical issues: N
