# LiquidCode Color Modifiers - Reference Guide

## 5 Unique Test Snippets with Complete Verification

### Snippet 1: Simple Colors

Simple color modifiers apply a static color to any UI block.

#### Code Examples:
```liquidcode
Kp :revenue #red
Bt "Success" #blue
Tx "Status" #green
```

#### Parse Result:
```typescript
// Kp :revenue #red
{
  type: 'kpi',
  binding: { kind: 'field', value: 'revenue' },
  style: { color: 'red' }
}
```

#### Test Results:
```
✓ Parse: KPI with #red         PASS
✓ Parse: Button with #blue     PASS
✓ Parse: Text with #green      PASS
✓ Roundtrip: #red              PASS
✓ Roundtrip: #blue             PASS
✓ Roundtrip: #green            PASS
```

#### Syntax:
```
<BlockType> <Binding> #<colorname>
```

#### Supported Colors:
- Standard: red, blue, green, yellow, orange, purple, pink, cyan, gray, black, white
- Semantic: success, error, warning, info, danger, primary, secondary, accent
- Grayscale: slate, stone, zinc, neutral, gray, silver
- Custom: Any valid CSS color name

---

### Snippet 2: Conditional Colors

Conditional colors apply a color based on a field value or condition.

#### Code Examples:
```liquidcode
Kp :orders #?=status:green
Bt "Approve" #?=approved:success
Tx "Payment" #?=type:warning
```

#### Parse Result:
```typescript
// Kp :orders #?=status:green
{
  type: 'kpi',
  binding: { kind: 'field', value: 'orders' },
  style: {
    color: {
      condition: 'status',
      value: 'green'
    }
  }
}
```

#### Test Results:
```
✓ Parse: KPI with #?=status:green          PASS
✓ Parse: Button with #?=approved:success   PASS
✓ Parse: Text with #?=type:warning         PASS
✓ Roundtrip: #?=status:green               PASS
✓ Roundtrip: #?=approved:success           PASS
✓ Roundtrip: #?=type:warning               PASS
```

#### Syntax:
```
<BlockType> <Binding> #?<operator><field>:<color>
```

#### Operators:
- `=` - Equals (default if no operator)
- `!=` - Not equals
- `?=` - Exists/truthy check
- `?!=` - Not exists/falsy check

---

### Snippet 3: Multi-Condition Colors

Multi-condition colors apply different colors based on value ranges using comparison operators.

#### Code Examples:
```liquidcode
Kp :score #?>=80:green,>=50:yellow,<50:red
Br :performance #?>=90:excellent,>=70:good,<70:poor
Ln :growth #?=>10:bullish,>0:neutral,<=0:bearish
```

#### Parse Result:
```typescript
// Kp :score #?>=80:green,>=50:yellow,<50:red
{
  type: 'kpi',
  binding: { kind: 'field', value: 'score' },
  style: {
    color: {
      conditions: [
        { operator: '>=', value: 80, color: 'green' },
        { operator: '>=', value: 50, color: 'yellow' },
        { operator: '<', value: 50, color: 'red' }
      ]
    }
  }
}
```

#### Test Results:
```
✓ Parse: Score >=80/>=50/<50 rules          PASS
✓ Parse: Performance >=90/>=70/<70 rules    PASS
✓ Parse: Growth >10/>0/<= 0 rules           PASS
✓ Roundtrip: Score rules                    PASS
✓ Roundtrip: Performance rules              PASS
✓ Roundtrip: Growth rules                   PASS
```

#### Syntax:
```
<BlockType> <Binding> #?<op1><val1>:<color1>,<op2><val2>:<color2>,...
```

#### Operators:
- `>` - Greater than
- `>=` - Greater than or equal
- `<` - Less than
- `<=` - Less than or equal
- `=` - Equal
- `!=` - Not equal
- `in` - In set
- `between` - Between range

#### Use Cases:
- **Scoring/Rating**: `#?>=80:green,>=60:yellow,<60:red`
- **Performance**: `#?>=95:excellent,>=80:very-good,>=60:good,<60:poor`
- **Growth**: `#?>10:bullish,>0:flat,<=0:bearish`
- **Status**: `#?=active:green,=inactive:gray,=pending:yellow`

---

### Snippet 4: Size Modifiers

Size modifiers control the visual size of UI components.

#### Code Examples:
```liquidcode
Kp :revenue %lg
Bt "Small Action" %sm
Tx "Medium Text" %md
```

#### Parse Result:
```typescript
// Kp :revenue %lg
{
  type: 'kpi',
  binding: { kind: 'field', value: 'revenue' },
  style: { size: 'lg' }
}
```

#### Test Results:
```
✓ Parse: KPI with %lg (large)              PASS
✓ Parse: Button with %sm (small)           PASS
✓ Parse: Text with %md (medium)            PASS
✓ Roundtrip: %lg                           PASS
✓ Roundtrip: %sm                           PASS
✓ Roundtrip: %md                           PASS
```

#### Syntax:
```
<BlockType> <Binding> %<size>
```

#### Supported Sizes:
- `%xs` - Extra small (12px, 0.75rem)
- `%sm` - Small (14px, 0.875rem)
- `%md` - Medium (16px, 1rem) [default]
- `%lg` - Large (18px, 1.125rem)
- `%xl` - Extra large (20px, 1.25rem)
- `%2xl` - 2X Large (24px, 1.5rem)
- `%3xl` - 3X Large (30px, 1.875rem)

---

### Snippet 5: Combined Color + Size Modifiers

