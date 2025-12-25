// Drawer Component Demo
import React, { useState } from 'react';
import { parseUI } from '../src/compiler/compiler';
import { LiquidUI } from '../src/renderer/LiquidUI';

// Demo 1: Basic drawer with button trigger
const demo1 = `
Bt "Open Menu" >menu
Dw "Navigation" <menu [
  Tx "Home",
  Tx "About",
  Tx "Contact",
  Bt "Close"
]
`;

// Demo 2: Settings drawer
const demo2 = `
Bt "Settings" >settings
Dw "App Settings" <settings [
  Sw :darkMode "Dark Mode",
  Sw :notifications "Notifications",
  Sw :autoSave "Auto-save"
]
`;

// Demo 3: Complex drawer with nested content
const demo3 = `
Bt "Open Panel" >panel
Dw "Side Panel" <panel [
  Hd "Welcome",
  Tx "This is a drawer component",
  Cn [
    Bt "Action 1",
    Bt "Action 2"
  ]
]
`;

export function DrawerDemo() {
  const [activeDemo, setActiveDemo] = useState(1);

  const demos = [
    { name: 'Basic Menu', code: demo1 },
    { name: 'Settings', code: demo2 },
    { name: 'Complex Panel', code: demo3 },
  ];

  const schema = parseUI(demos[activeDemo - 1].code);
  const data = {
    darkMode: false,
    notifications: true,
    autoSave: false,
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Drawer Component Demo</h1>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {demos.map((demo, i) => (
            <button
              key={i}
              onClick={() => setActiveDemo(i + 1)}
              style={{
                padding: '0.5rem 1rem',
                border: activeDemo === i + 1 ? '2px solid black' : '1px solid gray',
                background: activeDemo === i + 1 ? '#f0f0f0' : 'white',
                cursor: 'pointer',
              }}
            >
              {demo.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>DSL Code:</h3>
        <pre style={{
          background: '#f5f5f5',
          padding: '1rem',
          borderRadius: '4px',
          overflow: 'auto',
        }}>
          {demos[activeDemo - 1].code.trim()}
        </pre>
      </div>

      <div>
        <h3>Rendered Output:</h3>
        <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px' }}>
          <LiquidUI schema={schema} data={data} />
        </div>
      </div>
    </div>
  );
}

export default DrawerDemo;
