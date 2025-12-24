// Component Registry - Maps block types to React components
import type { ComponentType } from 'react';
import type { Block } from '../compiler/ui-emitter';
import type { DataContext } from './data-context';

/**
 * Props passed to all Liquid components
 */
export interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
}

/**
 * Component registry maps block types to React components
 */
export type ComponentRegistry = Record<string, ComponentType<LiquidComponentProps>>;

/**
 * Default component registry with built-in components
 * Users can extend or override these
 */
export const componentRegistry: ComponentRegistry = {};

/**
 * Register a component for a block type
 */
export function registerComponent(type: string, component: ComponentType<LiquidComponentProps>): void {
  componentRegistry[type] = component;
}

/**
 * Get component for a block type, with fallback
 */
export function getComponent(type: string): ComponentType<LiquidComponentProps> | undefined {
  return componentRegistry[type];
}
