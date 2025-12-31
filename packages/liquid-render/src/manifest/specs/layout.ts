// Layout Component Specifications
// Machine-readable specs for layout, typography, navigation, disclosure, and overlay components

import type { ComponentSpec } from '../types';

// ============================================================================
// Layout Components
// ============================================================================

const containerSpec: ComponentSpec = {
  type: 'container',
  description: 'Flexbox wrapper for centering and constraining content width',
  category: 'layout.container',
  usage: {
    when: ['Need centered content with max-width', 'Page-level content wrapper', 'Constrain content width on large screens'],
    avoid: ['Nested containers', 'When full-width is needed'],
    alternatives: [{ type: 'stack', reason: 'For simple vertical stacking without width constraints' }],
  },
  props: [
    { name: 'style.size', type: "'centered' | 'stretched'", required: false, description: 'Layout mode', default: 'centered' },
    { name: 'style.padding', type: 'string', required: false, description: 'Padding size token', default: 'lg' },
    { name: 'style.maxWidth', type: 'string', required: false, description: 'Max width value' },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['*'],
    validChildren: ['*'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { requirements: ['Semantic landmark when used as main content area'] },
  examples: [
    { name: 'Centered page', dsl: '{ type: "container", style: { size: "centered" }, children: [...] }', renders: 'Centered content with max-width' },
  ],
};

const gridSpec: ComponentSpec = {
  type: 'grid',
  description: 'CSS Grid layout with responsive columns',
  category: 'layout.grid',
  usage: {
    when: ['Multi-column layouts', 'Card grids', 'Responsive layouts'],
    avoid: ['Single column content', 'Complex nested grids'],
    alternatives: [{ type: 'stack', reason: 'For simple vertical lists' }],
  },
  props: [
    { name: 'style.columns', type: 'number', required: false, description: 'Number of columns', default: 3, examples: ['2', '3', '4'] },
    { name: 'style.gap', type: 'string', required: false, description: 'Gap between items', default: 'md' },
    { name: 'style.minChildWidth', type: 'string', required: false, description: 'Min width for auto-fit' },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['container', 'card', 'stack', 'split', 'modal', 'drawer', 'sheet'],
    validChildren: ['card', 'kpi-card', 'image', 'text', 'heading', '*'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { requirements: ['Use semantic list for collections', 'Ensure logical reading order'] },
  examples: [
    { name: '3-column grid', dsl: '{ type: "grid", style: { columns: 3, gap: "md" }, children: [...] }', renders: '3-column responsive grid' },
  ],
};

const stackSpec: ComponentSpec = {
  type: 'stack',
  description: 'Vertical flexbox layout with consistent gap spacing',
  category: 'layout',
  usage: {
    when: ['Vertical content flow', 'Form layouts', 'Card content stacking'],
    avoid: ['Horizontal layouts', 'Grid layouts'],
    alternatives: [{ type: 'grid', reason: 'For multi-column layouts' }],
  },
  props: [
    { name: 'style.gap', type: 'string', required: false, description: 'Gap between children', default: 'md', examples: ['sm', 'md', 'lg'] },
    { name: 'style.align', type: "'start' | 'center' | 'end' | 'stretch'", required: false, description: 'Cross-axis alignment', default: 'stretch' },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['container', 'card', 'modal', 'drawer', 'sheet', 'accordion', 'collapsible', '*'],
    validChildren: ['*'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { requirements: ['Maintain logical DOM order'] },
  examples: [
    { name: 'Form stack', dsl: '{ type: "stack", style: { gap: "md" }, children: [{ type: "input" }, { type: "button" }] }', renders: 'Vertically stacked form elements' },
  ],
};

const splitSpec: ComponentSpec = {
  type: 'split',
  description: 'Two-panel layout with resizable divider',
  category: 'layout',
  usage: {
    when: ['Master-detail views', 'Side-by-side comparisons', 'Resizable panels'],
    avoid: ['More than two panels', 'Mobile-first layouts'],
    alternatives: [{ type: 'grid', reason: 'For fixed multi-column layouts' }],
  },
  props: [
    { name: 'style.direction', type: "'horizontal' | 'vertical'", required: false, description: 'Split direction', default: 'horizontal' },
    { name: 'style.defaultSplit', type: 'number', required: false, description: 'Initial split ratio (0-100)', default: 50 },
    { name: 'style.minSize', type: 'number', required: false, description: 'Minimum panel size in pixels', default: 100 },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['container', 'modal', 'sheet'],
    validChildren: ['*'],
    siblings: { recommended: [], discouraged: [] },
  },
  features: { responsive: true, darkMode: true, dragDrop: true },
  a11y: { requirements: ['Keyboard-accessible divider', 'ARIA separator role'] },
  examples: [
    { name: 'Master-detail', dsl: '{ type: "split", style: { defaultSplit: 30 }, children: [{ type: "nav" }, { type: "container" }] }', renders: 'Resizable two-panel layout' },
  ],
};

const sidebarSpec: ComponentSpec = {
  type: 'sidebar',
  description: 'Collapsible navigation sidebar with menu items',
  category: 'navigation.menu',
  usage: {
    when: ['App-level navigation', 'Dashboard layouts', 'Multi-section navigation'],
    avoid: ['Simple page navigation', 'Mobile-only apps'],
    alternatives: [{ type: 'nav', reason: 'For simpler inline navigation' }],
  },
  props: [
    { name: 'label', type: 'string', required: false, description: 'Sidebar title' },
    { name: 'style.collapsed', type: 'boolean', required: false, description: 'Initial collapsed state', default: false },
    { name: 'style.width', type: 'string', required: false, description: 'Expanded width', default: '16rem' },
    { name: 'style.collapsedWidth', type: 'string', required: false, description: 'Collapsed width', default: '4rem' },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['container', 'split'],
    validChildren: ['nav', 'separator', 'heading', 'text'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'navigation', requirements: ['Keyboard toggle', 'ARIA expanded state'] },
  examples: [
    { name: 'App sidebar', dsl: '{ type: "sidebar", label: "Menu", children: [{ type: "nav", label: "Home" }] }', renders: 'Collapsible navigation sidebar' },
  ],
};

// ============================================================================
// Typography Components
// ============================================================================

const headingSpec: ComponentSpec = {
  type: 'heading',
  description: 'Semantic heading (h1-h6) with level-based styling',
  category: 'typography.heading',
  usage: {
    when: ['Section titles', 'Page headings', 'Content hierarchy'],
    avoid: ['Inline text styling', 'Non-semantic emphasis'],
    alternatives: [{ type: 'text', reason: 'For body text or non-heading styles' }],
  },
  props: [
    { name: 'label', type: 'string', required: false, description: 'Heading text (or use binding)' },
    { name: 'style.level', type: '1 | 2 | 3 | 4 | 5 | 6', required: false, description: 'Heading level', default: 2 },
    { name: 'style.size', type: '1 | 2 | 3 | 4 | 5 | 6', required: false, description: 'Visual size (overrides level)' },
    { name: 'style.align', type: "'left' | 'center' | 'right'", required: false, description: 'Text alignment', default: 'left' },
  ],
  bindings: {
    expects: [{ type: 'string', description: 'Heading text content' }],
    resolves: [{ expression: '{{title}}', value: 'Dashboard Overview' }],
  },
  composition: {
    validParents: ['container', 'card', 'stack', 'modal', 'header', '*'],
    validChildren: [],
  },
  features: { responsive: true, darkMode: true },
  a11y: { requirements: ['Use correct heading level for document outline', 'Avoid skipping levels'] },
  examples: [
    { name: 'Page title', dsl: '{ type: "heading", binding: { field: "title" }, style: { level: 1 } }', renders: 'H1 heading' },
    { name: 'Section heading', dsl: '{ type: "heading", label: "Overview", style: { level: 2 } }', renders: 'H2 section heading' },
  ],
};

const textSpec: ComponentSpec = {
  type: 'text',
  description: 'Typography component with variants for body, caption, label, and code',
  category: 'typography.body',
  usage: {
    when: ['Body text', 'Captions and labels', 'Code snippets', 'Formatted values'],
    avoid: ['Headings', 'Long-form content without structure'],
    alternatives: [{ type: 'heading', reason: 'For section titles and headings' }],
  },
  props: [
    { name: 'label', type: 'string', required: false, description: 'Text content (or use binding)' },
    { name: 'style.variant', type: "'body' | 'heading' | 'subheading' | 'caption' | 'label' | 'code'", required: false, description: 'Text variant', default: 'body' },
    { name: 'style.size', type: "'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'", required: false, description: 'Text size' },
    { name: 'style.weight', type: "'normal' | 'medium' | 'semibold' | 'bold'", required: false, description: 'Font weight' },
    { name: 'style.color', type: 'string', required: false, description: 'Text color token' },
    { name: 'style.align', type: "'left' | 'center' | 'right'", required: false, description: 'Text alignment' },
  ],
  bindings: {
    expects: [
      { type: 'string', description: 'Text content' },
      { type: 'number', description: 'Numeric value (auto-formatted)' },
    ],
    resolves: [{ expression: '{{description}}', value: 'Some text content' }],
  },
  composition: {
    validParents: ['container', 'card', 'stack', 'modal', 'collapsible', '*'],
    validChildren: [],
  },
  features: { responsive: true, darkMode: true },
  a11y: { requirements: ['Sufficient color contrast', 'Readable font size'] },
  examples: [
    { name: 'Body text', dsl: '{ type: "text", binding: { field: "content" } }', renders: 'Body text paragraph' },
    { name: 'Code snippet', dsl: '{ type: "text", label: "npm install", style: { variant: "code" } }', renders: 'Monospace code text' },
  ],
};

// ============================================================================
// Navigation Components
// ============================================================================

const navSpec: ComponentSpec = {
  type: 'nav',
  description: 'Navigation menu item with optional expandable submenu',
  category: 'navigation.menu',
  usage: {
    when: ['Sidebar navigation items', 'Menu items with submenus', 'Hierarchical navigation'],
    avoid: ['Breadcrumb navigation', 'Tab-based navigation'],
    alternatives: [
      { type: 'tabs', reason: 'For content switching in same view' },
      { type: 'breadcrumb', reason: 'For hierarchical path display' },
    ],
  },
  props: [
    { name: 'label', type: 'string', required: true, description: 'Nav item label' },
    { name: 'props.icon', type: 'string', required: false, description: 'Icon name' },
    { name: 'props.href', type: 'string', required: false, description: 'Navigation URL' },
    { name: 'signals.emit', type: 'SignalSpec', required: false, description: 'Signal to emit on click' },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['sidebar', 'nav', 'stack'],
    validChildren: ['nav'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'navigation', requirements: ['ARIA expanded for submenus', 'Keyboard navigation'] },
  examples: [
    { name: 'Simple nav item', dsl: '{ type: "nav", label: "Dashboard", props: { icon: "home", href: "/dashboard" } }', renders: 'Navigation link' },
    { name: 'With submenu', dsl: '{ type: "nav", label: "Settings", children: [{ type: "nav", label: "Profile" }] }', renders: 'Expandable nav with subitems' },
  ],
};

const breadcrumbSpec: ComponentSpec = {
  type: 'breadcrumb',
  description: 'Hierarchical navigation showing current location path',
  category: 'navigation.breadcrumb',
  usage: {
    when: ['Show page location in hierarchy', 'Deep navigation structures', 'Multi-level content'],
    avoid: ['Flat navigation', 'Single-page apps without hierarchy'],
    alternatives: [{ type: 'tabs', reason: 'For switching between peer sections' }],
  },
  props: [
    { name: 'label', type: 'string', required: false, description: 'Accessible label for nav' },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['header', 'container', 'stack'],
    validChildren: ['crumb'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'navigation', requirements: ['ARIA label', 'Current page marked with aria-current'] },
  examples: [
    { name: 'Page path', dsl: '{ type: "breadcrumb", children: [{ type: "crumb", label: "Home" }, { type: "crumb", label: "Products" }, { type: "crumb", label: "Shoes" }] }', renders: 'Home / Products / Shoes' },
  ],
};

const tabsSpec: ComponentSpec = {
  type: 'tabs',
  description: 'Tabbed interface with keyboard navigation',
  category: 'navigation.tabs',
  usage: {
    when: ['Switch between content panels', 'Organize related content', 'Reduce page navigation'],
    avoid: ['More than 5-7 tabs', 'Unrelated content sections'],
    alternatives: [{ type: 'accordion', reason: 'For many collapsible sections' }],
  },
  props: [
    { name: 'style.variant', type: "'line' | 'pills' | 'boxed'", required: false, description: 'Tab visual style', default: 'line' },
    { name: 'style.color', type: "'pills' | 'boxed'", required: false, description: 'Variant (legacy)' },
  ],
  bindings: {
    expects: [{ type: 'number', description: 'Active tab index' }],
  },
  composition: {
    validParents: ['container', 'card', 'modal', 'sheet'],
    validChildren: ['tab'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'tablist', requirements: ['Arrow key navigation', 'ARIA selected state', 'Tab panel associations'] },
  examples: [
    { name: 'Content tabs', dsl: '{ type: "tabs", binding: { field: "activeTab" }, children: [{ type: "tab", label: "Overview" }, { type: "tab", label: "Details" }] }', renders: 'Tabbed content switcher' },
  ],
};

const stepperSpec: ComponentSpec = {
  type: 'stepper',
  description: 'Multi-step progress indicator',
  category: 'navigation',
  usage: {
    when: ['Multi-step forms', 'Wizard flows', 'Progress tracking'],
    avoid: ['Non-linear navigation', 'Simple forms'],
    alternatives: [{ type: 'progress', reason: 'For simple progress bars without steps' }],
  },
  props: [
    { name: 'style.orientation', type: "'horizontal' | 'vertical'", required: false, description: 'Stepper orientation', default: 'horizontal' },
  ],
  bindings: {
    expects: [{ type: 'number', description: 'Current step index (0-based)' }],
    resolves: [{ expression: '{{currentStep}}', value: 2 }],
  },
  composition: {
    validParents: ['container', 'card', 'modal', 'header'],
    validChildren: ['step'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'list', requirements: ['Step status announced', 'aria-current for active step'] },
  examples: [
    { name: 'Checkout stepper', dsl: '{ type: "stepper", binding: { field: "step" }, children: [{ type: "step", label: "Cart" }, { type: "step", label: "Shipping" }, { type: "step", label: "Payment" }] }', renders: 'Horizontal progress steps' },
  ],
};

const paginationSpec: ComponentSpec = {
  type: 'pagination',
  description: 'Page navigation with smart ellipsis for large datasets',
  category: 'navigation.pagination',
  usage: {
    when: ['Paginated tables', 'Search results', 'Large data lists'],
    avoid: ['Infinite scroll implementations', 'Small datasets'],
    alternatives: [{ type: 'button', reason: 'For simple load more patterns' }],
  },
  props: [
    { name: 'props.totalPages', type: 'Binding', required: true, description: 'Total number of pages' },
    { name: 'props.pageSize', type: 'Binding', required: false, description: 'Items per page' },
    { name: 'props.siblingCount', type: 'number', required: false, description: 'Pages shown around current', default: 1 },
    { name: 'props.showPageInfo', type: 'boolean', required: false, description: 'Show "Page X of Y"', default: false },
    { name: 'props.showPageSize', type: 'boolean', required: false, description: 'Show page size selector', default: false },
    { name: 'props.pageSizeOptions', type: 'number[]', required: false, description: 'Available page sizes', default: [10, 20, 50, 100] },
    { name: 'signals.emit', type: 'SignalSpec', required: false, description: 'Signal for page changes' },
  ],
  bindings: {
    expects: [{ type: 'number', description: 'Current page (1-indexed)' }],
    resolves: [{ expression: '{{currentPage}}', value: 3 }],
  },
  composition: {
    validParents: ['container', 'card', 'stack'],
    validChildren: [],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'navigation', requirements: ['ARIA labels for buttons', 'Current page announced'] },
  examples: [
    { name: 'Table pagination', dsl: '{ type: "pagination", binding: { field: "page" }, props: { totalPages: { field: "totalPages" }, showPageInfo: true } }', renders: 'Page navigation with info' },
  ],
};

// ============================================================================
// Disclosure Components
// ============================================================================

const accordionSpec: ComponentSpec = {
  type: 'accordion',
  description: 'Expandable/collapsible section with animated content reveal',
  category: 'disclosure',
  usage: {
    when: ['FAQ sections', 'Collapsible settings', 'Space-constrained views'],
    avoid: ['Critical information that should always be visible', 'Deeply nested accordions'],
    alternatives: [{ type: 'tabs', reason: 'When content should be visible simultaneously' }],
  },
  props: [
    { name: 'label', type: 'string', required: false, description: 'Section title (or use binding)' },
    { name: 'props.defaultOpen', type: 'boolean', required: false, description: 'Initial open state', default: false },
  ],
  bindings: {
    expects: [{ type: 'string', description: 'Section title' }],
  },
  composition: {
    validParents: ['container', 'card', 'stack', 'modal'],
    validChildren: ['text', 'stack', 'form', '*'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'region', requirements: ['ARIA expanded state', 'Keyboard toggle', 'Focus management'] },
  examples: [
    { name: 'FAQ item', dsl: '{ type: "accordion", label: "How does it work?", children: [{ type: "text", binding: { field: "answer" } }] }', renders: 'Collapsible FAQ section' },
  ],
};

const collapsibleSpec: ComponentSpec = {
  type: 'collapsible',
  description: 'Expandable content section with optional preview',
  category: 'disclosure',
  usage: {
    when: ['Show/hide additional details', 'Preview with expand', 'Progressive disclosure'],
    avoid: ['Critical content', 'Primary actions'],
    alternatives: [{ type: 'accordion', reason: 'For multiple collapsible sections' }],
  },
  props: [
    { name: 'label', type: 'string', required: false, description: 'Section title' },
    { name: 'props.preview', type: 'string', required: false, description: 'Preview content binding field' },
    { name: 'props.defaultOpen', type: 'boolean', required: false, description: 'Initial open state', default: false },
  ],
  bindings: {
    expects: [{ type: 'string', description: 'Title text' }],
  },
  composition: {
    validParents: ['container', 'card', 'stack', 'modal'],
    validChildren: ['*'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'region', requirements: ['ARIA expanded', 'Keyboard accessible trigger'] },
  examples: [
    { name: 'Details section', dsl: '{ type: "collapsible", label: "Technical Details", props: { preview: "summary" }, children: [...] }', renders: 'Expandable details with preview' },
  ],
};

// ============================================================================
// Overlay Components
// ============================================================================

const modalSpec: ComponentSpec = {
  type: 'modal',
  description: 'Dialog overlay with focus trap and backdrop',
  category: 'overlays.modal',
  usage: {
    when: ['Confirmations', 'Forms requiring attention', 'Critical actions'],
    avoid: ['Non-critical information', 'Frequent interruptions'],
    alternatives: [
      { type: 'drawer', reason: 'For side panels with more content' },
      { type: 'sheet', reason: 'For slide-in panels' },
    ],
  },
  props: [
    { name: 'label', type: 'string', required: false, description: 'Modal title' },
    { name: 'style.size', type: "'sm' | 'md' | 'lg' | 'xl' | 'full'", required: false, description: 'Modal size', default: 'md' },
    { name: 'signals.receive', type: 'string | string[]', required: false, description: 'Signal to control open state' },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['*'],
    validChildren: ['heading', 'text', 'form', 'stack', 'button', '*'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'dialog', requirements: ['Focus trap', 'Escape to close', 'ARIA labelledby', 'Backdrop click to close'] },
  examples: [
    { name: 'Confirm dialog', dsl: '{ type: "modal", label: "Confirm Action", style: { size: "sm" }, signals: { receive: "confirmOpen" }, children: [...] }', renders: 'Centered modal dialog' },
  ],
};

const drawerSpec: ComponentSpec = {
  type: 'drawer',
  description: 'Slide-in panel from screen edge',
  category: 'overlays',
  usage: {
    when: ['Side navigation', 'Filters panel', 'Detail views'],
    avoid: ['Quick confirmations', 'Critical blocking actions'],
    alternatives: [
      { type: 'modal', reason: 'For focused attention dialogs' },
      { type: 'sheet', reason: 'For more customizable slide panels' },
    ],
  },
  props: [
    { name: 'label', type: 'string', required: false, description: 'Drawer title' },
    { name: 'style.position', type: "'left' | 'right' | 'bottom'", required: false, description: 'Slide direction', default: 'right' },
    { name: 'style.size', type: "'sm' | 'md' | 'lg' | 'full'", required: false, description: 'Drawer size', default: 'md' },
    { name: 'signals.receive', type: 'string | string[]', required: false, description: 'Signal to control open state' },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['*'],
    validChildren: ['heading', 'text', 'form', 'nav', 'stack', '*'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'dialog', requirements: ['Focus trap', 'Escape to close', 'ARIA modal'] },
  examples: [
    { name: 'Filters drawer', dsl: '{ type: "drawer", label: "Filters", style: { position: "right" }, signals: { receive: "filtersOpen" }, children: [...] }', renders: 'Right-side slide panel' },
  ],
};

const sheetSpec: ComponentSpec = {
  type: 'sheet',
  description: 'Slide-out panel overlay with position and size options',
  category: 'overlays',
  usage: {
    when: ['Side panels', 'Mobile navigation', 'Contextual forms'],
    avoid: ['Desktop-only detailed views', 'Heavy form content'],
    alternatives: [
      { type: 'drawer', reason: 'Similar but with different animation' },
      { type: 'modal', reason: 'For centered dialogs' },
    ],
  },
  props: [
    { name: 'label', type: 'string', required: false, description: 'Sheet title' },
    { name: 'style.position', type: "'left' | 'right' | 'top' | 'bottom'", required: false, description: 'Slide direction', default: 'right' },
    { name: 'style.size', type: "'sm' | 'md' | 'lg' | 'full'", required: false, description: 'Sheet size', default: 'md' },
    { name: 'signals.receive', type: 'string | string[]', required: false, description: 'Signal to control open state' },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['*'],
    validChildren: ['heading', 'text', 'form', 'nav', 'stack', '*'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'dialog', requirements: ['Focus trap', 'Escape to close', 'ARIA modal', 'Backdrop click to close'] },
  examples: [
    { name: 'Mobile menu', dsl: '{ type: "sheet", label: "Menu", style: { position: "left", size: "sm" }, signals: { receive: "menuOpen" }, children: [...] }', renders: 'Left-side mobile menu sheet' },
  ],
};

// ============================================================================
// Miscellaneous Components
// ============================================================================

const headerSpec: ComponentSpec = {
  type: 'header',
  description: 'Fixed top navigation bar with optional sticky behavior',
  category: 'layout',
  usage: {
    when: ['App header', 'Page title bar', 'Top navigation'],
    avoid: ['Content sections', 'Footer areas'],
    alternatives: [{ type: 'container', reason: 'For non-fixed page areas' }],
  },
  props: [
    { name: 'label', type: 'string', required: false, description: 'Header title' },
    { name: 'style.sticky', type: 'boolean', required: false, description: 'Sticky positioning', default: true },
    { name: 'style.size', type: 'string', required: false, description: 'Header height', default: '4rem' },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['container', '*'],
    validChildren: ['heading', 'nav', 'breadcrumb', 'button', 'avatar', '*'],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'banner', requirements: ['Landmark role for main header', 'Skip link target'] },
  examples: [
    { name: 'App header', dsl: '{ type: "header", children: [{ type: "heading", label: "App Name" }, { type: "nav", label: "Menu" }] }', renders: 'Sticky top header bar' },
  ],
};

const separatorSpec: ComponentSpec = {
  type: 'separator',
  description: 'Visual divider line (horizontal or vertical)',
  category: 'misc',
  usage: {
    when: ['Divide content sections', 'Visual grouping', 'Menu item separation'],
    avoid: ['Excessive use', 'Primary content boundaries'],
    alternatives: [],
  },
  props: [
    { name: 'props.orientation', type: "'horizontal' | 'vertical'", required: false, description: 'Divider orientation', default: 'horizontal' },
  ],
  bindings: { expects: [] },
  composition: {
    validParents: ['stack', 'container', 'sidebar', 'card', '*'],
    validChildren: [],
  },
  features: { responsive: true, darkMode: true },
  a11y: { role: 'separator', requirements: ['ARIA orientation'] },
  examples: [
    { name: 'Content divider', dsl: '{ type: "separator" }', renders: 'Horizontal line' },
    { name: 'Vertical divider', dsl: '{ type: "separator", props: { orientation: "vertical" } }', renders: 'Vertical line' },
  ],
};

// ============================================================================
// Export
// ============================================================================

export const layoutSpecs: ComponentSpec[] = [
  // Layout
  containerSpec,
  gridSpec,
  stackSpec,
  splitSpec,
  sidebarSpec,
  // Typography
  headingSpec,
  textSpec,
  // Navigation
  navSpec,
  breadcrumbSpec,
  tabsSpec,
  stepperSpec,
  paginationSpec,
  // Disclosure
  accordionSpec,
  collapsibleSpec,
  // Overlays
  modalSpec,
  drawerSpec,
  sheetSpec,
  // Misc
  headerSpec,
  separatorSpec,
];

export default layoutSpecs;
