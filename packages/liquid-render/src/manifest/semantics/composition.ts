// Semantic Composition Rules
// Guides LLM reasoning about valid component combinations, patterns, and anti-patterns

import type { CompositionRules, CompositionPattern, AntiPattern } from "../types";

// ============================================================================
// Composition Rules
// ============================================================================

/**
 * Global composition rules for LiquidRender components.
 * These rules help LLMs understand structural constraints when generating UI.
 */
export const compositionRules: CompositionRules = {
  maxNestingDepth: 6,

  // Components that should NEVER have children (terminal nodes)
  leafComponents: [
    // Typography
    "text",
    "heading",
    // Indicators
    "badge",
    "tag",
    "icon",
    "spinner",
    "skeleton",
    "progress",
    "gauge",
    "sparkline",
    // Media (self-contained)
    "avatar",
    "image",
    "video",
    "audio",
    // Dividers
    "separator",
    // Form primitives
    "input",
    "textarea",
    "checkbox",
    "radio",
    "switch",
    "rating",
    "color",
    "otp",
    // Empty state
    "empty",
  ],

  // Components that REQUIRE children to be meaningful
  containerComponents: [
    // Layout containers
    "container",
    "grid",
    "stack",
    "split",
    "sidebar",
    "header",
    // Card & panels
    "card",
    // Disclosure
    "accordion",
    "collapsible",
    // Overlays
    "modal",
    "drawer",
    "sheet",
    // Navigation containers
    "tabs",
    "stepper",
    "nav",
    // Forms
    "form",
    // Collections
    "carousel",
    "lightbox",
  ],

  // Specific parent-child constraints
  rules: [
    // Grid children
    {
      name: "grid-children",
      parent: "grid",
      allowedChildren: [
        "card",
        "kpi-card",
        "container",
        "stack",
        "image",
        "chart",
        "*",
      ],
      reason: "Grid items should be self-contained units, typically cards or containers",
    },

    // Form children
    {
      name: "form-children",
      parent: "form",
      allowedChildren: [
        "input",
        "textarea",
        "select",
        "checkbox",
        "radio",
        "switch",
        "date",
        "daterange",
        "time",
        "rating",
        "range",
        "color",
        "otp",
        "upload",
        "button",
        "stack",
        "grid",
        "heading",
        "text",
        "separator",
      ],
      reason: "Forms contain form controls, layout helpers, and submit buttons",
    },

    // Tabs content
    {
      name: "tabs-children",
      parent: "tabs",
      allowedChildren: ["tab"],
      reason: "Tabs only contain tab items, which hold the panel content",
    },

    // Stepper steps
    {
      name: "stepper-children",
      parent: "stepper",
      allowedChildren: ["step"],
      reason: "Stepper only contains step definitions",
    },

    // Sidebar structure
    {
      name: "sidebar-children",
      parent: "sidebar",
      allowedChildren: [
        "nav",
        "stack",
        "container",
        "separator",
        "heading",
        "text",
        "avatar",
      ],
      reason: "Sidebar contains navigation, user info, and structural elements",
    },

    // Header structure
    {
      name: "header-children",
      parent: "header",
      allowedChildren: [
        "heading",
        "nav",
        "breadcrumb",
        "button",
        "avatar",
        "dropdown",
        "stack",
        "container",
      ],
      reason: "Header contains branding, navigation, and user actions",
    },

    // Card content
    {
      name: "card-children",
      parent: "card",
      allowedChildren: ["*"],
      reason: "Cards are flexible content containers",
    },

    // Modal content
    {
      name: "modal-children",
      parent: "modal",
      allowedChildren: [
        "heading",
        "text",
        "form",
        "stack",
        "grid",
        "button",
        "alert",
        "separator",
        "*",
      ],
      reason: "Modals contain focused content, typically with title, body, and actions",
    },

    // Drawer content
    {
      name: "drawer-children",
      parent: "drawer",
      allowedChildren: [
        "heading",
        "text",
        "form",
        "nav",
        "stack",
        "grid",
        "button",
        "separator",
        "*",
      ],
      reason: "Drawers contain navigation, forms, or detailed content",
    },

    // Sheet content
    {
      name: "sheet-children",
      parent: "sheet",
      allowedChildren: [
        "heading",
        "text",
        "form",
        "nav",
        "stack",
        "grid",
        "button",
        "separator",
        "*",
      ],
      reason: "Sheets contain slide-in panel content",
    },

    // Navigation nesting
    {
      name: "nav-children",
      parent: "nav",
      allowedChildren: ["nav"],
      reason: "Nav items can nest for submenu structures",
    },

    // Accordion content
    {
      name: "accordion-children",
      parent: "accordion",
      allowedChildren: ["*"],
      reason: "Accordion sections can contain any content",
    },

    // Collapsible content
    {
      name: "collapsible-children",
      parent: "collapsible",
      allowedChildren: ["*"],
      reason: "Collapsible sections can contain any content",
    },

    // Breadcrumb items
    {
      name: "breadcrumb-children",
      parent: "breadcrumb",
      allowedChildren: ["crumb"],
      reason: "Breadcrumbs only contain crumb items",
    },

    // Split panel content
    {
      name: "split-children",
      parent: "split",
      allowedChildren: ["container", "card", "nav", "stack", "grid", "*"],
      reason: "Split panels contain two child containers",
    },

    // Carousel items
    {
      name: "carousel-children",
      parent: "carousel",
      allowedChildren: ["image", "card", "container", "*"],
      reason: "Carousel contains slides of images or content",
    },

    // Dropdown menu
    {
      name: "dropdown-children",
      parent: "dropdown",
      allowedChildren: ["button", "separator", "*"],
      reason: "Dropdown contains menu items and separators",
    },

    // Context menu
    {
      name: "contextmenu-children",
      parent: "contextmenu",
      allowedChildren: ["button", "separator", "*"],
      reason: "Context menu contains menu items and separators",
    },

    // Command palette
    {
      name: "command-children",
      parent: "command",
      allowedChildren: ["*"],
      reason: "Command palette contains command groups and items",
    },

    // Data table (leaf - uses binding)
    {
      name: "data-table-leaf",
      parent: "data-table",
      allowedChildren: [],
      reason: "Data table renders from binding data, not children",
    },

    // List (leaf - uses binding)
    {
      name: "list-leaf",
      parent: "list",
      allowedChildren: [],
      reason: "List renders from binding data, not children",
    },

    // Tree (leaf - uses binding)
    {
      name: "tree-leaf",
      parent: "tree",
      allowedChildren: [],
      reason: "Tree renders from binding data, not children",
    },

    // Kanban (leaf - uses binding)
    {
      name: "kanban-leaf",
      parent: "kanban",
      allowedChildren: [],
      reason: "Kanban renders from binding data, not children",
    },

    // Timeline (leaf - uses binding)
    {
      name: "timeline-leaf",
      parent: "timeline",
      allowedChildren: [],
      reason: "Timeline renders from binding data, not children",
    },

    // Charts are leaf nodes
    {
      name: "charts-leaf",
      parent: "line-chart",
      allowedChildren: [],
      reason: "Charts render from binding data, not children",
    },
    {
      name: "bar-chart-leaf",
      parent: "bar-chart",
      allowedChildren: [],
      reason: "Charts render from binding data, not children",
    },
    {
      name: "area-chart-leaf",
      parent: "area-chart",
      allowedChildren: [],
      reason: "Charts render from binding data, not children",
    },
    {
      name: "pie-chart-leaf",
      parent: "pie-chart",
      allowedChildren: [],
      reason: "Charts render from binding data, not children",
    },
    {
      name: "scatter-leaf",
      parent: "scatter",
      allowedChildren: [],
      reason: "Charts render from binding data, not children",
    },
    {
      name: "heatmap-leaf",
      parent: "heatmap",
      allowedChildren: [],
      reason: "Charts render from binding data, not children",
    },
    {
      name: "sankey-leaf",
      parent: "sankey",
      allowedChildren: [],
      reason: "Charts render from binding data, not children",
    },
    {
      name: "flow-leaf",
      parent: "flow",
      allowedChildren: [],
      reason: "Flow diagrams render from binding data, not children",
    },
    {
      name: "org-leaf",
      parent: "org",
      allowedChildren: [],
      reason: "Org charts render from binding data, not children",
    },
    {
      name: "map-leaf",
      parent: "map",
      allowedChildren: [],
      reason: "Maps render from binding data, not children",
    },
  ],
};

