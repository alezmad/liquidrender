import { parseUI, roundtripUI } from './src/compiler/compiler';

// 5 Unique Realtime Monitor Snippets
const snippets = [
  // 1. WebSocket live price ticker with conditional color (green >= 1000, red < 1000)
  'Kp :price "BTC Live" #?>=1000:green,<1000:red ~ws://api.crypto.com/btc',

  // 2. SSE event stream with table, polling every 10 seconds
  'Tb :events "Audit Log" ~sse://logs.example.com/stream, Kp :count "Events Received" ~10s',

  // 3. System metrics dashboard with multiple polling intervals
  '/0 [\n  Kp :cpu "CPU %" #?>=80:red,50-79:yellow,<50:green ~5s\n  Kp :memory "Memory %" #?>=90:red,70-89:yellow,<70:green ~5s\n  Kp :disk "Disk %" #?>=95:red,80-94:yellow,<80:green ~5s\n]',

  // 4. WebSocket network traffic monitor with status indicator
  'Ln :bandwidth "Network Traffic" #?>=500:red,100-499:orange,<100:green ~ws://network.example.com/metrics',

  // 5. SSE order stream with conditional styling and default polling
  'Br :orders "Live Orders" #?>=10:green,5-9:yellow,<5:gray ~sse://orders.example.com/stream, Tx :lastUpdate "Updated" %sm #gray ~1m'
];

console.log('='.repeat(80));
console.log('LiquidCode Realtime Monitor Verification Suite');
console.log('='.repeat(80));
console.log();

let passCount = 0;
let failCount = 0;

for (let i = 0; i < snippets.length; i++) {
  const snippet = snippets[i];
  const snippetNum = i + 1;

  console.log(`[Snippet ${snippetNum}] Testing realtime monitor:`, snippet.substring(0, 60) + (snippet.length > 60 ? '...' : ''));
  console.log('-'.repeat(80));

  try {
    // Step 1: Parse
    const schema = parseUI(snippet);
    console.log('✓ parseUI() successful');
    console.log(`  Layers: ${schema.layers.length}, Signals: ${schema.signals.length}`);

    // Step 2: Roundtrip
    const { dsl, isEquivalent, differences } = roundtripUI(schema);

    if (isEquivalent) {
      console.log('✓ roundtripUI() successful - PASS');
      passCount++;
    } else {
      console.log('✗ roundtripUI() - NOT EQUIVALENT - FAIL');
      console.log('  Differences:');
      differences.forEach(diff => console.log('    -', diff));
      failCount++;
    }

    // Show compiled DSL for inspection
    console.log('  Compiled DSL:');
    dsl.split('\n').forEach(line => console.log('    |', line));

  } catch (e) {
    console.log('✗ ERROR - FAIL');
    console.log('  Error:', (e as Error).message);
    failCount++;
  }

  console.log();
}

console.log('='.repeat(80));
console.log(`Summary: ${passCount} PASS, ${failCount} FAIL (Total: ${snippets.length})`);
console.log('='.repeat(80));
