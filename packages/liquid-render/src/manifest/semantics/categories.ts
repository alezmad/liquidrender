// Semantic Category Tree
// Organizes all LiquidRender components into a hierarchical taxonomy
// for LLM reasoning and intelligent component selection

import type { CategoryTree } from "../types";

/**
 * Complete category hierarchy for all 77+ LiquidRender components.
 * Categories follow a semantic structure optimized for:
 * - Component discovery (what's available?)
 * - Intent matching (what fits this use case?)
 * - Composition guidance (what goes together?)
 */
export const categoryTree: CategoryTree = {
  // ============================================================================
  // Layout - Structural containers and spatial organization
  // ============================================================================
  layout: {
    description:
      "Structural components for page layout and spatial organization. Use these to define the visual hierarchy and flow of content.",
    components: ["container", "grid", "stack", "split", "sidebar", "header", "nav", "separator"],
    subcategories: {
      container: {
        description:
          "Wrapper components that provide boundaries, padding, and max-width constraints. Starting point for most layouts.",
        components: ["container"],
      },
      grid: {
        description:
          "Multi-column and flexible layout systems. Use grid for 2D layouts, stack for 1D, split for two-panel designs.",
        components: ["grid", "stack", "split"],
      },
    },
  },

  // ============================================================================
  // Typography - Text and heading elements
  // ============================================================================
  typography: {
    description:
      "Text rendering components for all textual content. Choose based on semantic meaning, not visual size.",
    components: ["heading", "text"],
    subcategories: {
      heading: {
        description:
          "Section headings (h1-h6). Use for structural hierarchy. Only one h1 per page. Headings should not skip levels.",
        components: ["heading"],
      },
      body: {
        description:
          "Body text, paragraphs, and inline text. Use for readable content, descriptions, and labels.",
        components: ["text"],
      },
    },
  },

  // ============================================================================
  // Navigation - User wayfinding and page transitions
  // ============================================================================
  navigation: {
    description:
      "Components that help users navigate between pages, sections, or states. Essential for multi-page apps and complex UIs.",
    components: ["breadcrumb", "tabs", "stepper", "pagination", "nav", "sidebar"],
    subcategories: {
      menu: {
        description:
          "Primary navigation elements. Nav for horizontal menus, sidebar for vertical persistent navigation.",
        components: ["nav", "sidebar"],
      },
      breadcrumb: {
        description:
          "Location indicators showing the user's current position in a hierarchy. Always link all items except current page.",
        components: ["breadcrumb"],
      },
      tabs: {
        description:
          "In-page navigation between related content panels. Use when content is mutually exclusive and related.",
        components: ["tabs"],
      },
      pagination: {
        description:
          "Navigation through paged content. Use stepper for multi-step processes, pagination for data lists.",
        components: ["pagination", "stepper"],
      },
    },
  },

  // ============================================================================
  // Data Display - Presenting information to users
  // ============================================================================
  "data-display": {
    description:
      "Components for rendering and organizing data visually. The core of any data-driven application.",
    components: [
      "card",
      "kpi-card",
      "badge",
      "tag",
      "avatar",
      "icon",
      "image",
      "list",
      "tree",
      "data-table",
      "timeline",
      "kanban",
      "calendar",
      "empty",
    ],
    subcategories: {
      metrics: {
        description:
          "Single-value displays for KPIs and statistics. Use kpi-card for prominent metrics, badge/tag for inline indicators.",
        components: ["kpi-card", "badge", "tag"],
      },
      collections: {
        description:
          "Display multiple related items. Choose based on data structure: list for simple, tree for hierarchical, table for tabular, kanban for workflow states.",
        components: ["list", "tree", "data-table", "timeline", "kanban", "calendar"],
      },
      media: {
        description:
          "Visual content display. Avatar for user identity, icon for symbolic meaning, image for rich content.",
        components: ["avatar", "icon", "image"],
      },
    },
  },

  // ============================================================================
  // Charts - Data visualization
  // ============================================================================
  charts: {
    description:
      "Data visualization components for trends, comparisons, and distributions. Choose chart type based on the insight you want to communicate.",
    components: [
      "line-chart",
      "area-chart",
      "sparkline",
      "bar-chart",
      "pie-chart",
      "scatter",
      "gauge",
      "heatmap",
      "sankey",
      "flow",
      "org",
      "map",
    ],
    subcategories: {
      line: {
        description:
          "Trend visualization over time or continuous data. Line for trends, area for volume, sparkline for inline compact view.",
        components: ["line-chart", "area-chart", "sparkline"],
      },
      bar: {
        description:
          "Categorical comparisons. Use horizontal bars for long labels, vertical for time series or small label counts.",
        components: ["bar-chart"],
      },
      pie: {
        description:
          "Part-to-whole relationships. Limit to 5-7 segments. Consider bar chart for precise comparisons.",
        components: ["pie-chart"],
      },
      scatter: {
        description:
          "Correlation and distribution analysis. Shows relationship between two numerical variables.",
        components: ["scatter"],
      },
      specialized: {
        description:
          "Domain-specific visualizations. Gauge for single metrics with ranges, heatmap for density, sankey for flows, flow/org for structures, map for geography.",
        components: ["gauge", "heatmap", "sankey", "flow", "org", "map"],
      },
    },
  },

  // ============================================================================
  // Forms - User input and data collection
  // ============================================================================
  forms: {
    description:
      "Components for collecting user input. Always pair with proper labels, validation feedback, and accessibility attributes.",
    components: [
      "form",
      "input",
      "textarea",
      "otp",
      "select",
      "checkbox",
      "radio",
      "switch",
      "date",
      "daterange",
      "time",
      "color",
      "rating",
      "range",
      "upload",
      "button",
    ],
    subcategories: {
      input: {
        description:
          "Text entry fields. Use input for single-line, textarea for multi-line, otp for verification codes.",
        components: ["input", "textarea", "otp"],
      },
      selection: {
        description:
          "Choosing from options. Select for single choice from many, radio for few visible options, checkbox for multiple selections, switch for binary toggles.",
        components: ["select", "checkbox", "radio", "switch"],
      },
      specialized: {
        description:
          "Domain-specific inputs. Date/time pickers, color picker, rating scales, sliders, file upload.",
        components: ["date", "daterange", "time", "color", "rating", "range", "upload"],
      },
    },
  },

  // ============================================================================
  // Feedback - System-to-user communication
  // ============================================================================
  feedback: {
    description:
      "Components for communicating system state, validation results, and action outcomes to users.",
    components: ["alert", "toast", "progress", "spinner", "skeleton"],
    subcategories: {
      status: {
        description:
          "Persistent status messages. Alert for in-page messages that don't disappear. Use appropriate severity (info, warning, error, success).",
        components: ["alert"],
      },
      confirmation: {
        description:
          "Transient notifications. Toast for action confirmations that auto-dismiss. Use sparingly.",
        components: ["toast"],
      },
      progress: {
        description:
          "Loading and progress indicators. Progress for determinate operations with known duration, spinner for indeterminate, skeleton for content placeholders.",
        components: ["progress", "spinner", "skeleton"],
      },
    },
  },

  // ============================================================================
  // Overlays - Content above the main layer
  // ============================================================================
  overlays: {
    description:
      "Components that appear above the main content layer. Use sparingly as they interrupt user flow.",
    components: [
      "modal",
      "drawer",
      "sheet",
      "popover",
      "tooltip",
      "dropdown",
      "contextmenu",
      "hovercard",
      "alertdialog",
      "command",
    ],
    subcategories: {
      modal: {
        description:
          "Blocking dialogs requiring user action. Modal for complex forms, alertdialog for confirmations, sheet/drawer for side panels.",
        components: ["modal", "alertdialog", "drawer", "sheet"],
      },
      popover: {
        description:
          "Non-blocking floating content. Popover for interactive content, dropdown for menus, contextmenu for right-click actions, command for command palettes.",
        components: ["popover", "dropdown", "contextmenu", "command"],
      },
      tooltip: {
        description:
          "Hover-triggered supplementary info. Tooltip for brief help text, hovercard for rich previews.",
        components: ["tooltip", "hovercard"],
      },
    },
  },

  // ============================================================================
  // Disclosure - Show/hide content
  // ============================================================================
  disclosure: {
    description:
      "Components that reveal or hide content. Use to reduce visual complexity and let users focus on relevant sections.",
    components: ["accordion", "collapsible"],
  },

  // ============================================================================
  // Media - Audio, video, and image galleries
  // ============================================================================
  media: {
    description:
      "Rich media playback and gallery components. Consider accessibility (captions, alt text) and performance (lazy loading).",
    components: ["video", "audio", "carousel", "lightbox"],
  },

  // ============================================================================
  // Actions - User-triggered operations
  // ============================================================================
  actions: {
    description:
      "Components that trigger operations. Primary actions should be visually prominent, secondary actions subdued.",
    components: ["button"],
  },
};
