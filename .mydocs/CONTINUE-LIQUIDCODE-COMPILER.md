# Continue: Build LiquidCode UI Compiler

## Context

The `liquid-render` package is meant to be the **unified compiler** for both:
- **LiquidCode** (UI components) - Part I of spec
- **LiquidSurvey** (survey flows) - Part II of spec
- **Hybrid** (embedded surveys) - Part III of spec

**Current state:**
- LiquidSurvey compiler: DONE (20/20 TCS samples pass, 112 unit tests)
- LiquidCode compiler: NOT IMPLEMENTED
- Hybrid parser: NOT IMPLEMENTED

## Task: Build LiquidCode Compiler

Implement Part I of the spec (`packages/liquid-render/specs/LIQUID-RENDER-SPEC.md` §1-§6).

### Key Files to Read First

1. **Spec**: `packages/liquid-render/specs/LIQUID-RENDER-SPEC.md` - Read Part I (§1-§6)
2. **Existing Survey Compiler** (use as pattern):
   - `packages/liquid-render/src/compiler/scanner.ts`
   - `packages/liquid-render/src/compiler/parser.ts`
   - `packages/liquid-render/src/compiler/emitter.ts`
   - `packages/liquid-render/src/compiler/constants.ts`
   - `packages/liquid-render/src/compiler/compiler.ts`

### LiquidCode Grammar (from spec §1)

```
Program     := Signal* Statement+
Statement   := Block | Layer | Survey

Block       := Type Binding* Modifier* Children?
Type        := Index | Code
Binding     := Index | Field | Expr | Literal
Modifier    := Layout | Signal | Style | State | Action
Children    := '[' (Block ',')* Block? ']'

Index       := [0-9]+
Code        := [A-Z][a-z]?[a-z]?
Field       := ':' Name | ':.' Name?
Expr        := '=' Expression
Literal     := '"' [^"]* '"'
Name        := [a-z_][a-zA-Z0-9_]*

Layout      := '!' Priority | '^' Flex | '*' Span
Signal      := '@' Declare | '>' Emit | '<' Recv | '<>' Both
Style       := '#' Color | '%' Size
State       := ':' StateName '?' Condition
Action      := '!' ActionName

Layer       := '/' Index Block
Survey      := 'Survey' '{' SurveyBody '}'
```

### Core Types to Implement (§2.1)

| Index | Code | Type |
|-------|------|------|
| `0` | `Cn` | container |
| `1` | `Kp` | kpi |
| `2` | `Br` | bar |
| `3` | `Ln` | line |
| `4` | `Pi` | pie |
| `5` | `Tb` | table |
| `6` | `Fm` | form |
| `7` | `Ls` | list |
| `8` | `Cd` | card |
| `9` | `Md` | modal |

Plus extended types: `Gd`, `Sk`, `Sp`, `Dw`, `Sh`, `Pp`, `Tl`, `Ac`, `Tx`, `Hd`, `Ic`, `Im`, `Av`, `Tg`, `Pg`, `Gn`, `Rt`, `Sl`, `Bt`, `In`, `Se`, `Sw`, `Ck`, `Rd`, `Rg`, `Cl`, `Dt`, `Tm`, `Up`, `Ot`, `Hm`, `Sn`, `Tr`, `Or`, `Mp`, `Fl`, `Vd`, `Au`, `Cr`, `Lb`, `St`, `Kb`, `Ca`, `Ti`

### Implementation Steps

1. **Add UI type constants** to `compiler/constants.ts`:
   - `UI_TYPE_CODES` map (index -> code -> type name)
   - `MODIFIER_SYMBOLS` for `!`, `^`, `*`, `@`, `>`, `<`, `#`, `%`

2. **Extend scanner** (`compiler/scanner.ts`):
   - Recognize indexed types (`0-9` as standalone)
   - Recognize UI type codes (`Kp`, `Br`, `Bt`, etc.)
   - Recognize modifiers (`!h`, `^f`, `*3`, `@signal`, `>emit`, `#color`, `%size`)
   - Recognize bindings (`:field`, `:.`, `=expr`)
   - Recognize layers (`/1`, `/2`)
   - Recognize `Survey {` block opener

3. **Extend parser** (`compiler/parser.ts`):
   - Parse `Block` with type, bindings, modifiers, children
   - Parse `Layer` definitions
   - Parse `Survey { }` blocks (delegate to existing survey parser)

4. **Add UI emitter** (`compiler/emitter.ts`):
   - Output `LiquidSchema` interface (different from `GraphSurvey`)
   - Handle signals, layers, blocks

5. **Update compiler entry** (`compiler/compiler.ts`):
   - Add `parseUI()` function for LiquidCode
   - Add `compileUI()` function for LiquidCode
   - Keep existing `parse()` and `compile()` for surveys
   - Add unified `parseAny()` that auto-detects format

### Output Schema (§13.1)

```typescript
interface LiquidSchema {
  version: "1.0";
  signals: Signal[];
  layers: Layer[];
  surveys?: EmbeddedSurvey[];
}

interface Layer {
  id: number;
  visible: boolean;
  root: Block;
}

interface Block {
  uid: string;
  type: string;
  binding?: Binding;
  label?: string;
  layout?: Layout;
  signals?: SignalBinding;
  condition?: Condition;
  style?: Style;
  children?: Block[];
  survey?: GraphSurvey;  // Embedded survey
}
```

### Example DSL to Parse

```liquid
@dr
1 0, 1 1, 1 2, 1 3
3 :date :amount <dr
5 :orders [:id :customer :total :status]

Bt "Give Feedback" >/1

/1 9 "Quick Feedback" [
  Survey {
    > start "Rate this dashboard" -> q1
    ? q1 Rt* "How useful?" {min: 1, max: 5} -> end
    < end "Thanks!"
  }
]
```

### TCS Validation

Use the same TCS methodology we used for LiquidSurvey:
1. Create 10-20 UI sample schemas
2. Compile to DSL
3. Parse back to schema
4. Compare for equivalence

### Success Criteria

- [ ] Scanner recognizes all UI tokens
- [ ] Parser builds correct AST for UI blocks
- [ ] Emitter outputs valid LiquidSchema
- [ ] Roundtrip: LiquidSchema -> DSL -> LiquidSchema preserves data
- [ ] Hybrid: `Survey { }` blocks parse correctly within UI
- [ ] Unit tests pass
- [ ] TCS validation passes

## Commands

```bash
# Run tests
pnpm --filter "@repo/liquid-render" test

# Build
pnpm --filter "@repo/liquid-render" build

# Run TCS validation (after creating samples)
npx tsx packages/liquid-render/src/samples/tcs-batch/tcs-runner.ts
```

## Notes

- The survey compiler already handles `>`, `?`, `!`, `<` - these should NOT conflict with UI modifiers
- UI uses `!` for priority (`!h`, `!p`) which is different from survey `!` (message node)
- Context determines interpretation: inside `Survey { }` = survey syntax, outside = UI syntax
- Maintain backwards compatibility with existing survey-only usage
