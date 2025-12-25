import { parseUI } from '../src/compiler/compiler';

const input1 = 'Tl "Help information" [Ic "info"]';
console.log('Input:', input1);
const schema1 = parseUI(input1);
console.log('Parsed:', JSON.stringify(schema1.layers[0]?.root, null, 2));

const input2 = 'Tl :helpText [Bt "?"]';
console.log('\nInput:', input2);
const schema2 = parseUI(input2);
console.log('Parsed:', JSON.stringify(schema2.layers[0]?.root, null, 2));
