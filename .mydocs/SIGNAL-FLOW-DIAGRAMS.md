# LiquidCode Signal Flow Diagrams

Visual representations of how signals flow through each of the 5 tested snippets.

---

## Snippet 1: Multi-Signal Form with Tab, Filter, Sort

```
SIGNAL DECLARATIONS
@tab  @filter  @sort
  ▲      ▲      ▲
  │      │      │
  └──────┴──────┴─────────────┐
                              │
                         EMITTERS
                         ▼
                    ┌────────────────┐
                    │   Form         │
                    │ 6 :users [     │
                    │   ┌─────────┐  │
                    │   │ Card 1  │──┼───>tab=0
                    │   └─────────┘  │
                    │   ┌─────────┐  │
                    │   │ Card 2  │──┼───>filter
                    │   └─────────┘  │
                    │   ┌─────────┐  │
                    │   │ Button  │──┼───>sort=ascending
                    │   └─────────┘  │
                    └────────────────┘
                              │
                              │ RECEIVERS
                              ▼
                    ┌─────────────────┐
                    │  Table          │
                    │  5 :data        │
                    │  <tab           │
                    │  <filter        │
                    │  <sort          │
                    └─────────────────┘

SIGNAL FLOW SUMMARY
═══════════════════════════════════════════════════════════
Data Source:    @tab (tab index), @filter (text), @sort (direction)
Emitters:       3 (Card, Card, Button)
Receiver:       1 (Table)
Pattern:        Many Sources → Single Sink
Interaction:    User clicks/types on form → Table updates
```

---

## Snippet 2: Bidirectional Search and Range Filter

```
SIGNAL DECLARATIONS
@search  @selectedRange
   ▲           ▲
   │◄──────────┤◄─────────┐
   │           │          │
   │BIDIRECTIONAL BINDINGS
   │           │          │
   │ User ┌────┴───┐     │
   └─────►│ Input  │     │
   ◄──────│ :query │     │
          │<>search│     │
          └────────┘     │
                         │
          ┌──────────┐   │
   ┌─────►│  Slider  │───┘
   │ User │  :range  │
   └──────│<>range..│
   ◄──────│         │
          └──────────┘

RECEIVERS (Both signals)
      ▼
┌──────────────────┐
│   Table          │
│   5 :results     │
│   <search        │
│   <selectedRange │
└──────────────────┘

SIGNAL FLOW SUMMARY
═══════════════════════════════════════════════════════════
Data Source:    User input + external program updates
Emitters:       2 (Input, Range Slider) - bidirectional
Receiver:       1 (Table)
Pattern:        Two-Way Binding
Interaction:    User input updates signals ↔ Program updates UI
Features:       True synchronization (input ↔ signal ↔ display)
```

---

## Snippet 3: Increment/Decrement Counter with State

```
SIGNAL DECLARATIONS
@count  @total
  ▲       ▲
  │       │
  └───────┴─────────────────────┐
          EMITTERS              │
          ▼                      │
    ┌──────────┐                │
    │ Button + │──>count++      │
    └──────────┘                │
                                │ RECEIVER
    ┌──────────┐                │
    │ Button - │──>count--      │
    └──────────┘                │
                                ▼
                        ┌──────────────────┐
                        │  KPI             │
                        │  :value <count   │
                        └──────────────────┘

COMPUTED BINDING (re-evaluates on signal change)
                ▼
        ┌──────────────────────┐
        │ Computed             │
        │ 1 =total+count <count│
        │ (re-evaluates on     │
        │  every count change) │
        └──────────────────────┘

SIGNAL FLOW SUMMARY
═══════════════════════════════════════════════════════════
Data Source:    Click interactions (+ and - buttons)
Emitters:       2 (Button +, Button -)
Signal Operators: >count++, >count--
Receivers:      2 (KPI direct, Computed binding)
Pattern:        Single Source, Multiple Dependent Updates
Interaction:    Click → Count increments/decrements → UI updates
Features:       Numeric operators, computed re-evaluation
```

---

## Snippet 4: Nested Signals with Modal State and Form Data

```
SIGNAL DECLARATIONS
@modalState  @formData
      ▲           ▲
      │           │
      │           └──────┐
      │                  │
NESTING STRUCTURE        │
┌─────────────────────┐  │
│ Card (Level 0)      │  │
│ :title              │  │
│ >modalState=open ──┐│  │
│                   ││  │
│ CHILDREN          ││  │
│ ┌───────────────┐ ││  │
│ │ Form (L1)     │ ││  │
│ │ :fields       │ ││  │
│ │               │ ││  │
│ │ CHILDREN      │ ││  │
│ │ ┌───────────┐ │ ││  │
│ │ │ Input(L2) │ │ ││  │
│ │ │ <>formData├─┼─┼┘  │
│ │ └───────────┘ │ │   │
│ │               │ │   │
│ │ ┌───────────┐ │ │   │
│ │ │ Btn(L2)   │ │ │   │
│ │ │ >formData ├─┼─┘   │
│ │ └───────────┘ │     │
│ └───────────────┘     │
│                       │
└─────────────────────┘

OUTER RECEIVER
      ▼
┌─────────────────────┐
│ Container           │
│ <modalState         │
│ <formData           │
└─────────────────────┘

SIGNAL FLOW SUMMARY
═══════════════════════════════════════════════════════════
Nesting Levels:  3 (Card → Form → Input/Button)
Emitters:        2 (Card, Button) - at different levels
Receiver:        1 bidirectional (Input at L2)
Outer Receiver:  1 container at L0
Pattern:         Nested Scope with Signal Flow
Key Feature:     Signals propagate through nesting levels
                 Inner blocks can emit to outer signals
Interaction:     Modal mounts → signal emitted
                 Form input updates → signal updates
                 Submit button → signal emitted
                 Outer container reacts to both signals
```

