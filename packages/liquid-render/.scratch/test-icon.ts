import { parseUI } from '../src/compiler/compiler';

const input = 'Pp [Ic "info-circle", Tx "Info"]';
const result = parseUI(input);
console.log(JSON.stringify(result.layers[0].root, null, 2));
