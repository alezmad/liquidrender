// Liquid Components - Barrel Export
// All components for the LiquidCode UI renderer

// ============================================================================
// Utilities & Types
// ============================================================================

export * from './utils';

// ============================================================================
// Core Components
// ============================================================================

// KPI Card
export { KPICard } from './kpi-card';
export { KPICard as default } from './kpi-card';

// Button
export { Button, StaticButton } from './button';

// Text
export { Text, StaticText } from './text';

// Container
export { Container, StaticContainer, GridContainer } from './container';

// Card
export {
  Card,
  CardRoot,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  SimpleCard,
} from './card';

// ============================================================================
// Data Components
// ============================================================================

// DataTable
export { DataTable, StaticTable } from './data-table';

// LineChart
export { LineChart, LineChartComponent, StaticLineChart } from './line-chart';

// BarChart
export { BarChart, BarChartComponent, StaticBarChart } from './bar-chart';

// PieChart
export { PieChart, PieChartComponent, StaticPieChart, DonutChart } from './pie-chart';

// ============================================================================
// Interactive Components
// ============================================================================

// Modal
export { Modal, ControlledModal, useModal } from './modal';

// Input
export { Input, ControlledInput, Textarea, SearchInput } from './input';

// Form
export {
  Form,
  ControlledForm,
  FormField,
  FormRow,
  FormActions,
  useFormContext,
  useField,
} from './form';

// ============================================================================
// Component Map for Registry
// ============================================================================

import { KPICard } from './kpi-card';
import { Button } from './button';
import { Text } from './text';
import { Container } from './container';
import { Card } from './card';
import { DataTable } from './data-table';
import { LineChartComponent } from './line-chart';
import { BarChartComponent } from './bar-chart';
import { PieChartComponent } from './pie-chart';
import { Modal } from './modal';
import { Input } from './input';
import { Form } from './form';

import type { LiquidComponentProps } from './utils';
import type { ComponentType } from 'react';

/**
 * Map of block types to their React components.
 * Used by LiquidUI to render blocks.
 */
export const liquidComponents: Record<string, ComponentType<LiquidComponentProps>> = {
  kpi: KPICard,
  button: Button,
  text: Text,
  container: Container,
  card: Card,
  table: DataTable,
  line: LineChartComponent,
  bar: BarChartComponent,
  pie: PieChartComponent,
  modal: Modal,
  input: Input,
  form: Form,
};
