import { parseUI } from '../src/compiler/compiler';

const input = 'Pp [Bt "Actions", Ct row [Bt "Edit", Bt "Delete"]]';
const result = parseUI(input);
console.log(JSON.stringify(result.layers[0].root, null, 2));