---

## Snippet 5: Complex Multi-Signal with Conditional Styling

```
SIGNAL DECLARATIONS
@status  @priority  @threshold
   ▲         ▲          ▲
   │         │          │
   │         │    (declared but unused)
   │         │          
   │         └──────┐   
   │                │   
OUTER CONTAINER     │   
│0 [                │   
│  ┌─────────────┐  │ │
│  │ KPI         │  │ │
│  │ :health     │  │ │
│  │ <status ────┼──┘ │
│  │ #?>=80:green    │
│  │  ,?<50:red      │
│  └─────────────┘    │
│                     │
│  ┌──────────────┐   │
│  │ Progress     │   │
│  │ :progress    │   │
│  │ <status ─────┼───┤ MULTI-RECEIVER
│  │ <priority ──┼──┐│
│  └──────────────┘  ││
│                    ││
│  ┌──────────────┐  ││
│  │ Text         │  ││
│  │ :.label      │  ││
│  │ <status ─────┼──┤├─ MULTIPLE SIGNALS
│  │ <>priority ──┼──┘│
│  └──────────────┘   │
│                     │
│  ┌──────────────┐   │
│  │ Button       │   │
│  │ "Reset"      │   │
│  │ >status=init ├──┬┘
│  │ >priority=0  ├──┘
│  └──────────────┘

SIGNAL FLOW SUMMARY
═══════════════════════════════════════════════════════════
Data Sources:   @status, @priority, @threshold (unused)
Emitters:       1 (Button) - to 2 signals
Receivers:      3 components
- KPI:          1 receiver with conditional styling
- Progress:     2 receivers (status + priority)
- Text:         1 bidirectional + 1 receiver
Pattern:        Many Sinks with Complex Dependencies
Conditional:    #?>=80:green,?<50:red
               (color depends on status value)
Bidirectional:  Text field syncs priority bidirectionally
Reset Action:   Button resets both signals simultaneously
Interaction:    Status/priority change → All receivers update
               with different effects (color, value, label)
```

---

## Signal Operator Summary

```
EMISSION TYPES
══════════════════════════════════════════════════════════

Simple Emission
  >signal
  └─ Emits the current binding value from the component

Explicit Value
  >signal=value
  └─ Emits an explicit value
     Examples: >tab=0, >status=initial, >sort=ascending

Increment
  >signal++
  └─ Emit the signal with increment operation
     Used with numeric signals (counters, etc.)

Decrement
  >signal--
  └─ Emit the signal with decrement operation
     Used with numeric signals (counters, etc.)

Layer Emission
  >signal=layer/id
  └─ Emit signal to specific layer
     Advanced pattern for multi-layer UIs

RECEPTION TYPES
══════════════════════════════════════════════════════════

Single Receiver
  <signal
  └─ Component listens to this signal
     Updates when signal changes

Multiple Receivers
  <signal1 <signal2 <signal3
  └─ Component listens to multiple signals
     Updates when ANY signal changes

Bidirectional
  <>signal
  └─ Two-way binding:
     • Emit when component changes (user interaction)
     • Receive when signal changes (external update)
     • Perfect for form inputs and synchronized values

RECEIVER MODIFIERS
══════════════════════════════════════════════════════════

Conditional Styling
  <signal #?>=80:green,?<50:red
  └─ Apply color based on signal value
     Color changes as signal updates

Computed Binding
  =expression <signal
  └─ Computed field re-evaluates when signal changes
     Example: =total+count <count

Multiple Receptions
  <sig1 <sig2 <sig3
  └─ Update when ANY of these signals change
     Useful for multi-factor calculations
```

---

## Common Patterns

### Pattern 1: Hub-and-Spoke
```
        Emitter 1 ──┐
        Emitter 2 ──┼──> Central Signal ──> Receiver
        Emitter 3 ──┘
```
Example: Snippet 1 (Form inputs → Filter signal → Table)

### Pattern 2: Two-Way Sync
```
User Input  <──────> Signal  <──────> Display
(bidirectional)     (bidirectional)
```
Example: Snippet 2 (Input ↔ Search, Slider ↔ Range)

### Pattern 3: State Accumulation
```
Button + ──\
            ├──> Counter Signal ──> Display + Computed
Button - ──/
```
Example: Snippet 3 (++/-- operators)

### Pattern 4: Nested Scope
```
Parent Level ──┐
               ├──> Signal ──> Receiver
Child Level ───┘
```
Example: Snippet 4 (Card and Button in Form emit to outer Container)

### Pattern 5: Conditional Dependency
```
Status Signal ──> KPI (color based on value)
                > Progress (height based on value)
Priority Signal > Text (bidirectional)
                > Progress (combined logic)
```
Example: Snippet 5 (Complex multi-signal interaction)

---

## Implementation Notes

### Signal Scope
- Signals declared at program start
- Available in all blocks (local and nested)
- No need to re-declare in nested scopes

### Emission Timing
- Emitters emit immediately on trigger
- No queue or batching by default
- All receivers notified synchronously

### Receiver Updates
- Receivers update immediately on signal change
- Multiple receivers per signal = broadcast
- Bidirectional receivers emit back to signal

### Conditional Styling
- Conditions evaluated at render time
- Based on current signal value
- Supports multiple conditions (OR semantics)

### Computed Re-evaluation
- Computed fields with `<receiver` re-evaluate
- Only when that signal changes
- Other signal changes don't affect computation

---

**Last Updated:** 2024-12-24
**Status:** ✅ All Patterns Verified

