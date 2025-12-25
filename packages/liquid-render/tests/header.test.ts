// Header Component Tests
import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Header Component - DSL Parsing', () => {
  describe('Basic Headers', () => {
    it('parses simple header with title', () => {
      const dsl = 'Hr "Dashboard"';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.label).toBe('Dashboard');
    });

    it('parses header with dynamic binding', () => {
      const dsl = 'Hr :title';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.binding).toEqual({
        kind: 'field',
        value: 'title',
      });
    });

    it('parses header with nested field binding', () => {
      const dsl = 'Hr :app.name';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.binding).toEqual({
        kind: 'field',
        value: 'app.name',
      });
    });
  });

  describe('Headers with Actions', () => {
    it('parses header with single action button', () => {
      const dsl = 'Hr "Dashboard" [Bt "Help"]';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.label).toBe('Dashboard');
      expect(schema.layers[0].root.children).toHaveLength(1);
      expect(schema.layers[0].root.children?.[0].type).toBe('button');
      expect(schema.layers[0].root.children?.[0].label).toBe('Help');
    });

    it('parses header with multiple action buttons', () => {
      const dsl = 'Hr "App" [Bt "Settings", Bt "Profile", Bt "Logout"]';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.children).toHaveLength(3);
      expect(schema.layers[0].root.children?.[0].label).toBe('Settings');
      expect(schema.layers[0].root.children?.[1].label).toBe('Profile');
      expect(schema.layers[0].root.children?.[2].label).toBe('Logout');
    });

    it('parses header with mixed action types', () => {
      const dsl = 'Hr "Bank ETPs" [Bt "Help", Bt "Notifications", Av :user.avatar]';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.children).toHaveLength(3);
      expect(schema.layers[0].root.children?.[0].type).toBe('button');
      expect(schema.layers[0].root.children?.[1].type).toBe('button');
      expect(schema.layers[0].root.children?.[2].type).toBe('avatar');
      expect(schema.layers[0].root.children?.[2].binding).toEqual({
        kind: 'field',
        value: 'user.avatar',
      });
    });

    it('parses header with icon and text buttons', () => {
      const dsl = 'Hr "Dashboard" [Ic "settings", Bt "Logout"]';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.children).toHaveLength(2);
      expect(schema.layers[0].root.children?.[0].type).toBe('icon');
      expect(schema.layers[0].root.children?.[1].type).toBe('button');
    });
  });

  describe('Header Sticky Behavior', () => {
    it('parses header (sticky by default)', () => {
      const dsl = 'Hr "App"';
      const schema = parseUI(dsl);

      // Default sticky=true, no explicit style needed
      expect(schema.layers[0].root.type).toBe('header');
      // Sticky is default behavior in renderer
    });

    it('parses non-sticky header with modifier', () => {
      const dsl = 'Hr "App" ^f'; // fixed (non-sticky)
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.layout?.flex).toBe('fixed');
    });
  });

  describe('Header Size Variants', () => {
    it('parses small header', () => {
      const dsl = 'Hr "App" %sm';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.style?.size).toBe('sm');
    });

    it('parses medium header', () => {
      const dsl = 'Hr "App" %md';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.style?.size).toBe('md');
    });

    it('parses large header', () => {
      const dsl = 'Hr "App" %lg';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.style?.size).toBe('lg');
    });
  });

  describe('Header with Signals', () => {
    it('parses header with button that emits signal', () => {
      const dsl = '@menu\nHr "App" [Bt "Menu" >menu]';
      const schema = parseUI(dsl);

      expect(schema.signals).toContainEqual({ name: 'menu' });
      expect(schema.layers[0].root.children).toHaveLength(1);
      expect(schema.layers[0].root.children?.[0].signals?.emit?.name).toBe('menu');
    });

    it('parses header with button that emits value', () => {
      const dsl = '@view\nHr "Dashboard" [Bt "Grid" >view=grid, Bt "List" >view=list]';
      const schema = parseUI(dsl);

      expect(schema.signals).toContainEqual({ name: 'view' });
      expect(schema.layers[0].root.children).toHaveLength(2);
      expect(schema.layers[0].root.children?.[0].signals?.emit).toEqual({
        name: 'view',
        value: 'grid',
      });
      expect(schema.layers[0].root.children?.[1].signals?.emit).toEqual({
        name: 'view',
        value: 'list',
      });
    });

    it('parses header with multiple buttons emitting different signals', () => {
      const dsl = '@search @filter\nHr "Products" [Bt "Search" >search, Bt "Filter" >filter]';
      const schema = parseUI(dsl);

      expect(schema.signals).toHaveLength(2);
      expect(schema.signals).toContainEqual({ name: 'search' });
      expect(schema.signals).toContainEqual({ name: 'filter' });
    });
  });

  describe('Complex Header Scenarios', () => {
    it('parses header with nested containers in actions', () => {
      const dsl = 'Hr "App" [Cn [Bt "Save", Bt "Cancel"]]';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.children).toHaveLength(1);
      expect(schema.layers[0].root.children?.[0].type).toBe('container');
      expect(schema.layers[0].root.children?.[0].children).toHaveLength(2);
    });

    it('parses header with color modifier', () => {
      const dsl = 'Hr "App" #primary';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.style?.color).toBe('primary');
    });

    it('parses header with multiple modifiers', () => {
      const dsl = 'Hr "App" %lg #primary';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.style?.size).toBe('lg');
      expect(schema.layers[0].root.style?.color).toBe('primary');
    });
  });

  describe('Real-World Examples', () => {
    it('parses banking app header', () => {
      const dsl = `
        @notifications
        Hr "Singular Bank ETPs" [
          Bt "Help",
          Bt "Notifications" >notifications,
          Av :user.avatar
        ]
      `;
      const schema = parseUI(dsl);

      expect(schema.signals).toContainEqual({ name: 'notifications' });
      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.label).toBe('Singular Bank ETPs');
      expect(schema.layers[0].root.children).toHaveLength(3);
    });

    it('parses admin dashboard header', () => {
      const dsl = `
        @profile @settings
        Hr :app.title [
          Ic "search",
          Bt "Settings" >settings,
          Bt "Profile" >profile
        ]
      `;
      const schema = parseUI(dsl);

      expect(schema.signals).toHaveLength(2);
      expect(schema.layers[0].root.binding).toEqual({
        kind: 'field',
        value: 'app.title',
      });
      expect(schema.layers[0].root.children).toHaveLength(3);
    });

    it('parses e-commerce header', () => {
      const dsl = `
        @cart @search
        Hr "ShopHub" [
          In :searchQuery <>search,
          Bt "Cart" >cart,
          Av :user.photo
        ]
      `;
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.label).toBe('ShopHub');
      expect(schema.layers[0].root.children).toHaveLength(3);
      expect(schema.layers[0].root.children?.[0].type).toBe('input');
      // Bidirectional signal may be represented differently
      const inputSignals = schema.layers[0].root.children?.[0].signals;
      expect(inputSignals).toBeDefined();
    });

    it('parses mobile app header with hamburger', () => {
      const dsl = `
        @menu
        Hr "Mobile App" %sm [
          Bt "☰" >menu,
          Ic "user"
        ]
      `;
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.style?.size).toBe('sm');
      expect(schema.layers[0].root.children).toHaveLength(2);
      expect(schema.layers[0].root.children?.[0].label).toBe('☰');
    });
  });

  describe('Header Edge Cases', () => {
    it('parses header with empty actions array', () => {
      const dsl = 'Hr "App" []';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      // Empty children array may be omitted (undefined) or empty []
      const children = schema.layers[0].root.children;
      expect(children === undefined || children.length === 0).toBe(true);
    });

    it('parses header with only binding (no label)', () => {
      const dsl = 'Hr :dynamicTitle';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.binding).toEqual({
        kind: 'field',
        value: 'dynamicTitle',
      });
      // Parser auto-generates label from field name
      expect(schema.layers[0].root.label).toBe('Dynamic Title');
    });

    it('parses header with binding and label', () => {
      const dsl = 'Hr :title "Fallback"';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.binding).toEqual({
        kind: 'field',
        value: 'title',
      });
      expect(schema.layers[0].root.label).toBe('Fallback');
    });

    it('parses header with special characters in title', () => {
      const dsl = 'Hr "App™ - Dashboard © 2024"';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.label).toBe('App™ - Dashboard © 2024');
    });

    it('parses header with unicode emoji in title', () => {
      const dsl = 'Hr "🏠 Home Dashboard"';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.label).toBe('🏠 Home Dashboard');
    });
  });

  describe('Header Type Validation', () => {
    it('recognizes Hr as header type', () => {
      const dsl = 'Hr "Test"';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
    });

    it('maintains header type through transformations', () => {
      const dsl = 'Hr "App" %lg #primary [Bt "Save"]';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('header');
      expect(schema.layers[0].root.style).toBeDefined();
      expect(schema.layers[0].root.children).toBeDefined();
    });
  });

  describe('Header in Full Layouts', () => {
    it('parses header as first element in layout', () => {
      const dsl = `
        Hr "Dashboard"
        Cn [
          Kp :revenue,
          Kp :orders
        ]
      `;
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.type).toBe('container');
      expect(schema.layers[0].root.children).toHaveLength(2);
      expect(schema.layers[0].root.children?.[0].type).toBe('header');
      expect(schema.layers[0].root.children?.[1].type).toBe('container');
    });

    it('parses header with main content below', () => {
      const dsl = `
        Hr "Analytics" [Bt "Export"]
        Tb :data [:date :revenue :orders]
      `;
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.children).toHaveLength(2);
      expect(schema.layers[0].root.children?.[0].type).toBe('header');
      expect(schema.layers[0].root.children?.[1].type).toBe('table');
    });

    it('parses complete app layout with header', () => {
      const dsl = `
        @tab
        Hr "Dashboard" [Bt "Settings"]
        Cn [
          Bt "Overview" >tab=0,
          Bt "Analytics" >tab=1
        ]
        ?tab=0: Kp :revenue, Kp :orders
        ?tab=1: Ln :trend
      `;
      const schema = parseUI(dsl);

      expect(schema.signals).toContainEqual({ name: 'tab' });
      // The root container should have header as first child
      const rootChildren = schema.layers[0].root.children;
      expect(rootChildren?.[0].type).toBe('header');
    });
  });

  describe('Schema Integrity', () => {
    it('preserves all header properties in schema', () => {
      const dsl = 'Hr "Test Title" %lg #primary [Bt "Action"]';
      const schema = parseUI(dsl);
      const header = schema.layers[0].root;

      expect(header.type).toBe('header');
      expect(header.label).toBe('Test Title');
      expect(header.style?.size).toBe('lg');
      expect(header.style?.color).toBe('primary');
      expect(header.children).toHaveLength(1);
      expect(header.uid).toBeDefined();
    });

    it('generates unique UIDs for headers', () => {
      const dsl = 'Hr "Header 1"\nHr "Header 2"';
      const schema = parseUI(dsl);

      const headers = schema.layers[0].root.children;
      expect(headers).toHaveLength(2);
      expect(headers?.[0].uid).not.toBe(headers?.[1].uid);
    });
  });
});