// ============================================================================
// Composition Patterns
// ============================================================================

/**
 * Common composition patterns that demonstrate best practices.
 * LLMs should prefer these patterns when generating UI structures.
 */
export const compositionPatterns: CompositionPattern[] = [
  // -------------------------------------------------------------------------
  // Layout Patterns
  // -------------------------------------------------------------------------
  {
    name: "dashboard-layout",
    description: "Standard dashboard with sidebar navigation, header, and content grid",
    structure: `{
  type: "container",
  children: [
    { type: "sidebar", children: [{ type: "nav", ... }] },
    {
      type: "stack",
      children: [
        { type: "header", children: [{ type: "heading" }, { type: "avatar" }] },
        {
          type: "grid",
          style: { columns: 3 },
          children: [
            { type: "kpi-card", ... },
            { type: "kpi-card", ... },
            { type: "kpi-card", ... }
          ]
        }
      ]
    }
  ]
}`,
    when: [
      "Building admin dashboards",
      "Creating analytics pages",
      "Multi-section application layouts",
    ],
  },

  {
    name: "kpi-grid",
    description: "Grid of KPI cards for metrics overview",
    structure: `{
  type: "grid",
  style: { columns: 4, gap: "md" },
  children: [
    { type: "kpi-card", label: "Revenue", binding: { field: "revenue" }, props: { trend: { field: "revenueTrend" } } },
    { type: "kpi-card", label: "Users", binding: { field: "users" }, props: { trend: { field: "usersTrend" } } },
    { type: "kpi-card", label: "Orders", binding: { field: "orders" } },
    { type: "kpi-card", label: "Conversion", binding: { field: "conversion" } }
  ]
}`,
    when: [
      "Displaying key metrics",
      "Executive summary sections",
      "Dashboard top-level overview",
    ],
  },

  {
    name: "master-detail",
    description: "Split view with list on left, detail on right",
    structure: `{
  type: "split",
  style: { defaultSplit: 30, direction: "horizontal" },
  children: [
    { type: "card", children: [{ type: "list", binding: { field: "items" } }] },
    { type: "card", children: [{ type: "stack", children: [...] }] }
  ]
}`,
    when: [
      "Email/message interfaces",
      "File browsers",
      "Settings with item detail",
    ],
  },

  {
    name: "page-header",
    description: "Page title with breadcrumb and actions",
    structure: `{
  type: "header",
  children: [
    { type: "stack", style: { gap: "xs" }, children: [
      { type: "breadcrumb", children: [{ type: "crumb", label: "Home" }, { type: "crumb", label: "Products" }] },
      { type: "heading", label: "Products", style: { level: 1 } }
    ]},
    { type: "button", label: "Add Product", props: { variant: "primary" } }
  ]
}`,
    when: [
      "Page-level headers",
      "Section introductions with actions",
      "Breadcrumb navigation context",
    ],
  },

  // -------------------------------------------------------------------------
  // Form Patterns
  // -------------------------------------------------------------------------
  {
    name: "form-with-validation",
    description: "Standard form with stacked fields and submit button",
    structure: `{
  type: "form",
  signals: { emit: "submitForm" },
  children: [
    {
      type: "stack",
      style: { gap: "md" },
      children: [
        { type: "input", label: "Name", binding: { field: "name" }, props: { required: true } },
        { type: "input", label: "Email", binding: { field: "email" }, props: { type: "email", required: true } },
        { type: "textarea", label: "Message", binding: { field: "message" } },
        { type: "button", label: "Submit", props: { type: "submit", variant: "primary" } }
      ]
    }
  ]
}`,
    when: [
      "Contact forms",
      "User input forms",
      "Settings forms",
    ],
  },

  {
    name: "form-grid",
    description: "Two-column form layout for compact display",
    structure: `{
  type: "form",
  children: [
    {
      type: "grid",
      style: { columns: 2, gap: "md" },
      children: [
        { type: "input", label: "First Name", binding: { field: "firstName" } },
        { type: "input", label: "Last Name", binding: { field: "lastName" } },
        { type: "input", label: "Email", binding: { field: "email" } },
        { type: "input", label: "Phone", binding: { field: "phone" } }
      ]
    },
    { type: "button", label: "Save", props: { type: "submit" } }
  ]
}`,
    when: [
      "Profile forms",
      "Address forms",
      "Multi-field compact layouts",
    ],
  },

  {
    name: "confirmation-modal",
    description: "Modal dialog for confirming destructive actions",
    structure: `{
  type: "modal",
  label: "Confirm Delete",
  style: { size: "sm" },
  signals: { receive: "confirmDeleteOpen" },
  children: [
    { type: "text", label: "Are you sure you want to delete this item? This action cannot be undone." },
    {
      type: "stack",
      style: { gap: "sm", direction: "row", justify: "end" },
      children: [
        { type: "button", label: "Cancel", props: { variant: "ghost" }, signals: { emit: "confirmDeleteClose" } },
        { type: "button", label: "Delete", props: { variant: "destructive" }, signals: { emit: "confirmDelete" } }
      ]
    }
  ]
}`,
    when: [
      "Delete confirmations",
      "Destructive action warnings",
      "Important decisions",
    ],
  },

  // -------------------------------------------------------------------------
  // Data Display Patterns
  // -------------------------------------------------------------------------
  {
    name: "data-page",
    description: "Full data page with header, filters, table, and pagination",
    structure: `{
  type: "stack",
  style: { gap: "lg" },
  children: [
    { type: "header", children: [{ type: "heading", label: "Users" }, { type: "button", label: "Add User" }] },
    { type: "input", label: "Search", props: { icon: "search", placeholder: "Search users..." }, binding: { field: "search" } },
    { type: "data-table", binding: { field: "users" }, props: { columns: [...] } },
    { type: "pagination", binding: { field: "page" }, props: { totalPages: { field: "totalPages" } } }
  ]
}`,
    when: [
      "User management pages",
      "Product listings",
      "Any paginated data view",
    ],
  },

  {
    name: "chart-card",
    description: "Chart wrapped in card with heading",
    structure: `{
  type: "card",
  children: [
    { type: "heading", label: "Revenue Over Time", style: { level: 3 } },
    { type: "line-chart", binding: { field: "revenueData" }, props: { xKey: "date", yKey: "revenue" } }
  ]
}`,
    when: [
      "Dashboard chart panels",
      "Analytics visualizations",
      "Report sections",
    ],
  },

  {
    name: "stats-with-chart",
    description: "KPI card with inline sparkline",
    structure: `{
  type: "kpi-card",
  label: "Monthly Revenue",
  binding: { field: "currentRevenue" },
  props: {
    trend: { field: "revenueTrend" },
    prefix: "$"
  },
  children: [
    { type: "sparkline", binding: { field: "revenueHistory" } }
  ]
}`,
    when: [
      "Compact metric displays",
      "Dashboard KPIs with trend",
      "Executive summaries",
    ],
  },

  // -------------------------------------------------------------------------
  // Navigation Patterns
  // -------------------------------------------------------------------------
  {
    name: "sidebar-navigation",
    description: "Collapsible sidebar with grouped navigation",
    structure: `{
  type: "sidebar",
  children: [
    { type: "heading", label: "Main", style: { level: 6 } },
    { type: "nav", label: "Dashboard", props: { icon: "home", href: "/dashboard" } },
    { type: "nav", label: "Analytics", props: { icon: "bar-chart", href: "/analytics" } },
    { type: "separator" },
    { type: "heading", label: "Settings", style: { level: 6 } },
    { type: "nav", label: "Profile", props: { icon: "user", href: "/settings/profile" } },
    { type: "nav", label: "Team", props: { icon: "users", href: "/settings/team" } }
  ]
}`,
    when: [
      "Application navigation",
      "Admin panels",
      "Multi-section apps",
    ],
  },

  {
    name: "tabbed-content",
    description: "Content organized in tabs",
    structure: `{
  type: "tabs",
  binding: { field: "activeTab" },
  children: [
    { type: "tab", label: "Overview", children: [{ type: "stack", children: [...] }] },
    { type: "tab", label: "Details", children: [{ type: "stack", children: [...] }] },
    { type: "tab", label: "History", children: [{ type: "timeline", binding: { field: "history" } }] }
  ]
}`,
    when: [
      "Detail pages with multiple sections",
      "Settings pages",
      "Product/user profiles",
    ],
  },

  {
    name: "wizard-stepper",
    description: "Multi-step form with stepper navigation",
    structure: `{
  type: "stack",
  children: [
    {
      type: "stepper",
      binding: { field: "currentStep" },
      children: [
        { type: "step", label: "Account" },
        { type: "step", label: "Details" },
        { type: "step", label: "Review" }
      ]
    },
    { type: "card", children: [{ type: "form", children: [...] }] },
    {
      type: "stack",
      style: { direction: "row", justify: "between" },
      children: [
        { type: "button", label: "Back", props: { variant: "ghost" } },
        { type: "button", label: "Next", props: { variant: "primary" } }
      ]
    }
  ]
}`,
    when: [
      "Onboarding flows",
      "Checkout processes",
      "Complex form wizards",
    ],
  },

  // -------------------------------------------------------------------------
  // Feedback Patterns
  // -------------------------------------------------------------------------
  {
    name: "empty-state",
    description: "Empty state with illustration and action",
    structure: `{
  type: "card",
  children: [
    { type: "empty", label: "No Results", props: { description: "Try adjusting your search or filters" } },
    { type: "button", label: "Clear Filters", props: { variant: "outline" } }
  ]
}`,
    when: [
      "Search with no results",
      "Empty data tables",
      "First-time user states",
    ],
  },

  {
    name: "loading-skeleton",
    description: "Skeleton loading state for cards",
    structure: `{
  type: "grid",
  style: { columns: 3 },
  children: [
    { type: "card", children: [{ type: "skeleton", style: { height: "200px" } }] },
    { type: "card", children: [{ type: "skeleton", style: { height: "200px" } }] },
    { type: "card", children: [{ type: "skeleton", style: { height: "200px" } }] }
  ]
}`,
    when: [
      "Loading states for grids",
      "Async data fetching",
      "Progressive loading",
    ],
  },

  {
    name: "alert-banner",
    description: "Alert notification at top of content",
    structure: `{
  type: "stack",
  children: [
    { type: "alert", label: "Payment Required", props: { variant: "warning", description: "Your subscription expires in 3 days" } },
    { type: "container", children: [...] }
  ]
}`,
    when: [
      "System notifications",
      "Warning messages",
      "Important announcements",
    ],
  },
];

