// Component Gallery - Browse all LiquidCode components
// ============================================================================

import React, { useState, useMemo } from 'react';
import { LiquidUI } from '../src/renderer/LiquidUI';
import { parseUI } from '../src/compiler/ui-compiler';
import {
  generateGalleryData,
  getComponentsByCategory,
  getCategories,
  componentRegistry,
  type ComponentConfig,
  type Category,
  type GalleryData,
} from './gallery-data';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  } as React.CSSProperties,

  sidebar: {
    width: '240px',
    borderRight: '1px solid #e5e7eb',
    background: '#fafafa',
    padding: '1rem 0',
    flexShrink: 0,
    overflowY: 'auto',
  } as React.CSSProperties,

  sidebarHeader: {
    padding: '0 1rem 1rem',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '0.5rem',
  } as React.CSSProperties,

  sidebarTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#111',
    margin: 0,
  } as React.CSSProperties,

  sidebarSubtitle: {
    fontSize: '0.75rem',
    color: '#6b7280',
    margin: '0.25rem 0 0 0',
  } as React.CSSProperties,

  categorySection: {
    marginBottom: '0.5rem',
  } as React.CSSProperties,

  categoryHeader: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '0.5rem 1rem',
    margin: 0,
  } as React.CSSProperties,

  componentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    fontSize: '0.8rem',
    color: '#374151',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    width: '100%',
    textAlign: 'left' as const,
    transition: 'background 150ms',
  } as React.CSSProperties,

  componentItemActive: {
    background: '#fff',
    borderLeft: '2px solid #111',
    marginLeft: '-1px',
    fontWeight: 500,
  } as React.CSSProperties,

  main: {
    flex: 1,
    padding: '2rem',
    overflow: 'auto',
    background: '#fff',
  } as React.CSSProperties,

  header: {
    marginBottom: '1.5rem',
  } as React.CSSProperties,

  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#111',
    margin: 0,
  } as React.CSSProperties,

  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0.25rem 0 0 0',
  } as React.CSSProperties,

  preview: {
    background: '#fafafa',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    minHeight: '150px',
  } as React.CSSProperties,

  previewLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '1rem',
  } as React.CSSProperties,

  dslSection: {
    background: '#111827',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '1.5rem',
  } as React.CSSProperties,

  dslHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    borderBottom: '1px solid #1f2937',
    background: '#0d1117',
  } as React.CSSProperties,

  dslLabel: {
    fontSize: '0.7rem',
    color: '#6b7280',
    fontFamily: 'monospace',
  } as React.CSSProperties,

  dslCode: {
    margin: 0,
    padding: '1rem',
    color: '#10b981',
    fontSize: '0.875rem',
    fontFamily: 'ui-monospace, monospace',
    whiteSpace: 'pre-wrap' as const,
  } as React.CSSProperties,

  copyButton: {
    fontSize: '0.7rem',
    color: '#6b7280',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
  } as React.CSSProperties,

  actions: {
    display: 'flex',
    gap: '0.5rem',
  } as React.CSSProperties,

  actionButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.8rem',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#374151',
  } as React.CSSProperties,

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.125rem 0.5rem',
    fontSize: '0.65rem',
    fontWeight: 500,
    background: '#e5e7eb',
    color: '#374151',
    borderRadius: '100px',
  } as React.CSSProperties,

  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: '#9ca3af',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  searchContainer: {
    padding: '0.5rem 1rem',
    marginBottom: '0.5rem',
  } as React.CSSProperties,

  searchInput: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    background: '#fff',
    outline: 'none',
  } as React.CSSProperties,
};

// ============================================================================
// Category Icons (simple unicode/emoji)
// ============================================================================

const categoryIcons: Record<Category, string> = {
  Core: '🔷',
  Charts: '📊',
  Forms: '📝',
  Layout: '📐',
  Navigation: '🧭',
  'Data Display': '📋',
  Interactive: '🎯',
};

// ============================================================================
// Component
// ============================================================================

