import { parseUIToAST, parseUI, compileUI } from '../src/compiler/compiler';

console.log('\n=== Testing Implicit Container Syntax ===\n');

// Test 1: Simple implicit container
console.log('Test 1: Simple implicit container');
const code1 = '[Kp :a]';
console.log('Input:', code1);
try {
  const ast1 = parseUIToAST(code1);
  console.log('Parse: PASS');
  console.log('Main blocks count:', ast1.mainBlocks.length);
  console.log('First block type:', ast1.mainBlocks[0]?.type);
  console.log('First block typeIndex:', ast1.mainBlocks[0]?.typeIndex);
  console.log('First block children:', ast1.mainBlocks[0]?.children?.length);

  // Test roundtrip
  const schema1 = parseUI(code1);
  const emitted1 = compileUI(schema1);
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
  const ast2 = parseUIToAST(code2);
  console.log('Parse: PASS');
  console.log('Main blocks count:', ast2.mainBlocks.length);
  console.log('First block type:', ast2.mainBlocks[0]?.type);
  console.log('First block typeIndex:', ast2.mainBlocks[0]?.typeIndex);
  console.log('First block children:', ast2.mainBlocks[0]?.children?.length);

  // Test roundtrip
  const schema2 = parseUI(code2);
  const emitted2 = compileUI(schema2);
  console.log('Roundtrip:', emitted2);
  console.log('Roundtrip: PASS\n');
} catch (e) {
  console.log('Parse: FAIL', e);
}

// Test 3: Nested implicit containers
console.log('Test 3: Nested implicit containers');
const code3 = '[Kp :a, [Kp :b, Kp :c]]';
console.log('Input:', code3);
try {
  const ast3 = parseUIToAST(code3);
  console.log('Parse: PASS');
  console.log('Main blocks count:', ast3.mainBlocks.length);
  console.log('First block type:', ast3.mainBlocks[0]?.type);
  console.log('First block children:', ast3.mainBlocks[0]?.children?.length);
  console.log('Second child type:', ast3.mainBlocks[0]?.children?.[1]?.type);

  // Test roundtrip
  const schema3 = parseUI(code3);
  const emitted3 = compileUI(schema3);
  console.log('Roundtrip:', emitted3);
  console.log('Roundtrip: PASS\n');
} catch (e) {
  console.log('Parse: FAIL', e);
}

console.log('=== All Tests Complete ===\n');
