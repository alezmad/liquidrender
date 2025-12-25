import React from 'react';
import { createRoot } from 'react-dom/client';
import { AIDemo } from './AIDemo';
import { ComponentTest } from './ComponentTest';

// Get URL params
const urlParams = new URLSearchParams(window.location.search);
const apiKey = urlParams.get('apiKey') || urlParams.get('apikEY') || '';
const isTestMode = window.location.pathname === '/test' || urlParams.has('component');

function App() {
  // Test mode for Playwright
  if (isTestMode) {
    return <ComponentTest />;
  }

  // Normal demo mode
  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '2rem',
      minHeight: '100vh',
    }}>
      <div style={{ marginBottom: '1.5rem' }}>
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

      <AIDemo apiKey={apiKey} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
