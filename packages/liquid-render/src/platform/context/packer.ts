// Context Packer - Deterministic context selection
// ============================================================================
// Minimal, testable, no LLM in the loop
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface ContextIndex {
  version: number;
  domains: Record<string, DomainEntry>;
  vocabulary: Record<string, VocabTarget>;
  adjacency: Record<string, string[]>;  // assetId → connected assetIds
}

export interface DomainEntry {
  assets: string[];
  metrics: string[];
  dimensions: string[];
  signals: {
    hasTemporal: boolean;
    hasCurrency: boolean;
    rowCountTier: 'small' | 'medium' | 'large';
  };
  slicePath: string;
}

export interface VocabTarget {
  type: 'metric' | 'dimension' | 'asset';
  id: string;
  domain: string;
}

export interface ContextSlice {
  domain: string;
  assets: SliceAsset[];
  columns: SliceColumn[];
  relationships: SliceRelationship[];
  metrics: SliceMetric[];
  dimensions: SliceDimension[];
  tokenCount: number;
}

export interface SliceAsset {
  id: string;
  name: string;
  description?: string;
}

export interface SliceColumn {
  id: string;
  assetId: string;
  name: string;
  role: 'identifier' | 'foreign_key' | 'metric' | 'dimension' | 'temporal' | 'text';
  samples?: unknown[];
  stats?: { distinct: number; nullRate: number };
}

export interface SliceRelationship {
  from: string;
  to: string;
  type: string;
}

export interface SliceMetric {
  id: string;
  name: string;
  expression: string;
}

export interface SliceDimension {
  id: string;
  name: string;
  values?: string[];
}

export interface ContextPack {
  assets: SliceAsset[];
  columns: SliceColumn[];
  relationships: SliceRelationship[];
  metrics: SliceMetric[];
  dimensions: SliceDimension[];
  tokenCount: number;
  trace: PackTrace;
}

export interface PackTrace {
  query: string;
  matchedTerms: string[];
  domainsScored: Record<string, number>;
  slicesLoaded: string[];
  columnsIncluded: number;
  columnsPruned: number;
  budget: number;
}