// ============================================================================
// Anti-Patterns
// ============================================================================

/**
 * Composition anti-patterns that should be avoided.
 * LLMs should recognize and refuse to generate these patterns.
 */
export const antiPatterns: AntiPattern[] = [
  // -------------------------------------------------------------------------
  // Nesting Anti-patterns
  // -------------------------------------------------------------------------
  {
    name: "deeply-nested-grids",
    description: "Grids nested more than 2 levels deep create layout complexity and performance issues",
    example: `{
  type: "grid",
  children: [{
    type: "grid",
    children: [{
      type: "grid",
      children: [{
        type: "grid",  // 4 levels deep - BAD
        children: [...]
      }]
    }]
  }]
}`,
    fix: "Flatten the structure using stack for vertical flow or refactor to use fewer grid levels. Max 2 levels of grid nesting.",
  },

  {
    name: "nested-modals",
    description: "Modal inside modal creates focus trap conflicts and confusing UX",
    example: `{
  type: "modal",
  children: [{
    type: "button",
    signals: { emit: "openNestedModal" }
  }, {
    type: "modal",  // Nested modal - BAD
    signals: { receive: "openNestedModal" }
  }]
}`,
    fix: "Use a single modal that changes content, or use sheet/drawer for secondary panels. Chain modals sequentially, not nested.",
  },

  {
    name: "container-in-container",
    description: "Nested containers with same purpose add unnecessary wrapper elements",
    example: `{
  type: "container",
  children: [{
    type: "container",  // Redundant - BAD
    children: [{
      type: "container",  // Even more redundant - BAD
      children: [...]
    }]
  }]
}`,
    fix: "Use a single container with appropriate styling. Use stack for vertical grouping within containers.",
  },

  // -------------------------------------------------------------------------
  // Chart Anti-patterns
  // -------------------------------------------------------------------------
  {
    name: "chart-without-container",
    description: "Charts rendered directly without card wrapper lack proper framing",
    example: `{
  type: "stack",
  children: [
    { type: "line-chart", binding: { field: "data" } },  // No container - BAD
    { type: "bar-chart", binding: { field: "data" } }
  ]
}`,
    fix: "Wrap charts in card components with a heading describing the data. Charts need visual boundaries.",
  },

  {
    name: "text-inside-chart",
    description: "Text components inside chart components are ignored",
    example: `{
  type: "line-chart",
  children: [
    { type: "heading", label: "Revenue" },  // Ignored - BAD
    { type: "text", label: "Description" }
  ]
}`,
    fix: "Place heading and text as siblings before/after the chart. Charts are leaf nodes that render from bindings only.",
  },

  {
    name: "chart-children",
    description: "Charts cannot have children - they render from data bindings",
    example: `{
  type: "pie-chart",
  binding: { field: "data" },
  children: [
    { type: "badge", label: "New" }  // Ignored - BAD
  ]
}`,
    fix: "Remove children from charts. Use card wrapper to add labels, badges, or other content around the chart.",
  },

  // -------------------------------------------------------------------------
  // Form Anti-patterns
  // -------------------------------------------------------------------------
  {
    name: "form-without-submit",
    description: "Forms without submit button leave users unable to submit",
    example: `{
  type: "form",
  children: [
    { type: "input", label: "Name" },
    { type: "input", label: "Email" }
    // No submit button - BAD
  ]
}`,
    fix: "Always include a button with type='submit' or emit a submit signal. Forms need explicit submission mechanism.",
  },

  {
    name: "inputs-outside-form",
    description: "Form inputs outside form element break form semantics and submission",
    example: `{
  type: "stack",
  children: [
    { type: "input", label: "Name" },  // Outside form - BAD
    { type: "input", label: "Email" },
    { type: "form", children: [
      { type: "button", label: "Submit" }
    ]}
  ]
}`,
    fix: "Move all form inputs inside the form element. The form should wrap all related inputs and the submit button.",
  },

  {
    name: "nested-forms",
    description: "Nested form elements are invalid HTML and cause undefined behavior",
    example: `{
  type: "form",
  children: [
    { type: "form",  // Nested form - BAD
      children: [
        { type: "input", label: "Name" }
      ]
    }
  ]
}`,
    fix: "Use a single form. If you need form sections, use stack or card for visual grouping within one form.",
  },

  // -------------------------------------------------------------------------
  // Layout Anti-patterns
  // -------------------------------------------------------------------------
  {
    name: "sidebar-in-modal",
    description: "Sidebar navigation inside modal creates confusing context",
    example: `{
  type: "modal",
  children: [
    { type: "sidebar",  // App nav in modal - BAD
      children: [{ type: "nav", label: "Dashboard" }]
    }
  ]
}`,
    fix: "Use nav items or tabs for in-modal navigation. Sidebar is for app-level navigation only.",
  },

  {
    name: "multiple-headers",
    description: "Multiple header components create redundant navigation areas",
    example: `{
  type: "container",
  children: [
    { type: "header", children: [...] },
    { type: "header", children: [...] },  // Redundant - BAD
    { type: "container", children: [...] }
  ]
}`,
    fix: "Use a single header with all necessary elements. For sub-section headers, use heading components instead.",
  },

  {
    name: "split-without-two-children",
    description: "Split component requires exactly two children for its panels",
    example: `{
  type: "split",
  children: [
    { type: "container", children: [...] }
    // Missing second panel - BAD
  ]
}`,
    fix: "Split requires exactly two children - one for each panel. Add a second container for the right/bottom panel.",
  },

  // -------------------------------------------------------------------------
  // Data Display Anti-patterns
  // -------------------------------------------------------------------------
  {
    name: "data-table-with-children",
    description: "Data tables render from bindings, children are ignored",
    example: `{
  type: "data-table",
  binding: { field: "users" },
  children: [
    { type: "text", label: "Row content" }  // Ignored - BAD
  ]
}`,
    fix: "Remove children from data-table. Configure columns via props.columns array. Data comes from binding.",
  },

  {
    name: "pagination-without-binding",
    description: "Pagination without page binding cannot track or change pages",
    example: `{
  type: "pagination",
  props: { totalPages: 10 }  // No binding - BAD
}`,
    fix: "Add binding to track current page: binding: { field: 'currentPage' }. Pagination needs state to function.",
  },

  // -------------------------------------------------------------------------
  // Semantic Anti-patterns
  // -------------------------------------------------------------------------
  {
    name: "heading-for-styling",
    description: "Using heading components just for visual size instead of semantic structure",
    example: `{
  type: "stack",
  children: [
    { type: "heading", label: "Bold Text", style: { level: 4 } },  // For styling only - BAD
    { type: "heading", label: "Smaller Bold", style: { level: 5 } }
  ]
}`,
    fix: "Use text with style.weight='bold' for visual styling. Reserve headings for actual document structure and hierarchy.",
  },

  {
    name: "skipped-heading-levels",
    description: "Jumping from h1 to h4 breaks document outline and accessibility",
    example: `{
  type: "stack",
  children: [
    { type: "heading", label: "Page Title", style: { level: 1 } },
    { type: "heading", label: "Subsection", style: { level: 4 } }  // Skipped 2,3 - BAD
  ]
}`,
    fix: "Use sequential heading levels (1, 2, 3). If you need visual size difference, use style.size separate from level.",
  },

  {
    name: "interactive-inside-interactive",
    description: "Nesting clickable elements causes event handling conflicts",
    example: `{
  type: "button",
  children: [
    { type: "button", label: "Inner" }  // Button in button - BAD
  ]
}`,
    fix: "Never nest buttons, links, or other clickable elements. Restructure to have separate clickable areas.",
  },
];

// ============================================================================
// Exports
// ============================================================================

export default {
  compositionRules,
  compositionPatterns,
  antiPatterns,
};
