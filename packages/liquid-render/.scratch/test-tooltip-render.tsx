import React from 'react';
import { parseUI } from '../src/compiler/compiler';
import { LiquidUI } from '../src/renderer/LiquidUI';

// Test tooltip rendering
const code = `{
  Tl "Click for more information" [Bt "Info"]
  Tl :helpMessage [Ic "help"]
}`;

const schema = parseUI(code);
const data = {
  helpMessage: "This is helpful context",
};

console.log('Parsed schema:', JSON.stringify(schema, null, 2));

// Render component
function TooltipTest() {
  return (
    <div>
      <h1>Tooltip Component Test</h1>
      <LiquidUI schema={schema} data={data} />
    </div>
  );
}

export default TooltipTest;
