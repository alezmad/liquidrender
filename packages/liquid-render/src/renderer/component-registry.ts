// Component Registry - Maps block types to React components
import type { ComponentType } from 'react';
import type { Block } from '../compiler/ui-emitter';
import type { DataContext } from './data-context';

// Import all built-in components
import { KPICard } from './components/kpi-card';
import { Button } from './components/button';
import { Text } from './components/text';
import { Container } from './components/container';
import { Card } from './components/card';
import { DataTable } from './components/data-table';
import { LineChartComponent } from './components/line-chart';
import { BarChartComponent } from './components/bar-chart';
import { PieChartComponent } from './components/pie-chart';
import { Modal } from './components/modal';
import { Input } from './components/input';
import { Form } from './components/form';

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
export const componentRegistry: ComponentRegistry = {
  // Core components
  kpi: KPICard,
  button: Button,
  text: Text,
  container: Container,
  card: Card,

  // Data components
  table: DataTable,
  line: LineChartComponent,
  bar: BarChartComponent,
  pie: PieChartComponent,

  // Interactive components
  modal: Modal,
  input: Input,
  form: Form,
};

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

/**
 * Register multiple components at once
 */
export function registerComponents(components: Partial<ComponentRegistry>): void {
  Object.assign(componentRegistry, components);
}

/**
 * Get all registered component types
 */
export function getRegisteredTypes(): string[] {
  return Object.keys(componentRegistry);
}
