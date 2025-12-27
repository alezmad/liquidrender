# Survey Compilation Iteration

Run one iteration of the survey triangulation pipeline.

## Instructions

1. Run the iteration script:
```bash
cd /Users/agutierrez/Desktop/liquidrender/.mydocs/survey-engine && ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" npx tsx compiler/iteration.ts --samples=3
```

2. Parse the JSON output and analyze the results.

3. If `needsReview` is true, explain the review reasons and ask if you should:
   - Diagnose and fix DSL generation issues
   - Evolve the LiquidSurvey spec based on findings
   - Continue with more iterations

4. If `needsReview` is false and equivalence is high, ask if you should run more iterations.

## Key Metrics to Watch

- **equivalenceRate**: Target > 80% - DSL preserves all semantic info
- **avgCompressionRatio**: Target 3-5x - DSL is significantly more compact
- **findings with type "spec_gap"**: Issues requiring spec evolution
- **findings with type "loss"**: Semantic information lost in DSL
