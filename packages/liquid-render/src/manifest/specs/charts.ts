// Chart and Media Component Specifications
// Machine-readable specs for LLM-assisted UI generation

import type { ComponentSpec, ComponentCategory, FeatureFlags } from "../types";

// ============================================================================
// Common Features
// ============================================================================

const chartFeatures: FeatureFlags = {
  responsive: true,
  darkMode: true,
  loading: true,
  empty: true,
};

const mediaFeatures: FeatureFlags = {
  responsive: true,
  darkMode: true,
  loading: true,
  empty: true,
};

// ============================================================================
// Line Charts Category
// ============================================================================

const lineChartSpec: ComponentSpec = {
  type: "line",
  description:
    "Continuous line chart for time series and trend visualization. Auto-detects x/y fields from data. Supports multiple series.",
  category: "charts.line",
  usage: {
    when: [
      "Showing trends over time",
      "Comparing continuous values across periods",
      "Displaying multiple related metrics on same timeline",
      "Visualizing rates, growth, or progression",
    ],
    avoid: [
      "Categorical comparisons (use bar chart)",
      "Part-to-whole relationships (use pie chart)",
      "Very few data points (use sparkline or KPI)",
    ],
    alternatives: [
      { type: "area", reason: "When you want to emphasize volume/magnitude" },
      { type: "sparkline", reason: "When space is limited or inline display" },
      { type: "bar", reason: "When comparing discrete categories" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Chart title displayed above the visualization",
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        shape: { "[key: string]": "number | string" },
        description:
          "Array of objects with category/date field and one or more numeric fields. First string field becomes x-axis, numeric fields become lines.",
      },
    ],
    resolves: [
      {
        expression: "$.sales",
        value: [
          { month: "Jan", revenue: 4000, costs: 2400 },
          { month: "Feb", revenue: 3000, costs: 1398 },
        ],
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: chartFeatures,
  a11y: {
    role: "img",
    requirements: [
      "aria-label with chart description",
      "Hidden data table for screen readers",
      "Keyboard focusable for navigation",
    ],
  },
  examples: [
    {
      name: "Monthly Revenue Trend",
      dsl: 'Li "Revenue Trend" :$.monthlyData',
      data: {
        monthlyData: [
          { month: "Jan", revenue: 4000 },
          { month: "Feb", revenue: 5200 },
          { month: "Mar", revenue: 4800 },
        ],
      },
      renders: "Line chart showing revenue progression over months",
    },
    {
      name: "Multi-Series Comparison",
      dsl: 'Li "Sales vs Expenses" :$.financials',
      data: {
        financials: [
          { quarter: "Q1", sales: 10000, expenses: 8000 },
          { quarter: "Q2", sales: 12000, expenses: 8500 },
        ],
      },
      renders: "Line chart with two lines for sales and expenses",
    },
  ],
};

const areaChartSpec: ComponentSpec = {
  type: "area",
  description:
    "Filled area chart emphasizing volume and cumulative values. Supports stacking and gradient fills. Auto-detects fields.",
  category: "charts.line",
  usage: {
    when: [
      "Emphasizing cumulative totals over time",
      "Showing volume or magnitude of trends",
      "Displaying stacked contributions to a total",
      "Creating visual impact for key metrics",
    ],
    avoid: [
      "Precise value comparison (use line chart)",
      "Many overlapping series (becomes unreadable)",
      "Discrete categories (use bar chart)",
    ],
    alternatives: [
      { type: "line", reason: "When precision matters more than visual impact" },
      { type: "bar", reason: "For stacked categorical data" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Chart title",
    },
    {
      name: "stacked",
      type: "boolean",
      required: false,
      description: "Stack multiple series",
      default: false,
    },
    {
      name: "gradient",
      type: "boolean",
      required: false,
      description: "Use gradient fills",
      default: true,
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        shape: { "[key: string]": "number | string" },
        description:
          "Array of objects with category field and numeric value fields",
      },
    ],
    resolves: [
      {
        expression: "$.traffic",
        value: [
          { date: "Mon", visitors: 1200, pageViews: 3400 },
          { date: "Tue", visitors: 1400, pageViews: 4200 },
        ],
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: chartFeatures,
  a11y: {
    role: "img",
    requirements: [
      "aria-label with chart summary",
      "Hidden data table for screen readers",
    ],
  },
  examples: [
    {
      name: "Traffic Overview",
      dsl: 'Ar "Website Traffic" :$.dailyTraffic',
      data: {
        dailyTraffic: [
          { day: "Mon", visitors: 1200 },
          { day: "Tue", visitors: 1400 },
        ],
      },
      renders: "Area chart with gradient fill showing traffic trends",
    },
  ],
};

const sparklineSpec: ComponentSpec = {
  type: "sparkline",
  description:
    "Compact inline chart for embedding in text, tables, or KPIs. Auto-colors based on trend direction. Minimal footprint.",
  category: "charts.line",
  usage: {
    when: [
      "Showing trends in table cells",
      "Adding visual context to KPI cards",
      "Inline trend indicators in text",
      "Quick visual comparison of micro-trends",
    ],
    avoid: [
      "Detailed data exploration (use line chart)",
      "Multiple series comparison",
      "When exact values matter (no axis labels)",
    ],
    alternatives: [
      { type: "line", reason: "When you need full chart features" },
      { type: "kpi-card", reason: "When showing single metric with trend" },
    ],
  },
  props: [
    {
      name: "variant",
      type: "'line' | 'area'",
      required: false,
      description: "Sparkline style",
      default: "line",
    },
    {
      name: "width",
      type: "number",
      required: false,
      description: "Width in pixels",
      default: 80,
    },
    {
      name: "height",
      type: "number",
      required: false,
      description: "Height in pixels",
      default: 24,
    },
    {
      name: "color",
      type: "string",
      required: false,
      description: "Override stroke color",
    },
    {
      name: "autoColor",
      type: "boolean",
      required: false,
      description: "Auto-color based on trend (green up, red down)",
      default: true,
    },
    {
      name: "referenceLine",
      type: "boolean | 'average' | 'zero' | 'first' | 'last'",
      required: false,
      description: "Show reference line",
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        description: "Array of numbers or objects with value property",
      },
    ],
    resolves: [
      { expression: "$.trend", value: [10, 15, 12, 18, 22, 19, 25] },
      {
        expression: "$.values",
        value: [{ value: 10 }, { value: 15 }, { value: 18 }],
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "text", "data-table"],
    validChildren: [],
  },
  features: { ...chartFeatures, responsive: false },
  a11y: {
    role: "img",
    requirements: ["aria-label describing trend and data point count"],
  },
  examples: [
    {
      name: "Simple Trend",
      dsl: "Sp :$.weeklyViews",
      data: { weeklyViews: [100, 120, 115, 140, 155, 148, 170] },
      renders: "Small inline line showing upward trend",
    },
    {
      name: "Area Variant with Reference",
      dsl: "Sp :$.sales [variant:area referenceLine:average]",
      data: { sales: [50, 65, 55, 70, 80] },
      renders: "Area sparkline with average reference line",
    },
  ],
};

// ============================================================================
// Bar Charts Category
// ============================================================================

const barChartSpec: ComponentSpec = {
  type: "bar",
  description:
    "Vertical bar chart for categorical comparisons. Auto-detects category and value fields. Supports grouped and stacked bars.",
  category: "charts.bar",
  usage: {
    when: [
      "Comparing values across discrete categories",
      "Showing rankings or distributions",
      "Displaying grouped comparisons",
      "Stacked category breakdowns",
    ],
    avoid: [
      "Time series trends (use line chart)",
      "Part-to-whole with few items (use pie chart)",
      "Too many categories (>15 becomes hard to read)",
    ],
    alternatives: [
      { type: "line", reason: "For continuous/time-based data" },
      { type: "pie", reason: "For part-to-whole with few segments" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Chart title",
    },
    {
      name: "stacked",
      type: "boolean",
      required: false,
      description: "Stack multiple series",
      default: false,
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        shape: { "[category]": "string", "[value]": "number" },
        description:
          "Array of objects with string category field and one or more numeric value fields",
      },
    ],
    resolves: [
      {
        expression: "$.sales",
        value: [
          { product: "A", sales: 4000 },
          { product: "B", sales: 3000 },
          { product: "C", sales: 5000 },
        ],
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: chartFeatures,
  a11y: {
    role: "img",
    requirements: [
      "aria-label with chart description",
      "Hidden data table for screen readers",
    ],
  },
  examples: [
    {
      name: "Product Sales",
      dsl: 'Ba "Sales by Product" :$.productSales',
      data: {
        productSales: [
          { product: "Widget", sales: 4000 },
          { product: "Gadget", sales: 3000 },
        ],
      },
      renders: "Bar chart comparing product sales",
    },
  ],
};

// ============================================================================
// Pie Charts Category
// ============================================================================

const pieChartSpec: ComponentSpec = {
  type: "pie",
  description:
    "Circular chart showing part-to-whole relationships. Auto-detects name/value fields. Displays percentages on segments.",
  category: "charts.pie",
  usage: {
    when: [
      "Showing proportions of a whole",
      "Budget or allocation breakdown",
      "Market share visualization",
      "Few categories (2-6 ideal)",
    ],
    avoid: [
      "More than 7-8 segments (becomes unreadable)",
      "Values that don't sum to meaningful whole",
      "Precise comparison between similar values",
    ],
    alternatives: [
      { type: "bar", reason: "When precise comparison matters" },
      {
        type: "gauge",
        reason: "For single value as percentage of whole",
      },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Chart title",
    },
    {
      name: "innerRadius",
      type: "number",
      required: false,
      description: "Inner radius for donut variant (0 = pie, >0 = donut)",
      default: 0,
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        shape: { name: "string", value: "number" },
        description:
          "Array of objects with name/label field and numeric value field",
      },
    ],
    resolves: [
      {
        expression: "$.budget",
        value: [
          { category: "Marketing", amount: 3000 },
          { category: "Development", amount: 5000 },
          { category: "Operations", amount: 2000 },
        ],
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: chartFeatures,
  a11y: {
    role: "img",
    requirements: [
      "aria-label listing segments and percentages",
      "Hidden data table with segment values",
    ],
  },
  examples: [
    {
      name: "Budget Breakdown",
      dsl: 'Pi "Budget Allocation" :$.budget',
      data: {
        budget: [
          { category: "Marketing", amount: 30000 },
          { category: "Development", amount: 50000 },
          { category: "Operations", amount: 20000 },
        ],
      },
      renders: "Pie chart showing budget proportions with percentages",
    },
  ],
};

// ============================================================================
// Scatter Charts Category
// ============================================================================

const scatterSpec: ComponentSpec = {
  type: "scatter",
  description:
    "X/Y scatter plot for correlation analysis. Auto-detects numeric x/y fields. Supports optional z-axis for bubble sizing and trend lines.",
  category: "charts.scatter",
  usage: {
    when: [
      "Showing correlation between two variables",
      "Identifying clusters or outliers",
      "Three-dimensional data with bubble sizing",
      "Scientific or statistical visualization",
    ],
    avoid: [
      "Time series (use line chart)",
      "Categorical data (use bar chart)",
      "Too many points without zoom (>500 becomes slow)",
    ],
    alternatives: [
      { type: "line", reason: "When x values are sequential/temporal" },
      { type: "heatmap", reason: "For dense point distributions" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Chart title",
    },
    {
      name: "trendLine",
      type: "boolean",
      required: false,
      description: "Show linear regression trend line",
      default: false,
    },
    {
      name: "dotSize",
      type: "number",
      required: false,
      description: "Base dot size in pixels",
      default: 60,
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        shape: { x: "number", y: "number", z: "number (optional)" },
        description:
          "Array of objects with numeric x, y, and optional z (size) fields",
      },
    ],
    resolves: [
      {
        expression: "$.correlation",
        value: [
          { age: 25, income: 40000 },
          { age: 35, income: 60000 },
          { age: 45, income: 75000 },
        ],
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: chartFeatures,
  a11y: {
    role: "img",
    requirements: [
      "aria-label describing axes and point count",
      "Hidden data table with x/y values",
    ],
  },
  examples: [
    {
      name: "Age vs Income",
      dsl: 'Sc "Age vs Income" :$.demographics [trendLine:true]',
      data: {
        demographics: [
          { age: 25, income: 40000 },
          { age: 35, income: 60000 },
          { age: 45, income: 75000 },
        ],
      },
      renders: "Scatter plot with trend line showing correlation",
    },
  ],
};

// ============================================================================
// Specialized Charts Category
// ============================================================================

const gaugeSpec: ComponentSpec = {
  type: "gauge",
  description:
    "Semi-circular or full-circular gauge displaying progress toward a goal. Supports color zones and animated needle.",
  category: "charts.specialized",
  usage: {
    when: [
      "Showing progress toward a target",
      "Displaying performance metrics (0-100%)",
      "Health scores or ratings",
      "Single KPI with min/max context",
    ],
    avoid: [
      "Multiple values comparison",
      "Values without meaningful min/max",
      "Precise readings (hard to read exact values)",
    ],
    alternatives: [
      { type: "progress", reason: "For simpler linear progress" },
      { type: "kpi-card", reason: "For numeric display with context" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Gauge title/label",
    },
    {
      name: "min",
      type: "number",
      required: false,
      description: "Minimum value",
      default: 0,
    },
    {
      name: "max",
      type: "number",
      required: false,
      description: "Maximum value",
      default: 100,
    },
    {
      name: "unit",
      type: "string",
      required: false,
      description: "Unit label (e.g., '%', 'km/h')",
    },
    {
      name: "variant",
      type: "'semi' | 'full'",
      required: false,
      description: "Gauge arc style",
      default: "semi",
    },
    {
      name: "showNeedle",
      type: "boolean",
      required: false,
      description: "Show needle indicator",
      default: true,
    },
  ],
  bindings: {
    expects: [
      {
        type: "number",
        description: "Single numeric value",
      },
      {
        type: "object",
        shape: {
          value: "number",
          min: "number (optional)",
          max: "number (optional)",
          label: "string (optional)",
          unit: "string (optional)",
        },
        description: "Object with value and optional configuration",
      },
    ],
    resolves: [
      { expression: "$.score", value: 75 },
      {
        expression: "$.performance",
        value: { value: 85, min: 0, max: 100, unit: "%" },
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: chartFeatures,
  a11y: {
    role: "meter",
    requirements: [
      "aria-valuenow, aria-valuemin, aria-valuemax",
      "aria-valuetext with formatted value",
      "Keyboard focusable",
    ],
  },
  examples: [
    {
      name: "Performance Score",
      dsl: 'Ga "Performance" :$.score [unit:%]',
      data: { score: 78 },
      renders: "Semi-circular gauge showing 78%",
    },
  ],
};

const heatmapSpec: ComponentSpec = {
  type: "heatmap",
  description:
    "Grid of colored cells representing values at x/y intersections. Supports multiple color scales and interactive tooltips.",
  category: "charts.specialized",
  usage: {
    when: [
      "Showing patterns across two dimensions",
      "Correlation matrices",
      "Activity heatmaps (hour of day vs day of week)",
      "Geographic intensity without map",
    ],
    avoid: [
      "Precise value reading (colors are approximate)",
      "Few data points (use table)",
      "Single dimension (use bar chart)",
    ],
    alternatives: [
      { type: "scatter", reason: "When exact x/y positioning matters" },
      { type: "data-table", reason: "When exact values are needed" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Chart title",
    },
    {
      name: "colorScale",
      type: "'green' | 'blue' | 'red' | 'purple' | 'diverging'",
      required: false,
      description: "Color scale for values",
      default: "green",
    },
    {
      name: "xLabels",
      type: "string[]",
      required: false,
      description: "Custom x-axis labels",
    },
    {
      name: "yLabels",
      type: "string[]",
      required: false,
      description: "Custom y-axis labels",
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        description:
          "2D array of numbers (number[][]) or array of {x, y, value} objects",
      },
    ],
    resolves: [
      {
        expression: "$.activity",
        value: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
      },
      {
        expression: "$.data",
        value: [
          { x: "Mon", y: "9am", value: 10 },
          { x: "Mon", y: "10am", value: 25 },
        ],
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: chartFeatures,
  a11y: {
    role: "img",
    requirements: [
      "aria-label describing grid dimensions",
      "Hidden data table with all values",
      "Tooltip values on hover/focus",
    ],
  },
  examples: [
    {
      name: "Activity by Hour",
      dsl: 'Hm "Weekly Activity" :$.activity [colorScale:blue]',
      data: {
        activity: [
          [10, 20, 15, 25, 30, 20, 10],
          [15, 25, 20, 30, 35, 25, 15],
        ],
      },
      renders: "Heatmap showing activity patterns",
    },
  ],
};

const sankeySpec: ComponentSpec = {
  type: "sankey",
  description:
    "Flow diagram showing relationships and quantities flowing between nodes. Visualizes transfers, conversions, or hierarchies.",
  category: "charts.specialized",
  usage: {
    when: [
      "Showing flow from sources to destinations",
      "Conversion funnels with multiple paths",
      "Budget or resource allocation flows",
      "Energy or material transfer visualization",
    ],
    avoid: [
      "Simple hierarchies (use org chart)",
      "Circular flows (sankey is directed)",
      "Few nodes/links (overkill)",
    ],
    alternatives: [
      { type: "flow", reason: "For process flows with custom layouts" },
      { type: "org", reason: "For hierarchical org structures" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Chart title",
    },
    {
      name: "nodeWidth",
      type: "number",
      required: false,
      description: "Width of node bars",
      default: 10,
    },
    {
      name: "nodePadding",
      type: "number",
      required: false,
      description: "Vertical padding between nodes",
      default: 24,
    },
  ],
  bindings: {
    expects: [
      {
        type: "object",
        shape: {
          nodes: "Array<{name: string}>",
          links: "Array<{source: number, target: number, value: number}>",
        },
        description:
          "Object with nodes array and links array. Link source/target are node indices.",
      },
    ],
    resolves: [
      {
        expression: "$.funnel",
        value: {
          nodes: [
            { name: "Visitors" },
            { name: "Signups" },
            { name: "Paid" },
          ],
          links: [
            { source: 0, target: 1, value: 1000 },
            { source: 1, target: 2, value: 200 },
          ],
        },
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: chartFeatures,
  a11y: {
    role: "img",
    requirements: [
      "aria-label describing node and flow count",
      "Hidden table listing all flows",
    ],
  },
  examples: [
    {
      name: "Conversion Funnel",
      dsl: 'Sa "User Funnel" :$.funnel',
      data: {
        funnel: {
          nodes: [{ name: "Visit" }, { name: "Signup" }, { name: "Purchase" }],
          links: [
            { source: 0, target: 1, value: 1000 },
            { source: 1, target: 2, value: 200 },
          ],
        },
      },
      renders: "Sankey diagram showing conversion flow",
    },
  ],
};

const flowSpec: ComponentSpec = {
  type: "flow",
  description:
    "Node-based flow diagram for process visualization. Read-only display with custom node positions and edge connections.",
  category: "charts.specialized",
  usage: {
    when: [
      "Process or workflow diagrams",
      "State machines or decision trees",
      "System architecture visualization",
      "Custom layout requirements",
    ],
    avoid: [
      "Quantity-based flows (use sankey)",
      "Org hierarchies (use org chart)",
      "Interactive editing (read-only display)",
    ],
    alternatives: [
      { type: "sankey", reason: "For quantity-based flows" },
      { type: "org", reason: "For organizational hierarchies" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Diagram title",
    },
    {
      name: "width",
      type: "string | number",
      required: false,
      description: "Container width",
    },
    {
      name: "height",
      type: "number",
      required: false,
      description: "Container height",
    },
  ],
  bindings: {
    expects: [
      {
        type: "object",
        shape: {
          nodes:
            "Array<{id: string, x: number, y: number, label: string, type?: 'input' | 'output' | 'process' | 'decision'}>",
          edges: "Array<{source: string, target: string}>",
        },
        description:
          "Object with nodes (positioned) and edges (connections by id)",
      },
    ],
    resolves: [
      {
        expression: "$.workflow",
        value: {
          nodes: [
            { id: "start", x: 50, y: 100, label: "Start", type: "input" },
            { id: "process", x: 200, y: 100, label: "Process", type: "process" },
            { id: "end", x: 350, y: 100, label: "End", type: "output" },
          ],
          edges: [
            { source: "start", target: "process" },
            { source: "process", target: "end" },
          ],
        },
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: chartFeatures,
  a11y: {
    role: "img",
    requirements: ["aria-label describing node count and structure"],
  },
  examples: [
    {
      name: "Simple Workflow",
      dsl: 'Fl "Approval Flow" :$.workflow',
      data: {
        workflow: {
          nodes: [
            { id: "submit", x: 50, y: 50, label: "Submit", type: "input" },
            { id: "review", x: 200, y: 50, label: "Review", type: "process" },
            { id: "approve", x: 350, y: 50, label: "Approve", type: "output" },
          ],
          edges: [
            { source: "submit", target: "review" },
            { source: "review", target: "approve" },
          ],
        },
      },
      renders: "Flow diagram with three connected nodes",
    },
  ],
};

const orgSpec: ComponentSpec = {
  type: "org",
  description:
    "Organization chart / hierarchy visualization. Displays nested tree structure with avatars, names, and titles. Collapsible nodes.",
  category: "charts.specialized",
  usage: {
    when: [
      "Organizational structure display",
      "Reporting hierarchies",
      "Team composition visualization",
      "Nested category/taxonomy display",
    ],
    avoid: [
      "Non-hierarchical relationships",
      "Very deep structures (>5 levels)",
      "Process flows (use flow chart)",
    ],
    alternatives: [
      { type: "tree", reason: "For simpler hierarchical data" },
      { type: "flow", reason: "For process-based diagrams" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Chart title",
    },
    {
      name: "layout",
      type: "'vertical' | 'horizontal'",
      required: false,
      description: "Tree layout direction (via layout.flex)",
      default: "vertical",
    },
  ],
  bindings: {
    expects: [
      {
        type: "object",
        shape: {
          name: "string",
          title: "string (optional)",
          avatar: "string (optional)",
          children: "OrgNode[] (optional, recursive)",
        },
        description: "Nested object representing org hierarchy",
      },
    ],
    resolves: [
      {
        expression: "$.org",
        value: {
          name: "Jane CEO",
          title: "CEO",
          children: [
            { name: "Bob CTO", title: "CTO" },
            { name: "Alice CFO", title: "CFO" },
          ],
        },
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: { ...chartFeatures, dragDrop: false },
  a11y: {
    role: "tree",
    requirements: [
      "treeitem roles on nodes",
      "aria-expanded on collapsible nodes",
      "Keyboard navigation between nodes",
    ],
  },
  examples: [
    {
      name: "Company Org",
      dsl: 'Or "Company Structure" :$.company',
      data: {
        company: {
          name: "Jane Smith",
          title: "CEO",
          children: [
            { name: "Bob Johnson", title: "CTO" },
            { name: "Alice Williams", title: "CFO" },
          ],
        },
      },
      renders: "Org chart with CEO and two reports",
    },
  ],
};

const mapSpec: ComponentSpec = {
  type: "map",
  description:
    "Geographic map display with markers and popups. Placeholder visualization (no external map tiles). Shows marker positions and info.",
  category: "charts.specialized",
  usage: {
    when: [
      "Displaying location-based data",
      "Store or office locations",
      "Geographic distribution visualization",
      "Event or asset tracking display",
    ],
    avoid: [
      "Precise geographic analysis (use real map library)",
      "Route planning or navigation",
      "Dense marker clusters (placeholder has limits)",
    ],
    alternatives: [
      { type: "data-table", reason: "For listing locations with details" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Map title",
    },
    {
      name: "height",
      type: "string | number",
      required: false,
      description: "Container height",
      default: 300,
    },
  ],
  bindings: {
    expects: [
      {
        type: "object",
        shape: {
          center: "[number, number] (optional, [lat, lng])",
          zoom: "number (optional, 1-18)",
          markers:
            "Array<{lat: number, lng: number, label?: string, title?: string, description?: string, color?: string}>",
        },
        description: "Object with center, zoom, and markers array",
      },
    ],
    resolves: [
      {
        expression: "$.locations",
        value: {
          center: [37.7749, -122.4194],
          zoom: 12,
          markers: [
            {
              lat: 37.7749,
              lng: -122.4194,
              title: "San Francisco",
              description: "Headquarters",
            },
          ],
        },
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: chartFeatures,
  a11y: {
    role: "img",
    requirements: [
      "aria-label describing location and marker count",
      "Marker list for screen readers",
    ],
  },
  examples: [
    {
      name: "Office Locations",
      dsl: 'Ma "Our Offices" :$.offices',
      data: {
        offices: {
          center: [40.7128, -74.006],
          zoom: 10,
          markers: [
            { lat: 40.7128, lng: -74.006, title: "NYC Office" },
            { lat: 40.758, lng: -73.9855, title: "Times Square Branch" },
          ],
        },
      },
      renders: "Map with two office location markers",
    },
  ],
};

// ============================================================================
// Media Components Category
// ============================================================================

const videoSpec: ComponentSpec = {
  type: "video",
  description:
    "HTML5 video player with responsive container. Supports various URL formats and playback controls.",
  category: "media",
  usage: {
    when: [
      "Displaying video content",
      "Product demos or tutorials",
      "Media galleries with video",
      "Embedded video presentations",
    ],
    avoid: [
      "Audio-only content (use audio component)",
      "Image content (use image component)",
      "Live streaming (limited support)",
    ],
    alternatives: [
      { type: "audio", reason: "For audio-only content" },
      { type: "image", reason: "For static images" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Accessible video label",
    },
    {
      name: "autoplay",
      type: "boolean",
      required: false,
      description: "Auto-play on load (muted required)",
      default: false,
    },
    {
      name: "muted",
      type: "boolean",
      required: false,
      description: "Mute audio",
      default: false,
    },
    {
      name: "loop",
      type: "boolean",
      required: false,
      description: "Loop playback",
      default: false,
    },
    {
      name: "controls",
      type: "boolean",
      required: false,
      description: "Show playback controls",
      default: true,
    },
    {
      name: "poster",
      type: "string",
      required: false,
      description: "Poster image URL",
    },
    {
      name: "fit",
      type: "'contain' | 'cover' | 'fill' | 'none'",
      required: false,
      description: "Object-fit mode",
      default: "contain",
    },
    {
      name: "aspectRatio",
      type: "string",
      required: false,
      description: "Aspect ratio (e.g., '16/9')",
      default: "16/9",
    },
  ],
  bindings: {
    expects: [
      {
        type: "string",
        description: "Video URL",
      },
      {
        type: "object",
        shape: { src: "string", url: "string (alias for src)" },
        description: "Object with src or url property",
      },
    ],
    resolves: [
      { expression: "$.videoUrl", value: "https://example.com/video.mp4" },
      {
        expression: "$.video",
        value: { src: "https://example.com/video.mp4" },
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split", "carousel"],
    validChildren: [],
  },
  features: mediaFeatures,
  a11y: {
    requirements: [
      "aria-label describing video content",
      "Keyboard-accessible controls",
      "Captions/subtitles when available",
    ],
  },
  examples: [
    {
      name: "Product Demo",
      dsl: 'Vi "Product Demo" :$.demoVideo [controls:true]',
      data: { demoVideo: "https://example.com/demo.mp4" },
      renders: "Video player with controls",
    },
  ],
};

const audioSpec: ComponentSpec = {
  type: "audio",
  description:
    "Audio player with waveform visualization and playlist support. Handles single tracks or multi-track playlists.",
  category: "media",
  usage: {
    when: [
      "Playing audio content (podcasts, music, recordings)",
      "Playlist/album display",
      "Voice recordings or call playback",
      "Audio-heavy applications",
    ],
    avoid: [
      "Video content (use video component)",
      "Background music (consider custom implementation)",
    ],
    alternatives: [{ type: "video", reason: "When visual component is needed" }],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Player title",
    },
    {
      name: "waveform",
      type: "boolean",
      required: false,
      description: "Show waveform visualization",
      default: true,
    },
    {
      name: "playlist",
      type: "boolean",
      required: false,
      description: "Show playlist when multiple tracks",
      default: true,
    },
  ],
  bindings: {
    expects: [
      {
        type: "string",
        description: "Audio URL",
      },
      {
        type: "object",
        shape: {
          src: "string",
          title: "string (optional)",
          artist: "string (optional)",
          duration: "number (optional, seconds)",
        },
        description: "Audio track object",
      },
      {
        type: "array",
        description: "Array of audio tracks for playlist",
      },
    ],
    resolves: [
      { expression: "$.track", value: "https://example.com/song.mp3" },
      {
        expression: "$.podcast",
        value: {
          src: "https://example.com/episode.mp3",
          title: "Episode 1",
          artist: "Host Name",
        },
      },
      {
        expression: "$.playlist",
        value: [
          { src: "track1.mp3", title: "Track 1" },
          { src: "track2.mp3", title: "Track 2" },
        ],
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: mediaFeatures,
  a11y: {
    requirements: [
      "aria-label for player",
      "Keyboard-accessible controls",
      "Announce track changes",
    ],
  },
  examples: [
    {
      name: "Podcast Episode",
      dsl: 'Au "Podcast Player" :$.episode',
      data: {
        episode: {
          src: "https://example.com/episode.mp3",
          title: "Episode 1: Introduction",
          artist: "Tech Podcast",
        },
      },
      renders: "Audio player with waveform and track info",
    },
  ],
};

const carouselSpec: ComponentSpec = {
  type: "carousel",
  description:
    "Horizontally scrolling carousel with touch/swipe support. Renders children for each item. Supports dot navigation and auto-play.",
  category: "media",
  usage: {
    when: [
      "Image galleries or slideshows",
      "Product image carousels",
      "Testimonial rotators",
      "Featured content showcase",
    ],
    avoid: [
      "Primary navigation (poor a11y)",
      "Critical content (may be missed)",
      "Very few items (<3)",
    ],
    alternatives: [
      { type: "grid", reason: "When all items should be visible" },
      { type: "lightbox", reason: "For full-screen image viewing" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Carousel title",
    },
    {
      name: "orientation",
      type: "'row' | 'column'",
      required: false,
      description: "Scroll direction (via layout.flex)",
      default: "row",
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        description:
          "Array of items. Use ':.' to bind to current item, ':#' for index",
      },
    ],
    resolves: [
      {
        expression: "$.images",
        value: [
          { src: "img1.jpg", alt: "Image 1" },
          { src: "img2.jpg", alt: "Image 2" },
        ],
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: ["image", "video", "card", "container"],
    siblings: {
      recommended: [],
      discouraged: ["carousel"],
    },
  },
  features: { ...mediaFeatures, dragDrop: true },
  a11y: {
    role: "region",
    liveRegion: "polite",
    requirements: [
      "aria-roledescription='carousel'",
      "Keyboard navigation (arrow keys)",
      "Announce current slide",
    ],
  },
  examples: [
    {
      name: "Product Gallery",
      dsl: `Ca "Product Images" :$.productImages
  Im :. :.alt`,
      data: {
        productImages: [
          { src: "/product1.jpg", alt: "Front view" },
          { src: "/product2.jpg", alt: "Side view" },
        ],
      },
      renders: "Carousel with swipeable product images",
    },
  ],
};

const lightboxSpec: ComponentSpec = {
  type: "lightbox",
  description:
    "Full-screen image gallery with thumbnail grid. Click to open modal viewer with zoom and navigation.",
  category: "media",
  usage: {
    when: [
      "Photo galleries requiring full-screen view",
      "Portfolio or artwork display",
      "Product image detail viewing",
      "Document/image preview",
    ],
    avoid: [
      "Few images (<3, use simple image)",
      "Non-image content",
      "Quick browsing (carousel may be better)",
    ],
    alternatives: [
      { type: "carousel", reason: "For inline browsing without modal" },
      { type: "image", reason: "For single image display" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Gallery title",
    },
    {
      name: "columns",
      type: "number",
      required: false,
      description: "Thumbnail grid columns",
      default: 3,
    },
    {
      name: "gap",
      type: "string",
      required: false,
      description: "Gap between thumbnails",
      default: "8px",
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        description:
          "Array of image URLs (strings) or objects with src, alt, caption",
      },
    ],
    resolves: [
      {
        expression: "$.gallery",
        value: [
          { src: "/photo1.jpg", alt: "Photo 1", caption: "Sunset view" },
          { src: "/photo2.jpg", alt: "Photo 2", caption: "Mountain peak" },
        ],
      },
      {
        expression: "$.images",
        value: ["/img1.jpg", "/img2.jpg", "/img3.jpg"],
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack", "split"],
    validChildren: [],
  },
  features: mediaFeatures,
  a11y: {
    role: "region",
    requirements: [
      "Keyboard navigation in modal",
      "Focus trap when open",
      "Escape to close",
      "Image alt text announced",
    ],
  },
  examples: [
    {
      name: "Photo Gallery",
      dsl: 'Lb "Vacation Photos" :$.photos [columns:4]',
      data: {
        photos: [
          { src: "/beach.jpg", caption: "Beach sunset" },
          { src: "/mountain.jpg", caption: "Mountain view" },
          { src: "/city.jpg", caption: "City lights" },
        ],
      },
      renders: "4-column thumbnail grid, click opens full-screen viewer",
    },
  ],
};

// ============================================================================
// Export All Specs
// ============================================================================

export const chartSpecs: ComponentSpec[] = [
  // Line charts
  lineChartSpec,
  areaChartSpec,
  sparklineSpec,
  // Bar charts
  barChartSpec,
  // Pie charts
  pieChartSpec,
  // Scatter charts
  scatterSpec,
  // Specialized charts
  gaugeSpec,
  heatmapSpec,
  sankeySpec,
  flowSpec,
  orgSpec,
  mapSpec,
  // Media
  videoSpec,
  audioSpec,
  carouselSpec,
  lightboxSpec,
];

export default chartSpecs;
