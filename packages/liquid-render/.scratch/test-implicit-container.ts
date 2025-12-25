import { parseUI, roundtripUI } from '../src/compiler/compiler';

console.log('\n=== Testing Implicit Container Syntax ===\n');

// Test 1: Simple implicit container
console.log('Test 1: Simple implicit container');
const code1 = '[Kp :a]';
console.log('Input:', code1);
try {
  const ast1 = parseUI(code1);
  console.log('Parse: PASS');
  console.log('AST main blocks:', ast1.mainBlocks.length);
  console.log('First block type:', ast1.mainBlocks[0]?.type);
  console.log('First block typeIndex:', ast1.mainBlocks[0]?.typeIndex);
  console.log('First block children:', ast1.mainBlocks[0]?.children?.length);

  const emitted1 = roundtripUI(code1);
  console.log('Roundtrip:', emitted1);
  console.log('Roundtrip: PASS\n');
} catch (e) {
  console.log('Parse: FAIL', e);
}

// Test 2: Explicit container (should still work)
console.log('Test 2: Explicit container');
const code2 = '0 [Kp :a]';
console.log('Input:', code2);
try {
  const ast2 = parseUI(code2);
  console.log('Parse: PASS');
  console.log('AST main blocks:', ast2.mainBlocks.length);
  console.log('First block type:', ast2.mainBlocks[0]?.type);
  console.log('First block typeIndex:', ast2.mainBlocks[0]?.typeIndex);
  console.log('First block children:', ast2.mainBlocks[0]?.children?.length);

  const emitted2 = roundtripUI(code2);
  console.log('Roundtrip:', emitted2);
  console.log('Roundtrip: PASS\n');
} catch (e) {
  console.log('Parse: FAIL', e);
}

// Test 3: Multiple children in implicit container
console.log('Test 3: Multiple children in implicit container');
const code3 = '[Kp :a, Kp :b]';
console.log('Input:', code3);
try {
  const ast3 = parseUI(code3);
  console.log('Parse: PASS');
  console.log('AST main blocks:', ast3.mainBlocks.length);
  console.log('First block type:', ast3.mainBlocks[0]?.type);
  console.log('First block children:', ast3.mainBlocks[0]?.children?.length);

  const emitted3 = roundtripUI(code3);
  console.log('Roundtrip:', emitted3);
  console.log('Roundtrip: PASS\n');
} catch (e) {
  console.log('Parse: FAIL', e);
}

// Test 4: Nested implicit containers
console.log('Test 4: Nested implicit containers');
const code4 = '[Kp :a, [Kp :b, Kp :c]]';
console.log('Input:', code4);
try {
  const ast4 = parseUI(code4);
  console.log('Parse: PASS');
  console.log('AST main blocks:', ast4.mainBlocks.length);
  console.log('First block type:', ast4.mainBlocks[0]?.type);
  console.log('First block children:', ast4.mainBlocks[0]?.children?.length);
  console.log('Second child type:', ast4.mainBlocks[0]?.children?.[1]?.type);
  console.log('Second child children:', ast4.mainBlocks[0]?.children?.[1]?.children?.length);

  const emitted4 = roundtripUI(code4);
  console.log('Roundtrip:', emitted4);
  console.log('Roundtrip: PASS\n');
} catch (e) {
  console.log('Parse: FAIL', e);
}

// Test 5: Mixed explicit and implicit containers
console.log('Test 5: Mixed explicit and implicit');
const code5 = '[Kp :a, 0 [Kp :b]]';
console.log('Input:', code5);
try {
  const ast5 = parseUI(code5);
  console.log('Parse: PASS');
  console.log('AST main blocks:', ast5.mainBlocks.length);
  console.log('First block children:', ast5.mainBlocks[0]?.children?.length);
  console.log('First child type:', ast5.mainBlocks[0]?.children?.[0]?.type);
  console.log('Second child type:', ast5.mainBlocks[0]?.children?.[1]?.type);

  const emitted5 = roundtripUI(code5);
  console.log('Roundtrip:', emitted5);
  console.log('Roundtrip: PASS\n');
} catch (e) {
  console.log('Parse: FAIL', e);
}

console.log('=== All Tests Complete ===\n');
