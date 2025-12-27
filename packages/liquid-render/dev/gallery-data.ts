// Gallery Data Generators - Faker-powered test data for all components
// ============================================================================

import { faker } from '@faker-js/faker';

// ============================================================================
// Types
// ============================================================================

export interface ComponentConfig {
  type: string;
  name: string;
  category: Category;
  dsl: string;
  dataKey?: string;
}

export type Category =
  | 'Core'
  | 'Charts'
  | 'Forms'
  | 'Layout'
  | 'Navigation'
  | 'Data Display'
  | 'Interactive';

// ============================================================================
// Data Generators
// ============================================================================

/** Generate fresh random data for gallery */
export function generateGalleryData() {
  // Seed for reproducibility in dev
  faker.seed(42);

  return {
    // KPI data
    revenue: faker.number.int({ min: 50000, max: 500000 }),
    orders: faker.number.int({ min: 100, max: 5000 }),
    customers: faker.number.int({ min: 500, max: 10000 }),
    avgOrderValue: faker.number.int({ min: 50, max: 200 }),
    conversionRate: faker.number.float({ min: 0.02, max: 0.15, fractionDigits: 2 }),

    // Trend data for KPIs
    revenueTrend: faker.number.float({ min: -0.15, max: 0.25, fractionDigits: 2 }),
    ordersTrend: faker.number.float({ min: -0.1, max: 0.2, fractionDigits: 2 }),
    customersTrend: faker.number.float({ min: 0, max: 0.3, fractionDigits: 2 }),

    // Chart data - monthly
    monthlyData: generateMonthlyData(),
    weeklyData: generateWeeklyData(),
    categoryData: generateCategoryData(),

    // Table data
    recentOrders: generateOrders(8),
    users: generateUsers(6),
    products: generateProducts(5),

    // List data
    items: generateListItems(5),
    notifications: generateNotifications(4),
    tasks: generateTasks(6),

    // Form data
    user: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: 'user',
      bio: faker.lorem.sentence(),
    },
    settings: {
      theme: 'light',
      notifications: true,
      language: 'en',
    },

    // Navigation data
    navItems: generateNavItems(),
    breadcrumbs: generateBreadcrumbs(),
    tabItems: generateTabItems(),

    // Misc
    progress: faker.number.int({ min: 25, max: 85 }),
    rating: faker.number.int({ min: 3, max: 5 }),
    tags: generateTags(4),
    avatarUrl: faker.image.avatar(),
    imageUrl: faker.image.urlPicsumPhotos({ width: 400, height: 300 }),
    enabled: faker.datatype.boolean(),
    selectedDate: faker.date.recent().toISOString().split('T')[0],
    dateRange: {
      start: faker.date.past().toISOString().split('T')[0],
      end: faker.date.recent().toISOString().split('T')[0],
    },
  };
}

// ============================================================================
// Helper Generators
// ============================================================================

function generateMonthlyData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month) => ({
    month,
    revenue: faker.number.int({ min: 20000, max: 80000 }),
    orders: faker.number.int({ min: 100, max: 500 }),
    customers: faker.number.int({ min: 50, max: 200 }),
  }));
}

function generateWeeklyData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => ({
    day,
    value: faker.number.int({ min: 100, max: 500 }),
  }));
}

function generateCategoryData() {
  const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'];
  return categories.map((name) => ({
    name,
    value: faker.number.int({ min: 1000, max: 10000 }),
  }));
}

function generateOrders(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `ORD-${1000 + i}`,
    customer: faker.person.fullName(),
    amount: faker.number.int({ min: 50, max: 500 }),
    status: faker.helpers.arrayElement(['pending', 'shipped', 'delivered', 'cancelled']),
    date: faker.date.recent().toLocaleDateString(),
  }));
}

function generateUsers(count: number) {
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid().slice(0, 8),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: faker.helpers.arrayElement(['admin', 'user', 'editor']),
    status: faker.helpers.arrayElement(['active', 'inactive']),
  }));
}

function generateProducts(count: number) {
  return Array.from({ length: count }, () => ({
    id: faker.string.alphanumeric(6).toUpperCase(),
    name: faker.commerce.productName(),
    price: faker.number.int({ min: 10, max: 200 }),
    stock: faker.number.int({ min: 0, max: 100 }),
    category: faker.commerce.department(),
  }));
}

