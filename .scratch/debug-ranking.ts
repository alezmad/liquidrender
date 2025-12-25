// Debug ranking sample
import { compile, parse, roundtrip } from '../packages/liquid-render/src/compiler';
import type { GraphSurvey } from '../packages/liquid-render/src/types';

const rankingSample: GraphSurvey = {
  id: 'tcs-12-ranking',
  title: 'Priority Ranking',
  description: 'Drag and drop ranking',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Rank Priorities', message: 'Order by importance' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Rank these features by importance',
        type: 'ranking',
        required: true,
        rankingItems: [
          { id: 'r1', label: 'Speed', value: 'speed' },
          { id: 'r2', label: 'Reliability', value: 'reliability' },
          { id: 'r3', label: 'Price', value: 'price' },
          { id: 'r4', label: 'Support', value: 'support' },
        ],
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Ranked', message: 'Thank you for your priorities' },
      next: [],
    },
  },
};

console.log('Original survey:');
console.log(JSON.stringify(rankingSample.nodes.q1.content, null, 2));

// Step 1: Compile to DSL
console.log('\n--- Compiling to DSL ---');
const dsl = compile(rankingSample, 'liquidsurvey');
console.log('DSL output:');
console.log(dsl);

// Step 2: Parse back to GraphSurvey
console.log('\n--- Parsing DSL ---');
const parsedSurvey = parse(dsl as string);
console.log('Parsed nodes count:', Object.keys(parsedSurvey.nodes).length);
console.log('Parsed q1 content:');
console.log(JSON.stringify(parsedSurvey.nodes?.q1?.content, null, 2));

// Step 3: Roundtrip
console.log('\n--- Roundtrip ---');
const result = roundtrip(rankingSample);
console.log('Roundtrip passed:', result.isEquivalent);
if (!result.isEquivalent) {
  console.log('Differences:', result.differences);
}
console.log('Reconstructed q1 content:');
console.log(JSON.stringify(result.reconstructed.nodes?.q1?.content, null, 2));
