// Data Display Component Specifications
// Machine-readable specs for LLM-assisted UI generation
// Categories: data-display.*, feedback.*

import type { ComponentSpec, ComponentCategory, FeatureFlags } from "../types";

// ============================================================================
// Cards & Containers
// ============================================================================

const cardSpec: ComponentSpec = {
  type: "card",
  description:
    "Container component for grouping related content with optional header, title, and footer sections.",
  category: "data-display",
  usage: {
    when: [
      "Grouping related content visually",
      "Creating bordered sections with optional titles",
      "Building dashboard widgets or info panels",
    ],
    avoid: [
      "Simple text containers without visual distinction",
      "Deeply nested card structures",
    ],
    alternatives: [
      { type: "container", reason: "When no visual card styling is needed" },
      { type: "accordion", reason: "When content should be collapsible" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Optional card title displayed in header",
    },
  ],
  bindings: {
    expects: [
      { type: "object", description: "Any data object for context" },
      { type: "string", description: "Simple text content" },
    ],
  },
  composition: {
    validParents: ["container", "grid", "stack", "split", "list"],
    validChildren: [
      "text",
      "heading",
      "image",
      "badge",
      "button",
      "list",
      "kpi-card",
      "progress",
      "avatar",
    ],
  },
  features: {
    responsive: true,
    darkMode: true,
  },
  a11y: {
    role: "region",
    requirements: ["Use aria-labelledby when label is provided"],
  },
  examples: [
    {
      name: "Simple card with title",
      dsl: 'Cd "User Profile" [Tx :name, Tx :email]',
      data: { name: "John Doe", email: "john@example.com" },
      renders: "Card with title and two text elements",
    },
    {
      name: "Stats card",
      dsl: 'Cd "Revenue" [Kp :totalRevenue]',
      data: { totalRevenue: 125000 },
      renders: "Card containing a KPI display",
    },
  ],
};

const kpiCardSpec: ComponentSpec = {
  type: "kpi-card",
  description:
    "Displays key metric values with labels and optional trend indicators. Auto-expands objects with multiple numeric fields into multiple KPI displays.",
  category: "data-display.metrics",
  usage: {
    when: [
      "Displaying single numeric metrics prominently",
      "Showing KPIs with trend direction",
      "Creating dashboard metric widgets",
      "Displaying multiple metrics from a single data object",
    ],
    avoid: [
      "Non-numeric data display",
      "Complex data that needs tabular format",
    ],
    alternatives: [
      { type: "progress", reason: "When showing percentage completion" },
      {
        type: "data-table",
        reason: "When displaying multiple related metrics in rows",
      },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Metric label (auto-generated from field names if object)",
    },
    {
      name: "color",
      type: "string",
      required: false,
      description: "Accent color for the card border",
    },
  ],
  bindings: {
    expects: [
      { type: "number", description: "Single numeric value" },
      {
        type: "object",
        description: "Object with numeric fields (auto-expanded to multiple KPIs)",
        shape: {
          value: "number",
          label: "string",
          trend: "'up' | 'down' | 'neutral'",
          change: "number (percentage)",
        },
      },
    ],
    resolves: [
      { expression: ":totalUsers", value: 1250 },
      {
        expression: ":metrics",
        value: { revenue: 50000, users: 1200, orders: 340 },
      },
    ],
  },
  composition: {
    validParents: ["card", "container", "grid", "stack", "list"],
    validChildren: [],
  },
  features: {
    responsive: true,
    darkMode: true,
  },
  a11y: {
    requirements: [
      "Value has aria-labelledby referencing the label",
      "Trend indicators have descriptive labels",
    ],
  },
  examples: [
    {
      name: "Single KPI",
      dsl: 'Kp :totalRevenue "Total Revenue"',
      data: { totalRevenue: 125000 },
      renders: "KPI card showing $125,000 with label",
    },
    {
      name: "Object auto-expansion",
      dsl: "Kp :stats",
      data: { stats: { users: 1200, orders: 450, revenue: 89000 } },
      renders: "Three KPI cards side by side with auto-labels",
    },
  ],
};

// ============================================================================
// Labels & Tags
// ============================================================================

const badgeSpec: ComponentSpec = {
  type: "badge",
  description:
    "Notification badge or dot overlay for indicating counts, status, or attention. Supports pulse animation on value changes.",
  category: "data-display",
  usage: {
    when: [
      "Showing notification counts",
      "Indicating unread items",
      "Overlaying status on avatars or icons",
    ],
    avoid: [
      "Static labels (use tag instead)",
      "Long text content",
    ],
    alternatives: [
      { type: "tag", reason: "For display-only status labels" },
      { type: "icon", reason: "For simple status indicators" },
    ],
  },
  props: [
    {
      name: "size",
      type: "'xs' | 'sm' | 'md'",
      required: false,
      description: "Badge size",
      default: "sm",
    },
    {
      name: "max",
      type: "number",
      required: false,
      description: "Maximum value before showing 99+",
      default: 99,
    },
    {
      name: "dot",
      type: "boolean",
      required: false,
      description: "Show as dot without value",
      default: false,
    },
  ],
  bindings: {
    expects: [
      { type: "number", description: "Count value" },
      { type: "string", description: "Short text or status" },
      {
        type: "object",
        description: "Badge configuration",
        shape: { value: "number", max: "number", dot: "boolean", size: "string" },
      },
    ],
  },
  composition: {
    validParents: ["avatar", "button", "icon", "container"],
    validChildren: [],
  },
  features: {
    responsive: true,
    darkMode: true,
  },
  a11y: {
    requirements: ["Include aria-label with count for screen readers"],
  },
  examples: [
    {
      name: "Notification count",
      dsl: "Bd :unreadCount",
      data: { unreadCount: 5 },
      renders: "Badge showing 5",
    },
    {
      name: "Dot indicator",
      dsl: "Bd :hasNew",
      data: { hasNew: { dot: true } },
      renders: "Small dot badge",
    },
  ],
};

const tagSpec: ComponentSpec = {
  type: "tag",
  description:
    "Display-only label with semantic color variants. Auto-detects color from status values like 'active', 'pending', 'error'.",
  category: "data-display",
  usage: {
    when: [
      "Showing status labels",
      "Categorizing items visually",
      "Displaying short labels with semantic meaning",
    ],
    avoid: [
      "Interactive elements (use button)",
      "Notification counts (use badge)",
    ],
    alternatives: [
      { type: "badge", reason: "For notification counts and overlays" },
      { type: "text", reason: "For non-semantic text display" },
    ],
  },
  props: [
    {
      name: "color",
      type: "'default' | 'primary' | 'success' | 'warning' | 'danger'",
      required: false,
      description: "Tag color variant (auto-detected from value if not set)",
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Tag text (auto-colors: active, pending, error, etc.)" },
    ],
  },
  composition: {
    validParents: ["card", "container", "list", "data-table"],
    validChildren: [],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    requirements: ["Ensure sufficient color contrast"],
  },
  examples: [
    {
      name: "Status tag",
      dsl: "Tg :status",
      data: { status: "active" },
      renders: "Green tag showing 'active'",
    },
    {
      name: "Custom color",
      dsl: 'Tg :label #danger',
      data: { label: "Urgent" },
      renders: "Red danger tag",
    },
  ],
};

// ============================================================================
// Identity & Media
// ============================================================================

const avatarSpec: ComponentSpec = {
  type: "avatar",
  description:
    "User avatar with image and initials fallback. Extracts initials from name if image unavailable.",
  category: "data-display.media",
  usage: {
    when: [
      "Displaying user profile images",
      "Showing participant avatars in lists",
      "User identification in cards or comments",
    ],
    avoid: [
      "Non-user images (use image component)",
      "Large profile displays (use dedicated component)",
    ],
    alternatives: [
      { type: "image", reason: "For general images, logos, or thumbnails" },
      { type: "icon", reason: "For symbolic representations" },
    ],
  },
  props: [
    {
      name: "size",
      type: "'sm' | 'md' | 'lg'",
      required: false,
      description: "Avatar size",
      default: "md",
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Image URL" },
      {
        type: "object",
        description: "User object",
        shape: {
          avatar: "string (URL)",
          name: "string (for initials)",
          picture: "string (alternative URL field)",
          image: "string (alternative URL field)",
        },
      },
    ],
  },
  composition: {
    validParents: ["card", "list", "container", "hover-card"],
    validChildren: ["badge"],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    requirements: ["Include alt text for image", "Use aria-label for initials fallback"],
  },
  examples: [
    {
      name: "User avatar from URL",
      dsl: "Av :profileUrl",
      data: { profileUrl: "https://example.com/avatar.jpg" },
      renders: "Circular avatar image",
    },
    {
      name: "User object with fallback",
      dsl: "Av :user",
      data: { user: { name: "John Doe" } },
      renders: "Avatar with initials JD",
    },
  ],
};

const iconSpec: ComponentSpec = {
  type: "icon",
  description: "Display icons from icon libraries with customizable size and color.",
  category: "data-display",
  usage: {
    when: [
      "Adding visual cues to UI elements",
      "Symbolic representation of actions or status",
      "Decorative elements in buttons or menus",
    ],
    avoid: [
      "User profile images (use avatar)",
      "Complex illustrations",
    ],
    alternatives: [
      { type: "avatar", reason: "For user representations" },
      { type: "image", reason: "For complex graphics" },
    ],
  },
  props: [
    {
      name: "name",
      type: "string",
      required: true,
      description: "Icon identifier",
    },
    {
      name: "size",
      type: "number | string",
      required: false,
      description: "Icon size in pixels or CSS value",
      default: 24,
    },
    {
      name: "color",
      type: "string",
      required: false,
      description: "Icon color",
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Icon name" },
    ],
  },
  composition: {
    validParents: ["button", "card", "container", "nav", "menu"],
    validChildren: [],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    requirements: [
      "Use aria-hidden for decorative icons",
      "Provide aria-label for meaningful icons",
    ],
  },
  examples: [
    {
      name: "Static icon",
      dsl: 'Ic "check"',
      renders: "Check icon at default size",
    },
    {
      name: "Colored icon",
      dsl: 'Ic "alert" #warning',
      renders: "Warning-colored alert icon",
    },
  ],
};

const imageSpec: ComponentSpec = {
  type: "image",
  description:
    "Responsive image component with aspect ratio control and loading states.",
  category: "data-display.media",
  usage: {
    when: [
      "Displaying product images",
      "Showing thumbnails in galleries",
      "Content images in articles or cards",
    ],
    avoid: [
      "User avatars (use avatar)",
      "Icon graphics (use icon)",
    ],
    alternatives: [
      { type: "avatar", reason: "For circular user images" },
      { type: "carousel", reason: "For multiple images with navigation" },
    ],
  },
  props: [
    {
      name: "alt",
      type: "string",
      required: true,
      description: "Alternative text for accessibility",
    },
    {
      name: "aspectRatio",
      type: "string",
      required: false,
      description: "CSS aspect ratio (e.g., '16/9', '1/1')",
    },
    {
      name: "fit",
      type: "'cover' | 'contain' | 'fill'",
      required: false,
      description: "Object fit mode",
      default: "cover",
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Image URL" },
      {
        type: "object",
        description: "Image configuration",
        shape: { src: "string", alt: "string", width: "number", height: "number" },
      },
    ],
  },
  composition: {
    validParents: ["card", "container", "carousel", "lightbox"],
    validChildren: [],
  },
  features: {
    loading: true,
    responsive: true,
    darkMode: true,
  },
  a11y: {
    requirements: ["Always provide meaningful alt text"],
  },
  examples: [
    {
      name: "Product image",
      dsl: 'Im :productImage "Product photo"',
      data: { productImage: "https://example.com/product.jpg" },
      renders: "Product image with alt text",
    },
  ],
};

// ============================================================================
// Collections
// ============================================================================

const listSpec: ComponentSpec = {
  type: "list",
  description:
    "Repeating list/iterator for rendering arrays. Special bindings: `:. = current item`, `:#` = current index`.",
  category: "data-display.collections",
  usage: {
    when: [
      "Rendering arrays of similar items",
      "Creating repeated card layouts",
      "Building navigation menus from data",
    ],
    avoid: [
      "Tabular data with columns (use data-table)",
      "Hierarchical data (use tree)",
    ],
    alternatives: [
      { type: "data-table", reason: "When data needs columns and sorting" },
      { type: "tree", reason: "For hierarchical nested data" },
      { type: "kanban", reason: "For grouped items with drag-drop" },
    ],
  },
  props: [
    {
      name: "direction",
      type: "'row' | 'column'",
      required: false,
      description: "List layout direction",
      default: "column",
    },
    {
      name: "gap",
      type: "'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'",
      required: false,
      description: "Gap between items",
      default: "md",
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        description: "Array of items to iterate",
        shape: { items: "any[]" },
      },
    ],
    resolves: [
      { expression: ":users", value: [{ name: "Alice" }, { name: "Bob" }] },
      { expression: ":.", value: "Current item in iteration" },
      { expression: ":#", value: "Current index (0-based)" },
    ],
  },
  composition: {
    validParents: ["container", "card", "grid", "stack"],
    validChildren: ["card", "text", "avatar", "badge", "tag", "button"],
  },
  features: {
    empty: true,
    responsive: true,
    darkMode: true,
  },
  a11y: {
    role: "list",
    requirements: [
      "Children receive role=listitem",
      "Provide empty state message when no items",
    ],
  },
  examples: [
    {
      name: "User list",
      dsl: "Ls :users [Cd :.name]",
      data: { users: [{ name: "Alice" }, { name: "Bob" }] },
      renders: "List of cards, each showing a name",
    },
    {
      name: "Horizontal list",
      dsl: "Ls :tags [Tg :.]",
      data: { tags: ["urgent", "review", "approved"] },
      renders: "Horizontal row of tag components",
    },
  ],
};

