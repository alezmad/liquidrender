# Survey Triangulation (Claude CLI)

Run triangulation between GraphSurvey schema and LiquidSurvey DSL using Claude CLI.

## Instructions

You ARE the triangulation engine. For each sample:

### Step 1: Read the spec and a sample
```
Read: .mydocs/survey-engine/compiler/LIQUIDSURVEY-SPEC.md
Read: .mydocs/survey-engine/samples/01-simple-feedback.ts (or another sample)
```

### Step 2: Generate LiquidSurvey DSL
Convert the GraphSurvey to LiquidSurvey DSL following the spec exactly.
Write the result to: `.mydocs/survey-engine/compiler/output/[sample-name].liquid`

### Step 3: Validate Semantic Equivalence
Compare the original schema and generated DSL:
- Count nodes in each
- Verify all questions are preserved
- Verify all conditions/branching is preserved
- Calculate compression ratio (schema chars / DSL chars)

### Step 4: Record Findings
Write findings to: `.mydocs/survey-engine/compiler/output/[sample-name].findings.json`
```json
{
  "sample": "sample-name",
  "schemaChars": number,
  "dslChars": number,
  "compressionRatio": number,
  "nodesPreserved": boolean,
  "conditionsPreserved": boolean,
  "findings": [
    {
      "type": "loss|mismatch|spec_gap|improvement",
      "severity": "critical|major|minor",
      "description": "...",
      "suggestedFix": "..."
    }
  ]
}
```

### Step 5: Report Results
Summarize:
- Compression achieved
- Semantic equivalence status
- Any spec gaps or issues found

## Sample Order (by complexity)
1. 01-simple-feedback (simple, no branching)
2. 02-nps-survey (simple, with branching)
3. 03-product-satisfaction (medium, no branching)
4. 04-employee-engagement (medium, no branching)
5. 05-event-registration (medium, with branching)
6. 06-medical-intake (medium, with branching)
7. 07-market-research (complex, with branching)
8. 08-job-application (complex, with branching)
9. 09-real-estate-inquiry (complex, with branching)
10. 10-customer-journey (complex, with branching)

Run samples in order, 1-3 per session.
