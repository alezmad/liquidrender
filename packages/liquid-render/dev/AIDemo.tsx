// AI Demo - Clean, functional design
// ============================================================================

import React, { useState, useEffect } from 'react';
import { LiquidUI } from '../src/renderer/LiquidUI';
import {
  createDemoPlatform,
  generateSystemPrompt,
  type LiquidPlatform,
  type GenerationState,
} from '../src/platform';
import { useLiquidAI } from '../src/platform/use-liquid-ai';

// ============================================================================
// Example Queries
// ============================================================================

const exampleQueries = [
  'Show me revenue and orders as KPIs',
  'Dashboard with monthly trends chart',
  'Data table with recent transactions',
  'KPIs in a row with revenue, orders, customers',
  'Bar chart of monthly orders',
  'Pie chart of sales by category',
];

// ============================================================================
// Component
// ============================================================================

interface AIDemoProps {
  apiKey?: string;
}

export function AIDemo({ apiKey }: AIDemoProps) {
  const [query, setQuery] = useState('');
  const [platform] = useState<LiquidPlatform>(() => createDemoPlatform());
  const [showPrompt, setShowPrompt] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');

  const hasApiKey = !!apiKey;

  // Load system prompt
  useEffect(() => {
    platform.catalog.getCatalog().then((catalog) => {
      setSystemPrompt(generateSystemPrompt(catalog, { verbosity: 'standard' }));
    });
  }, [platform]);

  // AI hook
  const ai = useLiquidAI({
    ai: {
      provider: 'anthropic',
      apiKey: apiKey || 'placeholder',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 2048,
      temperature: 0.3,
    },
    platform,
  });

  const handleGenerate = async () => {
    if (!query.trim() || !hasApiKey) return;
    await ai.generate(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const stateLabel: Record<GenerationState, string> = {
    idle: 'Ready',
    generating: 'Generating...',
    resolving: 'Loading data...',
    complete: 'Complete',
    error: 'Error',
  };

  const stateColor: Record<GenerationState, string> = {
    idle: '#9ca3af',
    generating: '#3b82f6',
    resolving: '#8b5cf6',
    complete: '#10b981',
    error: '#ef4444',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Query Input Section */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#111' }}>
            What would you like to see?
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
            Describe the UI in natural language
          </p>
        </div>

        {/* Input Row */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Show me a dashboard with revenue metrics..."
            disabled={!hasApiKey}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontSize: '0.9rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              outline: 'none',
              background: hasApiKey ? '#fff' : '#f9fafb',
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={!hasApiKey || !query.trim() || ai.isGenerating}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 500,
              background: hasApiKey && query.trim() && !ai.isGenerating ? '#111' : '#e5e7eb',
              color: hasApiKey && query.trim() && !ai.isGenerating ? '#fff' : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              cursor: hasApiKey && query.trim() && !ai.isGenerating ? 'pointer' : 'not-allowed',
            }}
          >
            {ai.isGenerating ? 'Generating...' : 'Generate'}
          </button>
          {ai.isGenerating && (
            <button
              onClick={ai.cancel}
              style={{
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                background: '#fff',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Example Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', paddingTop: '0.25rem' }}>
            Try:
          </span>
          {exampleQueries.map((example) => (
            <button
              key={example}
              onClick={() => setQuery(example)}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                background: '#f9fafb',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '100px',
                cursor: 'pointer',
              }}
            >
              {example}
            </button>
          ))}
        </div>

        {/* API Key Warning */}
        {!hasApiKey && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: '#92400e',
          }}>
            Enter your Anthropic API key in the header to enable generation.
          </div>
        )}
      </div>

      {/* Status + DSL Section */}
      {(ai.state !== 'idle' || ai.dsl) && (
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          {/* Status Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e5e7eb',
            background: '#fafafa',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: stateColor[ai.state],
                animation: ai.state === 'generating' || ai.state === 'resolving'
                  ? 'pulse 1.5s infinite' : 'none',
              }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151' }}>
                {stateLabel[ai.state]}
              </span>
              {ai.blockCount > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  · {ai.blockCount} blocks
                </span>
              )}
            </div>
            {ai.result && (
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: '#9ca3af' }}>
                <span>AI: {ai.result.aiTime}ms</span>
                <span>Data: {ai.result.resolveTime}ms</span>
                <span>Total: {ai.result.totalTime}ms</span>
              </div>
            )}
          </div>

          {/* DSL Preview */}
          {ai.dsl && (
            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                borderBottom: '1px solid #1f2937',
                background: '#111827',
              }}>
                <span style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>
                  LiquidCode DSL
                </span>
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  style={{
                    fontSize: '0.7rem',
                    color: '#6b7280',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {showPrompt ? 'Hide' : 'Show'} system prompt
                </button>
              </div>
              <pre style={{
                margin: 0,
                padding: '1rem',
                background: '#111827',
                color: '#10b981',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: '150px',
                overflow: 'auto',
              }}>
                {ai.dsl}
              </pre>
            </div>
          )}

          {/* System Prompt */}
          {showPrompt && (
            <div style={{
              padding: '1rem',
              background: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                System Prompt (sent to AI):
              </div>
              <pre style={{
                margin: 0,
                padding: '0.75rem',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.7rem',
                color: '#374151',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {systemPrompt.slice(0, 3000)}...
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {ai.error && (
        <div style={{
          padding: '1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          fontSize: '0.85rem',
          color: '#dc2626',
        }}>
          <strong>Error:</strong> {ai.error.message}
        </div>
      )}

      {/* Rendered Result */}
      {ai.schema && ai.data && (
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e5e7eb',
            background: '#fafafa',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151' }}>
              Generated UI
            </span>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <LiquidUI schema={ai.schema} data={ai.data} />
          </div>
        </div>
      )}

      {/* Mock Demo (when idle and no API key) */}
      {!hasApiKey && ai.state === 'idle' && (
        <MockDemo platform={platform} />
      )}
    </div>
  );
}

// ============================================================================
// Mock Demo
// ============================================================================

function MockDemo({ platform }: { platform: LiquidPlatform }) {
  const [selectedExample, setSelectedExample] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedDsl, setDisplayedDsl] = useState('');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [schema, setSchema] = useState<any>(null);

  const mockExamples = [
    { query: 'Revenue KPI', dsl: 'Kp :revenue "Total Revenue"' },
    { query: 'Dashboard', dsl: 'Cn ^r [ Kp :revenue #green Kp :orders #blue Kp :customers #purple ]' },
    { query: 'Line Chart', dsl: 'Ln :monthlyData "Monthly Trends"' },
    { query: 'Data Table', dsl: 'Tb :recentOrders "Recent Orders"' },
  ];

  const simulateGeneration = async (index: number) => {
    setIsAnimating(true);
    setDisplayedDsl('');
    setData(null);
    setSchema(null);

    const example = mockExamples[index]!;
    const dsl = example.dsl;

    for (let i = 0; i <= dsl.length; i++) {
      setDisplayedDsl(dsl.slice(0, i));
      await new Promise((r) => setTimeout(r, 25));
    }

    await new Promise((r) => setTimeout(r, 300));

    const { parseUI } = await import('../src/compiler/ui-compiler');
    const parsedSchema = parseUI(dsl);
    setSchema(parsedSchema);
    const result = await platform.resolver.resolve(parsedSchema);
    setData(result.data);
    setIsAnimating(false);
  };

  useEffect(() => {
    simulateGeneration(selectedExample);
  }, [selectedExample]);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        background: '#fafafa',
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>
          Demo Mode
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          See how it works with simulated generation
        </div>
      </div>

      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {mockExamples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setSelectedExample(i)}
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                background: selectedExample === i ? '#111' : '#fff',
                color: selectedExample === i ? '#fff' : '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {ex.query}
            </button>
          ))}
        </div>

        {displayedDsl && (
          <pre style={{
            margin: 0,
            padding: '0.75rem',
            background: '#111827',
            color: '#10b981',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}>
            {displayedDsl}
            {isAnimating && <span style={{ opacity: 0.5 }}>|</span>}
          </pre>
        )}

        {data && schema && !isAnimating && (
          <div style={{
            padding: '1rem',
            background: '#fafafa',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}>
            <LiquidUI schema={schema} data={data} />
          </div>
        )}
      </div>
    </div>
  );
}

export default AIDemo;
