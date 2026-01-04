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

// MetricKPI (Calculated Metrics)
export { MetricKPI, StaticMetricKPI } from './metric-kpi';

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
// Wave 1 Components (shadcn wrappers)
// ============================================================================

// Alert
export { Alert, StaticAlert } from './alert';

// Calendar
export { Calendar, StaticCalendar } from './calendar';

// Carousel
export { Carousel, StaticCarousel } from './carousel';

// Collapsible
export { Collapsible, StaticCollapsible } from './collapsible';

// OTP
export { OTP, StaticOTP } from './otp';

// Separator
export { Separator, StaticSeparator } from './separator';

// Split
export { Split, StaticSplit, SplitPanel, NestedSplit } from './split';

// Toast
export {
  Toast,
  StaticToast,
  ToastProvider,
  useToast,
} from './toast';
export type {
  ToastVariant,
  ToastPosition,
  ToastAction,
  ToastData,
  ToastOptions,
  ToastContextValue,
  ToastFunction,
  ToastProviderProps,
  StaticToastProps,
} from './toast';

// ============================================================================
// Wave 2 Components (More shadcn wrappers)
// ============================================================================

// AlertDialog
export { AlertDialog, StaticAlertDialog } from './alertdialog';

// Dropdown
export { Dropdown, StaticDropdown } from './dropdown';

// ContextMenu
export { ContextMenu, StaticContextMenu } from './contextmenu';

// Command
export { Command, StaticCommand } from './command';

// Pagination
export { Pagination, StaticPagination } from './pagination';

// HoverCard
export { HoverCard, StaticHoverCard } from './hovercard';

// ============================================================================
// Wave 3 Components (Form controls)
// ============================================================================

// Upload
export { Upload, StaticUpload } from './upload';

// Color
export { Color, StaticColor } from './color';

// Time
export { Time, StaticTime } from './time';

// Rating
export { Rating, StaticRating } from './rating';

// Empty
export { Empty, StaticEmpty } from './empty';

// ============================================================================
// Wave 4 Components (Loading states)
// ============================================================================

// Skeleton
export { Skeleton, StaticSkeleton } from './skeleton';

// Spinner
export { Spinner, StaticSpinner } from './spinner';

// ============================================================================
// Wave 5 Components (Simple Recharts)
// ============================================================================

// Gauge
export { Gauge, StaticGauge } from './gauge';

// Scatter
export { Scatter, StaticScatter } from './scatter';

// Sparkline
export { Sparkline, StaticSparkline } from './sparkline';

// ============================================================================
// Wave 6 Components (Media + Timeline)
// ============================================================================

// Video
export { Video, StaticVideo } from './video';

// Audio
export { Audio, StaticAudio } from './audio';

// Lightbox
export { Lightbox, StaticLightbox } from './lightbox';

// Timeline
export { Timeline, StaticTimeline } from './timeline';

// ============================================================================
// Wave 7 Components (Complex charts)
// ============================================================================

// Heatmap
export { Heatmap, StaticHeatmap } from './heatmap';

// Sankey
export { Sankey, StaticSankey } from './sankey';

// Tree
export { Tree, StaticTree } from './tree';

// ============================================================================
// Wave 8 Components (Very complex)
// ============================================================================

// Kanban
export { Kanban, StaticKanban } from './kanban';

// Org
export { Org, StaticOrg } from './org';

// Map
export { Map, StaticMap } from './map';

// Flow
export { Flow, StaticFlow } from './flow';

// ============================================================================
// Component Map for Registry
// ============================================================================

import { KPICard } from './kpi-card';
import { MetricKPI } from './metric-kpi';
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
import { GridEmpty } from './grid-empty';
// Wave 1 imports
import { Alert } from './alert';
import { Calendar } from './calendar';
import { Carousel } from './carousel';
import { Collapsible } from './collapsible';
import { OTP } from './otp';
import { Separator } from './separator';
import { Split } from './split';
import { Toast } from './toast';
// Wave 2 imports
import { AlertDialog } from './alertdialog';
import { Dropdown } from './dropdown';
import { ContextMenu } from './contextmenu';
import { Command } from './command';
import { Pagination } from './pagination';
import { HoverCard } from './hovercard';
// Wave 3 imports
import { Upload } from './upload';
import { Color } from './color';
import { Time } from './time';
import { Rating } from './rating';
import { Empty } from './empty';
// Wave 4 imports
import { Skeleton } from './skeleton';
import { Spinner } from './spinner';
// Wave 5 imports
import { Gauge } from './gauge';
import { Scatter } from './scatter';
import { Sparkline } from './sparkline';
// Wave 6 imports
import { Video } from './video';
import { Audio } from './audio';
import { Lightbox } from './lightbox';
import { Timeline } from './timeline';
// Wave 7 imports
import { Heatmap } from './heatmap';
import { Sankey } from './sankey';
import { Tree } from './tree';
// Wave 8 imports
import { Kanban } from './kanban';
import { Org } from './org';
import { Map } from './map';
import { Flow } from './flow';

import type { LiquidComponentProps } from './utils';
import type { ComponentType } from 'react';

/**
 * Map of block types to their React components.
 * Used by LiquidUI to render blocks.
 */
export const liquidComponents: Record<string, ComponentType<LiquidComponentProps>> = {
  kpi: KPICard,
  metricKPI: MetricKPI,
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
  'grid-empty': GridEmpty,
  // Wave 1 components
  alert: Alert,
  calendar: Calendar,
  carousel: Carousel,
  collapsible: Collapsible,
  otp: OTP,
  separator: Separator,
  split: Split,
  toast: Toast,
  // Wave 2 components
  alertdialog: AlertDialog,
  dropdown: Dropdown,
  contextmenu: ContextMenu,
  command: Command,
  pagination: Pagination,
  hovercard: HoverCard,
  // Wave 3 components
  upload: Upload,
  color: Color,
  time: Time,
  rating: Rating,
  empty: Empty,
  // Wave 4 components
  skeleton: Skeleton,
  spinner: Spinner,
  // Wave 5 components
  gauge: Gauge,
  scatter: Scatter,
  sparkline: Sparkline,
  // Wave 6 components
  video: Video,
  audio: Audio,
  lightbox: Lightbox,
  timeline: Timeline,
  // Wave 7 components
  heatmap: Heatmap,
  sankey: Sankey,
  tree: Tree,
  // Wave 8 components
  kanban: Kanban,
  org: Org,
  map: Map,
  flow: Flow,
};
