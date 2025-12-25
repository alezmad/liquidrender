/**
 * Advanced E-Commerce LiquidCode Scenarios
 * Tests complex patterns: nested modals, multi-signal flows, advanced forms
 */

import { parseUI, roundtripUI, compileUI } from './src/compiler/compiler';

interface AdvancedTest {
  name: string;
  description: string;
  snippet: string;
  expectedFeatures: string[];
}

const advancedTests: AdvancedTest[] = [
  {
    name: 'Product Gallery with Thumbnails',
    description: 'Product image gallery with signal-driven image selection',
    snippet: `@selectedImage
Cn [
  Im :mainImage
  Tb :thumbnails [:thumb] >selectedImage
  Tx :description
]`,
    expectedFeatures: ['signal-emit', 'multi-component-flow', 'image-gallery'],
  },
  {
    name: 'Multi-step Checkout Wizard',
    description: 'Wizard-like checkout with multiple form sections',
    snippet: `Cn [
  Tx "Step 1: Shipping"
  Fm [In :address, In :city]
  Tx "Step 2: Payment"
  Fm [In :cardName, In :cardNumber ?required]
  Bt :complete "Complete Purchase" !submit
]`,
    expectedFeatures: ['nested-forms', 'multi-step', 'validation'],
  },
  {
    name: 'Product Comparison Modal',
    description: 'Side-by-side product comparison in modal',
    snippet: `/2 Md [
  Tx "Compare Products"
  Cn [
    Cd [Tx :product1, Kp :price1]
    Cd [Tx :product2, Kp :price2]
  ]
  Tb :differences [:feature :product1 :product2]
]`,
    expectedFeatures: ['modal-layer', 'nested-containers', 'comparison-table'],
  },
  {
    name: 'Dynamic Filter Sidebar',
    description: 'Product filters with reactive results',
    snippet: `@filterChanged
Cn [
  Cn [
    Tx "Filters"
    In :priceMin "Min Price" >filterChanged
    In :priceMax "Max Price" >filterChanged
    In :category "Category" >filterChanged
  ]
  Tb :products [:name :price :rating]
]`,
    expectedFeatures: ['multi-signal-emit', 'reactive-filtering', 'sidebar'],
  },
  {
    name: 'Customer Review Section',
    description: 'Reviews display with pagination and submission form',
    snippet: `Cn [
  Tb :reviews [:author :rating :text]
  Cn [
    Tx "Add Review"
    Fm [
      In :name "Your Name" ?required
      In :rating "Rating" ?required
      In :comment "Your Review" ?required
    ]
    Bt :submit "Post Review" !submit
  ]
]`,
    expectedFeatures: ['nested-form', 'review-collection', 'validation'],
  },
];

console.log('Advanced E-Commerce LiquidCode Verification');
console.log('='.repeat(80));
console.log();

let passCount = 0;
let failCount = 0;
const failedTests = [];

for (const test of advancedTests) {
  try {
    const schema = parseUI(test.snippet);
    const roundtrip = roundtripUI(schema);
    const compiled = compileUI(schema);

    const passed = roundtrip.isEquivalent;

    console.log(`Test: ${test.name}`);
    console.log(`Description: ${test.description}`);
    console.log(`Status: ${passed ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Features: ${test.expectedFeatures.join(', ')}`);
    console.log();

    if (passed) {
      passCount++;
      console.log('Original DSL:');
      console.log(test.snippet.split('\n').map(l => '  ' + l).join('\n'));
      console.log();
      console.log('Compiled DSL:');
      console.log(compiled.split('\n').map(l => '  ' + l).join('\n'));
    } else {
      failCount++;
      failedTests.push(test.name);
      console.log('Differences:');
      for (const diff of roundtrip.differences) {
        console.log(`  - ${diff}`);
      }
    }

    console.log();
    console.log('-'.repeat(80));
    console.log();
  } catch (e) {
    failCount++;
    failedTests.push(test.name);
    console.log(`Test: ${test.name}`);
    console.log(`Status: ✗ ERROR`);
    console.log(`Message: ${(e as Error).message}`);
    console.log('-'.repeat(80));
    console.log();
  }
}

console.log('='.repeat(80));
console.log('ADVANCED TEST SUMMARY');
console.log('='.repeat(80));
console.log();
console.log(`Total: ${advancedTests.length}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Success Rate: ${((passCount / advancedTests.length) * 100).toFixed(1)}%`);

if (failedTests.length > 0) {
  console.log();
  console.log('Failed Tests:');
  for (const name of failedTests) {
    console.log(`  - ${name}`);
  }
}

console.log();
console.log('='.repeat(80));

// Export for integration testing
export const results = {
  total: advancedTests.length,
  passed: passCount,
  failed: failCount,
  successRate: (passCount / advancedTests.length) * 100,
  tests: advancedTests.map(t => t.name),
};