const treeSpec: ComponentSpec = {
  type: "tree",
  description:
    "Hierarchical tree view with expand/collapse functionality. Supports single, multiple, and checkbox selection modes.",
  category: "data-display.collections",
  usage: {
    when: [
      "Displaying hierarchical/nested data",
      "File system browsers",
      "Category navigation with subcategories",
      "Organizational structures",
    ],
    avoid: [
      "Flat lists (use list)",
      "Tabular data (use data-table)",
    ],
    alternatives: [
      { type: "list", reason: "For flat non-hierarchical data" },
      { type: "accordion", reason: "For collapsible sections without nesting" },
    ],
  },
  props: [
    {
      name: "selectionMode",
      type: "'none' | 'single' | 'multiple' | 'checkbox'",
      required: false,
      description: "Selection behavior",
      default: "none",
    },
    {
      name: "showIcons",
      type: "boolean",
      required: false,
      description: "Show folder/file icons",
      default: true,
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        description: "Array of tree nodes with TreeNode interface: { label: string; id?: string; icon?: string | ReactNode; children?: TreeNode[]; defaultExpanded?: boolean; disabled?: boolean; data?: unknown }",
      },
    ],
    resolves: [
      {
        expression: ":fileTree",
        value: [
          { label: "src", children: [{ label: "index.ts" }, { label: "utils.ts" }] },
        ],
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "sidebar"],
    validChildren: [],
  },
  features: {
    empty: true,
    selection: true,
    responsive: true,
    darkMode: true,
  },
  a11y: {
    role: "tree",
    requirements: [
      "Nodes have role=treeitem",
      "aria-expanded for expandable nodes",
      "Arrow key navigation support",
      "Enter/Space for selection",
    ],
  },
  examples: [
    {
      name: "File browser",
      dsl: 'Tr :fileSystem "Files"',
      data: {
        fileSystem: [
          { label: "Documents", children: [{ label: "report.pdf" }] },
          { label: "Images", children: [{ label: "photo.jpg" }] },
        ],
      },
      renders: "Expandable tree with folder structure",
    },
  ],
};

