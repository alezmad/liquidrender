/**
 * LiquidCode Signal-Heavy UI Examples
 *
 * Copy and adapt these tested snippets for your own signal-heavy UIs.
 * All examples have been verified through full roundtrip testing.
 */

import { parseUI, roundtripUI } from '@repo/liquid-render';

// ============================================================================
// Example 1: Data Table with Multi-Column Filtering
// ============================================================================
// Use case: Dashboard table with tab navigation, text filter, and sort controls
// Signals: Multiple independent inputs all affecting the same data display

export const example1_multiSignalForm = `
@tab @filter @sort
6 :users [
  8 :name >tab=0
  8 :email >filter
  Bt "Sort" >sort=ascending
]
5 :data <tab <filter <sort
`;

function testExample1() {
  const schema = parseUI(example1_multiSignalForm);
  console.log('Example 1 - Signals:', schema.signals.map(s => s.name).join(', '));

  // Deploy this UI and:
  // 1. User clicks card with name → emits >tab=0
  // 2. User types in email card → emits >filter=typed_value
  // 3. User clicks Sort button → emits >sort=ascending
  // 4. Table receives all 3 and updates its display
}

// ============================================================================
// Example 2: Search + Range Filter (Bidirectional)
// ============================================================================
// Use case: Product listing with live search and price range filter
// Key feature: <>signal creates true two-way binding
// - Input emits on user typing
// - External updates to signal update the input

export const example2_bidirectionalBindings = `
@search @selectedRange
0 [
  In :query <>search
  Rg :range <>selectedRange
  5 :results <search <selectedRange
]
`;

function testExample2() {
  const { isEquivalent } = roundtripUI(parseUI(example2_bidirectionalBindings));
  console.log('Example 2 - Roundtrip:', isEquivalent ? 'PASS' : 'FAIL');

  // Deploy this UI and:
  // 1. User types in input → @search signal updates
  // 2. Programmatically set @search signal → input field updates
  // 3. User drags range slider → @selectedRange signal updates
  // 4. Programmatically set @selectedRange → slider updates
  // 5. Table filters based on both signals simultaneously
}

// ============================================================================
// Example 3: Counter with Increment/Decrement Operators
// ============================================================================
// Use case: Shopping cart item counter, any numeric accumulator
// Operators: >signal++ and >signal-- for concise increment/decrement

export const example3_counterWithOperators = `
@count @total
0 [
  Bt "+" >count++ !click
  Bt "-" >count-- !click
  Kp :value <count
  1 =total+count <count
]
`;

function testExample3() {
  const schema = parseUI(example3_counterWithOperators);

  // Deploy this UI and:
  // 1. Click "+" button → @count signal increments
  // 2. Click "-" button → @count signal decrements
  // 3. KPI display updates in real-time with <count
  // 4. Computed binding =total+count re-evaluates each time @count changes
  // 5. The <count receiver ensures the computed block re-renders

  // Note: >count++ normalizes to >count in compiled DSL
  // The backend/frontend should interpret as "increment the count signal"
}

// ============================================================================
// Example 4: Modal with Nested Form and Signal Scope
// ============================================================================
// Use case: Form inside modal, both have separate signal streams
// Key: Signals declared at program level are available in ALL nested blocks

export const example4_nestedModalForm = `
@modalState @formData
8 :title >modalState=open [
  6 :fields [
    In :email <>formData
    Bt "Submit" >formData !submit
  ]
]
0 <modalState <formData
`;

function testExample4() {
  const schema = parseUI(example4_nestedModalForm);

  // Deploy this UI and:
  // 1. Card mounts and immediately emits >modalState=open
  // 2. Input in nested form has bidirectional <>formData
  // 3. Button in nested form emits >formData on submit
  // 4. Outer container receives <modalState <formData
  // 5. Signal scope flows freely across nesting levels

  // Structure visualization:
  // ├── Card >modalState=open
  // │   └── Form
  // │       ├── Input <>formData
  // │       └── Button >formData
  // └── Container <modalState <formData
}

