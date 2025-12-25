#!/usr/bin/env npx tsx
/**
 * Snippet Verification Script
 * Tests a batch of LiquidCode snippets for roundtrip correctness
 */

import { parseUI, roundtripUI } from '../src/compiler/compiler';

interface SnippetResult {
  snippet: string;
  passed: boolean;
  error?: string;
  differences?: string[];
}

interface BatchResult {
  batch: number;
  domain: string;
  total: number;
  passed: number;
  failed: number;
  results: SnippetResult[];
}

function verifySnippet(snippet: string): SnippetResult {
  try {
    const schema = parseUI(snippet);
    const { isEquivalent, differences } = roundtripUI(schema);
    return {
      snippet,
      passed: isEquivalent,
      differences: isEquivalent ? undefined : differences,
    };
  } catch (error) {
    return {
      snippet,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function verifyBatch(batch: number, domain: string, snippets: string[]): BatchResult {
  const results = snippets.map(verifySnippet);
  const passed = results.filter(r => r.passed).length;
  return {
    batch,
    domain,
    total: snippets.length,
    passed,
    failed: snippets.length - passed,
    results,
  };
}

// Snippet domains for comprehensive coverage
const snippetDomains: Record<string, string[]> = {
  // Domain 1: Analytics Dashboard
  'analytics': [
    'Kp :revenue, Kp :orders, Kp :customers',
    'Kp :revenue !h, Kp :orders !p, Kp :customers !s',
    'Ln :monthly :revenue :orders',
    '@dr Kp :revenue <dr, Ln :trend <dr',
    '0 ^r [Kp :a, Kp :b, Kp :c]',
    'Br :category :sales #blue',
    'Pi :breakdown %lg',
    'Tb :transactions [:date, :customer, :amount]',
    '@tab Bt "Overview" >tab=0, Bt "Details" >tab=1',
    '?@tab=0 0 [Kp :summary]',
    '0 $lo [Kp :quick, Ln :preview]',
    'Kp :live ~5s',
    'Kp :realtime ~ws://api.test.com/stream',
    '0 $skeleton [Tb :loading]',
    'Hm :heatmap $hi',
  ],

  // Domain 2: E-commerce
  'ecommerce': [
    'Cd :product [Im :image, Tx :name, Tx :price]',
    'Tb :cart [:item, :qty, :price, :total]',
    'Fm [In :name, In :email, In :phone]',
    'Bt "Add to Cart" !addToCart >cart',
    '0 [Cd :p1, Cd :p2, Cd :p3]',
    'Ls :items [Cd :item]',
    '@qty Se :quantity >qty',
    'Kp :subtotal <qty, Kp :tax <qty, Kp :total <qty',
    'Bt "Checkout" >/1',
    '/1 Md [Fm :checkout]',
    'Sw :express "Express Shipping"',
    'Rg :quantity 1 10',
    'In :coupon "Coupon Code"',
    'Bt "Apply" !applyCoupon',
    '0 $defer [Tb :recommendations]',
  ],

  // Domain 3: Admin Panel
  'admin': [
    'Tb :users [:name, :email, :role, :status]',
    '@filter In :search >filter',
    'Se :role "Role" >filter',
    'Tb :data <filter [:id, :name, :value]',
    'Bt "Add User" >/1',
    '/1 Md [Fm :newUser [In :name, In :email, Se :role]]',
    'Sw :active "Active"',
    'Ck :admin "Admin Access"',
    'Tb :logs [:time, :action, :user] ~1m',
    'Pg :storage',
    'Gn :cpu, Gn :memory, Gn :disk',
    '@sel Tb :items [:name, :type] <sel',
    'Bt "Delete" !delete <sel',
    'Bt "Edit" >/2 <sel',
    '/2 Dw [Fm :edit]',
  ],

  // Domain 4: Forms & Wizards
  'forms': [
    'Fm [In :firstName, In :lastName]',
    'In :email @email',
    'Ta :description "Description"',
    'Se :country',
    'Dt :birthdate "Birth Date"',
    '@step Bt "Next" >step=1',
    '?@step=0 Fm [In :name, In :email]',
    '?@step=1 Fm [In :address, In :city]',
    '?@step=2 Fm [In :card, In :cvv]',
    'Bt "Submit" !submit',
    'Rg :budget 0 1000',
    'Cl :theme "Theme Color"',
    'Up :documents "Upload Files"',
    'Sw :newsletter "Subscribe"',
    'Rd :plan',
  ],

  // Domain 5: Realtime Monitors
  'monitors': [
    'Kp :status ~5s, Kp :uptime ~5s',
    'Ln :metrics ~ws://api.metrics.com',
    'Tb :events ~sse://events.stream',
    'Gn :cpu ~1s, Gn :memory ~1s',
    'Tg :status #?=up:green,=down:red',
    'Pg :progress ~500ms',
    '@alert Tx :message <alert #red',
    'Tb :logs [:time, :level, :message] ~1m',
    'Kp :requests, Kp :errors, Kp :latency',
    'Sl :trend',
    'Ti :events [:time, :event]',
    '0 $auto [Kp :adaptive]',
    'Hm :serverLoad $hi',
    '0 [Ic :status, Tx :server, Kp :load]',
    'Bt "Restart" !restart',
  ],

  // Domain 6: Mixed UI Patterns
  'mixed': [
    '@mode Bt "Light" >mode=light, Bt "Dark" >mode=dark',
    '?@mode=light 0 #white [Tx "Light Mode"]',
    '?@mode=dark 0 #dark [Tx "Dark Mode"]',
    'Ac [Hd "Section 1" [Tx :content1], Hd "Section 2" [Tx :content2]]',
    'Cr [Im :img1, Im :img2, Im :img3]',
    'St :steps [:s1, :s2, :s3]',
    'Kb :tasks [:todo, :progress, :done]',
    'Ca :events',
    'Mp :locations',
    'Av :user, Tx :name, Tg :role',
    'Rt :rating 5',
    'Tl :info [Tx "More info"]',
    'Pp :menu [Bt "Option 1", Bt "Option 2"]',
    'Sk [Tx "Title", Tx "Subtitle", Tx "Body"]',
    'Gd ^r [Cd :a, Cd :b, Cd :c, Cd :d]',
  ],

  // Domain 7: Complex Nesting
  'nesting': [
    '0 [0 [Kp :a], 0 [Kp :b]]',
    '0 ^r [0 [Kp :x, Kp :y], 0 [Ln :trend]]',
    'Fm [0 [In :a, In :b], 0 [In :c, In :d]]',
    'Cd [Im :img, 0 [Tx :title, Tx :desc], Bt "Action"]',
    'Tb :data [0 [:a, :b], 0 [:c, :d]]',
    'Ac [0 [Tx :s1], 0 [Tx :s2], 0 [Tx :s3]]',
    '0 [Kp :a, 0 [Kp :b, Kp :c], Kp :d]',
    'Ls [Cd [Tx :name, Tx :desc]]',
    '/1 Md [0 [Hd "Title"], 0 [Tx "Content"], 0 [Bt "Close" /<]]',
    '0 $lo [0 [Kp :a], 0 $hi [Ln :b]]',
  ],
};

// Generate all batches
function generateAllBatches(): { domain: string; snippets: string[] }[] {
  const batches: { domain: string; snippets: string[] }[] = [];

  for (const [domain, snippets] of Object.entries(snippetDomains)) {
    // Split into batches of 5
    for (let i = 0; i < snippets.length; i += 5) {
      batches.push({
        domain,
        snippets: snippets.slice(i, i + 5),
      });
    }
  }

  return batches;
}

// Main execution
const args = process.argv.slice(2);
const batchNum = args[0] ? parseInt(args[0], 10) : undefined;

const allBatches = generateAllBatches();

if (batchNum !== undefined) {
  // Run specific batch
  const batch = allBatches[batchNum];
  if (!batch) {
    console.error(`Batch ${batchNum} not found. Total batches: ${allBatches.length}`);
    process.exit(1);
  }
  const result = verifyBatch(batchNum, batch.domain, batch.snippets);
  console.log(JSON.stringify(result, null, 2));
} else {
  // Run all batches
  console.log(`Running ${allBatches.length} batches with ${allBatches.reduce((a, b) => a + b.snippets.length, 0)} total snippets...\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  const failures: { batch: number; domain: string; snippet: string; error?: string; differences?: string[] }[] = [];

  for (let i = 0; i < allBatches.length; i++) {
    const batch = allBatches[i]!;
    const result = verifyBatch(i, batch.domain, batch.snippets);
    totalPassed += result.passed;
    totalFailed += result.failed;

    for (const r of result.results) {
      if (!r.passed) {
        failures.push({ batch: i, domain: batch.domain, snippet: r.snippet, error: r.error, differences: r.differences });
      }
    }

    console.log(`Batch ${i} (${batch.domain}): ${result.passed}/${result.total} passed`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
  console.log(`Pass rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log(`\nFAILURES:`);
    for (const f of failures) {
      console.log(`  [${f.domain}] "${f.snippet}"`);
      if (f.error) console.log(`    Error: ${f.error}`);
      if (f.differences) console.log(`    Diff: ${f.differences.join(', ')}`);
    }
  }
}