function generateListItems(count: number) {
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid().slice(0, 8),
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
  }));
}

function generateNotifications(count: number) {
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid().slice(0, 8),
    title: faker.helpers.arrayElement([
      'New order received',
      'Payment processed',
      'User signed up',
      'Review submitted',
    ]),
    time: faker.date.recent().toLocaleTimeString(),
  }));
}

function generateTasks(count: number) {
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid().slice(0, 8),
    title: faker.lorem.words(4),
    done: faker.datatype.boolean(),
    priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
  }));
}

function generateNavItems() {
  return [
    { label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard' },
    { label: 'Orders', href: '/orders', icon: 'shopping-cart' },
    { label: 'Products', href: '/products', icon: 'package' },
    { label: 'Customers', href: '/customers', icon: 'users' },
    { label: 'Settings', href: '/settings', icon: 'settings' },
  ];
}

function generateBreadcrumbs() {
  return [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Electronics', href: '/products/electronics' },
    { label: 'Laptops' },
  ];
}

function generateTabItems() {
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ];
}

function generateTags(count: number) {
  const tagNames = ['New', 'Sale', 'Popular', 'Featured', 'Limited', 'Trending'];
  return faker.helpers.arrayElements(tagNames, count);
}

// ============================================================================
// Component Registry
// ============================================================================

