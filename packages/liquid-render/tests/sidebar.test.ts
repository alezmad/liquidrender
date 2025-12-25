// Sidebar Component Tests
import { describe, it, expect } from 'vitest';
import { parseUI } from '../src/compiler/compiler';

describe('Sidebar Component', () => {
  describe('Basic Parsing', () => {
    it('should parse basic sidebar with nav items', () => {
      const dsl = `Sd [Bt "Dashboard", Bt "Analytics", Bt "Settings"]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.type).toBe('sidebar');
      expect(result.layers[0].root.children).toHaveLength(3);
      expect(result.layers[0].root.children![0].type).toBe('button');
      expect(result.layers[0].root.children![0].label).toBe('Dashboard');
    });

    it('should parse sidebar with signal binding', () => {
      const dsl = `@navState
Sd <navState [Bt "Home", Bt "Profile"]`;
      const result = parseUI(dsl);

      expect(result.signals.some(s => s.name === 'navState')).toBe(true);
      expect(result.layers[0].root.type).toBe('sidebar');
      expect(result.layers[0].root.signals?.receive).toBe('navState');
    });

    it('should parse collapsible sidebar with ^collapse modifier', () => {
      const dsl = `Sd ^collapse [Bt "Dashboard", Bt "Settings"]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.type).toBe('sidebar');
      expect(result.layers[0].root.layout?.flex).toBe('collapse');
    });
  });

  describe('Navigation Items', () => {
    it('should parse sidebar with signal-emitting nav items', () => {
      const dsl = `@view
Sd [
  Bt "Dashboard" >view=dash,
  Bt "Analytics" >view=analytics,
  Bt "Settings" >view=settings
]`;
      const result = parseUI(dsl);

      expect(result.signals.some(s => s.name === 'view')).toBe(true);
      const buttons = result.layers[0].root.children!;
      expect(buttons[0].signals?.emit?.name).toBe('view');
      expect(buttons[0].signals?.emit?.value).toBe('dash');
      expect(buttons[1].signals?.emit?.value).toBe('analytics');
      expect(buttons[2].signals?.emit?.value).toBe('settings');
    });

    it('should parse nested navigation items', () => {
      const dsl = `Sd [
  Bt "Dashboard",
  Bt "Settings" [
    Bt "Profile",
    Bt "Billing"
  ]
]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.children).toHaveLength(2);
      expect(result.layers[0].root.children![1].children).toHaveLength(2);
      expect(result.layers[0].root.children![1].children![0].label).toBe('Profile');
    });

    it('should parse sidebar with active state tracking', () => {
      const dsl = `@currentView
Sd <currentView [
  Bt "Home" >currentView=home,
  Bt "About" >currentView=about
]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.signals?.receive).toBe('currentView');
      expect(result.layers[0].root.children![0].signals?.emit?.name).toBe('currentView');
    });
  });

  describe('Layout and Position', () => {
    it('should parse sidebar with position modifier', () => {
      const dsl = `Sd ^row [Bt "Nav1", Bt "Nav2"]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.layout?.flex).toBe('row');
    });

    it('should parse sidebar with full width span', () => {
      const dsl = `Sd *f [Bt "Item"]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.layout?.span).toBe('full');
    });

    it('should handle sidebar in a container layout', () => {
      const dsl = `Cn ^row [
  Sd [Bt "Nav1", Bt "Nav2"],
  Cn [Tx "Main content"]
]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.type).toBe('container');
      expect(result.layers[0].root.children![0].type).toBe('sidebar');
      expect(result.layers[0].root.children![1].type).toBe('container');
    });
  });

  describe('Complex Navigation Patterns', () => {
    it('should parse multi-level navigation with signal propagation', () => {
      const dsl = `@navState
Sd <navState [
  Bt "Dashboard" >navState=dash,
  Bt "Analytics" [
    Bt "Overview" >navState=analytics-overview,
    Bt "Reports" >navState=analytics-reports
  ],
  Bt "Settings" [
    Bt "Profile" >navState=settings-profile,
    Bt "Billing" >navState=settings-billing,
    Bt "Team" [
      Bt "Members" >navState=team-members,
      Bt "Roles" >navState=team-roles
    ]
  ]
]`;
      const result = parseUI(dsl);

      expect(result.signals.some(s => s.name === 'navState')).toBe(true);
      const sidebar = result.layers[0].root;
      expect(sidebar.type).toBe('sidebar');
      expect(sidebar.children).toHaveLength(3);

      // Check analytics submenu
      const analytics = sidebar.children![1];
      expect(analytics.children).toHaveLength(2);

      // Check settings submenu with nested team submenu
      const settings = sidebar.children![2];
      expect(settings.children).toHaveLength(3);
      const team = settings.children![2];
      expect(team.children).toHaveLength(2);
    });

    it('should parse sidebar with icons in nav items', () => {
      const dsl = `Sd [
  Cn [Ic "home", Bt "Home"],
  Cn [Ic "chart", Bt "Analytics"],
  Cn [Ic "settings", Bt "Settings"]
]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.children).toHaveLength(3);
      result.layers[0].root.children!.forEach((item) => {
        expect(item.type).toBe('container');
        expect(item.children).toHaveLength(2);
        expect(item.children![0].type).toBe('icon');
        expect(item.children![1].type).toBe('button');
      });
    });
  });

  describe('Collapsible Behavior', () => {
    it('should parse collapsible sidebar with toggle', () => {
      const dsl = `@collapsed
Sd ^collapse <>collapsed [
  Bt "Dashboard" >view=dash,
  Bt "Settings" >view=settings
]`;
      const result = parseUI(dsl);

      expect(result.signals.some(s => s.name === 'collapsed')).toBe(true);
      expect(result.layers[0].root.signals?.both).toBe('collapsed');
      expect(result.layers[0].root.layout?.flex).toBe('collapse');
    });

    it('should parse sidebar with fixed width when expanded', () => {
      const dsl = `Sd ^f [Bt "Nav1", Bt "Nav2"]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.layout?.flex).toBe('fixed');
    });
  });

  describe('Integration with Pages', () => {
    it('should parse sidebar with content layout', () => {
      const dsl = `@view
Cn ^row [
  Sd <view [
    Bt "Dashboard" >view=dash,
    Bt "Analytics" >view=analytics
  ],
  Cn [
    Kp :revenue,
    Tb :data
  ]
]`;
      const result = parseUI(dsl);

      expect(result.signals.some(s => s.name === 'view')).toBe(true);
      const container = result.layers[0].root;
      expect(container.children).toHaveLength(2);

      const sidebar = container.children![0];
      expect(sidebar.type).toBe('sidebar');
      expect(sidebar.signals?.receive).toBe('view');

      const content = container.children![1];
      expect(content.children).toHaveLength(2);
      expect(content.children![0].type).toBe('kpi');
      expect(content.children![1].type).toBe('table');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard-navigable nav items', () => {
      const dsl = `Sd [
  Bt "Item 1" >nav=1,
  Bt "Item 2" >nav=2,
  Bt "Item 3" >nav=3
]`;
      const result = parseUI(dsl);

      const items = result.layers[0].root.children!;
      expect(items).toHaveLength(3);
      items.forEach((item, idx) => {
        expect(item.signals?.emit?.value).toBe(String(idx + 1));
      });
    });
  });

  describe('Styling and Theming', () => {
    it('should parse sidebar with color modifier', () => {
      const dsl = `Sd #primary [Bt "Nav"]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.style?.color).toBe('primary');
    });

    it('should parse sidebar nav items with color', () => {
      const dsl = `Sd [
  Bt "Home" #blue,
  Bt "About" #green
]`;
      const result = parseUI(dsl);

      const items = result.layers[0].root.children!;
      expect(items[0].style?.color).toBe('blue');
      expect(items[1].style?.color).toBe('green');
    });
  });

  describe('Empty and Edge Cases', () => {
    it('should parse empty sidebar', () => {
      const dsl = `Sd []`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.type).toBe('sidebar');
      expect(result.layers[0].root.children || []).toHaveLength(0);
    });

    it('should parse sidebar with single nav item', () => {
      const dsl = `Sd [Bt "Only Item"]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.children).toHaveLength(1);
      expect(result.layers[0].root.children![0].label).toBe('Only Item');
    });

    it('should handle deeply nested navigation', () => {
      const dsl = `Sd [
  Bt "Level 1" [
    Bt "Level 2" [
      Bt "Level 3" [
        Bt "Level 4"
      ]
    ]
  ]
]`;
      const result = parseUI(dsl);

      let current = result.layers[0].root.children![0];
      let depth = 1;
      while (current.children && current.children.length > 0) {
        depth++;
        current = current.children[0];
      }
      expect(depth).toBe(4);
    });
  });

  describe('Real-World Examples', () => {
    it('should parse full dashboard layout with sidebar', () => {
      const dsl = `@view @collapsed
Cn ^row [
  Sd ^collapse <>collapsed <view [
    Bt "Dashboard" >view=dashboard,
    Bt "Analytics" [
      Bt "Overview" >view=analytics-overview,
      Bt "Reports" >view=analytics-reports
    ],
    Bt "Settings" >view=settings
  ],
  Cn *f [
    Cn ?@view=dashboard [
      Kp :revenue "Revenue",
      Kp :orders "Orders",
      Ln :trend
    ],
    Cn ?@view=analytics-overview [
      Tb :data
    ],
    Cn ?@view=settings [
      Fm [In :name, In :email]
    ]
  ]
]`;
      const result = parseUI(dsl);

      expect(result.signals.some(s => s.name === 'view')).toBe(true);
      expect(result.signals.some(s => s.name === 'collapsed')).toBe(true);

      const layout = result.layers[0].root;
      expect(layout.type).toBe('container');
      expect(layout.children).toHaveLength(2);

      const sidebar = layout.children![0];
      expect(sidebar.type).toBe('sidebar');
      expect(sidebar.signals?.both).toBe('collapsed');
      expect(sidebar.signals?.receive).toBe('view');

      const content = layout.children![1];
      expect(content.children).toHaveLength(3);
    });

    it('should parse e-commerce site navigation', () => {
      const dsl = `@category
Sd <category [
  Bt "Home" >category=home,
  Bt "Products" [
    Bt "Electronics" >category=electronics,
    Bt "Clothing" >category=clothing,
    Bt "Books" >category=books
  ],
  Bt "Cart" >category=cart,
  Bt "Account" [
    Bt "Profile" >category=profile,
    Bt "Orders" >category=orders,
    Bt "Settings" >category=settings
  ]
]`;
      const result = parseUI(dsl);

      expect(result.signals.some(s => s.name === 'category')).toBe(true);
      const sidebar = result.layers[0].root;
      expect(sidebar.children).toHaveLength(4);
      expect(sidebar.children![1].children).toHaveLength(3);
      expect(sidebar.children![3].children).toHaveLength(3);
    });
  });
});
