import React from 'react';
import { createRoot } from 'react-dom/client';
import { parseUI } from '../src/compiler/ui-compiler';
import { LiquidUI } from '../src/renderer/LiquidUI';

// Sample data
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

// MINIMAL SYNTAX with implicit field detection
const dsl = `Kp :summary
Ln :monthly
Br :monthly
Tb :transactions`;

const schema = parseUI(dsl);

function App() {
  return (
    <>
      <h1>LiquidUI Dashboard<span className="badge">Interactive</span></h1>
      <p className="subtitle">Rendered with React + Recharts from ultra-minimal DSL</p>

      <div className="dsl-preview">{dsl}</div>

      <LiquidUI schema={schema} data={dashboardData} />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
