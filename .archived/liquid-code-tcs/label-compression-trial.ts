/**
 * Label Compression Trial
 *
 * Tests different strategies for compressing repeated labels in LiquidCode
 */

import { readFileSync } from 'fs';

interface Sample {
  id: number;
  category: string;
  name: string;
  jsx: string;
  schema: string;
  liquid: string;
}

// Extract all quoted strings from LiquidCode
function extractLabels(liquid: string): string[] {
  const matches = liquid.match(/"[^"]+"/g) || [];
  return matches.map(m => m.slice(1, -1)); // Remove quotes
}

// Count label frequency across all samples
function countGlobalLabels(samples: Sample[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const sample of samples) {
    const labels = extractLabels(sample.liquid);
    for (const label of labels) {
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }
  return counts;
}

// Count label repetitions within each sample
function countLocalRepetitions(liquid: string): Map<string, number> {
  const labels = extractLabels(liquid);
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return counts;
}

// Strategy A: Global Label Index
function applyGlobalIndex(liquid: string, globalIndex: Map<string, string>): string {
  let result = liquid;
  for (const [label, code] of globalIndex) {
    result = result.replace(new RegExp(`"${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), code);
  }
  return result;
}

// Strategy B: Local Label Deduplication
function applyLocalDedup(liquid: string): string {
  const labels = extractLabels(liquid);
  const seen = new Map<string, number>();
  let result = liquid;
  let index = 1;

  for (const label of labels) {
    if (seen.has(label)) {
      // Replace subsequent occurrences with reference
      const pattern = new RegExp(`"${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
      let count = 0;
      result = result.replace(pattern, () => {
        count++;
        return count === 1 ? `"${label}"` : `$${seen.get(label)}`;
      });
    } else {
      seen.set(label, index++);
    }
  }
  return result;
}

// Strategy C: Hybrid (Global + Local)
function applyHybrid(liquid: string, globalIndex: Map<string, string>): string {
  // First apply global
  let result = applyGlobalIndex(liquid, globalIndex);
  // Then apply local for remaining duplicates
  result = applyLocalDedup(result);
  return result;
}

// Load samples
const samplesPath = '.mydocs/autodev/output/empirical-samples.jsonl';
const samplesText = readFileSync(samplesPath, 'utf-8');
const samples: Sample[] = samplesText.trim().split('\n').map(line => JSON.parse(line));

console.log('# Label Compression Analysis\n');

// Analyze global label frequency
const globalCounts = countGlobalLabels(samples);
const sortedLabels = [...globalCounts.entries()].sort((a, b) => b[1] - a[1]);

console.log('## §1 Global Label Frequency\n');
console.log('| Rank | Label | Occurrences | Bytes |');
console.log('|------|-------|-------------|-------|');
for (let i = 0; i < Math.min(25, sortedLabels.length); i++) {
  const [label, count] = sortedLabels[i];
  console.log(`| ${i + 1} | "${label}" | ${count} | ${label.length + 2} |`);
}

// Build global index for top labels
const TOP_N = 20;
const globalIndex = new Map<string, string>();
const indexChars = 'scxdearuovntilmpfghkwbjqzy'; // Ordered by frequency intent

for (let i = 0; i < Math.min(TOP_N, sortedLabels.length); i++) {
  globalIndex.set(sortedLabels[i][0], `$${indexChars[i]}`);
}

console.log('\n## §2 Proposed Global Index\n');
console.log('| Code | Label | Savings per use |');
console.log('|------|-------|-----------------|');
for (const [label, code] of globalIndex) {
  const savings = (label.length + 2) - code.length;
  console.log(`| ${code} | "${label}" | ${savings} chars |`);
}

// Calculate compression with each strategy
console.log('\n## §3 Compression Trial Results\n');

let totalOriginal = 0;
let totalGlobalOnly = 0;
let totalLocalOnly = 0;
let totalHybrid = 0;

const trialResults: { id: number; name: string; original: number; global: number; local: number; hybrid: number }[] = [];

for (const sample of samples) {
  const original = sample.liquid.length;
  const withGlobal = applyGlobalIndex(sample.liquid, globalIndex).length;
  const withLocal = applyLocalDedup(sample.liquid).length;
  const withHybrid = applyHybrid(sample.liquid, globalIndex).length;

  totalOriginal += original;
  totalGlobalOnly += withGlobal;
  totalLocalOnly += withLocal;
  totalHybrid += withHybrid;

  trialResults.push({
    id: sample.id,
    name: sample.name,
    original,
    global: withGlobal,
    local: withLocal,
    hybrid: withHybrid
  });
}

console.log('### Per-Sample Results\n');
console.log('| ID | Name | Original | Global | Local | Hybrid | Best Δ |');
console.log('|----|------|----------|--------|-------|--------|--------|');

for (const r of trialResults) {
  const bestDelta = Math.min(r.global, r.local, r.hybrid) - r.original;
  const best = bestDelta < 0 ? `${bestDelta}` : '0';
  console.log(`| ${r.id} | ${r.name.slice(0, 20)} | ${r.original} | ${r.global} | ${r.local} | ${r.hybrid} | ${best} |`);
}

console.log('\n### Aggregate Results\n');
console.log('| Strategy | Total Chars | Δ from Original | Compression |');
console.log('|----------|-------------|-----------------|-------------|');
console.log(`| Original | ${totalOriginal} | - | 1.00x |`);
console.log(`| Global Index | ${totalGlobalOnly} | ${totalGlobalOnly - totalOriginal} | ${(totalOriginal / totalGlobalOnly).toFixed(2)}x |`);
console.log(`| Local Dedup | ${totalLocalOnly} | ${totalLocalOnly - totalOriginal} | ${(totalOriginal / totalLocalOnly).toFixed(2)}x |`);
console.log(`| Hybrid | ${totalHybrid} | ${totalHybrid - totalOriginal} | ${(totalOriginal / totalHybrid).toFixed(2)}x |`);

// Analyze local repetition patterns
console.log('\n## §4 Local Repetition Analysis\n');

let samplesWithRepeats = 0;
let totalRepeatedLabels = 0;
let totalRepeatBytes = 0;

for (const sample of samples) {
  const counts = countLocalRepetitions(sample.liquid);
  let hasRepeats = false;

  for (const [label, count] of counts) {
    if (count > 1) {
      hasRepeats = true;
      totalRepeatedLabels += count - 1; // Extra occurrences
      totalRepeatBytes += (count - 1) * (label.length + 2); // Bytes from repeats
    }
  }

  if (hasRepeats) samplesWithRepeats++;
}

console.log(`- Samples with repeated labels: ${samplesWithRepeats}/${samples.length} (${(samplesWithRepeats/samples.length*100).toFixed(0)}%)`);
console.log(`- Total repeated label instances: ${totalRepeatedLabels}`);
console.log(`- Bytes in repeated labels: ${totalRepeatBytes}`);
console.log(`- Potential savings from local dedup: ${totalRepeatBytes - totalRepeatedLabels * 2} chars`);

// Show examples
console.log('\n## §5 Transformation Examples\n');

const exampleSamples = [
  samples.find(s => s.name === 'Tab Navigation'),
  samples.find(s => s.name === 'Settings Form'),
  samples.find(s => s.name === 'Login Form'),
];

for (const sample of exampleSamples) {
  if (!sample) continue;
  console.log(`### ${sample.name}\n`);
  console.log('**Original:**');
  console.log('```');
  console.log(sample.liquid);
  console.log('```');
  console.log(`(${sample.liquid.length} chars)\n`);

  const withHybrid = applyHybrid(sample.liquid, globalIndex);
  console.log('**With Hybrid Compression:**');
  console.log('```');
  console.log(withHybrid);
  console.log('```');
  console.log(`(${withHybrid.length} chars, ${((1 - withHybrid.length / sample.liquid.length) * 100).toFixed(1)}% smaller)\n`);
}

// Proposed spec addition
console.log('## §6 Proposed Spec Extension\n');
console.log('```');
console.log('§X Label Compression');
console.log('');
console.log('§X.1 Global Label Codes');
console.log('Common labels have single-char codes:');
console.log('');
for (let i = 0; i < 10; i++) {
  const [label, code] = [...globalIndex.entries()][i];
  console.log(`${code} = "${label}"`);
}
console.log('');
console.log('§X.2 Local Label References');
console.log('First quoted string becomes $1, second $2, etc.');
console.log('Subsequent uses of same label use $N reference.');
console.log('');
console.log('Example:');
console.log('Bt "Custom" Bt "Other" Bt $1  # $1 = "Custom"');
console.log('```');

console.log('\n## §7 Recommendation\n');

const hybridImprovement = ((totalOriginal - totalHybrid) / totalOriginal * 100).toFixed(1);
const globalImprovement = ((totalOriginal - totalGlobalOnly) / totalOriginal * 100).toFixed(1);

if (totalHybrid < totalOriginal) {
  console.log(`**Implement Hybrid Strategy**: ${hybridImprovement}% additional compression`);
  console.log('');
  console.log('Benefits:');
  console.log('- Global codes eliminate common label overhead');
  console.log('- Local refs handle domain-specific repeats');
  console.log('- Maintains readability (codes are mnemonic)');
} else if (totalGlobalOnly < totalOriginal) {
  console.log(`**Implement Global Index Only**: ${globalImprovement}% additional compression`);
} else {
  console.log('**No significant improvement** - labels are already efficient in current samples');
}