const dataTableSpec: ComponentSpec = {
  type: "data-table",
  description:
    "Sortable, responsive table with auto-column detection. Infers columns from data keys if not specified.",
  category: "data-display.collections",
  usage: {
    when: [
      "Displaying tabular data with multiple columns",
      "Data that needs sorting",
      "Structured records with consistent fields",
    ],
    avoid: [
      "Simple lists without columns (use list)",
      "Hierarchical data (use tree)",
    ],
    alternatives: [
      { type: "list", reason: "For simple item lists" },
      { type: "kanban", reason: "For grouped task boards" },
    ],
  },
  props: [
    {
      name: "columns",
      type: "string[]",
      required: false,
      description: "Column keys to display (auto-detected if omitted)",
    },
    {
      name: "sortable",
      type: "boolean",
      required: false,
      description: "Enable column sorting",
      default: true,
    },
    {
      name: "striped",
      type: "boolean",
      required: false,
      description: "Alternate row colors",
      default: true,
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        description: "Array of row objects",
        shape: {
          items: "Record<string, unknown>[]",
        },
      },
    ],
    resolves: [
      {
        expression: ":users",
        value: [
          { name: "Alice", email: "alice@example.com", role: "Admin" },
          { name: "Bob", email: "bob@example.com", role: "User" },
        ],
      },
    ],
  },
  composition: {
    validParents: ["container", "card"],
    validChildren: [],
  },
  features: {
    empty: true,
    sorting: true,
    responsive: true,
    darkMode: true,
  },
  a11y: {
    role: "table",
    requirements: [
      "Column headers are th elements",
      "Sort state announced via aria-sort",
      "Scrollable container has tabindex for keyboard access",
    ],
  },
  examples: [
    {
      name: "User table",
      dsl: 'Tb :users "Team Members"',
      data: {
        users: [
          { name: "Alice", role: "Admin" },
          { name: "Bob", role: "Developer" },
        ],
      },
      renders: "Sortable table with Name and Role columns",
    },
    {
      name: "Specific columns",
      dsl: 'Tb :data "Sales" [name, revenue, region]',
      data: {
        data: [
          { name: "Q1", revenue: 50000, region: "North", ignored: true },
        ],
      },
      renders: "Table with only specified columns",
    },
  ],
};

