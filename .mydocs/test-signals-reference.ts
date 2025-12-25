/**
 * Reference Test Code for Signal-Heavy Snippets
 *
 * This is the exact test code used to verify all 5 snippets.
 * Copy this file to run verification at any time.
 *
 * Location: /Users/agutierrez/Desktop/liquidrender/packages/liquid-render/
 * Run: npx tsx test-signals-reference.ts
 */

import { parseUI, roundtripUI } from './src/compiler/compiler';

// 5 Unique Signal-Heavy LiquidCode Snippets
const snippets = [
  // 1. Multi-signal declaration with emitters and receivers
  `@tab @filter @sort
6 :users [
  8 :name >tab=0
  8 :email >filter
  Bt "Sort" >sort=ascending
]
5 :data <tab <filter <sort`,

  // 2. Bidirectional signal binding with computed fields
  `@search @selectedRange
0 [
  In :query <>search
  Rg :range <>selectedRange
  5 :results <search <selectedRange
]`,

  // 3. Signal increment/decrement with receivers
  `@count @total
0 [
  Bt "+" >count++ !click
  Bt "-" >count-- !click
  Kp :value <count
  1 =total+count <count
]`,

  // 4. Nested signals with layer emission
  `@modalState @formData
8 :title >modalState=open [
  6 :fields [
    In :email <>formData
    Bt "Submit" >formData !submit
  ]
]
0 <modalState <formData`,

  // 5. Complex multi-signal with conditional styling
  `@status @priority @threshold
0 [
  1 :health <status #?>=80:green,?<50:red
  Pg :progress <status <priority
  Tx :.label <status <>priority
  Bt "Reset" >status=initial >priority=0
]`
];

console.log('=== LiquidCode Signal-Heavy Roundtrip Tests ===\n');

let passCount = 0;
let failCount = 0;

for (let i = 0; i < snippets.length; i++) {
  const snippet = snippets[i]!;
  console.log(`\n--- Test ${i + 1} ---`);
  console.log(`Input:\n${snippet}\n`);

  try {
    const schema = parseUI(snippet);
    console.log(`Schema generated:`);
    console.log(`  Signals: [${schema.signals.map(s => s.name).join(', ')}]`);
    console.log(`  Layers: ${schema.layers.length}`);

    const { dsl, isEquivalent, differences } = roundtripUI(schema);

    if (isEquivalent) {
      console.log(`✓ PASS - Roundtrip successful`);
      passCount++;
    } else {
      console.log(`✗ FAIL - Roundtrip has differences:`);
      differences.forEach(d => console.log(`    - ${d}`));
      failCount++;
    }

    console.log(`\nGenerated DSL:\n${dsl}`);
  } catch (e) {
    console.log(`✗ FAIL - Error: ${(e as Error).message}`);
    failCount++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Total: ${snippets.length} | Pass: ${passCount} | Fail: ${failCount}`);
console.log(`Success Rate: ${((passCount / snippets.length) * 100).toFixed(1)}%`);

// Export for use in other test suites
export { snippets };
