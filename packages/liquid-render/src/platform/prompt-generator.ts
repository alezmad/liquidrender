// AI Prompt Generator - Schema-aware system prompts for LiquidCode generation
// ============================================================================

import type { SchemaCatalog, CatalogBinding } from './catalog';

/**
 * Options for prompt generation
 */
export interface PromptGeneratorOptions {
  /** Include example DSL snippets */
  includeExamples?: boolean;
  /** Include full syntax reference */
  includeSyntaxReference?: boolean;
  /** Include relationships between bindings */
  includeRelationships?: boolean;
  /** Maximum number of bindings to include (for context limits) */
  maxBindings?: number;
  /** Custom instructions to append */
  customInstructions?: string;
  /** Verbosity level */
  verbosity?: 'minimal' | 'standard' | 'detailed';
}

/**
 * Generate AI system prompt from schema catalog
 */
export function generateSystemPrompt(
  catalog: SchemaCatalog,
  options: PromptGeneratorOptions = {}
): string {
  const {
    includeExamples = true,
    includeSyntaxReference = true,
    includeRelationships = false,
    maxBindings = 50,
    customInstructions,
    verbosity = 'standard',
  } = options;

  const sections: string[] = [];

  // Header
  sections.push(HEADER);

  // Bindings section
  sections.push(generateBindingsSection(catalog, maxBindings, verbosity));

  // Syntax reference
  if (includeSyntaxReference) {
    sections.push(verbosity === 'detailed' ? SYNTAX_REFERENCE_DETAILED : SYNTAX_REFERENCE);
  }

  // Relationships
  if (includeRelationships && Object.keys(catalog.relationships).length > 0) {
    sections.push(generateRelationshipsSection(catalog));
  }

  // Rules
  sections.push(RULES);

  // Examples
  if (includeExamples) {
    sections.push(verbosity === 'detailed' ? EXAMPLES_DETAILED : EXAMPLES);
  }

  // Custom instructions
  if (customInstructions) {
    sections.push(`## Additional Instructions\n\n${customInstructions}`);
  }

  return sections.join('\n\n');
}

/**
 * Generate just the bindings section (for partial updates)
 */
