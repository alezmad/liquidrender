/**
 * Test Suite: 5 Unique LiquidCode Snippets for STREAMING MODIFIERS
 *
 * Tests parsing and roundtrip verification for:
 * - Interval polling (~5s, ~1m, ~30s)
 * - WebSocket (~ws://url)
 * - SSE (~sse://url)
 * - Combined with other modifiers
 */

import { parseUI, roundtripUI, type LiquidSchema } from '../packages/liquid-render/src/compiler/compiler';

// ============================================================================
// Test Snippets
// ============================================================================

const testSnippets = [
  {
    id: 'STREAM-001',
    name: 'Interval Polling (~5s) with KPI',
    source: '1 :stockPrice ~5s',
    description: 'Real-time stock price updated every 5 seconds',
    expectedStreamType: 'interval',
    expectedInterval: 5000,
  },
  {
    id: 'STREAM-002',
    name: 'Interval Polling (~1m) with Chart + Signal Receive',
    source: '@market 3 :date :volume ~1m <market',
    description: 'Volume chart updating every minute, receiving market signal',
    expectedStreamType: 'interval',
    expectedInterval: 60000,
  },
  {
    id: 'STREAM-003',
    name: 'WebSocket (~ws://url) with Priority + Fidelity',
    source: 'Kp :liveCount ~ws://api.example.com/live !h $auto',
    description: 'Live counter via WebSocket with high priority and auto fidelity',
    expectedStreamType: 'ws',
    expectedStreamUrl: 'ws://api.example.com/live',
  },
  {
    id: 'STREAM-004',
    name: 'SSE (~sse://url) with Table + Emit Signal',
    source: 'Tb :events ~sse://api.example.com/stream [:timestamp :event_type :data] >refresh',
    description: 'Event table streaming via SSE with refresh signal',
    expectedStreamType: 'sse',
    expectedStreamUrl: 'sse://api.example.com/stream',
  },
  {
    id: 'STREAM-005',
    name: 'Interval (~30s) with Layout Modifiers + Conditional',
    source: '@tab ?@tab=1 [Br :category :sales ~30s !p *2] ?@tab=2 [Ln :month :growth ~1m !h ^g]',
    description: 'Tabbed dashboard with streaming charts at different intervals and layouts',
    expectedStreamType: 'interval',
    expectedInterval: 30000,
  },
];

// ============================================================================
// Test Runner
// ============================================================================

interface TestResult {
  id: string;
  name: string;
  parsePass: boolean;
  parseError?: string;
  roundtripPass: boolean;
  roundtripError?: string;
  streamConfig?: {
    type: string;
    url?: string;
    interval?: number;
  };
  differences?: string[];
}

const results: TestResult[] = [];

console.log('='.repeat(80));
console.log('STREAMING MODIFIERS TEST SUITE');
console.log('='.repeat(80));
console.log();

for (const snippet of testSnippets) {
  console.log(`[${snippet.id}] ${snippet.name}`);
  console.log(`Description: ${snippet.description}`);
  console.log(`Source: ${snippet.source}`);
  console.log('-'.repeat(80));

  const result: TestResult = {
    id: snippet.id,
    name: snippet.name,
    parsePass: false,
    roundtripPass: false,
  };

  // Step 1: Parse
  let schema: LiquidSchema | undefined;
  try {
    schema = parseUI(snippet.source);
    result.parsePass = true;
    console.log('✓ PARSE: Success');

    // Extract stream config for verification
    const root = schema.layers[0]?.root;
    if (root?.stream) {
      result.streamConfig = {
        type: root.stream.type,
        url: root.stream.url,
        interval: root.stream.interval,
      };
      console.log(`  Stream Type: ${root.stream.type}`);
      if (root.stream.url) {
        console.log(`  Stream URL: ${root.stream.url}`);
      }
      if (root.stream.interval !== undefined) {
        console.log(`  Interval: ${root.stream.interval}ms`);
      }
    }
  } catch (error) {
    result.parsePass = false;
    result.parseError = error instanceof Error ? error.message : String(error);
    console.log(`✗ PARSE: Failed - ${result.parseError}`);
  }

  // Step 2: Roundtrip (only if parse succeeded)
  if (schema) {
    try {
      const roundtripResult = roundtripUI(schema);
      result.roundtripPass = roundtripResult.isEquivalent;
      result.differences = roundtripResult.differences;

      if (roundtripResult.isEquivalent) {
        console.log('✓ ROUNDTRIP: Equivalent (PASS)');
      } else {
        console.log('✗ ROUNDTRIP: Not equivalent (FAIL)');
        console.log('  Differences:');
        roundtripResult.differences.forEach(diff => {
          console.log(`    - ${diff}`);
        });
      }

      console.log(`\n  Reconstructed DSL:\n  ${roundtripResult.dsl}`);
    } catch (error) {
      result.roundtripPass = false;
      result.roundtripError = error instanceof Error ? error.message : String(error);
      console.log(`✗ ROUNDTRIP: Failed - ${result.roundtripError}`);
    }
  }

  results.push(result);
  console.log();
}

// ============================================================================
// Summary Report
// ============================================================================

console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log();

const parsePassCount = results.filter(r => r.parsePass).length;
const roundtripPassCount = results.filter(r => r.roundtripPass).length;
const totalTests = results.length;

console.log('Parse Results:');
console.log(`  PASS: ${parsePassCount}/${totalTests}`);
console.log(`  FAIL: ${totalTests - parsePassCount}/${totalTests}`);
console.log();

console.log('Roundtrip Results:');
console.log(`  PASS: ${roundtripPassCount}/${totalTests}`);
console.log(`  FAIL: ${totalTests - roundtripPassCount}/${totalTests}`);
console.log();

console.log('Detailed Results Table:');
console.log('');
console.log(
  [
    'ID',
    'Name',
    'Parse',
    'Roundtrip',
    'Stream Type',
  ]
    .map(h => h.padEnd(20))
    .join('|')
);
console.log('-'.repeat(120));

results.forEach(r => {
  const parseStatus = r.parsePass ? '✓ PASS' : '✗ FAIL';
  const roundtripStatus = r.roundtripPass ? '✓ PASS' : '✗ FAIL';
  const streamType = r.streamConfig?.type || 'N/A';

  console.log(
    [
      r.id.padEnd(20),
      r.name.substring(0, 20).padEnd(20),
      parseStatus.padEnd(20),
      roundtripStatus.padEnd(20),
      streamType.padEnd(20),
    ].join('|')
  );
});

console.log();
console.log('='.repeat(80));
console.log('OVERALL RESULT');
console.log('='.repeat(80));

if (parsePassCount === totalTests && roundtripPassCount === totalTests) {
  console.log('✓ ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log(`✗ SOME TESTS FAILED - Parse: ${parsePassCount}/${totalTests}, Roundtrip: ${roundtripPassCount}/${totalTests}`);
  process.exit(1);
}
