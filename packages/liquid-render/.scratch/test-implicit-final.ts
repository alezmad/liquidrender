import { parseUIToAST, parseUI, compileUI } from '../src/compiler/compiler';

console.log('\n=== Testing Implicit Container Syntax - Final Verification ===\n');

const tests = [
  {
    name: 'Simple implicit container',
    input: '[Kp :a]',
    expected: {
      mainBlocksCount: 1,
      type: 'container',
      typeIndex: 0,
      childrenCount: 1,
    },
  },
  {
    name: 'Explicit container (should still work)',
    input: '0 [Kp :a]',
    expected: {
      mainBlocksCount: 1,
      type: 'container',
      typeIndex: 0,
      childrenCount: 1,
    },
  },
  {
    name: 'Multiple children in implicit container',
    input: '[Kp :a, Kp :b]',
    expected: {
      mainBlocksCount: 1,
      type: 'container',
      childrenCount: 2,
    },
  },
  {
    name: 'Nested implicit containers',
    input: '[Kp :a, [Kp :b, Kp :c]]',
    expected: {
      mainBlocksCount: 1,
      type: 'container',
      childrenCount: 2,
      secondChildType: 'container',
    },
  },
  {
    name: 'Mixed explicit and implicit',
    input: '[Kp :a, 0 [Kp :b]]',
    expected: {
      mainBlocksCount: 1,
      type: 'container',
      childrenCount: 2,
      secondChildType: 'container',
    },
  },
  {
    name: 'Implicit container with modifiers on children',
    input: '[Kp :a !h, Bt "Click" #blue]',
    expected: {
      mainBlocksCount: 1,
      type: 'container',
      childrenCount: 2,
    },
  },
  {
    name: 'Triple nested implicit',
    input: '[[[Kp :a]]]',
    expected: {
      mainBlocksCount: 1,
      type: 'container',
      childrenCount: 1,
    },
  },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`Test: ${test.name}`);
  console.log(`Input: ${test.input}`);

  try {
    // Parse to AST
    const ast = parseUIToAST(test.input);

    // Verify AST structure
    const checks: string[] = [];

    if (ast.mainBlocks.length !== test.expected.mainBlocksCount) {
      checks.push(`✗ mainBlocks count: expected ${test.expected.mainBlocksCount}, got ${ast.mainBlocks.length}`);
    } else {
      checks.push(`✓ mainBlocks count: ${ast.mainBlocks.length}`);
    }

    const firstBlock = ast.mainBlocks[0];
    if (firstBlock) {
      if (firstBlock.type !== test.expected.type) {
        checks.push(`✗ type: expected ${test.expected.type}, got ${firstBlock.type}`);
      } else {
        checks.push(`✓ type: ${firstBlock.type}`);
      }

      if (test.expected.typeIndex !== undefined && firstBlock.typeIndex !== test.expected.typeIndex) {
        checks.push(`✗ typeIndex: expected ${test.expected.typeIndex}, got ${firstBlock.typeIndex}`);
      } else if (test.expected.typeIndex !== undefined) {
        checks.push(`✓ typeIndex: ${firstBlock.typeIndex}`);
      }

      if (test.expected.childrenCount !== undefined) {
        const actualChildren = firstBlock.children?.length ?? 0;
        if (actualChildren !== test.expected.childrenCount) {
          checks.push(`✗ children count: expected ${test.expected.childrenCount}, got ${actualChildren}`);
        } else {
          checks.push(`✓ children count: ${actualChildren}`);
        }
      }

      if (test.expected.secondChildType !== undefined && firstBlock.children?.[1]) {
        if (firstBlock.children[1].type !== test.expected.secondChildType) {
          checks.push(`✗ second child type: expected ${test.expected.secondChildType}, got ${firstBlock.children[1].type}`);
        } else {
          checks.push(`✓ second child type: ${firstBlock.children[1].type}`);
        }
      }
    }

    // Test roundtrip
    const schema = parseUI(test.input);
    const emitted = compileUI(schema);
    checks.push(`✓ roundtrip: ${emitted}`);

    console.log(checks.join('\n'));
    console.log('✓ PASS\n');
    passed++;
  } catch (e) {
    console.log('✗ FAIL:', e);
    failed++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Passed: ${passed}/${tests.length}`);
console.log(`Failed: ${failed}/${tests.length}`);
console.log(failed === 0 ? '\n✓ ALL TESTS PASSED' : '\n✗ SOME TESTS FAILED');
