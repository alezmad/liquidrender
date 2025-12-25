# LiquidCode Signal-Heavy Snippets - Quick Reference

**All Tested & Verified ✅ (5/5 Pass)**

---

## Snippet 1: Multi-Signal Form with Tab, Filter, Sort

```liquidcode
@tab @filter @sort
6 :users [
  8 :name >tab=0
  8 :email >filter
  Bt "Sort" >sort=ascending
]
5 :data <tab <filter <sort
```

**Features:** Multiple independent signals, form with data binding, table filtering
**Status:** ✅ PASS

---

## Snippet 2: Bidirectional Search and Range Filter

```liquidcode
@search @selectedRange
0 [
  In :query <>search
  Rg :range <>selectedRange
  5 :results <search <selectedRange
]
```

**Features:** Two-way binding (`<>`), live input/range, multi-signal receivers
**Status:** ✅ PASS

---

## Snippet 3: Increment/Decrement Counter with State

```liquidcode
@count @total
0 [
  Bt "+" >count++ !click
  Bt "-" >count-- !click
  Kp :value <count
  1 =total+count <count
]
```

**Features:** Signal operators (`++`, `--`), computed bindings, state updates
**Status:** ✅ PASS

---

## Snippet 4: Nested Signals with Modal State and Form Data

```liquidcode
@modalState @formData
8 :title >modalState=open [
  6 :fields [
    In :email <>formData
    Bt "Submit" >formData !submit
  ]
]
0 <modalState <formData
```

**Features:** Nested containers, layer emission, modal state management
**Status:** ✅ PASS

---

## Snippet 5: Complex Multi-Signal with Conditional Styling

```liquidcode
@status @priority @threshold
0 [
  1 :health <status #?>=80:green,?<50:red
  Pg :progress <status <priority
  Tx :.label <status <>priority
  Bt "Reset" >status=initial >priority=0
]
```

**Features:** Conditional color styling, multi-signal receivers, reset emissions
**Status:** ✅ PASS

---

## Signal Syntax Quick Reference

### Declare Signals
```
@signal1 @signal2 @signal3
```

### Emit to Signals
```
>signalName              # Emit current value
>signalName=value       # Emit explicit value
>signalName++           # Increment
>signalName--           # Decrement
>signalName=layer/id    # Emit to layer
```

### Receive from Signals
```
<signalName             # Single receiver
<sig1 <sig2 <sig3       # Multiple receivers
<>signalName            # Bidirectional (emit & receive)
```

### Conditional Styling with Signals
```
#?>=value:color         # If signal >= value, use color
#?<value:color,?>=other:otherColor  # Multiple conditions
```

---

## Test Results

```
Total Tests: 5
Passed: 5
Failed: 0
Success Rate: 100.0%

All snippets verified for:
✓ Parsing
✓ Schema generation
✓ DSL compilation
✓ Roundtrip equivalence
```

---

## Use Cases

| Snippet | Use Case | Signals |
|---------|----------|---------|
| 1 | Filter/sort tables, multi-column forms | tab, filter, sort |
| 2 | Search + range filters, live results | search, selectedRange |
| 3 | Counters, counters with aggregates | count, total |
| 4 | Modals, forms, nested state | modalState, formData |
| 5 | Status dashboards, conditional UI | status, priority |

---

## Testing Command

```bash
npx tsx test-signals.ts
```

**Output:** Full roundtrip verification with generated DSL for each snippet.

---

**Last Updated:** 2024-12-24
**Framework:** @liquidrender/compiler
**Status:** Production Ready ✅
