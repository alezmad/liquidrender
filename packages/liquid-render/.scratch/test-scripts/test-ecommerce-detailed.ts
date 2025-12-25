/**
 * E-Commerce LiquidCode Detailed Roundtrip Verification
 * with Schema introspection and validation metrics
 */

import { parseUI, roundtripUI, compileUI } from './src/compiler/compiler';
import type { LiquidSchema } from './src/compiler/ui-emitter';

interface TestResult {
  num: number;
  name: string;
  snippet: string;
  dsl: string;
  schema: LiquidSchema;
  roundtripResult: ReturnType<typeof roundtripUI>;
  passed: boolean;
}

const testCases = [
  {
    name: 'Product Card with Images',
    snippet: `Cd [
  Im :productImage
  Tx :productName "Product"
  Kp :price "Price"
  Rt :rating
]`,
  },
  {
    name: 'Shopping Cart with Signals',
    snippet: `@itemCount
Cn [
  Tx "Shopping Cart"
  Bt :checkout "Checkout" >itemCount
  Tb :cartItems [:product :quantity :subtotal]
]`,
  },
  {
    name: 'Checkout Form with Validation',
    snippet: `Fm [
In :email "Email" ?required
In :address "Address" ?required
In :cardNumber "Card Number" ?required
In :expiryDate "Expiry"
Bt :placeOrder "Place Order" !submit
]`,
  },
  {
    name: 'Product Detail Modal',
    snippet: `/0 Md [
Tx :productName "Product Details"
Im :fullImage
Tx :description "About This Product"
Kp :price "Price"
Rt :reviews "Customer Rating"
Bt :addToCart "Add to Cart" !addToCart
]`,
  },
  {
    name: 'Review Submission Modal',
    snippet: `/1 Md [
Tx "Leave a Review"
In :reviewTitle "Review Title" ?required
Tx :starRating "Rating" %large
Tx :reviewText "Your Review"
Bt :submitReview "Submit Review" !submit
Bt :cancel "Cancel"
]`,
  },
];

const results: TestResult[] = [];

console.log('E-Commerce LiquidCode Roundtrip Verification - Detailed Report');
console.log('='.repeat(80));
console.log();

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  const num = i + 1;

  try {
    // Step 1: Parse DSL to Schema
    const schema = parseUI(tc.snippet);

    // Step 2: Roundtrip (Schema -> DSL -> Schema)
    const roundtrip = roundtripUI(schema);

    // Step 3: Compile back to DSL for comparison
    const compiledDsl = compileUI(schema);

    const passed = roundtrip.isEquivalent;

    results.push({
      num,
      name: tc.name,
      snippet: tc.snippet,
      dsl: compiledDsl,
      schema,
      roundtripResult: roundtrip,
      passed,
    });

    // Print detailed result
    console.log(`[Test ${num}] ${tc.name}`);
    console.log('-'.repeat(80));
    console.log(`Status: ${passed ? '✓ PASS' : '✗ FAIL'}`);
    console.log();
    console.log('Original DSL:');
    console.log(tc.snippet.split('\n').map(l => '  ' + l).join('\n'));
    console.log();
    console.log('Compiled DSL:');
    console.log(compiledDsl.split('\n').map(l => '  ' + l).join('\n'));
    console.log();
    console.log(`Schema Details:`);
    console.log(`  - Version: ${schema.version}`);
    console.log(`  - Signals: ${schema.signals.length}`);
    console.log(`  - Layers: ${schema.layers.length}`);
    if (schema.layers.length > 0) {
      const root = schema.layers[0].root;
      console.log(`  - Root Block Type: ${root.type}`);
      console.log(`  - Children: ${root.children?.length ?? 0}`);
    }
    console.log();

    if (!passed) {
      console.log('Roundtrip Differences:');
      for (const diff of roundtrip.differences) {
        console.log(`  - ${diff}`);
      }
      console.log();
    }

    console.log();
  } catch (e) {
    results.push({
      num,
      name: tc.name,
      snippet: tc.snippet,
      dsl: '',
      schema: {} as LiquidSchema,
      roundtripResult: {
        dsl: '',
        reconstructed: {} as LiquidSchema,
        isEquivalent: false,
        differences: [(e as Error).message],
      },
      passed: false,
    });

    console.log(`[Test ${num}] ${tc.name}`);
    console.log('-'.repeat(80));
    console.log(`Status: ✗ ERROR`);
    console.log(`Message: ${(e as Error).message}`);
    console.log();
  }
}

// Summary Report
console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

const passed = results.filter(r => r.passed).length;
const failed = results.length - passed;
const successRate = ((passed / results.length) * 100).toFixed(1);

console.log();
console.log(`Total Tests: ${results.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${successRate}%`);
console.log();

if (failed > 0) {
  console.log('Failed Tests:');
  for (const r of results.filter(r => !r.passed)) {
    console.log(`  [${r.num}] ${r.name}`);
  }
  console.log();
}

// Component Coverage
console.log('Component Types Used:');
const types = new Set<string>();
for (const r of results) {
  const collectTypes = (block: any) => {
    types.add(block.type);
    if (block.children?.length) {
      for (const child of block.children) {
        collectTypes(child);
      }
    }
  };
  for (const layer of r.schema.layers || []) {
    collectTypes(layer.root);
  }
}
for (const type of Array.from(types).sort()) {
  console.log(`  - ${type}`);
}
console.log();

// Signal Coverage
const signalTypes = new Set<string>();
for (const r of results) {
  for (const signal of r.schema.signals || []) {
    signalTypes.add(signal.name);
  }
  const collectSignals = (block: any) => {
    if (block.signals?.emit) signalTypes.add(block.signals.emit);
    if (block.signals?.receive) signalTypes.add(block.signals.receive);
    if (block.children?.length) {
      for (const child of block.children) {
        collectSignals(child);
      }
    }
  };
  for (const layer of r.schema.layers || []) {
    collectSignals(layer.root);
  }
}

if (signalTypes.size > 0) {
  console.log('Signals Used:');
  for (const sig of Array.from(signalTypes).sort()) {
    console.log(`  - ${sig}`);
  }
  console.log();
}

console.log('='.repeat(80));
console.log(`Report generated: ${new Date().toISOString()}`);