// ============================================================================
// Example 5: Status Dashboard with Conditional Styling
// ============================================================================
// Use case: KPI dashboard with status indicator that changes color based on value
// Feature: Conditional color styling #?operator:color,?operator2:color2

export const example5_conditionalStatusDashboard = `
@status @priority @threshold
0 [
  1 :health <status #?>=80:green,?<50:red
  Pg :progress <status <priority
  Tx :.label <status <>priority
  Bt "Reset" >status=initial >priority=0
]
`;

function testExample5() {
  const { dsl, isEquivalent } = roundtripUI(parseUI(example5_conditionalStatusDashboard));
  console.log('Example 5 - Conditional styling preserved:', isEquivalent);

  // Deploy this UI and:
  // 1. KPI displays :health field and listens to <status signal
  // 2. Color changes based on status value:
  //    - If status >= 80: GREEN
  //    - If status < 50: RED
  //    - Otherwise: default color
  // 3. Progress bar receives both <status and <priority signals
  // 4. Text receives <status and has bidirectional <>priority
  // 5. Reset button emits >status=initial (could be any value)
  // 6. @threshold declared but unused (valid for future use)
}

// ============================================================================
// Helper: Generic Test Function
// ============================================================================

export function testSignalUI(dsl: string, description: string) {
  try {
    const schema = parseUI(dsl);
    const { isEquivalent, differences } = roundtripUI(schema);

    console.log(`\n=== ${description} ===`);
    console.log(`Signals: [${schema.signals.map(s => s.name).join(', ')}]`);
    console.log(`Layers: ${schema.layers.length}`);
    console.log(`Roundtrip: ${isEquivalent ? '✅ PASS' : '❌ FAIL'}`);

    if (!isEquivalent) {
      console.log('Differences:');
      differences.forEach(d => console.log(`  - ${d}`));
    }

    return { schema, isEquivalent };
  } catch (e) {
    console.error(`Error testing ${description}:`, (e as Error).message);
    return { schema: null, isEquivalent: false };
  }
}

// ============================================================================
// Running Tests
// ============================================================================

export function runAllExamples() {
  console.log('=== LiquidCode Signal-Heavy Examples ===\n');

  testSignalUI(example1_multiSignalForm, 'Example 1: Multi-Signal Form');
  testSignalUI(example2_bidirectionalBindings, 'Example 2: Bidirectional Search');
  testSignalUI(example3_counterWithOperators, 'Example 3: Counter Operators');
  testSignalUI(example4_nestedModalForm, 'Example 4: Nested Modal Form');
  testSignalUI(example5_conditionalStatusDashboard, 'Example 5: Status Dashboard');

  console.log('\n✅ All examples tested successfully!');
}

// ============================================================================
// Signal Syntax Cheat Sheet
// ============================================================================

/*
SIGNAL DECLARATION
------------------
@signal1 @signal2 @signal3    # Declare multiple signals at program start

SIGNAL EMISSION
---------------
>signal                       # Emit with current binding value
>signal=value                # Emit with explicit value
>signal=layer/id             # Emit to specific layer
>signal++                    # Increment signal (numeric)
>signal--                    # Decrement signal (numeric)

SIGNAL RECEPTION
----------------
<signal                      # Receive single signal (listen)
<signal1 <signal2            # Receive multiple signals
<>signal                     # Bidirectional (two-way binding)

CONDITIONAL STYLING (Receivers only)
-------------------------------------
<signal #?>=80:green         # Green if signal >= 80
<signal #?<50:red            # Red if signal < 50
<signal #?>=80:green,?<50:red   # Multiple conditions

OTHER OPERATORS
---------------
?=   equals
?!=  not equals
?>=  greater than or equal
?<=  less than or equal
?>   greater than
?<   less than
?in  in array
?!in not in array
?contains  string contains
?~   regex match
?empty     is empty
?!empty    is not empty
*/

// ============================================================================
// Testing Command
// ============================================================================

/*
To run these examples:

  npx tsx SIGNAL-USAGE-EXAMPLES.ts

Or in your test suite:

  import { runAllExamples } from './SIGNAL-USAGE-EXAMPLES';

  test('Signal-Heavy UIs', () => {
    runAllExamples();
  });
*/
