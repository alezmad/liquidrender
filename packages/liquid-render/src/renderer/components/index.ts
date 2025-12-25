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

// Heading
export { Heading, StaticHeading } from './heading';

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

// AreaChart
export { AreaChart, AreaChartComponent, StaticAreaChart } from './area-chart';

// ============================================================================
// Interactive Components
// ============================================================================

// Modal
export { Modal, ControlledModal, useModal } from './modal';

// Input
export { Input, ControlledInput, SearchInput } from './input';

// Textarea
export { Textarea, StaticTextarea } from './textarea';

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

// Progress
export { Progress, StaticProgress } from './progress';

// Tag
export { Tag, StaticTag } from './tag';

// Badge
export { Badge, StaticBadge } from './badge';

// Checkbox
export { Checkbox, StaticCheckbox } from './checkbox';

// Switch
export { Switch, StaticSwitch } from './switch';

// Select
export { Select, StaticSelect } from './select';

// Range
export { Range, StaticRange } from './range';

// Icon
export { Icon, StaticIcon } from './icon';

// Avatar
export { Avatar, StaticAvatar } from './avatar';

// Tooltip
export { Tooltip, StaticTooltip } from './tooltip';

// Popover
export { Popover, StaticPopover } from './popover';

// Accordion
export { Accordion, StaticAccordion } from './accordion';

// Drawer
export { Drawer, StaticDrawer } from './drawer';

// Sheet
export { Sheet, StaticSheet, useSheet, useSheetContext } from './sheet';

// Sidebar
export { Sidebar, StaticSidebar } from './sidebar';

// Tabs
export { Tabs, StaticTabs } from './tabs';

// Header
export { Header, StaticHeader } from './header';

// Breadcrumb
export { Breadcrumb, StaticBreadcrumb } from './breadcrumb';

// DateRange
export { DateRange, StaticDateRange } from './daterange';

// DatePicker
export { DatePicker, NativeDatePicker, StaticDatePicker } from './date';

// Nav
export { Nav, StaticNav } from './nav';

// List/Repeater
export { List, StaticList, GridList } from './list';

// Image
export { Image, StaticImage } from './image';

// Stack
export { Stack, VStack, HStack, StaticStack, StaticVStack, StaticHStack } from './stack';

// Grid
export { Grid, StaticGrid, GridItem, ResponsiveGrid } from './grid';

// ============================================================================
// Component Map for Registry
// ============================================================================

import { KPICard } from './kpi-card';
import { Button } from './button';
import { Text } from './text';
import { Heading } from './heading';
import { Container } from './container';
import { Card } from './card';
import { DataTable } from './data-table';
import { LineChartComponent } from './line-chart';
import { BarChartComponent } from './bar-chart';
import { PieChartComponent } from './pie-chart';
import { AreaChartComponent } from './area-chart';
import { Modal } from './modal';
import { Input } from './input';
import { Textarea } from './textarea';
import { Form } from './form';
import { Progress } from './progress';
import { Tag } from './tag';
import { Badge } from './badge';
import { Checkbox } from './checkbox';
import { Switch } from './switch';
import { Icon } from './icon';
import { Select } from './select';
import { Range } from './range';
import { Avatar } from './avatar';
import { Header } from './header';
import { Tooltip } from './tooltip';
import { Popover } from './popover';
import { Accordion } from './accordion';
import { Drawer } from './drawer';
import { Sheet } from './sheet';
import { Sidebar } from './sidebar';
import { Tabs } from './tabs';
import { Breadcrumb } from './breadcrumb';
import { DateRange } from './daterange';
import { DatePicker } from './date';
import { Nav } from './nav';
import { List } from './list';
import { Image } from './image';
import { Stack, VStack, HStack } from './stack';
import { Grid } from './grid';

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
  heading: Heading,
  container: Container,
  card: Card,
  table: DataTable,
  line: LineChartComponent,
  bar: BarChartComponent,
  pie: PieChartComponent,
  area: AreaChartComponent,
  modal: Modal,
  input: Input,
  textarea: Textarea,
  form: Form,
  progress: Progress,
  tag: Tag,
  badge: Badge,
  checkbox: Checkbox,
  switch: Switch,
  select: Select,
  range: Range,
  icon: Icon,
  avatar: Avatar,
  tooltip: Tooltip,
  popover: Popover,
  accordion: Accordion,
  drawer: Drawer,
  sheet: Sheet,
  sidebar: Sidebar,
  tabs: Tabs,
  breadcrumb: Breadcrumb,
  daterange: DateRange,
  date: DatePicker,
  nav: Nav,
  header: Header,
  list: List,
  image: Image,
  stack: Stack,
  vstack: VStack,
  hstack: HStack,
  grid: Grid,
};
