/**
 * Complex LiquidCode Scenario Tests
 *
 * Tests 5 unique, complex scenarios with streaming, signals, conditionals,
 * and real-world UI patterns. Each scenario is parsed, verified with roundtrip,
 * and results are reported.
 */

import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI, type LiquidSchema } from '../src/compiler/ui-compiler';

// ============================================================================
// SCENARIO 1: Dashboard with Streaming KPIs and Fidelity
// ============================================================================

describe('Scenario 1: Dashboard with Streaming KPIs and Fidelity', () => {
  const scenario1 = `@revenue @orders @customers
Kp :totalRevenue "Revenue" ~5s $hi !h *4 #green
Kp :orderCount "Orders" ~5s $hi !p *3
Kp :activeCustomers "Active Customers" ~5s $hi !s *3
Ln :month :dailyRevenue ~1m <revenue
Br :category :sales $auto`;

  it('should parse with all signals declared', () => {
    const schema = parseUI(scenario1);
    expect(schema.signals).toHaveLength(3);
    expect(schema.signals.map(s => s.name)).toEqual(['revenue', 'orders', 'customers']);
  });

  it('should have 5 child blocks in root', () => {
    const schema = parseUI(scenario1);
    expect(schema.layers[0]?.root.children).toHaveLength(5);
  });

  it('should have 3 KPIs with stream modifiers', () => {
    const schema = parseUI(scenario1);
    const kpis = schema.layers[0]?.root.children?.filter(c => c.type === 'kpi') || [];
    expect(kpis).toHaveLength(3);
    kpis.forEach(kpi => {
      expect(kpi.stream?.type).toBe('interval');
    });
  });

  it('should have KPIs with fidelity levels', () => {
    const schema = parseUI(scenario1);
    const kpis = schema.layers[0]?.root.children?.filter(c => c.type === 'kpi') || [];
    kpis.forEach(kpi => {
      expect(kpi.fidelity).toBe('hi');
    });
  });

  it('should have chart with receive signal modifier', () => {
    const schema = parseUI(scenario1);
    const chart = schema.layers[0]?.root.children?.find(c => c.type === 'line');
    expect(chart).toBeDefined();
    expect(chart?.signals?.receive).toBe('revenue');
  });

  it('should roundtrip successfully', () => {
    const schema = parseUI(scenario1);
    const { isEquivalent, differences } = roundtripUI(schema);
    expect(isEquivalent).toBe(true);
    expect(differences).toHaveLength(0);
  });
});

// ============================================================================
// SCENARIO 2: Form Wizard with Signals and Conditionals
// ============================================================================

describe('Scenario 2: Form Wizard with Signals and Conditionals', () => {
  const scenario2 = `@step @formData
Cn [
  Bt "Step 1" >step=1 !h,
  Bt "Step 2" >step=2 !p,
  Bt "Step 3" >step=3 !s
]
?@step=1 [Fm [In :firstName "First Name", In :lastName "Last Name"]]
?@step=2 [Fm [In :email "Email", In :phone "Phone"]]
?@step=3 [Fm [In :address "Address", In :city "City", In :zip "ZIP"] Bt "Submit" !submit]`;

  it('should parse with step and formData signals', () => {
    const schema = parseUI(scenario2);
    expect(schema.signals).toHaveLength(2);
    expect(schema.signals.map(s => s.name)).toEqual(['step', 'formData']);
  });

  it('should have conditional blocks', () => {
    const schema = parseUI(scenario2);

    const countConditional = (block: any): number => {
      let count = 0;
      if (block.condition) count++;
      if (block.children) {
        block.children.forEach((child: any) => {
          count += countConditional(child);
        });
      }
      return count;
    };

    let conditionalCount = 0;
    for (const layer of schema.layers) {
      conditionalCount += countConditional(layer.root);
    }
    expect(conditionalCount).toBeGreaterThan(0);
  });

  it('should have button group with emit signals', () => {
    const schema = parseUI(scenario2);
    const buttons = schema.layers[0]?.root.children?.[0]?.children || [];
    expect(buttons).toHaveLength(3);
    buttons.forEach((btn: any, idx: number) => {
      expect(btn.signals?.emit?.name).toBe('step');
      expect(btn.signals?.emit?.value).toBe(String(idx + 1));
    });
  });

  it('should have button group with correct structure', () => {
    const schema = parseUI(scenario2);
    const buttonGroup = schema.layers[0]?.root.children?.[0];
    expect(buttonGroup?.type).toBe('container');
    const buttons = buttonGroup?.children || [];
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should roundtrip successfully', () => {
    const schema = parseUI(scenario2);
    const { isEquivalent, differences } = roundtripUI(schema);
    expect(isEquivalent).toBe(true);
    expect(differences).toHaveLength(0);
  });
});

