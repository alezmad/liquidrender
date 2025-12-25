/**
 * Debug: Check what's being parsed for fidelity modifiers
 */

import { UIScanner } from './src/compiler/ui-scanner';
import { UIParser } from './src/compiler/ui-parser';

const snippet = `
signal: dataReady

[ hero-card
  "Sales Dashboard"
  @src=salesData
  $lo
]
`.trim();

console.log('=== INPUT ===');
console.log(snippet);

console.log('\n=== SCANNER ===');
const scanner = new UIScanner(snippet);
const tokens = scanner.scan();
tokens.forEach((token, i) => {
  console.log(`${i}: ${token.type} = "${token.value}"`);
});

console.log('\n=== PARSER ===');
const parser = new UIParser(tokens);
const ast = parser.parse();
console.log(JSON.stringify(ast, null, 2));
