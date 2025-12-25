import { parseUI } from '../src/compiler/compiler';

// Test various syntaxes
const tests = [
  'Pp [Bt "Info"] "Details"',  // Like tooltip
  'Pp [Bt "Info", Tx "Details"]',  // Both as children
  'Pp {Bt "Info", Tx "Details"}',  // Container as child
  'Pp [Bt "Info"] {Tx "Details"}',  // Mix
];

tests.forEach(input => {
  console.log('='.repeat(60));
  console.log('Input:', input);
  try {
    const result = parseUI(input);
    console.log('Parsed:', JSON.stringify(result.layers[0].root, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
  console.log('');
});