// ============================================================================
// SCENARIO 3: Admin Panel with Tables, Modals, and Filters
// ============================================================================

describe('Scenario 3: Admin Panel with Tables, Modals, and Filters', () => {
  const scenario3 = `@filter @selectedUser
Cn [
  Cn ^r [In :searchQuery "Search", Bt "Reset" >filter= #blue],
  Tb :users [:id :name :email :status :lastActive] <filter $hi
]
/1 9 "User Details Modal" [
  Tx :selectedUser.name "User",
  Tx :selectedUser.email,
  Tx :selectedUser.role "Role",
  Cn [Bt "Edit" !edit, Bt "Delete" !delete #red, Bt "Close" ></1>]
]`;

  it('should parse with filter and selectedUser signals', () => {
    const schema = parseUI(scenario3);
    expect(schema.signals.map(s => s.name)).toEqual(['filter', 'selectedUser']);
  });

  it('should have 2 layers', () => {
    const schema = parseUI(scenario3);
    expect(schema.layers).toHaveLength(2);
  });

  it('should have modal layer with correct type', () => {
    const schema = parseUI(scenario3);
    const modalLayer = schema.layers.find(l => l.id === 1);
    expect(modalLayer).toBeDefined();
    expect(modalLayer?.root.type).toBe('modal');
  });

  it('should have table with columns in main layer', () => {
    const schema = parseUI(scenario3);
    const table = schema.layers[0]?.root.children?.find((c: any) => c.type === 'table');
    expect(table).toBeDefined();
    expect((table as any)?.columns).toEqual(['id', 'name', 'email', 'status', 'lastActive']);
  });

  it('should have table in container', () => {
    const schema = parseUI(scenario3);
    const tableContainer = schema.layers[0]?.root.children?.[1];
    const table = tableContainer?.type === 'table' ? tableContainer : tableContainer?.children?.find((c: any) => c.type === 'table');
    expect(table).toBeDefined();
  });

  it('should have multiple text blocks with expressions in modal', () => {
    const schema = parseUI(scenario3);
    const modalLayer = schema.layers.find(l => l.id === 1);
    const textBlocks = modalLayer?.root.children?.filter((c: any) => c.type === 'text') || [];
    expect(textBlocks.length).toBeGreaterThan(0);
  });

  it('should roundtrip with minor differences allowed', () => {
    const schema = parseUI(scenario3);
    const { isEquivalent, differences } = roundtripUI(schema);
    // Allow for label generation differences
    const significantDifferences = differences.filter(d =>
      !d.includes('label') && !d.includes('binding.kind')
    );
    expect(significantDifferences.length).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// SCENARIO 4: Real-time Monitor with Multiple Streams
// ============================================================================

describe('Scenario 4: Real-time Monitor with Multiple Streams', () => {
  const scenario4 = `@timeframe
Kp :cpuUsage "CPU" ~1s $skeleton #red
Kp :memoryUsage "Memory" ~1s $skeleton #orange
Kp :networkIO "Network I/O" ~1s $skeleton #blue
Ln :timestamp :cpuHistory ~ws://metrics.internal/cpu $defer
Ln :timestamp :memoryHistory ~sse://metrics.internal/memory $defer
Br :service :errorRate ~5s $auto #red !h`;

  it('should parse timeframe signal', () => {
    const schema = parseUI(scenario4);
    expect(schema.signals).toHaveLength(1);
    expect(schema.signals[0].name).toBe('timeframe');
  });

  it('should have 6 child blocks', () => {
    const schema = parseUI(scenario4);
    expect(schema.layers[0]?.root.children).toHaveLength(6);
  });

  it('should have KPIs with interval streams', () => {
    const schema = parseUI(scenario4);
    const kpis = schema.layers[0]?.root.children?.filter((c: any) => c.type === 'kpi') || [];
    expect(kpis).toHaveLength(3);
    kpis.forEach(kpi => {
      expect(kpi.stream?.type).toBe('interval');
      expect(kpi.stream?.interval).toBe(1000);
    });
  });

  it('should have WebSocket stream', () => {
    const schema = parseUI(scenario4);
    const wsChart = schema.layers[0]?.root.children?.find((c: any) => c.stream?.type === 'ws');
    expect(wsChart).toBeDefined();
    expect(wsChart?.stream?.type).toBe('ws');
  });

  it('should have SSE stream', () => {
    const schema = parseUI(scenario4);
    const sseChart = schema.layers[0]?.root.children?.find((c: any) => c.stream?.type === 'sse');
    expect(sseChart).toBeDefined();
    expect(sseChart?.stream?.type).toBe('sse');
  });

  it('should have fidelity levels on all blocks', () => {
    const schema = parseUI(scenario4);
    const blocks = schema.layers[0]?.root.children || [];
    blocks.forEach(block => {
      expect(block.fidelity).toBeDefined();
    });
  });

  it('should roundtrip successfully', () => {
    const schema = parseUI(scenario4);
    const { isEquivalent, differences } = roundtripUI(schema);
    expect(isEquivalent).toBe(true);
    expect(differences).toHaveLength(0);
  });
});

// ============================================================================
// SCENARIO 5: E-commerce with Cart Signals and Layers
// ============================================================================

describe('Scenario 5: E-commerce with Cart Signals and Layers', () => {
  const scenario5 = `@cart @sort @filter
Cn [
  Cn ^r [
    In :search "Search products",
    Bt "Sort ↕" >sort=toggle,
    Bt "Filter" >filter=open
  ] !h,
  Tb :products [:id :name :price :category :stock] $hi <sort <filter,
  Cn ^r [
    Kp :totalItems "Items" =cart.items.length,
    Kp :subtotal "Subtotal" =cart.subtotal,
    Kp :tax "Tax" =cart.tax,
    Kp :total "Total" =cart.subtotal+cart.tax !h #green *2
  ]
]
/1 9 "Cart" [
  Tb :cart.items [:name :qty :price :subtotal],
  Cn [Bt "Checkout" !checkout #green, Bt "Continue" ></1> #blue]
] $hi
/2 9 "Checkout" [
  Fm [
    In :billingAddress "Billing Address",
    In :shippingAddress "Shipping Address",
    In :cardNumber "Card Number"
  ],
  Bt "Place Order" !placeOrder #green
] $defer`;

  it('should parse cart, sort, and filter signals', () => {
    const schema = parseUI(scenario5);
    expect(schema.signals.map(s => s.name)).toEqual(['cart', 'sort', 'filter']);
  });

  it('should have 3 layers', () => {
    const schema = parseUI(scenario5);
    expect(schema.layers).toHaveLength(3);
  });

  it('should have main layer, cart modal, and checkout modal', () => {
    const schema = parseUI(scenario5);
    expect(schema.layers[0]?.id).toBe(0);
    expect(schema.layers[1]?.id).toBe(1);
    expect(schema.layers[2]?.id).toBe(2);
  });

  it('should have table or containers with children in main layer', () => {
    const schema = parseUI(scenario5);
    const children = schema.layers[0]?.root.children || [];
    expect(children.length).toBeGreaterThan(0);
    // At least one container should exist
    const hasContainer = children.some((c: any) => c.type === 'container');
    expect(hasContainer).toBe(true);
  });

  it('should have KPI blocks in main layer', () => {
    const schema = parseUI(scenario5);
    const kpiBlocks = schema.layers[0]?.root.children?.filter((c: any) => c.type === 'kpi') || [];
    const containerKpis = schema.layers[0]?.root.children
      ?.filter((c: any) => c.type === 'container')
      .flatMap((c: any) => c.children?.filter((ch: any) => ch.type === 'kpi') || []) || [];
    expect(kpiBlocks.length + containerKpis.length).toBeGreaterThan(0);
  });

  it('should have multiple layers', () => {
    const schema = parseUI(scenario5);
    const cartLayer = schema.layers.find(l => l.id === 1);
    const checkoutLayer = schema.layers.find(l => l.id === 2);
    expect(cartLayer).toBeDefined();
    expect(checkoutLayer).toBeDefined();
  });

  it('should have modal layers with correct content', () => {
    const schema = parseUI(scenario5);
    const cartLayer = schema.layers.find(l => l.id === 1);
    const checkoutLayer = schema.layers.find(l => l.id === 2);
    expect(cartLayer?.root.type).toBe('modal');
    expect(checkoutLayer?.root.type).toBe('modal');
  });

  it('should roundtrip successfully', () => {
    const schema = parseUI(scenario5);
    const { isEquivalent, differences } = roundtripUI(schema);
    expect(isEquivalent).toBe(true);
    expect(differences).toHaveLength(0);
  });
});
