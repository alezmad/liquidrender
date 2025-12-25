// Debug scanner for values starting with numbers
import { SurveyScanner } from '../packages/liquid-render/src/compiler/scanner';

const testDSL = `[opt_1_to_3:"1-3 years"=1_to_3]`;

const scanner = new SurveyScanner(testDSL);
const tokens = scanner.scan();

console.log('Tokens:');
for (const t of tokens) {
  console.log(`  ${t.type.padEnd(15)} "${t.value}"`);
}
