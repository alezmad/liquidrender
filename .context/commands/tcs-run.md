# TCS Run Loop

Run multiple iterations of the TCS pipeline with automatic review checkpoints.

## Arguments
- $ARGUMENTS: Number of iterations to run (default: 10)

## Instructions

Run iterations in a loop until checkpoint is reached:

1. For each iteration (up to $ARGUMENTS or 10):

   a. Run the iteration:
   ```bash
   cd /Users/agutierrez/Desktop/liquidrender/.mydocs/autodev && ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" npx tsx src/iteration.ts --samples=3
   ```

   b. Parse the JSON result

   c. Print a one-line summary:
      `[Iter N] ✓ X/3 samples | Y% consistent | Z findings`

   d. If `needsReview` is true, STOP and:
      - Explain the review reasons
      - Analyze the accumulated findings
      - Propose fixes or spec changes
      - Ask for approval to continue

2. After all iterations complete, show final summary:
   - Total samples processed
   - Overall success rate
   - Overall consistency rate
   - Key patterns in findings
   - Recommendations

3. Ask if you should:
   - Run more iterations
   - Review and evolve the spec
   - Diagnose specific failures