const timelineSpec: ComponentSpec = {
  type: "timeline",
  description:
    "Event timeline with connecting lines and status markers. Supports vertical, horizontal, and alternate layouts.",
  category: "data-display.collections",
  usage: {
    when: [
      "Showing chronological events",
      "Order/process status tracking",
      "Activity history or logs",
    ],
    avoid: [
      "Non-sequential data",
      "Data that needs tabular format",
    ],
    alternatives: [
      { type: "list", reason: "For simple sequential items without timeline styling" },
      { type: "stepper", reason: "For multi-step process with user interaction" },
    ],
  },
  props: [
    {
      name: "orientation",
      type: "'vertical' | 'horizontal'",
      required: false,
      description: "Timeline direction",
      default: "vertical",
    },
    {
      name: "layout",
      type: "'left' | 'right' | 'alternate'",
      required: false,
      description: "Content position relative to line (vertical only)",
      default: "left",
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        description: "Array of timeline events with TimelineEvent interface: { date: string | Date; title: string; description?: string; type?: 'success' | 'error' | 'warning' | 'info' | 'primary'; icon?: string; status?: 'completed' | 'current' | 'pending' }",
      },
    ],
    resolves: [
      {
        expression: ":orderHistory",
        value: [
          { date: "2024-01-15", title: "Order Placed", status: "completed" },
          { date: "2024-01-16", title: "Processing", status: "current" },
        ],
      },
    ],
  },
  composition: {
    validParents: ["container", "card"],
    validChildren: [],
  },
  features: {
    empty: true,
    responsive: true,
    darkMode: true,
  },
  a11y: {
    requirements: [
      "Events are semantically ordered",
      "Status conveyed through more than color",
    ],
  },
  examples: [
    {
      name: "Order tracking",
      dsl: 'Tl :orderEvents "Order Status"',
      data: {
        orderEvents: [
          { date: "2024-01-15", title: "Ordered", status: "completed" },
          { date: "2024-01-16", title: "Shipped", status: "current" },
          { date: "2024-01-18", title: "Delivery", status: "pending" },
        ],
      },
      renders: "Vertical timeline with status markers",
    },
  ],
};

const kanbanSpec: ComponentSpec = {
  type: "kanban",
  description:
    "Column-based board layout with drag-and-drop card movement between columns.",
  category: "data-display.collections",
  usage: {
    when: [
      "Task/project management boards",
      "Workflow visualization",
      "Status-based item organization",
    ],
    avoid: [
      "Simple lists (use list)",
      "Data without distinct stages",
    ],
    alternatives: [
      { type: "data-table", reason: "When tabular view is preferred" },
      { type: "list", reason: "For single-column item lists" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: false,
      description: "Board title",
    },
  ],
  bindings: {
    expects: [
      {
        type: "object",
        description: "Kanban board structure with columns array. KanbanData: { columns: Array<{ id: string; title: string; cards: Array<{ id: string; title: string; description?: string; tags?: string[]; avatar?: string; avatarAlt?: string }> }> }",
        shape: {
          columns: "KanbanColumn[]",
        },
      },
    ],
    resolves: [
      {
        expression: ":board",
        value: {
          columns: [
            { id: "todo", title: "To Do", cards: [{ id: "1", title: "Task 1" }] },
            { id: "doing", title: "In Progress", cards: [] },
            { id: "done", title: "Done", cards: [] },
          ],
        },
      },
    ],
  },
  composition: {
    validParents: ["container", "card"],
    validChildren: [],
  },
  features: {
    empty: true,
    dragDrop: true,
    responsive: true,
    darkMode: true,
  },
  a11y: {
    role: "region",
    requirements: [
      "Columns are groups with aria-label",
      "Cards are draggable with aria-grabbed",
      "Keyboard drag-drop instructions provided",
    ],
  },
  examples: [
    {
      name: "Task board",
      dsl: 'Kb :projectBoard "Sprint Board"',
      data: {
        projectBoard: {
          columns: [
            { id: "1", title: "Backlog", cards: [{ id: "t1", title: "Design review" }] },
            { id: "2", title: "In Progress", cards: [] },
            { id: "3", title: "Done", cards: [] },
          ],
        },
      },
      renders: "Three-column kanban board with draggable cards",
    },
  ],
};

const calendarSpec: ComponentSpec = {
  type: "calendar",
  description:
    "Full calendar view with month navigation. Supports single, multiple, and range date selection modes.",
  category: "data-display.collections",
  usage: {
    when: [
      "Date selection for forms",
      "Displaying date-based data",
      "Booking/scheduling interfaces",
    ],
    avoid: [
      "Simple date input (use date picker)",
      "Time-only selection (use time picker)",
    ],
    alternatives: [
      { type: "date", reason: "For compact date input field" },
      { type: "daterange", reason: "For dedicated range picker UI" },
    ],
  },
  props: [
    {
      name: "mode",
      type: "'single' | 'multiple' | 'range'",
      required: false,
      description: "Selection mode",
      default: "single",
    },
    {
      name: "minDate",
      type: "Date | string",
      required: false,
      description: "Minimum selectable date",
    },
    {
      name: "maxDate",
      type: "Date | string",
      required: false,
      description: "Maximum selectable date",
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "ISO date string (YYYY-MM-DD)" },
      {
        type: "object",
        description: "Date range",
        shape: { start: "string (ISO)", end: "string (ISO)" },
      },
      { type: "array", description: "Multiple ISO date strings" },
    ],
  },
  composition: {
    validParents: ["container", "card", "popover", "modal"],
    validChildren: [],
  },
  features: {
    responsive: true,
    darkMode: true,
  },
  a11y: {
    role: "grid",
    requirements: [
      "Arrow key navigation between dates",
      "Enter/Space to select",
      "Current date has aria-current=date",
      "Live region announces navigation",
    ],
  },
  examples: [
    {
      name: "Single date selection",
      dsl: 'Ca :selectedDate "Pick a date"',
      data: { selectedDate: "2024-06-15" },
      renders: "Calendar with June 15 selected",
    },
    {
      name: "Date range",
      dsl: "Ca :dateRange #range",
      data: { dateRange: { start: "2024-06-10", end: "2024-06-20" } },
      renders: "Calendar with range highlighted",
    },
  ],
};

