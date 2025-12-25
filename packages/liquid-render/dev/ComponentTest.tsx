// Component Test Harness for Playwright Visual Testing
// URL: /test?component=ComponentName&props=base64EncodedProps
import React, { useMemo } from 'react';
import { LiquidUI } from '../src/renderer/LiquidUI';

// Test data sets for different component types
const testData = {
  kpi: {
    value: 12345,
    label: 'Total Revenue',
    trend: 0.12,
  },
  table: {
    items: [
      { id: 1, name: 'Item A', value: 100, status: 'active' },
      { id: 2, name: 'Item B', value: 200, status: 'pending' },
      { id: 3, name: 'Item C', value: 150, status: 'active' },
    ],
  },
  chart: {
    monthly: [
      { month: 'Jan', value: 100 },
      { month: 'Feb', value: 150 },
      { month: 'Mar', value: 120 },
      { month: 'Apr', value: 180 },
    ],
  },
  form: {
    user: { name: '', email: '', role: 'user' },
  },
  list: {
    items: [
      { id: 1, title: 'First Item', description: 'Description 1' },
      { id: 2, title: 'Second Item', description: 'Description 2' },
      { id: 3, title: 'Third Item', description: 'Description 3' },
    ],
  },
};

// DSL snippets for each component type
const componentDSL: Record<string, string> = {
  // P0 - Critical
  list: '0 ^col *items [Cd :$.title :$.description]',
  select: 'Se :user.role "Role" [opt "user" "User", opt "admin" "Admin"]',
  switch: 'Sw :enabled "Enable Feature"',
  checkbox: 'Ck :agreed "I agree to terms"',
  tag: 'Tg "Active" #green',
  progress: 'Pg :progress "Loading" 75',

  // P1 - Important
  heading: 'Hd "Section Title" #2',
  icon: 'Ic "check" #green',
  avatar: 'Av :user.avatar "John Doe"',
  radio: 'Rd :user.role "Role" [opt "user" "User", opt "admin" "Admin"]',
  accordion: 'Ac "Details" [Tx "Hidden content here"]',
  drawer: 'Dw "Settings" [Fm :settings [In :name "Name"]]',
  stepper: 'St :step [stp "Info", stp "Review", stp "Done"]',
  popover: 'Pp "Menu" [Bt "Action 1", Bt "Action 2"]',

  // Existing components for regression
  kpi: 'Kp :value "Revenue"',
  button: 'Bt "Click Me" #primary',
  text: 'Tx "Hello World"',
  card: 'Cd "Title" [Tx "Content"]',
  table: 'Tb :items',
  line: 'Ln :monthly',
  bar: 'Br :monthly',
  pie: 'Pi :monthly',
  form: 'Fm :user [In :name "Name", In :email "Email"]',
  input: 'In :value "Label"',
  modal: 'Md "Dialog" [Tx "Modal content"]',
  container: '0 ^row [Tx "A", Tx "B", Tx "C"]',
};

interface ComponentTestProps {
  component?: string;
  dsl?: string;
  dataKey?: string;
}

export function ComponentTest({ component, dsl, dataKey }: ComponentTestProps) {
  // Parse URL params if not provided as props
  const params = useMemo(() => {
    if (typeof window === 'undefined') return { component, dsl, dataKey };
    const urlParams = new URLSearchParams(window.location.search);
    return {
      component: component || urlParams.get('component') || 'kpi',
      dsl: dsl || urlParams.get('dsl') || undefined,
      dataKey: dataKey || urlParams.get('data') || 'kpi',
    };
  }, [component, dsl, dataKey]);

  const finalDsl = params.dsl || componentDSL[params.component || 'kpi'] || 'Tx "Unknown"';
  const data = testData[params.dataKey as keyof typeof testData] || testData.kpi;

  return (
    <div
      data-testid="component-test-harness"
      data-component={params.component}
      style={{
        padding: '24px',
        minHeight: '200px',
        background: '#fafafa',
      }}
    >
      <div style={{ marginBottom: '16px', fontSize: '12px', color: '#666' }}>
        Testing: <code>{params.component}</code>
      </div>
      <div data-testid="component-render">
        <LiquidUI dsl={finalDsl} data={data} />
      </div>
    </div>
  );
}

export default ComponentTest;
