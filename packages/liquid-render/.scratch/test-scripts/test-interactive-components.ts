/**
 * Interactive Components Test Suite
 *
 * Tests 5 unique LiquidCode snippets for interactive components:
 * - Accordions (Ac)
 * - Carousels (Cr)
 * - Tabs with content
 * - Steppers (St)
 *
 * Each snippet is parsed with parseUI() and verified with roundtripUI()
 * Reports pass/fail for each component type
 */

import { parseUI, roundtripUI } from './src/compiler/compiler';

// ============================================================================
// Test Results Tracker
// ============================================================================

interface TestResult {
  name: string;
  snippet: string;
  parsePass: boolean;
  roundtripPass: boolean;
  parseError?: string;
  differences?: string[];
}

const results: TestResult[] = [];

// ============================================================================
// SNIPPET 1: Accordion Component (Ac)
// Multi-section collapsible accordion with signal-based state management
// ============================================================================

function testAccordion() {
  const name = 'Accordion with Signal State (Ac)';
  const snippet = `
@acc_state
Ac "Product Features" [
  Bt "Durability" >acc_state=1 !p,
  ?@acc_state=1 [Tx "Built to last 5+ years with military-grade materials"],
  Bt "Warranty" >acc_state=2 !p,
  ?@acc_state=2 [Tx "5-year comprehensive warranty included"],
  Bt "Support" >acc_state=3 !p,
  ?@acc_state=3 [Tx "24/7 email, chat, and phone support"]
]
  `.trim();

  const result: TestResult = {
    name,
    snippet,
    parsePass: false,
    roundtripPass: false,
  };

  try {
    // Parse
    const schema = parseUI(snippet);
    result.parsePass = true;
    console.log(`✓ ${name} - Parse: PASS`);

    // Roundtrip
    const roundtrip = roundtripUI(schema);
    result.roundtripPass = roundtrip.isEquivalent;

    if (roundtrip.isEquivalent) {
      console.log(`✓ ${name} - Roundtrip: PASS`);
    } else {
      console.log(`✗ ${name} - Roundtrip: FAIL`);
      result.differences = roundtrip.differences;
    }
  } catch (error) {
    result.parseError = error instanceof Error ? error.message : String(error);
    console.log(`✗ ${name} - Parse: FAIL - ${result.parseError}`);
  }

  results.push(result);
}

// ============================================================================
// SNIPPET 2: Carousel Component (Cr) with Auto-Rotation
// Image/content carousel with navigation buttons and streaming
// ============================================================================

function testCarousel() {
  const name = 'Carousel with Navigation (Cr)';
  const snippet = `
@carousel_idx
Cr "Featured Products" ~5s [
  Tx "Product 1: Premium Headphones" #blue !h *2,
  Tx "Product 2: Wireless Speakers" #green !h *2,
  Tx "Product 3: Smart Watch" #red !h *2
]
Bt "Previous" >carousel_idx=-1 !s,
Bt "Next" >carousel_idx=+1 !s
  `.trim();

  const result: TestResult = {
    name,
    snippet,
    parsePass: false,
    roundtripPass: false,
  };

  try {
    const schema = parseUI(snippet);
    result.parsePass = true;
    console.log(`✓ ${name} - Parse: PASS`);

    const roundtrip = roundtripUI(schema);
    result.roundtripPass = roundtrip.isEquivalent;

    if (roundtrip.isEquivalent) {
      console.log(`✓ ${name} - Roundtrip: PASS`);
    } else {
      console.log(`✗ ${name} - Roundtrip: FAIL`);
      result.differences = roundtrip.differences;
    }
  } catch (error) {
    result.parseError = error instanceof Error ? error.message : String(error);
    console.log(`✗ ${name} - Parse: FAIL - ${result.parseError}`);
  }

  results.push(result);
}

// ============================================================================
// SNIPPET 3: Tabbed Interface (Tabs)
// Multi-tab navigation with conditional content rendering
// ============================================================================

