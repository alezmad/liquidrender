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
import { Avatar } from './components/avatar';
import { Sidebar } from './components/sidebar';
import { Tabs } from './components/tabs';
import { DateRange } from './components/daterange';
import { Header } from './components/header';
import { Badge } from './components/badge';
import { Breadcrumb } from './components/breadcrumb';
import { Nav } from './components/nav';
import { List } from './components/list';
import { Image } from './components/image';
import { Sheet } from './components/sheet';
import { Grid } from './components/grid';
import { Stack, VStack, HStack } from './components/stack';
import { AreaChartComponent } from './components/area-chart';
import { Heading } from './components/heading';
import { Textarea } from './components/textarea';
import { DatePicker } from './components/date';

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

  // Display components
  avatar: Avatar,

  // Dashboard components (WF-0003)
  sidebar: Sidebar,
  tabs: Tabs,
  daterange: DateRange,
  header: Header,
  badge: Badge,
  breadcrumb: Breadcrumb,
  nav: Nav,
  list: List,
  heading: Heading,
  textarea: Textarea,
  date: DatePicker,

  // Wave 2 components (WF-0003)
  image: Image,
  sheet: Sheet,
  grid: Grid,
  stack: Stack,
  vstack: VStack,
  hstack: HStack,
  area: AreaChartComponent,
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