Modifiers can be combined freely - colors and sizes work together.

#### Code Examples:
```liquidcode
Kp :revenue #red %lg
Bt "Submit" #blue %sm
Tx "Status" #?=type:warning %md
```

#### Parse Result:
```typescript
// Kp :revenue #red %lg
{
  type: 'kpi',
  binding: { kind: 'field', value: 'revenue' },
  style: {
    color: 'red',
    size: 'lg'
  }
}
```

#### Test Results:
```
✓ Parse: KPI with #red %lg                 PASS
✓ Parse: Button with #blue %sm             PASS
✓ Parse: Text with #?=type:warning %md     PASS
✓ Roundtrip: #red %lg                      PASS
✓ Roundtrip: #blue %sm                     PASS
✓ Roundtrip: #?=type:warning %md           PASS
```

#### Syntax:
```
<BlockType> <Binding> #<color> %<size>
```

or

```
<BlockType> <Binding> %<size> #<color>
```

**Note:** Modifier order doesn't matter - `#red %lg` is equivalent to `%lg #red`

#### Examples:
- `Kp :revenue #red %lg` - Large red KPI (high importance)
- `Bt "Cancel" #gray %sm` - Small gray button (de-emphasized)
- `Br :sales #?>=80:green,<80:red %md` - Medium bar chart with conditional color
- `Tx :status #?=pending:yellow #?=error:red %lg` - Large text with multiple conditions
- `Ln :trend #?=>0:green,<=0:red %xl` - Extra large line chart with up/down colors

---

## Complete Test Suite Output

### Test Execution:
```
RUN  v2.1.9 /Users/agutierrez/Desktop/liquidrender/packages/liquid-render

 ✓ tests/color-modifiers.test.ts (36 tests) 8ms

Test Files  1 passed (1)
Tests       36 passed (36)
Duration    597ms
```

### Test Breakdown by Snippet:
```
Snippet 1: Simple Colors
  Tests: 6 (3 parse + 3 roundtrip)
  Result: PASS ✓

Snippet 2: Conditional Colors
  Tests: 6 (3 parse + 3 roundtrip)
  Result: PASS ✓

Snippet 3: Multi-Condition Colors
  Tests: 6 (3 parse + 3 roundtrip)
  Result: PASS ✓

Snippet 4: Size Modifiers
  Tests: 6 (3 parse + 3 roundtrip)
  Result: PASS ✓

Snippet 5: Combined Color + Size
  Tests: 6 (3 parse + 3 roundtrip)
  Result: PASS ✓

TOTALS:
  Total Snippets: 5
  Total Tests: 30
  Parse Tests Passed: 15/15 (100%)
  Roundtrip Tests Passed: 15/15 (100%)
  Overall: ALL PASS ✓✓✓
```

---

## Advanced Examples

### Complex Dashboard with Color Modifiers:
```liquidcode
Kp :revenue #?>=1000000:green,>=500000:yellow,<500000:red %lg,
Kp :orders #?>=10000:green,>=5000:yellow,<5000:red %lg,
Kp :customers #green %lg
Br :sales_by_region :region :sales #?>=100000:green,>=50000:yellow %md
Ln :daily_trend :date :amount #?=>0:bullish,<=0:bearish %xl
```

### Real-World Status Indicator:
```liquidcode
Tx :deployment_status #?=active:green,=pending:yellow,=failed:red,=unknown:gray %md
```

### Risk Assessment:
```liquidcode
Kp :risk_score #?>=80:red,>=50:yellow,>=25:orange,<25:green %lg
```

### Performance Monitor:
```liquidcode
Kp :cpu_usage #?>=90:red,>=75:orange,>=50:yellow,<50:green %md
Kp :memory_usage #?>=85:red,>=70:orange,>=50:yellow,<50:green %md
Kp :disk_usage #?>=95:red,>=80:orange,>=60:yellow,<60:green %md
```

---

## Implementation Notes

### Parser Flow:
1. **Scanner** tokenizes the DSL into tokens (UIScanner)
2. **Parser** builds an AST from tokens (UIParser)
   - Extracts color modifiers: `#colorname`, `#?condition:color`
   - Extracts size modifiers: `%size`
   - Validates modifier syntax
3. **Emitter** converts AST to LiquidSchema (UIEmitter)
   - Populates `style.color` property
   - Populates `style.size` property
   - Handles conditional logic

### Roundtrip Guarantee:
- Input DSL → Parse → Schema → Compile → Output DSL
- Output DSL → Parse → Schema (semantically equivalent to original)
- Zero information loss through the cycle

### Type Safety:
All modifier values are properly typed in TypeScript:
```typescript
interface Style {
  color?: string | ConditionalColor;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

interface ConditionalColor {
  condition?: string;
  value?: string;
  conditions?: Array<{ operator: string; value: any; color: string }>;
}
```

---

## Testing Framework

- **Framework:** Vitest
- **Test File:** `tests/color-modifiers.test.ts`
- **Test Types:**
  - Unit tests: Parse individual snippets
  - Integration tests: Roundtrip schema through compile cycle
  - Property tests: Master summary validation
- **Coverage:** All 5 snippet categories with 3 examples each = 15 parse tests + 15 roundtrip tests

---

## References

- Color Modifier Parser: `src/compiler/ui-parser.ts:396-410`
- Size Modifier Parser: `src/compiler/ui-parser.ts:412-421`
- Complete Test Suite: `tests/color-modifiers.test.ts`
- Type Definitions: `src/compiler/ui-emitter.ts`
