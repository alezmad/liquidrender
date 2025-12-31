// Design Token Manifest
// Machine-readable token definitions for LLM-assisted UI generation
// Extracted from renderer/components/utils.ts

import type { TokenManifest } from "./types";

// ============================================================================
// Token Manifest Export
// ============================================================================

/**
 * Complete design token manifest for the LiquidRender system
 * Enables LLMs to understand and apply the design system correctly
 *
 * All tokens support CSS variable overrides with fallback values.
 * Pattern: var(--token-name, fallback-value)
 */
export const tokenManifest: TokenManifest = {
  // ==========================================================================
  // Colors
  // ==========================================================================
  colors: {
    // Core colors
    background: {
      value: "var(--background, #ffffff)",
      description: "Page/app background color",
    },
    foreground: {
      value: "var(--foreground, #0a0a0a)",
      description: "Primary text color",
    },

    // Card surfaces
    card: {
      value: "var(--card, #ffffff)",
      description: "Card background color",
    },
    cardForeground: {
      value: "var(--card-foreground, #0a0a0a)",
      description: "Text color on cards",
    },

    // Primary action colors
    primary: {
      value: "var(--primary, #171717)",
      description: "Primary action/brand color (buttons, links)",
    },
    primaryForeground: {
      value: "var(--primary-foreground, #fafafa)",
      description: "Text color on primary backgrounds",
    },

    // Secondary action colors
    secondary: {
      value: "var(--secondary, #f5f5f5)",
      description: "Secondary action color (less prominent buttons)",
    },
    secondaryForeground: {
      value: "var(--secondary-foreground, #171717)",
      description: "Text color on secondary backgrounds",
    },

    // Muted content
    muted: {
      value: "var(--muted, #f5f5f5)",
      description: "Muted/subdued background for less important content",
    },
    mutedForeground: {
      value: "var(--muted-foreground, #737373)",
      description: "Text color for muted/secondary content",
    },

    // Accent highlights
    accent: {
      value: "var(--accent, #f5f5f5)",
      description: "Accent color for highlights and focus states",
    },
    accentForeground: {
      value: "var(--accent-foreground, #171717)",
      description: "Text color on accent backgrounds",
    },

    // Destructive actions
    destructive: {
      value: "var(--destructive, #ef4444)",
      description: "Color for destructive/dangerous actions (delete, remove)",
    },
    destructiveForeground: {
      value: "var(--destructive-foreground, #fafafa)",
      description: "Text color on destructive backgrounds",
    },

    // UI elements
    border: {
      value: "var(--border, #e5e5e5)",
      description: "Border color for cards, inputs, dividers",
    },
    input: {
      value: "var(--input, #e5e5e5)",
      description: "Border color specifically for input fields",
    },
    ring: {
      value: "var(--ring, #0a0a0a)",
      description: "Focus ring color for accessibility",
    },

    // Semantic status colors
    success: {
      value: "var(--success, #22c55e)",
      description: "Success state color (green) - confirmations, positive values",
    },
    warning: {
      value: "var(--warning, #f59e0b)",
      description: "Warning state color (amber) - caution, needs attention",
    },
    error: {
      value: "var(--error, #ef4444)",
      description: "Error state color (red) - errors, validation failures",
    },
    info: {
      value: "var(--info, #3b82f6)",
      description: "Info state color (blue) - informational messages, tips",
    },
  },

  // ==========================================================================
  // Spacing
  // ==========================================================================
  spacing: {
    xs: {
      value: "0.25rem",
      description: "Extra small spacing (4px) - tight spacing between related elements",
    },
    sm: {
      value: "0.5rem",
      description: "Small spacing (8px) - compact layouts, inline elements",
    },
    md: {
      value: "1rem",
      description: "Medium spacing (16px) - default padding, standard gaps",
    },
    lg: {
      value: "1.5rem",
      description: "Large spacing (24px) - section separation, generous padding",
    },
    xl: {
      value: "2rem",
      description: "Extra large spacing (32px) - major section gaps",
    },
    "2xl": {
      value: "3rem",
      description: "2X large spacing (48px) - page-level separation, hero areas",
    },
  },

  // ==========================================================================
  // Border Radius
  // ==========================================================================
  radius: {
    none: {
      value: "0",
      description: "No border radius - sharp corners",
    },
    sm: {
      value: "0.25rem",
      description: "Small radius (4px) - subtle rounding for small elements",
    },
    md: {
      value: "0.375rem",
      description: "Medium radius (6px) - default for buttons, inputs",
    },
    lg: {
      value: "0.5rem",
      description: "Large radius (8px) - cards, modals, prominent elements",
    },
    xl: {
      value: "0.75rem",
      description: "Extra large radius (12px) - featured cards, hero elements",
    },
    full: {
      value: "9999px",
      description: "Full radius - circular elements, pills, avatars",
    },
  },

  // ==========================================================================
  // Font Sizes
  // ==========================================================================
  fontSize: {
    xs: {
      value: "0.75rem",
      description: "Extra small (12px) - captions, fine print, badges",
    },
    sm: {
      value: "0.875rem",
      description: "Small (14px) - secondary text, input labels, table cells",
    },
    base: {
      value: "1rem",
      description: "Base size (16px) - body text, default paragraph",
    },
    lg: {
      value: "1.125rem",
      description: "Large (18px) - emphasized text, lead paragraphs",
    },
    xl: {
      value: "1.25rem",
      description: "Extra large (20px) - subheadings, card titles",
    },
    "2xl": {
      value: "1.5rem",
      description: "2X large (24px) - section headings, h3",
    },
    "3xl": {
      value: "1.875rem",
      description: "3X large (30px) - major headings, h2",
    },
    "4xl": {
      value: "2.25rem",
      description: "4X large (36px) - page titles, h1, hero text",
    },
  },

  // ==========================================================================
  // Font Weights
  // ==========================================================================
  fontWeight: {
    normal: {
      value: "400",
      description: "Normal weight - body text, default paragraphs",
    },
    medium: {
      value: "500",
      description: "Medium weight - slightly emphasized text, labels",
    },
    semibold: {
      value: "600",
      description: "Semibold - buttons, important labels, subheadings",
    },
    bold: {
      value: "700",
      description: "Bold - headings, strong emphasis, key values",
    },
  },

  // ==========================================================================
  // Shadows
  // ==========================================================================
  shadows: {
    none: {
      value: "none",
      description: "No shadow - flat elements",
    },
    sm: {
      value: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      description: "Small shadow - subtle depth for cards, buttons",
    },
    md: {
      value: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      description: "Medium shadow - elevated cards, dropdowns",
    },
    lg: {
      value: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      description: "Large shadow - modals, popovers, prominent overlays",
    },
  },

  // ==========================================================================
  // Transitions
  // ==========================================================================
  transitions: {
    fast: {
      value: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
      description: "Fast transition (150ms) - hover states, micro-interactions",
    },
    normal: {
      value: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
      description: "Normal transition (200ms) - default animations, state changes",
    },
    slow: {
      value: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
      description: "Slow transition (300ms) - complex animations, page transitions",
    },
  },
};

// ============================================================================
// Chart Colors (Supplementary)
// ============================================================================

/**
 * Chart color palette for data visualization
 * Consistent, accessible colors optimized for distinguishability
 */
export const chartColorManifest: Record<string, { value: string; description: string }> = {
  blue: {
    value: "#3b82f6",
    description: "Primary chart color - default series, primary metrics",
  },
  green: {
    value: "#22c55e",
    description: "Success/positive - growth, profit, positive trends",
  },
  amber: {
    value: "#f59e0b",
    description: "Warning/neutral - caution, pending, secondary metrics",
  },
  red: {
    value: "#ef4444",
    description: "Error/negative - decline, loss, negative trends",
  },
  violet: {
    value: "#8b5cf6",
    description: "Accent - categories, distinct series 5",
  },
  pink: {
    value: "#ec4899",
    description: "Accent - categories, distinct series 6",
  },
  cyan: {
    value: "#06b6d4",
    description: "Accent - categories, distinct series 7",
  },
  lime: {
    value: "#84cc16",
    description: "Accent - categories, distinct series 8",
  },
};

export default tokenManifest;
