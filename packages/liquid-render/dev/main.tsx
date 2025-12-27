import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AIDemo } from './AIDemo';
import { ComponentTest } from './ComponentTest';
import { ComponentGallery } from './ComponentGallery';

// Get URL params
const urlParams = new URLSearchParams(window.location.search);
const apiKey = urlParams.get('apiKey') || urlParams.get('apikEY') || '';
const isTestMode = window.location.pathname === '/test' || urlParams.has('component');
const isGalleryMode = window.location.pathname === '/gallery' || urlParams.has('gallery');

type ViewMode = 'demo' | 'gallery';

function App() {
  const [view, setView] = useState<ViewMode>(isGalleryMode ? 'gallery' : 'demo');

  // Test mode for Playwright
  if (isTestMode) {
    return <ComponentTest />;
  }

  // Gallery mode
  if (view === 'gallery') {
    return <ComponentGallery onBack={() => setView('demo')} />;
  }

  // Normal demo mode
  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '2rem',
      minHeight: '100vh',
    }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: 0,
            color: '#111',
          }}>
            LiquidCode AI Demo
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0.25rem 0 0 0',
          }}>
            Generate UI from natural language using Claude
          </p>
        </div>
        <button
          onClick={() => setView('gallery')}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#374151',
          }}
        >
          📚 Component Gallery
        </button>
      </div>

      <AIDemo apiKey={apiKey} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