export function generateBindingsSection(
  catalog: SchemaCatalog,
  maxBindings: number = 50,
  verbosity: 'minimal' | 'standard' | 'detailed' = 'standard'
): string {
  const lines: string[] = ['## Available Data Bindings', ''];

  // Group bindings by type
  const metrics: Array<[string, CatalogBinding]> = [];
  const arrays: Array<[string, CatalogBinding]> = [];
  const objects: Array<[string, CatalogBinding]> = [];

  let count = 0;
  for (const [name, binding] of Object.entries(catalog.bindings)) {
    if (count >= maxBindings) {
      lines.push(`\n_... and ${Object.keys(catalog.bindings).length - maxBindings} more bindings_`);
      break;
    }

    if (binding.type === 'number' || binding.type === 'string' || binding.type === 'boolean') {
      metrics.push([name, binding]);
    } else if (binding.type === 'array') {
      arrays.push([name, binding]);
    } else {
      objects.push([name, binding]);
    }
    count++;
  }

  // Metrics
  if (metrics.length > 0) {
    lines.push('### Metrics (single values) → Use with `Kp`');
    for (const [name, binding] of metrics) {
      lines.push(formatBinding(name, binding, verbosity));
    }
    lines.push('');
  }

  // Arrays (charts & tables)
  if (arrays.length > 0) {
    lines.push('### Data Sets (arrays) → Use with `Ln`, `Br`, `Pi`, `Tb`, `Ls`');
    for (const [name, binding] of arrays) {
      lines.push(formatBinding(name, binding, verbosity));
    }
    lines.push('');
  }

  // Objects
  if (objects.length > 0) {
    lines.push('### Objects → Use with `Kp` (auto-expands) or nested binding');
    for (const [name, binding] of objects) {
      lines.push(formatBinding(name, binding, verbosity));
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format a single binding for the prompt
 */
function formatBinding(
  name: string,
  binding: CatalogBinding,
  verbosity: 'minimal' | 'standard' | 'detailed'
): string {
  const realtime = binding.realtime ? ' ⚡' : '';
  const suggested = binding.suggestedComponent ? ` → ${binding.suggestedComponent}` : '';

  if (verbosity === 'minimal') {
    return `- \`:${name}\` (${binding.type})${realtime}`;
  }

  let line = `- \`:${name}\` - ${binding.description}${realtime}${suggested}`;

  if (verbosity === 'detailed' && binding.example !== undefined) {
    const example = JSON.stringify(binding.example);
    if (example.length < 80) {
      line += `\n  Example: ${example}`;
    }
  }

  if (verbosity === 'detailed' && binding.schema?.properties) {
    const fields = Object.keys(binding.schema.properties).slice(0, 5);
    line += `\n  Fields: ${fields.join(', ')}${fields.length < Object.keys(binding.schema.properties).length ? '...' : ''}`;
  }

  return line;
}

/**
 * Generate relationships section
 */
function generateRelationshipsSection(catalog: SchemaCatalog): string {
  const lines = ['## Data Relationships', '', 'These bindings are related and often used together:', ''];

  for (const [binding, related] of Object.entries(catalog.relationships)) {
    lines.push(`- \`:${binding}\` ↔ ${related.map((r) => `:${r}`).join(', ')}`);
  }

  return lines.join('\n');
}

// ============================================================================
// Static Prompt Sections
// ============================================================================

const HEADER = `# LiquidCode UI Generator

You generate LiquidCode DSL to create dynamic data visualizations based on user requests.
LiquidCode is a compact, LLM-optimized syntax for describing UI components and data bindings.

**IMPORTANT**: Only use bindings listed below. Each binding maps to real data from connected sources.`;

const SYNTAX_REFERENCE = `## LiquidCode Syntax

### Components
| Code | Component | Data Type | Description |
|------|-----------|-----------|-------------|
| \`Kp\` | KPI Card | number/object | Single metric or auto-expand object |
| \`Ln\` | Line Chart | array | Time series data |
| \`Br\` | Bar Chart | array | Categorical comparisons |
| \`Pi\` | Pie Chart | array | Part-to-whole relationships |
| \`Tb\` | Table | array | Tabular data display |
| \`Ls\` | List | array | Vertical list of items |
| \`Bt\` | Button | - | Interactive button |
| \`Tx\` | Text | string | Text display |

### Data Binding
- \`:fieldName\` - Bind to a data field
- \`:obj.nested\` - Nested field access
- \`"literal"\` - String literal
- \`=expression\` - Computed value

### Layout
- \`Cn ^r [...]\` - Row container (horizontal)
- \`Cn ^c [...]\` - Column container (vertical)
- \`Cn ^g [...]\` - Grid container

### Modifiers
- \`#color\` - Color accent (#green, #blue, #red, #yellow, #purple)
- \`~5s\` - Refresh interval (for real-time bindings)
- \`"Label"\` - Custom label`;

const SYNTAX_REFERENCE_DETAILED = `## LiquidCode Syntax Reference

### Component Codes
| Code | Component | Best For | Data Type |
|------|-----------|----------|-----------|
| \`Kp\` | KPI Card | Single metrics, summaries | number, object |
| \`Ln\` | Line Chart | Trends over time | array of {x, y} |
| \`Br\` | Bar Chart | Comparisons | array of {category, value} |
| \`Pi\` | Pie Chart | Proportions | array of {name, value} |
| \`Tb\` | Table | Detailed data | array of objects |
| \`Ls\` | List | Vertical items | array |
| \`Cd\` | Card | Grouped content | any |
| \`Fm\` | Form | User input | - |
| \`Bt\` | Button | Actions | - |
| \`In\` | Input | Text entry | - |
| \`Tx\` | Text | Display text | string |
| \`Md\` | Modal | Overlay content | - |

### Data Binding Patterns
\`\`\`
:fieldName          → Simple field binding
:obj.nested.field   → Nested field access
:field1 :field2     → Multiple fields (KPI auto-expands)
:.arrayField        → Iterator over array
"literal text"      → String literal
=expression         → Computed (e.g., =price * quantity)
=value|currency     → Formatted (currency, percent, number, compact)
\`\`\`

### Layout & Containers
\`\`\`
Cn ^r [A B C]       → Row (horizontal)
Cn ^c [A B C]       → Column (vertical)
Cn ^g [A B C]       → Grid
^1 ^2 ^3            → Priority/ordering
\`\`\`

### Signals (Interactivity)
\`\`\`
@signal             → Declare a signal
Bt "Click" >sig=val → Emit signal on click
?@sig=val Block     → Conditional render
<sig                → Receive signal
\`\`\`

### Style Modifiers
\`\`\`
#green #blue #red   → Color accents
#yellow #purple     → More colors
~5s ~10s ~1m        → Refresh intervals
$lo $hi $auto       → Fidelity levels
\`\`\`

### Labels
\`\`\`
Kp :revenue "Total Revenue"    → Explicit label
Br :sales "Monthly Sales"      → Chart title
\`\`\``;

const RULES = `## Rules

1. **Only use listed bindings** - Don't invent binding names
2. **Match component to data type**:
   - \`Kp\` for numbers/metrics
   - \`Ln/Br/Pi\` for arrays (charts)
   - \`Tb\` for array data tables
3. **Use containers for layout** - \`Cn ^r [...]\` for rows
4. **Add labels** - Help users understand the data
5. **Keep it simple** - Don't over-complicate layouts
6. **Use real-time marker** - \`~5s\` only for bindings marked ⚡`;

const EXAMPLES = `## Examples

**User**: "Show me revenue"
\`\`\`
Kp :revenue "Total Revenue"
\`\`\`

**User**: "Dashboard with key metrics"
\`\`\`
Cn ^r [ Kp :revenue "Revenue" Kp :orders "Orders" Kp :customers "Customers" ]
\`\`\`

**User**: "Sales chart with data table"
\`\`\`
Br :salesByRegion "Regional Sales"
Tb :recentOrders "Recent Orders"
\`\`\`

**User**: "Monthly trends"
\`\`\`
Ln :monthlyData "Monthly Performance"
\`\`\``;

const EXAMPLES_DETAILED = `## Examples

### Simple Metric
**User**: "Show me revenue"
\`\`\`
Kp :revenue "Total Revenue"
\`\`\`

### Multiple Metrics (Row)
**User**: "Dashboard with key metrics"
\`\`\`
Cn ^r [ Kp :revenue "Revenue" #green Kp :orders "Orders" #blue Kp :customers "Customers" ]
\`\`\`

### Chart + Table
**User**: "Sales breakdown with details"
\`\`\`
Br :salesByRegion "Sales by Region"
Tb :recentOrders "Recent Orders"
\`\`\`

### Multiple Charts
**User**: "Compare monthly and regional data"
\`\`\`
Cn ^r [
  Ln :monthlyData "Monthly Trend"
  Pi :salesByRegion "By Region"
]
\`\`\`

### Interactive Tabs
**User**: "Tabbed view with overview, charts, and data"
\`\`\`
@tab
Cn ^r [ Bt "Overview" >tab=0 Bt "Charts" >tab=1 Bt "Data" >tab=2 ]
?@tab=0 Kp :summary
?@tab=1 Ln :monthlyData
?@tab=2 Tb :transactions
\`\`\`

### Real-time Dashboard
**User**: "Live metrics dashboard"
\`\`\`
Cn ^r [ Kp :liveUsers "Active Users" ~5s Kp :liveRevenue "Revenue" ~5s ]
Ln :liveEvents "Event Stream" ~1s
\`\`\`

### Complex Layout
**User**: "Executive dashboard with everything"
\`\`\`
Cn ^c [
  Cn ^r [ Kp :revenue #green Kp :orders #blue Kp :growth #purple ]
  Cn ^r [ Ln :monthlyData "Trends" Br :salesByCategory "By Category" ]
  Tb :recentTransactions "Latest Transactions"
]
\`\`\``;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a minimal prompt for context-constrained scenarios
 */
export function generateMinimalPrompt(catalog: SchemaCatalog): string {
  const bindingList = Object.entries(catalog.bindings)
    .slice(0, 20)
    .map(([name, b]) => `:${name}(${b.type})`)
    .join(' ');

  return `Generate LiquidCode DSL. Available bindings: ${bindingList}

Components: Kp(metric) Ln(line) Br(bar) Pi(pie) Tb(table) Cn(container)
Layout: Cn ^r [...] = row, Cn ^c [...] = column
Example: Cn ^r [ Kp :revenue "Revenue" Br :sales "Sales" ]`;
}

/**
 * Generate prompt section for a specific connector's bindings
 */
export function generateConnectorSection(
  catalog: SchemaCatalog,
  connectorId: string
): string {
  const connectorMeta = catalog.connectors[connectorId];
  if (!connectorMeta) return '';

  const bindings = Object.entries(catalog.bindings)
    .filter(([_, b]) => b.connector === connectorId);

  if (bindings.length === 0) return '';

  const lines = [`### ${connectorMeta.name}`, ''];

  for (const [name, binding] of bindings) {
    lines.push(formatBinding(name, binding, 'standard'));
  }

  return lines.join('\n');
}

/**
 * Estimate token count for a prompt (rough approximation)
 */
export function estimateTokens(prompt: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(prompt.length / 4);
}

/**
 * Truncate prompt to fit within token limit
 */
export function truncatePrompt(
  catalog: SchemaCatalog,
  maxTokens: number,
  options: PromptGeneratorOptions = {}
): string {
  // Start with full prompt
  let prompt = generateSystemPrompt(catalog, options);
  let tokens = estimateTokens(prompt);

  // Progressively reduce if over limit
  if (tokens > maxTokens) {
    prompt = generateSystemPrompt(catalog, { ...options, includeExamples: false });
    tokens = estimateTokens(prompt);
  }

  if (tokens > maxTokens) {
    prompt = generateSystemPrompt(catalog, {
      ...options,
      includeExamples: false,
      verbosity: 'minimal',
    });
    tokens = estimateTokens(prompt);
  }

  if (tokens > maxTokens) {
    prompt = generateSystemPrompt(catalog, {
      ...options,
      includeExamples: false,
      includeSyntaxReference: false,
      verbosity: 'minimal',
      maxBindings: 20,
    });
  }

  if (tokens > maxTokens) {
    // Last resort: minimal prompt
    prompt = generateMinimalPrompt(catalog);
  }

  return prompt;
}
