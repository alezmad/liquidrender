import { parseUI, roundtripUI } from '../src/compiler/ui-compiler';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  scenario: number;
  file: string;
  source: string;
  parseSuccess: boolean;
  parseError?: string;
  schema?: any;
  roundtripSuccess?: boolean;
  roundtripDifferences?: any;
  reconstructedDSL?: string;
}

const scenarios = [1, 2, 3, 4];
const results: TestResult[] = [];

for (const num of scenarios) {
  const filePath = path.join(__dirname, `../test-data/fuzz-campaign/scenarios/analytics-${num}.lc`);
  const source = fs.readFileSync(filePath, 'utf-8');

  console.log(`\n${'='.repeat(80)}`);
  console.log(`SCENARIO ${num}: ${filePath}`);
  console.log('='.repeat(80));
  console.log('\n=== SOURCE ===');
  console.log(source);

  const result: TestResult = {
    scenario: num,
    file: filePath,
    source,
    parseSuccess: false,
  };

  try {
    const schema = parseUI(source);
    result.parseSuccess = true;
    result.schema = schema;

    console.log('\n=== PARSE: SUCCESS ===');
    console.log(JSON.stringify(schema, null, 2));

    try {
      const { dsl, isEquivalent, differences } = roundtripUI(schema);
      result.roundtripSuccess = isEquivalent;

      console.log('\n=== ROUNDTRIP ===');
      console.log('Equivalent:', isEquivalent);

      if (!isEquivalent) {
        result.roundtripDifferences = differences;
        result.reconstructedDSL = dsl;
        console.log('Differences:', differences);
        console.log('\n=== RECONSTRUCTED DSL ===');
        console.log(dsl);
      }
    } catch (e: any) {
      result.roundtripSuccess = false;
      result.parseError = e.message;
      console.log('\n=== ROUNDTRIP: ERROR ===');
      console.log(e.message);
      if (e.stack) {
        console.log(e.stack);
      }
    }
  } catch (e: any) {
    result.parseSuccess = false;
    result.parseError = e.message;
    console.log('\n=== PARSE: ERROR ===');
    console.log(e.message);
    if (e.stack) {
      console.log(e.stack);
    }
  }

  results.push(result);
}

console.log('\n\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total scenarios: ${results.length}`);
console.log(`Parse success: ${results.filter(r => r.parseSuccess).length}`);
console.log(`Parse failures: ${results.filter(r => !r.parseSuccess).length}`);
console.log(`Roundtrip success: ${results.filter(r => r.roundtripSuccess).length}`);
console.log(`Roundtrip failures: ${results.filter(r => r.parseSuccess && !r.roundtripSuccess).length}`);

// Export results for report generation
fs.writeFileSync(
  path.join(__dirname, '../test-data/fuzz-campaign/scenarios/test-results.json'),
  JSON.stringify(results, null, 2)
);

console.log('\nResults saved to test-results.json');