export const componentRegistry: ComponentConfig[] = [
  // Core
  { type: 'kpi', name: 'KPI Card', category: 'Core', dsl: 'Kp :revenue "Total Revenue" #green' },
  { type: 'button', name: 'Button', category: 'Core', dsl: 'Bt "Click Me" #primary' },
  { type: 'text', name: 'Text', category: 'Core', dsl: 'Tx "Hello, this is sample text content."' },
  { type: 'heading', name: 'Heading', category: 'Core', dsl: 'Hd "Section Title" #2' },
  { type: 'container', name: 'Container', category: 'Core', dsl: 'Cn ^row [Tx "Item A", Tx "Item B", Tx "Item C"]' },
  { type: 'card', name: 'Card', category: 'Core', dsl: 'Cd "Card Title" [Tx "Card content goes here"]' },

  // Charts
  { type: 'line', name: 'Line Chart', category: 'Charts', dsl: 'Ln :monthlyData "Monthly Trends"' },
  { type: 'bar', name: 'Bar Chart', category: 'Charts', dsl: 'Br :monthlyData "Revenue by Month"' },
  { type: 'pie', name: 'Pie Chart', category: 'Charts', dsl: 'Pi :categoryData "Sales by Category"' },
  { type: 'area', name: 'Area Chart', category: 'Charts', dsl: 'Ar :monthlyData "Revenue Over Time"' },

  // Forms
  { type: 'input', name: 'Input', category: 'Forms', dsl: 'In :user.name "Full Name"' },
  { type: 'textarea', name: 'Textarea', category: 'Forms', dsl: 'Ta :user.bio "Biography"' },
  { type: 'select', name: 'Select', category: 'Forms', dsl: 'Se :user.role "Role" [opt "user" "User", opt "admin" "Admin", opt "editor" "Editor"]' },
  { type: 'checkbox', name: 'Checkbox', category: 'Forms', dsl: 'Ck :enabled "Enable notifications"' },
  { type: 'switch', name: 'Switch', category: 'Forms', dsl: 'Sw :settings.notifications "Notifications"' },
  { type: 'range', name: 'Range', category: 'Forms', dsl: 'Rg :progress "Volume" 0 100' },
  { type: 'date', name: 'Date Picker', category: 'Forms', dsl: 'Dt :selectedDate "Select Date"' },
  { type: 'daterange', name: 'Date Range', category: 'Forms', dsl: 'Dr :dateRange "Date Range"' },
  { type: 'form', name: 'Form', category: 'Forms', dsl: 'Fm :user [In :name "Name", In :email "Email", Bt "Submit" #primary]' },

  // Layout
  { type: 'grid', name: 'Grid', category: 'Layout', dsl: 'Gd #3 [Cd "A" [Tx "1"], Cd "B" [Tx "2"], Cd "C" [Tx "3"]]' },
  { type: 'stack', name: 'Stack', category: 'Layout', dsl: 'Sk ^col #md [Tx "First", Tx "Second", Tx "Third"]' },
  { type: 'vstack', name: 'VStack', category: 'Layout', dsl: 'Cn ^col [Tx "Vertical 1", Tx "Vertical 2", Tx "Vertical 3"]' },
  { type: 'hstack', name: 'HStack', category: 'Layout', dsl: 'Cn ^row [Bt "A", Bt "B", Bt "C"]' },
  { type: 'sheet', name: 'Sheet', category: 'Layout', dsl: 'Sh "Settings Panel" [Tx "Sheet content here"]' },
  { type: 'drawer', name: 'Drawer', category: 'Layout', dsl: 'Dw "Menu" [Tx "Drawer content"]' },

  // Navigation
  { type: 'tabs', name: 'Tabs', category: 'Navigation', dsl: 'Ts [tab "Overview" [Tx "Overview content"], tab "Details" [Tx "Details content"]]' },
  { type: 'nav', name: 'Nav', category: 'Navigation', dsl: 'Nv :navItems' },
  { type: 'breadcrumb', name: 'Breadcrumb', category: 'Navigation', dsl: 'Bc :breadcrumbs' },
  { type: 'header', name: 'Header', category: 'Navigation', dsl: 'Hr "App Title" [Bt "Action"]' },
  { type: 'sidebar', name: 'Sidebar', category: 'Navigation', dsl: 'Sd :navItems' },

  // Data Display
  { type: 'table', name: 'Data Table', category: 'Data Display', dsl: 'Tb :recentOrders "Recent Orders"' },
  { type: 'list', name: 'List', category: 'Data Display', dsl: 'Ls :items [Cd :$.title [Tx :$.description]]' },
  { type: 'avatar', name: 'Avatar', category: 'Data Display', dsl: 'Av :avatarUrl "John Doe"' },
  { type: 'badge', name: 'Badge', category: 'Data Display', dsl: 'Bg "New" #green' },
  { type: 'tag', name: 'Tag', category: 'Data Display', dsl: 'Tg "Featured" #blue' },
  { type: 'progress', name: 'Progress', category: 'Data Display', dsl: 'Pg :progress "Loading"' },
  { type: 'icon', name: 'Icon', category: 'Data Display', dsl: 'Ic "check-circle" #green' },
  { type: 'image', name: 'Image', category: 'Data Display', dsl: 'Im :imageUrl "Sample Image"' },

  // Interactive
  { type: 'modal', name: 'Modal', category: 'Interactive', dsl: 'Md "Confirm Action" [Tx "Are you sure?", Bt "Confirm" #primary]' },
  { type: 'tooltip', name: 'Tooltip', category: 'Interactive', dsl: 'Tl "Hover for info" [Bt "Hover me"]' },
  { type: 'popover', name: 'Popover', category: 'Interactive', dsl: 'Pp "Options" [Bt "Option 1", Bt "Option 2"]' },
  { type: 'accordion', name: 'Accordion', category: 'Interactive', dsl: 'Ac "FAQ" [Tx "Frequently asked questions content here"]' },
];

// ============================================================================
// Utilities
// ============================================================================

/** Get components by category */
export function getComponentsByCategory(): Record<Category, ComponentConfig[]> {
  const result: Record<Category, ComponentConfig[]> = {
    Core: [],
    Charts: [],
    Forms: [],
    Layout: [],
    Navigation: [],
    'Data Display': [],
    Interactive: [],
  };

  for (const component of componentRegistry) {
    result[component.category].push(component);
  }

  return result;
}

/** Get all unique categories */
export function getCategories(): Category[] {
  return ['Core', 'Charts', 'Forms', 'Layout', 'Navigation', 'Data Display', 'Interactive'];
}

/** Find component by type */
export function findComponent(type: string): ComponentConfig | undefined {
  return componentRegistry.find((c) => c.type === type);
}

export type GalleryData = ReturnType<typeof generateGalleryData>;