interface ComponentGalleryProps {
  onBack?: () => void;
}

export function ComponentGallery({ onBack }: ComponentGalleryProps) {
  const [selectedType, setSelectedType] = useState<string>('kpi');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate data once
  const data = useMemo<GalleryData>(() => generateGalleryData(), []);
  const componentsByCategory = useMemo(() => getComponentsByCategory(), []);
  const categories = getCategories();

  // Find selected component
  const selected = componentRegistry.find((c) => c.type === selectedType);

  // Filter components by search
  const filteredByCategory = useMemo(() => {
    if (!searchQuery.trim()) return componentsByCategory;

    const query = searchQuery.toLowerCase();
    const result: Record<Category, ComponentConfig[]> = {
      Core: [],
      Charts: [],
      Forms: [],
      Layout: [],
      Navigation: [],
      'Data Display': [],
      Interactive: [],
    };

    for (const category of categories) {
      result[category] = componentsByCategory[category].filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.type.toLowerCase().includes(query)
      );
    }

    return result;
  }, [searchQuery, componentsByCategory, categories]);

  // Copy DSL to clipboard
  const handleCopy = () => {
    if (selected) {
      navigator.clipboard.writeText(selected.dsl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Regenerate data
  const [dataKey, setDataKey] = useState(0);
  const handleRegenerate = () => {
    setDataKey((k) => k + 1);
  };

  const freshData = useMemo<GalleryData>(() => generateGalleryData(), [dataKey]);

  // Parse DSL to schema
  const parsedSchema = useMemo(() => {
    if (!selected) return null;
    try {
      return parseUI(selected.dsl);
    } catch (e) {
      console.error('Failed to parse DSL:', selected.dsl, e);
      return null;
    }
  }, [selected]);

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Components</h2>
          <p style={styles.sidebarSubtitle}>
            {componentRegistry.length} components
          </p>
        </div>

        {/* Search */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Category List */}
        {categories.map((category) => {
          const components = filteredByCategory[category];
          if (components.length === 0) return null;

          return (
            <div key={category} style={styles.categorySection}>
              <h3 style={styles.categoryHeader}>
                {categoryIcons[category]} {category}
              </h3>
              {components.map((component) => (
                <button
                  key={component.type}
                  onClick={() => setSelectedType(component.type)}
                  style={{
                    ...styles.componentItem,
                    ...(selectedType === component.type
                      ? styles.componentItemActive
                      : {}),
                  }}
                >
                  <span>{component.name}</span>
                </button>
              ))}
            </div>
          );
        })}
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  ...styles.actionButton,
                  padding: '0.35rem 0.75rem',
                }}
              >
                ← Back
              </button>
            )}
            <div>
              <h1 style={styles.title}>{selected?.name || 'Component'}</h1>
              <p style={styles.subtitle}>
                Type: <code>{selected?.type}</code> · Category:{' '}
                {selected?.category}
              </p>
            </div>
          </div>
        </div>

        {selected ? (
          <>
            {/* Preview */}
            <div style={styles.preview}>
              <div style={styles.previewLabel}>Live Preview</div>
              {parsedSchema ? (
                <LiquidUI schema={parsedSchema} data={freshData} />
              ) : (
                <div style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                  Failed to parse DSL
                </div>
              )}
            </div>

            {/* DSL Code */}
            <div style={styles.dslSection}>
              <div style={styles.dslHeader}>
                <span style={styles.dslLabel}>LiquidCode DSL</span>
                <button
                  onClick={handleCopy}
                  style={styles.copyButton}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#1f2937')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre style={styles.dslCode}>{selected.dsl}</pre>
            </div>

            {/* Actions */}
            <div style={styles.actions}>
              <button onClick={handleRegenerate} style={styles.actionButton}>
                ↻ Regenerate Data
              </button>
              <button onClick={handleCopy} style={styles.actionButton}>
                📋 Copy DSL
              </button>
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <div>Select a component from the sidebar</div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ComponentGallery;