function testTabs() {
  const name = 'Tabs with Conditional Content';
  const snippet = `
@active_tab
Cn ^r [
  Bt "Overview" >active_tab=1 !h,
  Bt "Details" >active_tab=2 !p,
  Bt "Reviews" >active_tab=3 !p,
  Bt "Shipping" >active_tab=4 !p
]
?@active_tab=1 [
  Kp :total_views "Total Views" !h,
  Kp :avg_rating "Average Rating" !h,
  Kp :active_buyers "Active Buyers" !h
]
?@active_tab=2 [
  Tx "Specifications" #blue,
  Tb :specs [:name, :value]
]
?@active_tab=3 [
  Tx "Customer Reviews" #blue,
  Ls :reviews
]
?@active_tab=4 [
  Tx "Shipping Information" #blue,
  In :country "Country" !p
]
  `.trim();

  const result: TestResult = {
    name,
    snippet,
    parsePass: false,
    roundtripPass: false,
  };

  try {
    const schema = parseUI(snippet);
    result.parsePass = true;
    console.log(`✓ ${name} - Parse: PASS`);

    const roundtrip = roundtripUI(schema);
    result.roundtripPass = roundtrip.isEquivalent;

    if (roundtrip.isEquivalent) {
      console.log(`✓ ${name} - Roundtrip: PASS`);
    } else {
      console.log(`✗ ${name} - Roundtrip: FAIL`);
      result.differences = roundtrip.differences;
    }
  } catch (error) {
    result.parseError = error instanceof Error ? error.message : String(error);
    console.log(`✗ ${name} - Parse: FAIL - ${result.parseError}`);
  }

  results.push(result);
}

// ============================================================================
// SNIPPET 4: Stepper Component (St)
// Multi-step form wizard with validation and progression
// ============================================================================

function testStepper() {
  const name = 'Stepper Form Wizard (St)';
  const snippet = `
@current_step
St "Checkout Process" [
  Bt "Personal Info" >current_step=1 !h,
  Bt "Shipping" >current_step=2 !p,
  Bt "Payment" >current_step=3 !p,
  Bt "Confirm" >current_step=4 !s
]
?@current_step=1 [
  Fm [
    In :firstName "First Name" !p,
    In :lastName "Last Name" !p,
    In :email "Email" !p
  ]
]
?@current_step=2 [
  Fm [
    In :address "Street Address" !p,
    In :city "City" !p,
    Se :country "Country" !p
  ]
]
?@current_step=3 [
  Fm [
    In :cardNumber "Card Number" !p,
    In :expiry "Expiry" !p,
    In :cvv "CVV" !p
  ]
]
?@current_step=4 [
  Tx "Order Summary" #green !h,
  Tb :orderItems [:product, :quantity, :price]
]
  `.trim();

  const result: TestResult = {
    name,
    snippet,
    parsePass: false,
    roundtripPass: false,
  };

  try {
    const schema = parseUI(snippet);
    result.parsePass = true;
    console.log(`✓ ${name} - Parse: PASS`);

    const roundtrip = roundtripUI(schema);
    result.roundtripPass = roundtrip.isEquivalent;

    if (roundtrip.isEquivalent) {
      console.log(`✓ ${name} - Roundtrip: PASS`);
    } else {
      console.log(`✗ ${name} - Roundtrip: FAIL`);
      result.differences = roundtrip.differences;
    }
  } catch (error) {
    result.parseError = error instanceof Error ? error.message : String(error);
    console.log(`✗ ${name} - Parse: FAIL - ${result.parseError}`);
  }

  results.push(result);
}

// ============================================================================
// SNIPPET 5: Complex Interactive Dashboard
// Combines Accordion, Tabs, and Real-time Streaming
// ============================================================================

