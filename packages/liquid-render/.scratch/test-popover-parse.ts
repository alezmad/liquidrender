import { parseUI } from '../src/compiler/compiler';

// Test Tooltip parsing (known working)
console.log('=== TOOLTIP TEST ===');
const tooltipInput = 'Tl [Ic "info"] "Help"';
const tooltipResult = parseUI(tooltipInput);
console.log('Input:', tooltipInput);
console.log('Parsed:', JSON.stringify(tooltipResult.layers[0].root, null, 2));

// Test Popover parsing
console.log('\n=== POPOVER TEST ===');
const popoverInput = 'Pp [Bt "Info"] [Tx "Details"]';
const popoverResult = parseUI(popoverInput);
console.log('Input:', popoverInput);
console.log('Parsed:', JSON.stringify(popoverResult.layers[0].root, null, 2));

// Test simpler popover
console.log('\n=== SIMPLE POPOVER TEST ===');
const simpleInput = 'Pp [Bt "Info"]';
const simpleResult = parseUI(simpleInput);
console.log('Input:', simpleInput);
console.log('Parsed:', JSON.stringify(simpleResult.layers[0].root, null, 2));
