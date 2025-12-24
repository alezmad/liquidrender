import React from 'react';
import { renderToString } from 'react-dom/server';
import { parseUI } from '../src/compiler/ui-compiler';
import { LiquidUI } from '../src/renderer/LiquidUI';
import * as fs from 'fs';

const dashboardData = {
  summary: {
    revenue: 832000,
    orders: 2248,
    customers: 1694,
    growth: 0.14,
  },
  monthly: [
    { month: 'Jan', revenue: 45000, orders: 120 },
    { month: 'Feb', revenue: 52000, orders: 145 },
    { month: 'Mar', revenue: 48000, orders: 132 },
    { month: 'Apr', revenue: 61000, orders: 168 },
    { month: 'May', revenue: 58000, orders: 155 },
    { month: 'Jun', revenue: 67000, orders: 182 },
  ],
  transactions: [
    { date: '2024-06-15', customer: 'Acme Corp', amount: 12500, status: 'Completed' },
    { date: '2024-06-14', customer: 'TechStart', amount: 8900, status: 'Completed' },
    { date: '2024-06-14', customer: 'Global Inc', amount: 15200, status: 'Pending' },
    { date: '2024-06-13', customer: 'StartupXYZ', amount: 4500, status: 'Completed' },
    { date: '2024-06-12', customer: 'MegaCorp', amount: 28000, status: 'Completed' },
  ],
};

// MINIMAL SYNTAX - implicit field detection!
const dsl = `Kp :summary
Ln :monthly
Br :monthly
Tb :transactions`;

const schema = parseUI(dsl);
const content = renderToString(React.createElement(LiquidUI, { schema, data: dashboardData }));

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LiquidUI Preview - Real Charts</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/recharts@2/umd/Recharts.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
      padding: 2rem;
    }
    h1 { margin-bottom: 0.5rem; color: #111827; }
    .subtitle { color: #6b7280; margin-bottom: 1.5rem; }
    .dsl-preview {
      background: #1f2937;
      color: #10b981;
      padding: 1rem;
      border-radius: 0.5rem;
      font-family: monospace;
      font-size: 0.875rem;
      margin-bottom: 2rem;
      white-space: pre-wrap;
    }
    .badge {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      margin-left: 0.5rem;
    }
    [data-liquid-ui] { max-width: 1200px; margin: 0 auto; }
    .note {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-top: 2rem;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <h1>LiquidUI Dashboard<span class="badge">Minimal Syntax</span></h1>
  <p class="subtitle">Generated from ultra-compact DSL with implicit field detection</p>

  <div class="dsl-preview">${dsl}</div>

  ${content}

  <div class="note">
    <strong>Note:</strong> This is SSR output. Charts show as placeholders in SSR mode.
    In a real React app, Recharts would render interactive charts with tooltips, legends, and animations.
  </div>
</body>
</html>`;

fs.writeFileSync('preview.html', html);
console.log('Preview saved to preview.html');
console.log('');
console.log('DSL used (LLM-optimal syntax):');
console.log(dsl);
