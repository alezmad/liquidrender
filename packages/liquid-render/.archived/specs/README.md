# Liquid Render Specifications

This package contains two related DSL specifications:

## LIQUIDSURVEY-SPEC.md (Active)

The survey-specific DSL used by the compiler in this package.

- Node types: `>` start, `?` question, `!` message, `<` end
- 41 question type codes (Tx, Ch, Rt, Np, etc.)
- Condition operators for branching logic
- Used by: `compile()`, `parse()` functions

## LIQUID-SPEC.md (Reference)

The general Liquid UI DSL specification (v4.0).

- Broader scope: any UI component
- More complex grammar
- Reference for future renderer development

## Usage

```typescript
import { compile, parse } from '@repo/liquid-render';

// Parse LiquidSurvey DSL to GraphSurvey JSON
const survey = parse(`
  survey "feedback"
  > start -> q1
  ? q1 "How was your experience?" Rt[1-5] -> end
  < end "Thank you!"
`);

// Compile GraphSurvey JSON to LiquidSurvey DSL
const dsl = compile(survey);
```