// ============================================================================
// States
// ============================================================================

const emptySpec: ComponentSpec = {
  type: "empty",
  description:
    "Empty state display with preset illustrations (no-data, no-results, error, inbox, search, custom).",
  category: "feedback.status",
  usage: {
    when: [
      "No data matches filters",
      "Empty collections or inboxes",
      "First-time user states",
      "Search with no results",
    ],
    avoid: [
      "Loading states (use skeleton)",
      "Error states with actions (use alert)",
    ],
    alternatives: [
      { type: "skeleton", reason: "When data is loading" },
      { type: "alert", reason: "For actionable error states" },
    ],
  },
  props: [
    {
      name: "preset",
      type: "'no-data' | 'no-results' | 'error' | 'inbox' | 'search' | 'custom'",
      required: false,
      description: "Preset illustration and message",
      default: "no-data",
    },
    {
      name: "title",
      type: "string",
      required: false,
      description: "Custom title text",
    },
    {
      name: "description",
      type: "string",
      required: false,
      description: "Custom description text",
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Preset name or custom message" },
      {
        type: "object",
        description: "Empty state configuration",
        shape: { preset: "string", title: "string", description: "string" },
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "list", "data-table"],
    validChildren: ["button"],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "status",
    requirements: ["Message is announced to screen readers"],
  },
  examples: [
    {
      name: "No search results",
      dsl: 'Em #no-results "Try different keywords"',
      renders: "Empty state with search illustration",
    },
    {
      name: "Empty inbox",
      dsl: "Em #inbox",
      renders: "Empty inbox illustration with default message",
    },
  ],
};

const skeletonSpec: ComponentSpec = {
  type: "skeleton",
  description:
    "Placeholder loading state with shimmer animation. Supports text, circle, rectangle, and card shapes.",
  category: "feedback.progress",
  usage: {
    when: [
      "Content is loading asynchronously",
      "Placeholder while fetching data",
      "Initial page load states",
    ],
    avoid: [
      "Action loading (use spinner)",
      "When content shape is unknown",
    ],
    alternatives: [
      { type: "spinner", reason: "For action-based loading indicators" },
      { type: "progress", reason: "When progress is determinable" },
    ],
  },
  props: [
    {
      name: "shape",
      type: "'text' | 'circle' | 'rectangle' | 'card'",
      required: false,
      description: "Skeleton shape",
      default: "text",
    },
    {
      name: "lines",
      type: "number",
      required: false,
      description: "Number of text lines",
      default: 1,
    },
    {
      name: "animation",
      type: "'shimmer' | 'pulse' | 'none'",
      required: false,
      description: "Animation style",
      default: "shimmer",
    },
  ],
  bindings: {
    expects: [
      { type: "number", description: "Number of lines" },
      { type: "string", description: "Shape name" },
      {
        type: "object",
        description: "Skeleton configuration",
        shape: {
          shape: "string",
          width: "string | number",
          height: "string | number",
          lines: "number",
          animation: "string",
        },
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "list"],
    validChildren: [],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "status",
    liveRegion: "polite",
    requirements: ["aria-busy=true while loading", "aria-label describes loading state"],
  },
  examples: [
    {
      name: "Text skeleton",
      dsl: "Sk 3",
      renders: "Three skeleton text lines",
    },
    {
      name: "Card skeleton",
      dsl: "Sk #card",
      renders: "Card-shaped skeleton with avatar and text",
    },
  ],
};

const progressSpec: ComponentSpec = {
  type: "progress",
  description:
    "Progress indicator bar with percentage display. Supports indeterminate mode for unknown durations.",
  category: "feedback.progress",
  usage: {
    when: [
      "Showing completion percentage",
      "Upload/download progress",
      "Multi-step process completion",
    ],
    avoid: [
      "Indeterminate loading (use spinner)",
      "Action feedback (use toast)",
    ],
    alternatives: [
      { type: "spinner", reason: "For unknown duration loading" },
      { type: "gauge", reason: "For displaying metrics in radial format" },
    ],
  },
  props: [
    {
      name: "indeterminate",
      type: "boolean",
      required: false,
      description: "Show indeterminate animation",
      default: false,
    },
    {
      name: "showValue",
      type: "boolean",
      required: false,
      description: "Display percentage text",
      default: true,
    },
    {
      name: "color",
      type: "string",
      required: false,
      description: "Bar color",
    },
  ],
  bindings: {
    expects: [
      { type: "number", description: "Progress value 0-100" },
      {
        type: "object",
        description: "Progress configuration",
        shape: { value: "number", max: "number", indeterminate: "boolean" },
      },
    ],
  },
  composition: {
    validParents: ["container", "card"],
    validChildren: [],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "progressbar",
    requirements: [
      "aria-valuenow for current value",
      "aria-valuemin and aria-valuemax",
      "aria-label describing the progress",
    ],
  },
  examples: [
    {
      name: "Upload progress",
      dsl: 'Pg :uploadProgress "Uploading..."',
      data: { uploadProgress: 65 },
      renders: "Progress bar at 65%",
    },
    {
      name: "Indeterminate",
      dsl: "Pg #indeterminate",
      renders: "Animated indeterminate progress bar",
    },
  ],
};

const spinnerSpec: ComponentSpec = {
  type: "spinner",
  description: "Animated loading spinner for indicating ongoing operations.",
  category: "feedback.progress",
  usage: {
    when: [
      "Button or action is processing",
      "Page section is loading",
      "Unknown duration operations",
    ],
    avoid: [
      "Known progress amounts (use progress)",
      "Content placeholders (use skeleton)",
    ],
    alternatives: [
      { type: "progress", reason: "When progress is determinable" },
      { type: "skeleton", reason: "For content placeholders" },
    ],
  },
  props: [
    {
      name: "size",
      type: "'sm' | 'md' | 'lg'",
      required: false,
      description: "Spinner size",
      default: "md",
    },
  ],
  bindings: {
    expects: [
      {
        type: "object",
        description: "Spinner configuration",
        shape: { size: "string" },
      },
    ],
  },
  composition: {
    validParents: ["button", "container", "card"],
    validChildren: [],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "status",
    liveRegion: "polite",
    requirements: ["aria-label describing what is loading"],
  },
  examples: [
    {
      name: "Button spinner",
      dsl: "Sp #sm",
      renders: "Small loading spinner",
    },
  ],
};

// ============================================================================
// Alerts & Feedback
// ============================================================================

const alertSpec: ComponentSpec = {
  type: "alert",
  description:
    "Contextual feedback message with semantic variants (info, success, warning, error).",
  category: "feedback.status",
  usage: {
    when: [
      "Displaying form validation results",
      "System status messages",
      "Important notices requiring attention",
    ],
    avoid: [
      "Transient feedback (use toast)",
      "Blocking confirmations (use alert-dialog)",
    ],
    alternatives: [
      { type: "toast", reason: "For temporary auto-dismissing messages" },
      { type: "alert-dialog", reason: "For blocking confirmations" },
    ],
  },
  props: [
    {
      name: "variant",
      type: "'default' | 'info' | 'success' | 'warning' | 'error'",
      required: false,
      description: "Alert semantic style",
      default: "default",
    },
    {
      name: "dismissible",
      type: "boolean",
      required: false,
      description: "Show dismiss button",
      default: false,
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Alert message" },
      {
        type: "object",
        description: "Alert configuration",
        shape: { message: "string", variant: "string", title: "string" },
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "form"],
    validChildren: ["text", "button"],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "alert",
    liveRegion: "assertive",
    requirements: [
      "Automatically announces to screen readers",
      "Dismiss button has aria-label",
    ],
  },
  examples: [
    {
      name: "Success alert",
      dsl: 'Al :message #success',
      data: { message: "Changes saved successfully" },
      renders: "Green success alert with message",
    },
    {
      name: "Error alert",
      dsl: 'Al "Invalid email address" #error',
      renders: "Red error alert",
    },
  ],
};

const alertDialogSpec: ComponentSpec = {
  type: "alert-dialog",
  description:
    "Modal confirmation dialog for destructive or important actions. Requires explicit user response.",
  category: "feedback.confirmation",
  usage: {
    when: [
      "Confirming destructive actions (delete, cancel)",
      "Important decisions requiring acknowledgment",
      "Actions that cannot be undone",
    ],
    avoid: [
      "Information display (use modal)",
      "Non-blocking messages (use alert or toast)",
    ],
    alternatives: [
      { type: "modal", reason: "For informational content" },
      { type: "alert", reason: "For non-blocking messages" },
    ],
  },
  props: [
    {
      name: "open",
      type: "boolean",
      required: true,
      description: "Dialog visibility state",
    },
    {
      name: "title",
      type: "string",
      required: true,
      description: "Dialog title",
    },
    {
      name: "description",
      type: "string",
      required: false,
      description: "Explanatory text",
    },
    {
      name: "cancelLabel",
      type: "string",
      required: false,
      description: "Cancel button text",
      default: "Cancel",
    },
    {
      name: "confirmLabel",
      type: "string",
      required: false,
      description: "Confirm button text",
      default: "Confirm",
    },
  ],
  bindings: {
    expects: [
      {
        type: "object",
        description: "Dialog configuration",
        shape: {
          open: "boolean",
          title: "string",
          description: "string",
        },
      },
    ],
  },
  composition: {
    validParents: [],
    validChildren: [],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "alertdialog",
    requirements: [
      "Focus trapped within dialog",
      "Escape key closes dialog",
      "aria-describedby for description",
      "Focus returns to trigger on close",
    ],
  },
  examples: [
    {
      name: "Delete confirmation",
      dsl: 'Ad :confirmDelete "Delete Item" "This cannot be undone"',
      data: { confirmDelete: { open: true } },
      renders: "Modal dialog with cancel and delete buttons",
    },
  ],
};

const toastSpec: ComponentSpec = {
  type: "toast",
  description:
    "Temporary notification message that auto-dismisses. Stacks multiple toasts.",
  category: "feedback.status",
  usage: {
    when: [
      "Transient success/error feedback",
      "Background operation completion",
      "Non-critical notifications",
    ],
    avoid: [
      "Persistent messages (use alert)",
      "Confirmations (use alert-dialog)",
    ],
    alternatives: [
      { type: "alert", reason: "For persistent inline messages" },
      { type: "alert-dialog", reason: "For blocking confirmations" },
    ],
  },
  props: [
    {
      name: "variant",
      type: "'default' | 'success' | 'error' | 'warning' | 'info'",
      required: false,
      description: "Toast semantic style",
      default: "default",
    },
    {
      name: "duration",
      type: "number",
      required: false,
      description: "Auto-dismiss duration in ms",
      default: 5000,
    },
    {
      name: "position",
      type: "'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'",
      required: false,
      description: "Toast position on screen",
      default: "bottom-right",
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Toast message" },
      {
        type: "object",
        description: "Toast configuration",
        shape: { message: "string", variant: "string", duration: "number" },
      },
    ],
  },
  composition: {
    validParents: [],
    validChildren: ["button"],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "status",
    liveRegion: "polite",
    requirements: [
      "Announced to screen readers",
      "Dismiss button accessible",
      "Not modal - doesn't trap focus",
    ],
  },
  examples: [
    {
      name: "Success toast",
      dsl: 'To "Saved!" #success',
      renders: "Green success toast in corner",
    },
    {
      name: "Error toast",
      dsl: 'To :errorMessage #error',
      data: { errorMessage: "Failed to save" },
      renders: "Red error toast",
    },
  ],
};

// ============================================================================
// Popovers & Overlays
// ============================================================================

const popoverSpec: ComponentSpec = {
  type: "popover",
  description:
    "Click-triggered floating panel for additional content or controls.",
  category: "overlays.popover",
  usage: {
    when: [
      "Contextual forms or controls",
      "Additional options on click",
      "Rich tooltip content",
    ],
    avoid: [
      "Simple text hints (use tooltip)",
      "Navigation menus (use dropdown)",
    ],
    alternatives: [
      { type: "tooltip", reason: "For simple hover hints" },
      { type: "dropdown", reason: "For menu-style options" },
    ],
  },
  props: [
    {
      name: "placement",
      type: "'top' | 'bottom' | 'left' | 'right'",
      required: false,
      description: "Popover position relative to trigger",
      default: "bottom",
    },
  ],
  bindings: {
    expects: [
      {
        type: "object",
        description: "Popover content",
        shape: { title: "string", content: "string | ReactNode" },
      },
    ],
  },
  composition: {
    validParents: ["container", "card"],
    validChildren: ["button", "text", "input", "form"],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "dialog",
    requirements: [
      "aria-haspopup on trigger",
      "aria-expanded state",
      "Focus management",
      "Escape to close",
    ],
  },
  examples: [
    {
      name: "Settings popover",
      dsl: "Po [Bt Settings] [form content]",
      renders: "Button that opens popover with form",
    },
  ],
};

const tooltipSpec: ComponentSpec = {
  type: "tooltip",
  description: "Hover/focus-triggered hint text for UI elements.",
  category: "overlays.tooltip",
  usage: {
    when: [
      "Explaining icon buttons",
      "Additional context on hover",
      "Abbreviation definitions",
    ],
    avoid: [
      "Interactive content (use popover)",
      "Long-form content",
    ],
    alternatives: [
      { type: "popover", reason: "For interactive or rich content" },
      { type: "hover-card", reason: "For preview cards on hover" },
    ],
  },
  props: [
    {
      name: "placement",
      type: "'top' | 'bottom' | 'left' | 'right'",
      required: false,
      description: "Tooltip position",
      default: "top",
    },
    {
      name: "delay",
      type: "number",
      required: false,
      description: "Show delay in ms",
      default: 300,
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Tooltip text" },
    ],
  },
  composition: {
    validParents: ["button", "icon", "container"],
    validChildren: [],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "tooltip",
    requirements: [
      "aria-describedby on trigger",
      "role=tooltip on content",
      "Accessible on focus for keyboard users",
    ],
  },
  examples: [
    {
      name: "Icon tooltip",
      dsl: 'Tt [Ic "settings"] "Open settings"',
      renders: "Icon with hover tooltip",
    },
  ],
};

const dropdownSpec: ComponentSpec = {
  type: "dropdown",
  description: "Click-triggered menu with selectable options and submenus.",
  category: "overlays.popover",
  usage: {
    when: [
      "Action menus with multiple options",
      "User account menus",
      "Multi-level navigation",
    ],
    avoid: [
      "Form selections (use select)",
      "Rich content (use popover)",
    ],
    alternatives: [
      { type: "select", reason: "For form field selections" },
      { type: "context-menu", reason: "For right-click menus" },
    ],
  },
  props: [
    {
      name: "placement",
      type: "'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'",
      required: false,
      description: "Menu position",
      default: "bottom-start",
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        description:
          "Menu items array with DropdownItem interface: { id: string; label: string; icon?: ReactNode; shortcut?: string; disabled?: boolean; danger?: boolean; separator?: boolean; children?: DropdownItem[] }",
      },
    ],
  },
  composition: {
    validParents: ["container", "nav", "header"],
    validChildren: [],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "menu",
    requirements: [
      "Items have role=menuitem",
      "Arrow key navigation",
      "Escape to close",
      "Submenus have role=menu",
    ],
  },
  examples: [
    {
      name: "Actions menu",
      dsl: 'Dd [Bt "Actions"] :menuItems',
      data: {
        menuItems: [
          { id: "1", label: "Edit" },
          { id: "2", label: "Delete", danger: true },
        ],
      },
      renders: "Button with dropdown menu",
    },
  ],
};

const contextMenuSpec: ComponentSpec = {
  type: "context-menu",
  description:
    "Right-click triggered menu with nested submenus and keyboard shortcuts.",
  category: "overlays.popover",
  usage: {
    when: [
      "Right-click context actions",
      "File/item operations",
      "Power user quick actions",
    ],
    avoid: [
      "Primary actions (use buttons)",
      "Click-triggered menus (use dropdown)",
    ],
    alternatives: [
      { type: "dropdown", reason: "For click-triggered menus" },
    ],
  },
  props: [],
  bindings: {
    expects: [
      {
        type: "array",
        description:
          "Menu items array with ContextMenuItem interface: { id: string; label: string; icon?: ReactNode; shortcut?: string; disabled?: boolean; danger?: boolean; separator?: boolean; children?: ContextMenuItem[]; onClick?: () => void }",
      },
    ],
  },
  composition: {
    validParents: ["container", "card", "list"],
    validChildren: [],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "menu",
    requirements: [
      "role=menuitem on items",
      "aria-haspopup for submenus",
      "aria-expanded for open submenus",
      "Arrow key navigation",
      "Escape to close",
    ],
  },
  examples: [
    {
      name: "File context menu",
      dsl: "Cm [Cd :file] :fileActions",
      data: {
        file: { name: "document.pdf" },
        fileActions: [
          { id: "1", label: "Open" },
          { id: "2", label: "Delete", danger: true, shortcut: "Del" },
        ],
      },
      renders: "Card with right-click context menu",
    },
  ],
};

const hoverCardSpec: ComponentSpec = {
  type: "hover-card",
  description:
    "Rich content card shown on hover with configurable delay and placement.",
  category: "overlays.popover",
  usage: {
    when: [
      "User profile previews",
      "Link previews",
      "Rich tooltip content with structure",
    ],
    avoid: [
      "Simple text hints (use tooltip)",
      "Interactive content (use popover)",
    ],
    alternatives: [
      { type: "tooltip", reason: "For simple text hints" },
      { type: "popover", reason: "For interactive content" },
    ],
  },
  props: [
    {
      name: "placement",
      type: "'top' | 'bottom' | 'left' | 'right'",
      required: false,
      description: "Card position",
      default: "top",
    },
    {
      name: "showDelay",
      type: "number",
      required: false,
      description: "Delay before showing (ms)",
      default: 500,
    },
    {
      name: "hideDelay",
      type: "number",
      required: false,
      description: "Delay before hiding (ms)",
      default: 300,
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Simple description text" },
      {
        type: "object",
        description: "Rich content configuration",
        shape: {
          title: "string",
          description: "string",
          avatar: "string (URL)",
          avatarInitials: "string",
          links: "Array<{ label: string; href: string }>",
        },
      },
    ],
  },
  composition: {
    validParents: ["container", "list", "text"],
    validChildren: ["avatar", "text", "badge", "button"],
  },
  features: {
    darkMode: true,
  },
  a11y: {
    role: "dialog",
    requirements: [
      "aria-haspopup=dialog on trigger",
      "aria-expanded state",
      "aria-describedby for content",
    ],
  },
  examples: [
    {
      name: "User preview",
      dsl: "Hc [Av :user] :userProfile",
      data: {
        user: { name: "Alice" },
        userProfile: {
          title: "Alice Smith",
          description: "Product Designer at Acme",
          avatar: "https://example.com/alice.jpg",
        },
      },
      renders: "Avatar with hover card showing profile",
    },
  ],
};

const commandSpec: ComponentSpec = {
  type: "command",
  description:
    "Command palette (Cmd+K style) with fuzzy search, keyboard navigation, and grouped items.",
  category: "overlays.modal",
  usage: {
    when: [
      "Global keyboard shortcuts",
      "Quick action search",
      "Power user navigation",
    ],
    avoid: [
      "Simple menus (use dropdown)",
      "Form selections (use select)",
    ],
    alternatives: [
      { type: "dropdown", reason: "For simple click menus" },
      { type: "select", reason: "For form field selections" },
    ],
  },
  props: [
    {
      name: "placeholder",
      type: "string",
      required: false,
      description: "Search input placeholder",
      default: "Search commands...",
    },
  ],
  bindings: {
    expects: [
      {
        type: "array",
        description:
          "Command groups array with CommandGroup interface: { heading: string; items: CommandItem[] } where CommandItem: { id: string; label: string; description?: string; icon?: ReactNode; shortcut?: string; disabled?: boolean; keywords?: string[]; onSelect?: () => void }",
      },
    ],
  },
  composition: {
    validParents: [],
    validChildren: [],
  },
  features: {
    darkMode: true,
    filtering: true,
  },
  a11y: {
    role: "combobox",
    requirements: [
      "role=listbox for results",
      "aria-autocomplete=list",
      "Arrow key navigation",
      "Enter to select",
      "Escape to close",
    ],
  },
  examples: [
    {
      name: "Command palette",
      dsl: 'Cm :commands "Search..."',
      data: {
        commands: [
          {
            heading: "Actions",
            items: [
              { id: "1", label: "New File", shortcut: "Cmd+N" },
              { id: "2", label: "Open", shortcut: "Cmd+O" },
            ],
          },
        ],
      },
      renders: "Command palette modal with search and grouped commands",
    },
  ],
};

// ============================================================================
// Export All Specs
// ============================================================================

export const dataDisplaySpecs: ComponentSpec[] = [
  // Cards & Containers
  cardSpec,
  kpiCardSpec,

  // Labels & Tags
  badgeSpec,
  tagSpec,

  // Identity & Media
  avatarSpec,
  iconSpec,
  imageSpec,

  // Collections
  listSpec,
  treeSpec,
  dataTableSpec,
  timelineSpec,
  kanbanSpec,
  calendarSpec,

  // States
  emptySpec,
  skeletonSpec,
  progressSpec,
  spinnerSpec,

  // Alerts & Feedback
  alertSpec,
  alertDialogSpec,
  toastSpec,

  // Popovers & Overlays
  popoverSpec,
  tooltipSpec,
  dropdownSpec,
  contextMenuSpec,
  hoverCardSpec,
  commandSpec,
];

export default dataDisplaySpecs;