export interface PackerConfig {
  tokenBudget: number;
  maxSlices: number;
  includeRoles: string[];
  includeSamples: boolean;
  includeStats: boolean;
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: PackerConfig = {
  tokenBudget: 1200,
  maxSlices: 3,
  includeRoles: ['metric', 'dimension', 'temporal', 'identifier', 'foreign_key'],
  includeSamples: false,
  includeStats: false,
};

// ============================================================================
// Scorer (pure function)
// ============================================================================

interface ScoredDomain {
  domain: string;
  score: number;
  matchedTerms: string[];
}

function scoreQuery(
  query: string,
  index: ContextIndex
): ScoredDomain[] {
  const tokens = tokenize(query);
  const scores: Record<string, { score: number; terms: string[] }> = {};

  // Initialize all domains
  for (const domain of Object.keys(index.domains)) {
    scores[domain] = { score: 0, terms: [] };
  }

  // Match against vocabulary
  for (const token of tokens) {
    const target = index.vocabulary[token];
    if (target) {
      scores[target.domain].score += 10;  // Exact vocab match
      scores[target.domain].terms.push(token);
    }
  }

  // Match against domain names, assets, metrics, dimensions
  for (const [domain, entry] of Object.entries(index.domains)) {
    for (const token of tokens) {
      if (domain.toLowerCase().includes(token)) {
        scores[domain].score += 5;
        scores[domain].terms.push(token);
      }
      for (const asset of entry.assets) {
        if (asset.toLowerCase().includes(token)) {
          scores[domain].score += 3;
          scores[domain].terms.push(token);
        }
      }
      for (const metric of entry.metrics) {
        if (metric.toLowerCase().includes(token)) {
          scores[domain].score += 8;
          scores[domain].terms.push(token);
        }
      }
      for (const dimension of entry.dimensions) {
        if (dimension.toLowerCase().includes(token)) {
          scores[domain].score += 6;
          scores[domain].terms.push(token);
        }
      }
    }
  }

  return Object.entries(scores)
    .map(([domain, { score, terms }]) => ({
      domain,
      score,
      matchedTerms: [...new Set(terms)],
    }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score);
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// ============================================================================
// Packer (prune + assemble)
// ============================================================================

export function pack(
  query: string,
  index: ContextIndex,
  loadSlice: (path: string) => ContextSlice,
  config: Partial<PackerConfig> = {}
): ContextPack {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 1. Score domains
  const scored = scoreQuery(query, index);
  const domainsScored: Record<string, number> = {};
  for (const s of scored) {
    domainsScored[s.domain] = s.score;
  }

  // 2. Select top-N domains
  const topDomains = scored.slice(0, cfg.maxSlices);
  if (topDomains.length === 0) {
    // Fallback: load first domain
    const firstDomain = Object.keys(index.domains)[0];
    if (firstDomain) {
      topDomains.push({ domain: firstDomain, score: 0, matchedTerms: [] });
    }
  }

  // 3. Load slices
  const slices: ContextSlice[] = [];
  const slicesLoaded: string[] = [];
  for (const { domain } of topDomains) {
    const entry = index.domains[domain];
    if (entry?.slicePath) {
      slices.push(loadSlice(entry.slicePath));
      slicesLoaded.push(domain);
    }
  }

  // 4. Merge slices
  const merged = mergeSlices(slices);

  // 5. Add join paths if needed
  const connectedAssets = addJoinPaths(merged, index.adjacency);

  // 6. Prune to budget
  const pruned = pruneToTokenBudget(connectedAssets, cfg);

  // 7. Build trace
  const trace: PackTrace = {
    query,
    matchedTerms: topDomains.flatMap(d => d.matchedTerms),
    domainsScored,
    slicesLoaded,
    columnsIncluded: pruned.columns.length,
    columnsPruned: connectedAssets.columns.length - pruned.columns.length,
    budget: cfg.tokenBudget,
  };

  return { ...pruned, trace };
}

// ============================================================================
// Helpers
// ============================================================================

function mergeSlices(slices: ContextSlice[]): Omit<ContextPack, 'trace'> {
  const assets: SliceAsset[] = [];
  const columns: SliceColumn[] = [];
  const relationships: SliceRelationship[] = [];
  const metrics: SliceMetric[] = [];
  const dimensions: SliceDimension[] = [];

  const seenAssets = new Set<string>();
  const seenColumns = new Set<string>();
  const seenMetrics = new Set<string>();
  const seenDimensions = new Set<string>();

  for (const slice of slices) {
    for (const a of slice.assets) {
      if (!seenAssets.has(a.id)) {
        assets.push(a);
        seenAssets.add(a.id);
      }
    }
    for (const c of slice.columns) {
      if (!seenColumns.has(c.id)) {
        columns.push(c);
        seenColumns.add(c.id);
      }
    }
    for (const r of slice.relationships) {
      relationships.push(r);
    }
    for (const m of slice.metrics) {
      if (!seenMetrics.has(m.id)) {
        metrics.push(m);
        seenMetrics.add(m.id);
      }
    }
    for (const d of slice.dimensions) {
      if (!seenDimensions.has(d.id)) {
        dimensions.push(d);
        seenDimensions.add(d.id);
      }
    }
  }

  return {
    assets,
    columns,
    relationships,
    metrics,
    dimensions,
    tokenCount: estimateTokens({ assets, columns, relationships, metrics, dimensions }),
  };
}

function addJoinPaths(
  pack: Omit<ContextPack, 'trace'>,
  adjacency: Record<string, string[]>
): Omit<ContextPack, 'trace'> {
  // Find assets that need connection
  const assetIds = new Set(pack.assets.map(a => a.id));

  // For each pair of assets, check if they're connected
  // If not directly connected, we might need intermediate assets
  // For simplicity, we just add direct relationships from adjacency

  const newRelationships = [...pack.relationships];
  for (const assetId of assetIds) {
    const connected = adjacency[assetId] || [];
    for (const targetId of connected) {
      if (assetIds.has(targetId)) {
        const exists = newRelationships.some(
          r => (r.from === assetId && r.to === targetId) ||
               (r.from === targetId && r.to === assetId)
        );
        if (!exists) {
          newRelationships.push({ from: assetId, to: targetId, type: 'inferred' });
        }
      }
    }
  }

  return { ...pack, relationships: newRelationships };
}

function pruneToTokenBudget(
  pack: Omit<ContextPack, 'trace'>,
  config: PackerConfig
): Omit<ContextPack, 'trace'> {
  let current = { ...pack };
  let tokens = estimateTokens(current);

  // Priority 1: Remove samples if over budget
  if (tokens > config.tokenBudget && !config.includeSamples) {
    current.columns = current.columns.map(c => ({ ...c, samples: undefined }));
    tokens = estimateTokens(current);
  }

  // Priority 2: Remove stats if over budget
  if (tokens > config.tokenBudget && !config.includeStats) {
    current.columns = current.columns.map(c => ({ ...c, stats: undefined }));
    tokens = estimateTokens(current);
  }

  // Priority 3: Keep only essential roles
  if (tokens > config.tokenBudget) {
    current.columns = current.columns.filter(c =>
      config.includeRoles.includes(c.role)
    );
    tokens = estimateTokens(current);
  }

  // Priority 4: Drop dimension values
  if (tokens > config.tokenBudget) {
    current.dimensions = current.dimensions.map(d => ({ ...d, values: undefined }));
    tokens = estimateTokens(current);
  }

  // Priority 5: Limit columns per asset
  if (tokens > config.tokenBudget) {
    const maxPerAsset = 5;
    const byAsset: Record<string, SliceColumn[]> = {};
    for (const col of current.columns) {
      byAsset[col.assetId] = byAsset[col.assetId] || [];
      byAsset[col.assetId].push(col);
    }
    current.columns = Object.values(byAsset).flatMap(cols =>
      cols.slice(0, maxPerAsset)
    );
    tokens = estimateTokens(current);
  }

  current.tokenCount = tokens;
  return current;
}

function estimateTokens(pack: Omit<ContextPack, 'trace' | 'tokenCount'> & { tokenCount?: number }): number {
  // Rough estimation: ~4 chars per token
  let chars = 0;
  chars += JSON.stringify(pack.assets).length;
  chars += JSON.stringify(pack.columns).length;
  chars += JSON.stringify(pack.relationships).length;
  chars += JSON.stringify(pack.metrics).length;
  chars += JSON.stringify(pack.dimensions).length;
  return Math.ceil(chars / 4);
}

// ============================================================================
// Format for LLM
// ============================================================================

export function formatForLLM(pack: ContextPack): string {
  const lines: string[] = [];

  lines.push('# Available Data\n');

  // Metrics
  if (pack.metrics.length > 0) {
    lines.push('## Metrics');
    for (const m of pack.metrics) {
      lines.push(`- ${m.name}: ${m.expression}`);
    }
    lines.push('');
  }

  // Dimensions
  if (pack.dimensions.length > 0) {
    lines.push('## Dimensions');
    for (const d of pack.dimensions) {
      const values = d.values ? ` [${d.values.slice(0, 5).join(', ')}]` : '';
      lines.push(`- ${d.name}${values}`);
    }
    lines.push('');
  }

  // Assets
  if (pack.assets.length > 0) {
    lines.push('## Tables');
    for (const a of pack.assets) {
      const cols = pack.columns.filter(c => c.assetId === a.id);
      const colNames = cols.map(c => `${c.name}(${c.role})`).join(', ');
      lines.push(`- ${a.name}: ${colNames}`);
    }
    lines.push('');
  }

  // Relationships
  if (pack.relationships.length > 0) {
    lines.push('## Joins');
    for (const r of pack.relationships) {
      lines.push(`- ${r.from} → ${r.to}`);
    }
  }

  return lines.join('\n');
}
