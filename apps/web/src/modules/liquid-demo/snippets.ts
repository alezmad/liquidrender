// Demo snippets for LiquidRender component gallery
// Using LiquidCode DSL format (2-char type codes with [] for children)

export interface DemoSnippet {
  name: string;
  category: string;
  description: string;
  dsl: string;
  data: Record<string, unknown>;
}

export const snippets: DemoSnippet[] = [
  // Layout
  {
    name: "Card with Stack",
    category: "layout",
    description: "Basic card with stacked content",
    dsl: `Cd [
  Hd "Dashboard Overview"
  Tx "Welcome to your analytics dashboard"
]`,
    data: {},
  },
  {
    name: "Grid Layout (Fixed)",
    category: "layout",
    description: "Fixed 3-column grid",
    dsl: `Gd 3 [
  Cd [Tx "Card 1"]
  Cd [Tx "Card 2"]
  Cd [Tx "Card 3"]
]`,
    data: {},
  },
  {
    name: "Grid Auto-Fit",
    category: "layout",
    description: "Responsive grid with auto-fit (default)",
    dsl: `Gd ~fit %lg [
  Cd [Tx "Auto-sizes based on container"]
  Cd [Tx "Expands to fill space"]
  Cd [Tx "Wraps responsively"]
  Cd [Tx "Minimum 200px each"]
]`,
    data: {},
  },
  {
    name: "Grid Custom Min Width",
    category: "layout",
    description: "Auto-fit with 300px minimum",
    dsl: `Gd ~300 %md [
  Cd [Hd "Feature 1" Tx "300px minimum width"]
  Cd [Hd "Feature 2" Tx "Responsive wrapping"]
  Cd [Hd "Feature 3" Tx "Large gap spacing"]
]`,
    data: {},
  },
  {
    name: "Grid with Empty Cells",
    category: "layout",
    description: "Grid with placeholder empty cells",
    dsl: `Gd 3 %sm [
  Cd [Tx "Top Left"]
  _
  Cd [Tx "Top Right"]
  _
  Cd [Tx "Center"]
  _
  Cd [Tx "Bottom Left"]
  _
  Cd [Tx "Bottom Right"]
]`,
    data: {},
  },
  {
    name: "Grid Centered Last Row",
    category: "layout",
    description: "Incomplete row centered with ^c",
    dsl: `Gd 3 %md ^c [
  Cd [Tx "Row 1 - Col 1"]
  Cd [Tx "Row 1 - Col 2"]
  Cd [Tx "Row 1 - Col 3"]
  Cd [Tx "Centered"]
]`,
    data: {},
  },
  {
    name: "Split Panel",
    category: "layout",
    description: "Two-panel layout with sidebar",
    dsl: `Sp [
  Cd [Tx "Sidebar"]
  Cd [Tx "Main Content"]
]`,
    data: {},
  },

  // Data Display
  {
    name: "KPI Cards",
    category: "data-display",
    description: "Key metrics display",
    dsl: `Gd 3 %md [
  Kp :metrics.revenue
  Kp :metrics.users
  Kp :metrics.orders
]`,
    data: {
      metrics: {
        revenue: { label: "Revenue", value: "$45,231", change: "+12.5%" },
        users: { label: "Active Users", value: "2,350", change: "+8.2%" },
        orders: { label: "Orders", value: "1,247", change: "+23.1%" },
      },
    },
  },
  {
    name: "Data Table",
    category: "data-display",
    description: "Interactive data table with columns",
    dsl: `Cd [
  Hd "Recent Orders"
  Tb :orders
]`,
    data: {
      orders: [
        { id: "ORD-001", customer: "Alice Johnson", amount: "$299.00", status: "Completed" },
        { id: "ORD-002", customer: "Bob Smith", amount: "$149.50", status: "Pending" },
        { id: "ORD-003", customer: "Carol White", amount: "$599.00", status: "Shipped" },
        { id: "ORD-004", customer: "David Brown", amount: "$89.99", status: "Completed" },
      ],
    },
  },
  {
    name: "List with Badges",
    category: "data-display",
    description: "Task list with status badges",
    dsl: `Cd [
  Hd "Tasks"
  Ls :tasks
]`,
    data: {
      tasks: [
        { title: "Review PR #123", badge: "urgent" },
        { title: "Update documentation", badge: "in-progress" },
        { title: "Deploy to staging", badge: "completed" },
      ],
    },
  },

  // Charts
  {
    name: "Line Chart",
    category: "charts",
    description: "Revenue trend over time",
    dsl: `Cd [
  Hd "Revenue Trend"
  Ln :chartData
]`,
    data: {
      chartData: [
        { month: "Jan", revenue: 4000 },
        { month: "Feb", revenue: 3000 },
        { month: "Mar", revenue: 5000 },
        { month: "Apr", revenue: 4500 },
        { month: "May", revenue: 6000 },
        { month: "Jun", revenue: 5500 },
      ],
    },
  },
  {
    name: "Bar Chart",
    category: "charts",
    description: "Sales by category",
    dsl: `Cd [
  Hd "Sales by Category"
  Br :salesData
]`,
    data: {
      salesData: [
        { category: "Electronics", sales: 4200 },
        { category: "Clothing", sales: 3100 },
        { category: "Home", sales: 2800 },
        { category: "Sports", sales: 1900 },
      ],
    },
  },
  {
    name: "Pie Chart",
    category: "charts",
    description: "Market share distribution",
    dsl: `Cd [
  Hd "Market Share"
  Pi :marketShare
]`,
    data: {
      marketShare: [
        { name: "Product A", value: 400 },
        { name: "Product B", value: 300 },
        { name: "Product C", value: 200 },
        { name: "Product D", value: 100 },
      ],
    },
  },

  // Forms
  {
    name: "Contact Form",
    category: "forms",
    description: "Basic contact form",
    dsl: `Cd [
  Hd "Contact Us"
  Fm [
    In "Name"
    In "Email"
    Ta "Message"
    Bt "Send Message"
  ]
]`,
    data: {},
  },
  {
    name: "Login Form",
    category: "forms",
    description: "Simple login form",
    dsl: `Cd [
  Hd "Sign In"
  Fm [
    In "Email"
    In "Password"
    Ck "Remember me"
    Bt "Sign In"
  ]
]`,
    data: {},
  },
  {
    name: "Settings Form",
    category: "forms",
    description: "Settings with various inputs",
    dsl: `Cd [
  Hd "Settings"
  Fm [
    In "Display Name"
    Se :timezones
    Sw "Dark Mode"
    Rg "Volume"
    Bt "Save Changes"
  ]
]`,
    data: {
      timezones: [
        { label: "UTC", value: "utc" },
        { label: "EST", value: "est" },
        { label: "PST", value: "pst" },
      ],
    },
  },

  // Feedback & Overlays
  {
    name: "Alert Messages",
    category: "feedback",
    description: "Various alert types",
    dsl: `Sk [
  Al "Operation completed successfully"
  Al "Please review your settings"
  Al "Unable to save changes"
]`,
    data: {},
  },
  {
    name: "Progress Indicators",
    category: "feedback",
    description: "Loading states",
    dsl: `Cd [
  Hd "Upload Progress"
  Pg :uploadProgress
  Tx "Uploading files..."
]`,
    data: {
      uploadProgress: 65,
    },
  },

  // Navigation
  {
    name: "Tabs Navigation",
    category: "navigation",
    description: "Tabbed content sections",
    dsl: `Cd [
  Ts [
    tab "Overview" [Tx "Dashboard overview content"]
    tab "Analytics" [Tx "Analytics and metrics"]
    tab "Settings" [Tx "Configuration options"]
  ]
]`,
    data: {},
  },
  {
    name: "Breadcrumb",
    category: "navigation",
    description: "Navigation breadcrumb",
    dsl: `Sk [
  Bc :path
  Hd "Product Details"
]`,
    data: {
      path: [
        { label: "Home", href: "/" },
        { label: "Products", href: "/products" },
        { label: "Electronics", href: "/products/electronics" },
      ],
    },
  },

  // Complex Layouts
  {
    name: "Dashboard Panel",
    category: "complex",
    description: "Full dashboard with multiple sections",
    dsl: `Sk [
  Hd "Analytics Dashboard"
  Gd 4 %md [
    Kp :stats.revenue
    Kp :stats.users
    Kp :stats.orders
    Kp :stats.growth
  ]
  Gd 2 %lg [
    Cd [
      Hd "Revenue Trend"
      Ln :revenueChart
    ]
    Cd [
      Hd "Top Products"
      Tb :products
    ]
  ]
]`,
    data: {
      stats: {
        revenue: { label: "Revenue", value: "$125,430", change: "+15.3%" },
        users: { label: "Users", value: "8,549", change: "+22.1%" },
        orders: { label: "Orders", value: "3,215", change: "+8.7%" },
        growth: { label: "Growth", value: "23.5%", change: "+4.2%" },
      },
      revenueChart: [
        { month: "Jan", value: 12000 },
        { month: "Feb", value: 15000 },
        { month: "Mar", value: 18000 },
        { month: "Apr", value: 16000 },
        { month: "May", value: 21000 },
        { month: "Jun", value: 25000 },
      ],
      products: [
        { name: "Widget Pro", sales: 1234, revenue: "$45,230" },
        { name: "Gadget Plus", sales: 892, revenue: "$32,100" },
        { name: "Tool Master", sales: 654, revenue: "$21,450" },
      ],
    },
  },
];

export const categories = [
  { id: "all", label: "All Components" },
  { id: "layout", label: "Layout" },
  { id: "data-display", label: "Data Display" },
  { id: "charts", label: "Charts" },
  { id: "forms", label: "Forms" },
  { id: "feedback", label: "Feedback" },
  { id: "navigation", label: "Navigation" },
  { id: "complex", label: "Complex" },
];