function testComplexInteractive() {
  const name = 'Complex Interactive Dashboard';
  const snippet = `
@view_mode @selected_metric
Ac "Performance Metrics" [
  Bt "Revenue Tracking" >view_mode=revenue !p,
  ?@view_mode=revenue [
    Kp :total_revenue "Total Revenue" !h,
    Ln :date :daily_revenue ~5s,
    Br :region :sales
  ],
  Bt "Traffic Analysis" >view_mode=traffic !p,
  ?@view_mode=traffic [
    Kp :page_views "Page Views" !h,
    Kp :bounce_rate "Bounce Rate" !h,
    Ln :date :sessions ~5s
  ]
]
Cn ^r [
  Bt "Last 7 Days" >selected_metric=7d !h,
  Bt "Last 30 Days" >selected_metric=30d !p,
  Bt "YTD" >selected_metric=ytd !p
]
?@selected_metric=7d [
  Tb :weekly_data [:day, :revenue, :visitors]
]
?@selected_metric=30d [
  Tb :monthly_data [:week, :revenue, :visitors]
]
?@selected_metric=ytd [
  Tb :yearly_data [:month, :revenue, :visitors]
]
  `.trim();

  const result: TestResult = {
    name,
    snippet,
    parsePass: false,
    roundtripPass: false,
  };

  try {
    const schema = parseUI(snippet);
    result.parsePass = true;
    console.log(`✓ ${name} - Parse: PASS`);

    const roundtrip = roundtripUI(schema);
    result.roundtripPass = roundtrip.isEquivalent;

    if (roundtrip.isEquivalent) {
      console.log(`✓ ${name} - Roundtrip: PASS`);
    } else {
      console.log(`✗ ${name} - Roundtrip: FAIL`);
      result.differences = roundtrip.differences;
    }
  } catch (error) {
    result.parseError = error instanceof Error ? error.message : String(error);
    console.log(`✗ ${name} - Parse: FAIL - ${result.parseError}`);
  }

  results.push(result);
}

// ============================================================================
// Main Test Execution
// ============================================================================

console.log('═'.repeat(80));
console.log('INTERACTIVE COMPONENTS TEST SUITE');
console.log('═'.repeat(80));
console.log('');

// Run all tests
console.log('Running tests...\n');

testAccordion();
console.log('');

testCarousel();
console.log('');

testTabs();
console.log('');

testStepper();
console.log('');

testComplexInteractive();
console.log('');

// ============================================================================
// Results Summary
// ============================================================================

console.log('═'.repeat(80));
console.log('TEST RESULTS SUMMARY');
console.log('═'.repeat(80));
console.log('');

const passCount = results.filter(r => r.parsePass && r.roundtripPass).length;
const totalTests = results.length;

console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${totalTests - passCount}`);
console.log('');

console.log('Detailed Results:');
console.log('');

results.forEach((result, index) => {
  const status = result.parsePass && result.roundtripPass ? '✓' : '✗';
  console.log(`${status} Test ${index + 1}: ${result.name}`);

  if (!result.parsePass) {
    console.log(`  Parse Error: ${result.parseError}`);
  } else {
    console.log(`  Parse: PASS`);
  }

  if (!result.roundtripPass) {
    console.log(`  Roundtrip: FAIL`);
    if (result.differences && result.differences.length > 0) {
      console.log(`  Differences:`);
      result.differences.slice(0, 3).forEach(diff => {
        console.log(`    - ${diff}`);
      });
    }
  } else {
    console.log(`  Roundtrip: PASS`);
  }

  console.log('');
});

// ============================================================================
// Component Type Statistics
// ============================================================================

console.log('═'.repeat(80));
console.log('COMPONENT TYPES COVERED');
console.log('═'.repeat(80));
console.log('');

const componentMap: Record<string, number> = {
  'Accordion (Ac)': 2,        // Snippet 1 and 5
  'Carousel (Cr)': 1,         // Snippet 2
  'Tabs': 2,                  // Snippet 3 and 5 (implicit)
  'Stepper (St)': 1,          // Snippet 4
  'Signals': 5,               // All snippets use signals
  'Conditional Blocks': 5,    // All snippets use conditionals
};

console.log('Component Coverage:');
Object.entries(componentMap).forEach(([component, count]) => {
  console.log(`  ${component}: ${count} snippet(s)`);
});

console.log('');
console.log('═'.repeat(80));
