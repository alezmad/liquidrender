import '@testing-library/jest-dom/vitest';
import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import React from 'react';

expect.extend(matchers);

// Mock Recharts components for SSR/test environment
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'line-chart' }, children),
  Line: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'bar-chart' }, children),
  Bar: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'pie-chart' }, children),
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'responsive-container' }, children),
}));
