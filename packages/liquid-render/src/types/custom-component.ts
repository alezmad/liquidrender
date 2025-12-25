/**
 * Custom Component Types for LLM-Generated Components
 *
 * These types define the contract between:
 * - LiquidSchema (portable, platform-agnostic)
 * - Custom component implementations (platform-specific)
 *
 * @see packages/liquid-render/specs/LLM-REACT-CODE-ARCHITECTURE.md
 */

import type { Block, Binding } from '../compiler/ui-emitter';

// ============================================================================
// Schema Types (Platform-Agnostic)
// ============================================================================

/**
 * Custom block in LiquidSchema
 * Referenced by componentId, implementation is platform-specific
 */
export interface CustomBlock extends Omit<Block, 'type'> {
  type: 'custom';

  /** Unique identifier for the custom component */
  componentId: string;

  /** Additional serializable props passed to component */
  props?: Record<string, unknown>;
}

/**
 * Type guard to check if a block is a CustomBlock
 */
export function isCustomBlock(block: Block): block is CustomBlock {
  return block.type === 'custom';
}

// ============================================================================
// Component Contract (For LLM Generation)
// ============================================================================

/**
 * Contract definition for custom components
 * Used by LLM to understand what props are available
 */
export interface CustomComponentContract {
  /** Unique identifier matching componentId in schema */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description for LLM context */
  description?: string;

  /** Props schema (JSON Schema subset) */
  props: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      required?: boolean;
      default?: unknown;
      description?: string;
      enum?: unknown[];
    };
  };

  /** Expected binding types */
  bindings?: {
    primary?: 'array' | 'object' | 'string' | 'number' | 'any';
    secondary?: 'array' | 'object' | 'string' | 'number' | 'any';
  };

  /** Example DSL usage */
  example?: string;
}

// ============================================================================
// React Implementation Types
// ============================================================================

/**
 * Props passed to custom component implementations
 * Platform-specific (React version)
 */
export interface CustomComponentProps<T = unknown> {
  /** The block definition from schema */
  block: CustomBlock;

  /** Data context for binding resolution */
  data: T;

  /** Pre-rendered children (if any) */
  children?: React.ReactNode;
}

/**
 * Type for custom component registration
 */
export type CustomComponentType = React.ComponentType<CustomComponentProps>;

/**
 * Registry of custom components
 */
export type CustomComponentRegistry = Record<string, CustomComponentType>;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract props type from a custom component contract
 */
export type ExtractProps<C extends CustomComponentContract> = {
  [K in keyof C['props']]?: C['props'][K]['type'] extends 'string'
    ? string
    : C['props'][K]['type'] extends 'number'
      ? number
      : C['props'][K]['type'] extends 'boolean'
        ? boolean
        : C['props'][K]['type'] extends 'array'
          ? unknown[]
          : C['props'][K]['type'] extends 'object'
            ? Record<string, unknown>
            : unknown;
};
