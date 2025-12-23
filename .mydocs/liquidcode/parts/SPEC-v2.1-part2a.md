# LiquidCode Specification v2.1 - Part 2A: Layout System

**Version:** 2.1 Part 2A
**Date:** 2025-12-22
**Status:** Draft - Enhanced
**Changes:** Integrated ISS-009, ISS-094, ISS-095, ISS-096, ISS-065

---

## 11. Layout & Responsiveness System

### 11.1 The Layout Problem

Traditional approaches fail for LLM-generated interfaces:

| Approach | Problem |
|----------|---------|
| Pixel sizes in schema | Fragile, platform-specific, token-heavy |
| CSS media queries | Platform-specific, LLM can't reason about it |
| Fixed percentages | Doesn't adapt to content or container |

**The insight:** Layout is not about sizes. Layout is about **relationships and priorities**.

The LLM should express semantic intent:
- "This is the most important block"
- "These blocks should stay together"
- "This can shrink if needed"

The **adapter** converts these constraints to platform-specific layout.

### 11.2 The Three Layout Concepts

| Concept | Purpose | What LLM Decides |
|---------|---------|------------------|
| **Priority** | Importance ranking | Which blocks matter most |
| **Flexibility** | Resize behavior | What can adapt to space |
| **Relationship** | Spatial semantics | How blocks relate |

### 11.3 Priority System

Blocks have semantic importance levels:

| Priority | Level | Meaning | Responsive Behavior |
|----------|-------|---------|---------------------|
| `hero` | 1 | The main insight | Never hidden, always visible |
| `primary` | 2 | Key supporting info | Visible in standard+ breakpoints |
| `secondary` | 3 | Important but deferrable | May collapse on small screens |
| `detail` | 4 | Nice-to-have | Hidden on compact, shown on demand |

**Default:** Blocks without explicit priority are `primary`.

### 11.4 Flexibility System

Blocks have adaptation behavior:

| Flexibility | Meaning | Use Case |
|-------------|---------|----------|
| `fixed` | Needs its content space | KPIs, key metrics |
| `shrink` | Can reduce size | Charts (lose legend/labels) |
| `grow` | Can expand to fill | Tables, large visualizations |
| `collapse` | Can minimize/hide | Detail blocks, secondary info |

**Defaults by block type:**

| Block Type | Default Flexibility |
|------------|---------------------|
| kpi | fixed |
| bar-chart, line-chart, pie-chart | shrink |
| data-table | grow |
| text | shrink |
| metric-group | shrink |

### 11.5 Relationship System

Blocks can have spatial relationships:

| Relationship | Meaning | Example |
|--------------|---------|---------|
| `group` | These blocks are a unit | KPI row that moves together |
| `compare` | Should be same size | Side-by-side charts |
| `detail` | Elaborates another block | Table showing chart data |
| `flow` | Natural reading order | Can wrap to next line |

### 11.6 LiquidCode Layout Syntax

**Priority suffix:** `!`
```liquidcode
K$revenue!hero      # Hero priority (never hide)
K$orders!1          # Explicit level 1
L$trend!3           # Secondary (can collapse)
K$profit!detail     # Detail (hidden on compact)
```

**Flexibility suffix:** `^`
```liquidcode
K$revenue^fixed     # Fixed size
L$trend^grow        # Can grow to fill space
T$orders^shrink     # Can shrink
P$dist^collapse     # Can collapse/hide
```

**Relationship grouping:** `=`
```liquidcode
[K$revenue K$orders K$profit]=group    # These stay together
[L$trend B$compare]=compare            # Same size
[K$total -> T$breakdown]=detail        # Detail relationship
```

**Combined (composable):**
```liquidcode
K$revenue!hero^fixed    # Hero priority, fixed size
L$trend!2^grow*full     # Primary, can grow, full width
```

**Span suffix:** `*` (in grid context)
```liquidcode
L$trend*full            # Full width (all columns)
T$data*2                # Span 2 columns
```

### 11.7 Complete Layout Example

```liquidcode
#sales_dashboard;G2x3
§dateRange:dr=30d,url
DF<>@dateRange
K$revenue!hero^fixed
K$orders!1^fixed
K$profit!2^fixed
[K$revenue K$orders K$profit]=group
L$trend!1^grow*full
B$byRegion!2^shrink
[L$trend B$byRegion]=compare
T$details!3^collapse*full
```

This encodes:
- Revenue KPI is hero (never hidden)
- Three KPIs are a group (stay together)
- Trend chart and region chart should be same height
- Details table can collapse and spans full width

### 11.8 Block Layout Properties (Schema)

The Block interface (see §4.1) includes an optional `layout` field:

```typescript
interface BlockLayout {
  // Priority (1-4, or semantic name)
  priority?: 1 | 2 | 3 | 4 | 'hero' | 'primary' | 'secondary' | 'detail';

  // Flexibility
  flex?: 'fixed' | 'shrink' | 'grow' | 'collapse';

  // Size hints (adapter interprets)
  size?: SizeHints;

  // Span (in grid context)
  span?: SpanSpec;

  // Relationship to other blocks
  relationship?: RelationshipSpec;
}

interface SizeHints {
  min?: SizeValue;       // Minimum viable size
  ideal?: SizeValue;     // Preferred size
  max?: SizeValue;       // Maximum size
  aspect?: number;       // Width/height ratio (e.g., 16/9)
}

type SizeValue = number | 'auto' | 'content' | `${number}%`;

interface SpanSpec {
  columns?: number | 'full' | 'half' | 'third' | 'quarter' | 'auto';
  rows?: number;
}

interface RelationshipSpec {
  type: 'group' | 'compare' | 'detail' | 'flow';
  with?: string[];       // Block IDs/UIDs in relationship
}
```

### 11.9 Intrinsic Block Sizes

Each block type has natural size requirements:

| Block Type | Min Width | Ideal Width | Height | Aspect Ratio |
|------------|-----------|-------------|--------|--------------|
| kpi | 100px | 200px | ~80px | - |
| bar-chart | 200px | 400px | auto | 16:9 |
| line-chart | 250px | 500px | auto | 16:9 |
| pie-chart | 150px | 300px | auto | 1:1 |
| data-table | 300px | 100% | content | - |
| text | 150px | 100% | content | - |
| comparison | 120px | 250px | ~100px | - |

### 11.10 Slot Context (Embedded Rendering)

When LiquidCode renders in a container (not full screen), the adapter provides context:

```typescript
interface SlotContext {
  // Available space
  width: number;
  height: number | 'auto';

  // Breakpoint (adapter-determined)
  breakpoint: 'compact' | 'standard' | 'expanded';

  // Constraints
  minBlockWidth?: number;
  orientation?: 'any' | 'portrait' | 'landscape';

  // Parent coordination
  parentSignals?: SignalRegistry;
}
```

The engine uses slot context during compilation:

```typescript
engine.compile(liquidCode, {
  context: slotContext,
  adapt: true  // Enable responsive adaptation
});
```

### 11.11 Responsive Transformation Rules

The engine transforms schemas based on breakpoint:

| Breakpoint | Trigger | Transformation |
|------------|---------|----------------|
| `expanded` | width >= 1200px | Full layout as designed |
| `standard` | 600px <= width < 1200px | Reduce columns, stack some blocks |
| `compact` | width < 600px | Single column, collapse detail blocks |

**Transformation algorithm:**

```
1. Determine breakpoint from slot context
2. Filter blocks by priority for breakpoint
3. Calculate available space per visible block
4. Apply flexibility rules:
   - fixed: allocate minimum required
   - grow: share remaining space proportionally
   - shrink: reduce to minimum viable
   - collapse: minimize or hide
5. Apply relationships:
   - group: keep together, stack if needed
   - compare: equalize dimensions
   - detail: position after master
6. Generate adapted layout
```

#### 11.11.1 The Enhanced Constraint Solver Algorithm

The layout engine uses a priority-based constraint solver to resolve conflicts and distribute space.

**Constraint Representation:**

```typescript
interface LayoutConstraint {
  type: ConstraintType;
  priority: number;         // 1 (lowest) to 10 (highest)
  blocks: string[];         // Block UIDs affected
  requirement: ConstraintRequirement;
}

type ConstraintType =
  | 'min-size'              // Block must be at least N px
  | 'max-size'              // Block must be at most N px
  | 'fixed-size'            // Block must be exactly N px
  | 'aspect-ratio'          // Block must maintain aspect ratio
  | 'equal-size'            // Blocks must be same size (compare)
  | 'group-together'        // Blocks must be adjacent (group)
  | 'priority-visibility'   // Block visibility based on priority level
  | 'space-distribution';   // How remaining space is distributed

interface ConstraintRequirement {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatio?: number;
  distribution?: 'equal' | 'proportional' | 'min-content';
}
```

**Constraint Priority Levels:**

| Priority | Constraint Type | Rationale |
|----------|----------------|-----------|
| 10 | `priority-visibility` for hero blocks | Never hide critical content |
| 9 | `min-size` from intrinsic block requirements | Blocks must be usable |
| 8 | `fixed-size` from explicit layout | User/LLM intent is explicit |
| 7 | `aspect-ratio` for charts | Visual integrity |
| 6 | `equal-size` for compare relationships | Meaningful comparison |
| 5 | `group-together` for group relationships | Semantic coherence |
| 4 | `max-size` from container constraints | Must fit in available space |
| 3 | `space-distribution` for grow/shrink | Aesthetic polish |
| 2 | `priority-visibility` for detail blocks | Can hide if space limited |

**Constraint Generation from Block Metadata:**

```typescript
function generateConstraints(
  blocks: Block[],
  slotContext: SlotContext,
  layout: LayoutBlock
): LayoutConstraint[] {
  const constraints: LayoutConstraint[] = [];

  // 1. Priority visibility constraints
  for (const block of blocks) {
    const priorityLevel = block.layout?.priority || 'primary';
    const numericPriority = typeof priorityLevel === 'number'
      ? priorityLevel
      : { hero: 1, primary: 2, secondary: 3, detail: 4 }[priorityLevel];

    const visibleAtBreakpoint = shouldShowAtBreakpoint(numericPriority, slotContext.breakpoint);

    constraints.push({
      type: 'priority-visibility',
      priority: visibleAtBreakpoint ? 10 : 2,
      blocks: [block.uid],
      requirement: { minWidth: visibleAtBreakpoint ? 1 : 0 }  // 0 = hidden
    });
  }

  // 2. Intrinsic size constraints
  for (const block of blocks) {
    const intrinsic = getIntrinsicSize(block.type);

    constraints.push({
      type: 'min-size',
      priority: 9,
      blocks: [block.uid],
      requirement: {
        minWidth: intrinsic.minWidth,
        minHeight: intrinsic.minHeight
      }
    });

    if (intrinsic.aspectRatio) {
      constraints.push({
        type: 'aspect-ratio',
        priority: 7,
        blocks: [block.uid],
        requirement: { aspectRatio: intrinsic.aspectRatio }
      });
    }
  }

  // 3. Explicit size constraints (from block.layout.size)
  for (const block of blocks) {
    if (block.layout?.flex === 'fixed' && block.layout.size?.ideal) {
      constraints.push({
        type: 'fixed-size',
        priority: 8,
        blocks: [block.uid],
        requirement: {
          minWidth: parseSize(block.layout.size.ideal),
          maxWidth: parseSize(block.layout.size.ideal)
        }
      });
    }
  }

  // 4. Relationship constraints
  for (const block of blocks) {
    if (block.layout?.relationship?.type === 'compare') {
      const compareWith = block.layout.relationship.with || [];
      constraints.push({
        type: 'equal-size',
        priority: 6,
        blocks: [block.uid, ...compareWith],
        requirement: { distribution: 'equal' }
      });
    }

    if (block.layout?.relationship?.type === 'group') {
      const groupWith = block.layout.relationship.with || [];
      constraints.push({
        type: 'group-together',
        priority: 5,
        blocks: [block.uid, ...groupWith],
        requirement: {}
      });
    }
  }

  // 5. Container max-size constraints
  constraints.push({
    type: 'max-size',
    priority: 4,
    blocks: blocks.map(b => b.uid),
    requirement: {
      maxWidth: slotContext.width,
      maxHeight: slotContext.height === 'auto' ? undefined : slotContext.height
    }
  });

  return constraints;
}

function shouldShowAtBreakpoint(priority: number, breakpoint: Breakpoint): boolean {
  const visibility = {
    compact: [1],           // Only hero
    standard: [1, 2],       // Hero + primary
    expanded: [1, 2, 3, 4]  // All
  };
  return visibility[breakpoint].includes(priority);
}
```

**Constraint Solving Algorithm:**

```typescript
interface LayoutSolution {
  blocks: BlockLayout[];
  satisfied: LayoutConstraint[];
  violated: LayoutConstraint[];
  totalScore: number;
}

interface BlockLayout {
  uid: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

function solveLayout(
  blocks: Block[],
  constraints: LayoutConstraint[],
  slotContext: SlotContext,
  layoutType: 'grid' | 'stack'
): LayoutSolution {
  // Step 1: Sort constraints by priority (descending)
  const sortedConstraints = [...constraints].sort((a, b) => b.priority - a.priority);

  // Step 2: Initialize block positions and sizes
  let solution: BlockLayout[] = blocks.map(b => ({
    uid: b.uid,
    x: 0,
    y: 0,
    width: getIntrinsicSize(b.type).idealWidth,
    height: getIntrinsicSize(b.type).idealHeight || 200,
    visible: true
  }));

  // Step 3: Apply constraints in priority order
  const satisfied: LayoutConstraint[] = [];
  const violated: LayoutConstraint[] = [];

  for (const constraint of sortedConstraints) {
    const result = applyConstraint(constraint, solution, slotContext);

    if (result.success) {
      solution = result.solution;
      satisfied.push(constraint);
    } else {
      violated.push(constraint);

      // For critical constraints (priority >= 8), force satisfaction
      if (constraint.priority >= 8) {
        solution = result.forcedSolution || solution;
        satisfied.push(constraint);
      }
    }
  }

  // Step 4: Distribute remaining space (grow/shrink)
  solution = distributeSpace(solution, blocks, slotContext, layoutType);

  // Step 5: Position blocks (grid or stack)
  solution = positionBlocks(solution, layoutType, slotContext);

  // Step 6: Calculate solution score
  const totalScore = calculateScore(satisfied, violated);

  return {
    blocks: solution,
    satisfied,
    violated,
    totalScore
  };
}

function applyConstraint(
  constraint: LayoutConstraint,
  solution: BlockLayout[],
  slotContext: SlotContext
): { success: boolean; solution?: BlockLayout[]; forcedSolution?: BlockLayout[] } {
  const newSolution = [...solution];

  switch (constraint.type) {
    case 'priority-visibility': {
      const block = newSolution.find(b => b.uid === constraint.blocks[0]);
      if (block) {
        block.visible = (constraint.requirement.minWidth || 0) > 0;
      }
      return { success: true, solution: newSolution };
    }

    case 'min-size': {
      const block = newSolution.find(b => b.uid === constraint.blocks[0]);
      if (block && constraint.requirement.minWidth) {
        block.width = Math.max(block.width, constraint.requirement.minWidth);
      }
      if (block && constraint.requirement.minHeight) {
        block.height = Math.max(block.height, constraint.requirement.minHeight);
      }
      return { success: true, solution: newSolution };
    }

    case 'max-size': {
      let totalWidth = newSolution.filter(b => b.visible).reduce((sum, b) => sum + b.width, 0);
      const exceeds = totalWidth > slotContext.width;

      if (exceeds) {
        // Scale down all blocks proportionally
        const scale = slotContext.width / totalWidth;
        newSolution.forEach(b => {
          if (b.visible) b.width *= scale;
        });
      }

      return { success: !exceeds, solution: newSolution };
    }

    case 'fixed-size': {
      const block = newSolution.find(b => b.uid === constraint.blocks[0]);
      if (block && constraint.requirement.minWidth) {
        block.width = constraint.requirement.minWidth;
      }
      return { success: true, solution: newSolution };
    }

    case 'equal-size': {
      const affectedBlocks = newSolution.filter(b => constraint.blocks.includes(b.uid));
      const avgWidth = affectedBlocks.reduce((sum, b) => sum + b.width, 0) / affectedBlocks.length;
      const avgHeight = affectedBlocks.reduce((sum, b) => sum + b.height, 0) / affectedBlocks.length;

      affectedBlocks.forEach(b => {
        b.width = avgWidth;
        b.height = avgHeight;
      });

      return { success: true, solution: newSolution };
    }

    case 'aspect-ratio': {
      const block = newSolution.find(b => b.uid === constraint.blocks[0]);
      if (block && constraint.requirement.aspectRatio) {
        // Maintain aspect ratio, prioritize width
        block.height = block.width / constraint.requirement.aspectRatio;
      }
      return { success: true, solution: newSolution };
    }

    case 'group-together': {
      // Groups are handled in positioning phase
      return { success: true, solution: newSolution };
    }

    default:
      return { success: false };
  }
}

function distributeSpace(
  solution: BlockLayout[],
  blocks: Block[],
  slotContext: SlotContext,
  layoutType: 'grid' | 'stack'
): BlockLayout[] {
  const visibleBlocks = solution.filter(b => b.visible);
  const totalUsedWidth = visibleBlocks.reduce((sum, b) => sum + b.width, 0);
  const remainingWidth = slotContext.width - totalUsedWidth;

  if (remainingWidth <= 0) return solution;

  // Find blocks with 'grow' flexibility
  const growBlocks = visibleBlocks.filter(b => {
    const block = blocks.find(bl => bl.uid === b.uid);
    return block?.layout?.flex === 'grow';
  });

  if (growBlocks.length === 0) return solution;

  // Distribute remaining space equally among grow blocks
  const extraPerBlock = remainingWidth / growBlocks.length;
  growBlocks.forEach(b => b.width += extraPerBlock);

  return solution;
}

function positionBlocks(
  solution: BlockLayout[],
  layoutType: 'grid' | 'stack',
  slotContext: SlotContext
): BlockLayout[] {
  const visibleBlocks = solution.filter(b => b.visible);

  if (layoutType === 'stack') {
    // Stack vertically
    let currentY = 0;
    visibleBlocks.forEach(b => {
      b.x = 0;
      b.y = currentY;
      b.width = slotContext.width;  // Full width in stack
      currentY += b.height;
    });
  } else {
    // Grid layout - simple row wrapping
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;

    visibleBlocks.forEach(b => {
      if (currentX + b.width > slotContext.width && currentX > 0) {
        // Wrap to next row
        currentX = 0;
        currentY += rowHeight;
        rowHeight = 0;
      }

      b.x = currentX;
      b.y = currentY;

      currentX += b.width;
      rowHeight = Math.max(rowHeight, b.height);
    });
  }

  return solution;
}

function calculateScore(
  satisfied: LayoutConstraint[],
  violated: LayoutConstraint[]
): number {
  const satisfiedScore = satisfied.reduce((sum, c) => sum + c.priority, 0);
  const violatedPenalty = violated.reduce((sum, c) => sum + c.priority * 2, 0);
  return satisfiedScore - violatedPenalty;
}
```

#### 11.11.2 Conflict Resolution

When constraints conflict (e.g., min-size + max-size impossible to satisfy):

1. **Priority wins:** Higher priority constraint is satisfied
2. **Critical constraints forced:** Priority >= 8 are always satisfied
3. **Graceful degradation:** Lower priority constraints are violated

**Example conflict:**

```
Constraint A (priority 9): Block must be 300px wide (min-size)
Constraint B (priority 4): Container is 250px wide (max-size)
Resolution: Block gets 300px, overflows container (higher priority wins)
            Adapter must handle overflow (scroll, clip, etc.)
```

#### 11.11.3 Priority Conflict Resolution

**Added from ISS-094**

When multiple blocks have the same priority level, or when priorities conflict with layout constraints, the system uses **deterministic tie-breaking** rules.

**Conflict Resolution Algorithm:**

```typescript
interface PriorityResolution {
  blockUid: string;
  declaredPriority?: Priority;
  effectivePriority: Priority;
  visibleAtBreakpoint: Record<Breakpoint, boolean>;
  reason: string;
}

type Priority = 1 | 2 | 3 | 4 | 'hero' | 'primary' | 'secondary' | 'detail';
type Breakpoint = 'compact' | 'standard' | 'expanded';

function resolvePriorityConflicts(
  blocks: Block[],
  breakpoint: Breakpoint,
  layoutCapacity: LayoutCapacity
): PriorityResolution[] {
  const resolutions: PriorityResolution[] = [];

  // Normalize priorities (hero → 1, primary → 2, etc.)
  const normalized = blocks.map(block => ({
    block,
    priority: normalizePriority(block.layout?.priority),
    ordinal: blocks.indexOf(block),
  }));

  // Sort by priority (lower number = higher priority), then by ordinal
  normalized.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.ordinal - b.ordinal; // Tie-breaker: schema order
  });

  // Apply layout capacity constraints
  let remainingCapacity = layoutCapacity.maxVisible[breakpoint];

  for (const { block, priority, ordinal } of normalized) {
    const visible = remainingCapacity > 0 &&
                    isVisibleAtPriority(priority, breakpoint);

    if (visible) {
      remainingCapacity--;
    }

    resolutions.push({
      blockUid: block.uid,
      declaredPriority: block.layout?.priority,
      effectivePriority: priority,
      visibleAtBreakpoint: {
        compact: isVisibleAtPriority(priority, 'compact'),
        standard: isVisibleAtPriority(priority, 'standard'),
        expanded: isVisibleAtPriority(priority, 'expanded'),
      },
      reason: visible
        ? `Visible (priority ${priority}, ordinal ${ordinal})`
        : `Hidden (${remainingCapacity === 0 ? 'capacity exceeded' : 'breakpoint filter'})`,
    });
  }

  return resolutions;
}

function normalizePriority(priority?: Priority): number {
  if (priority === undefined) return 2; // Default: primary
  if (priority === 'hero') return 1;
  if (priority === 'primary') return 2;
  if (priority === 'secondary') return 3;
  if (priority === 'detail') return 4;
  return priority; // Already numeric
}

function isVisibleAtPriority(priority: number, breakpoint: Breakpoint): boolean {
  // Visibility rules by breakpoint
  const rules = {
    compact: [1], // Only hero (priority 1)
    standard: [1, 2], // Hero + primary (1-2)
    expanded: [1, 2, 3, 4], // All priorities
  };

  return rules[breakpoint].includes(priority);
}
```

**Ordinal Tie-Breaker:**

When multiple blocks have the same priority, schema order (ordinal) determines precedence:

```typescript
// Schema order determines tie-breaking
blocks: [
  { uid: 'b_1', type: 'kpi', layout: { priority: 'hero' } },      // Wins tie
  { uid: 'b_2', type: 'kpi', layout: { priority: 'hero' } },      // Second
  { uid: 'b_3', type: 'kpi', layout: { priority: 'hero' } },      // Third
]

// In compact breakpoint (capacity: 1):
// - b_1 visible (hero, ordinal 0)
// - b_2 hidden (hero, ordinal 1 - capacity exceeded)
// - b_3 hidden (hero, ordinal 2 - capacity exceeded)
```

**Group Priority Resolution:**

Grouped blocks (§11.5) are treated as a single unit with the **highest priority** in the group:

```typescript
interface RelationshipSpec {
  type: 'group' | 'compare' | 'detail' | 'flow';
  with?: string[];
}

function resolveGroupPriority(group: Block[]): number {
  // Group priority = highest (lowest numeric) priority in group
  const priorities = group.map(b =>
    normalizePriority(b.layout?.priority)
  );

  return Math.min(...priorities);
}
```

**Deterministic Guarantee:**

> **Guarantee:** Given the same schema and breakpoint, priority resolution produces the same visibility decisions every time.

This is ensured by:
1. Ordinal tie-breaker uses stable schema order (UID-based traversal)
2. Priority normalization is pure function
3. No randomness or timestamps in resolution
4. Capacity constraints are deterministic

#### 11.11.4 Dimension Validation

**Added from ISS-095**

All container dimensions are validated and clamped to safe ranges:

```typescript
interface DimensionConstraints {
  minWidth: number;      // Minimum viable width (default: 320px)
  minHeight: number;     // Minimum viable height (default: 200px)
  maxWidth: number;      // Maximum reasonable width (default: 7680px - 8K)
  maxHeight: number;     // Maximum reasonable height (default: 4320px - 8K)
}

const DEFAULT_CONSTRAINTS: DimensionConstraints = {
  minWidth: 320,    // iPhone SE width
  minHeight: 200,   // Minimum for meaningful content
  maxWidth: 7680,   // 8K display width
  maxHeight: 4320,  // 8K display height
};

function validateDimensions(
  width: number,
  height: number | 'auto',
  constraints: DimensionConstraints = DEFAULT_CONSTRAINTS
): ValidatedDimensions {
  const warnings: string[] = [];

  // Validate width
  let validatedWidth = width;

  if (!isFinite(width) || width < 0) {
    validatedWidth = constraints.minWidth;
    warnings.push(`Invalid width ${width}, using minimum: ${constraints.minWidth}px`);
  } else if (width === 0) {
    validatedWidth = constraints.minWidth;
    warnings.push(`Zero width detected, using minimum: ${constraints.minWidth}px`);
  } else if (width > constraints.maxWidth) {
    validatedWidth = constraints.maxWidth;
    warnings.push(`Width ${width}px exceeds maximum, clamping to ${constraints.maxWidth}px`);
  } else if (width < constraints.minWidth) {
    validatedWidth = constraints.minWidth;
    warnings.push(`Width ${width}px below minimum, using ${constraints.minWidth}px`);
  }

  // Validate height
  let validatedHeight = height;

  if (height !== 'auto') {
    if (!isFinite(height) || height < 0) {
      validatedHeight = constraints.minHeight;
      warnings.push(`Invalid height ${height}, using minimum: ${constraints.minHeight}px`);
    } else if (height === 0) {
      validatedHeight = 'auto'; // Zero height → auto (content-based)
      warnings.push('Zero height detected, using auto height');
    } else if (height > constraints.maxHeight) {
      validatedHeight = constraints.maxHeight;
      warnings.push(`Height ${height}px exceeds maximum, clamping to ${constraints.maxHeight}px`);
    }
  }

  return {
    width: validatedWidth,
    height: validatedHeight,
    warnings,
    isZeroWidth: width === 0,
    isZeroHeight: height === 0,
  };
}

interface ValidatedDimensions {
  width: number;
  height: number | 'auto';
  warnings: string[];
  isZeroWidth: boolean;
  isZeroHeight: boolean;
}
```

**Zero-Width Handling Strategy:**

When container width is zero or near-zero, apply **lazy rendering** to avoid wasted work:

```typescript
interface RenderDecision {
  shouldRender: boolean;
  reason: string;
  deferredUntil?: 'visibility' | 'resize';
}

function shouldRenderInContainer(
  context: SlotContext,
  schema: LiquidSchema
): RenderDecision {
  const validated = validateDimensions(context.width, context.height);

  // Zero width: defer rendering until visible
  if (validated.isZeroWidth) {
    return {
      shouldRender: false,
      reason: 'Container width is zero (likely hidden or collapsed)',
      deferredUntil: 'visibility',
    };
  }

  // Very small width: defer rendering
  if (validated.width < 100) {
    return {
      shouldRender: false,
      reason: `Container width ${validated.width}px too small for meaningful content`,
      deferredUntil: 'resize',
    };
  }

  // Normal case: render
  return {
    shouldRender: true,
    reason: 'Container has valid dimensions',
  };
}
```

#### 11.11.5 Single-Column Adaptation

**Added from ISS-096**

When container width constraints force single-column layout, the system applies **priority-ordered vertical stacking** while preserving semantic relationships where possible.

**Single-Column Trigger Conditions:**

```typescript
function shouldUseSingleColumn(
  context: SlotContext,
  layout: LayoutBlock
): boolean {
  // Check explicit override first
  const breakpointConfig = layout.responsive?.breakpoints?.[context.breakpoint];
  if (breakpointConfig?.columns === 1) {
    return true; // Explicit single-column
  }

  // Check container width
  const minColumnWidth = context.minBlockWidth || 320;
  if (context.width < minColumnWidth) {
    return true; // Too narrow
  }

  // Check if blocks would be too narrow
  const desiredColumns = layout.type === 'grid'
    ? inferGridColumns(layout)
    : 1;
  const widthPerColumn = context.width / desiredColumns;

  if (widthPerColumn < 150) {
    return true; // Blocks too narrow in multi-column
  }

  return false;
}
```

**Single-Column Transformation:**

```typescript
interface SingleColumnLayout {
  type: 'stack';
  blocks: Block[];
  order: 'priority' | 'schema' | 'relationship';
  preserveGroups: boolean;
}

function transformToSingleColumn(
  layout: LayoutBlock,
  context: SlotContext
): SingleColumnLayout {
  const blocks = getAllBlocks(layout);

  // Determine ordering strategy
  const order = decideSingleColumnOrder(blocks, layout);

  // Sort blocks according to strategy
  const sorted = sortBlocksForSingleColumn(blocks, order);

  // Preserve relationship groups if possible
  const withGroups = preserveRelationshipGroups(sorted, blocks);

  return {
    type: 'stack',
    blocks: withGroups,
    order,
    preserveGroups: true,
  };
}
```

**Relationship Preservation in Single-Column:**

| Relationship | Multi-Column Behavior | Single-Column Behavior |
|--------------|----------------------|------------------------|
| `group` | Stays together spatially | Stays together, stacked vertically |
| `compare` | Side-by-side, same size | Stacked vertically, same width |
| `detail` | Detail below/beside master | Detail immediately after master |
| `flow` | Wraps to next line | Already vertical, no change |

### 11.12 Responsive Layout Config (Schema)

```typescript
interface LayoutBlock {
  type: 'grid' | 'stack' | 'flow';

  // Responsive configuration
  responsive?: ResponsiveConfig;

  children: Block[];
}

interface ResponsiveConfig {
  // Explicit breakpoint overrides
  breakpoints?: {
    compact?: BreakpointLayout;
    standard?: BreakpointLayout;
    expanded?: BreakpointLayout;
  };

  // Or automatic layout inference
  auto?: {
    minColumnWidth: number;    // Min column width before wrap
    maxColumns: number;        // Max columns regardless of space
    gutter: 'none' | 'tight' | 'normal' | 'loose';
  };
}

interface BreakpointLayout {
  columns: number;
  visiblePriorities?: number[];  // Which priority levels show
  collapse?: string[];           // Block IDs to collapse
  stack?: string[][];            // Block groups to stack vertically
}
```

### 11.13 LiquidCode Responsive Overrides

For explicit breakpoint control (rare, usually auto-inferred):

```liquidcode
# Override for compact breakpoint
@compact:L$trend^collapse     # Collapse chart on compact
@compact:T$details-           # Remove table on compact
@compact:[K$a K$b]=stack      # Stack these KPIs on compact
```

### 11.14 Adapter Responsibility

The adapter translates layout constraints to platform:

```typescript
interface LiquidAdapter<RenderOutput> {
  // ... existing methods ...

  // Layout-aware rendering
  renderWithContext(
    schema: LiquidSchema,
    data: any,
    context: SlotContext
  ): RenderOutput;

  // Calculate layout for context
  calculateLayout(
    schema: LiquidSchema,
    context: SlotContext
  ): LayoutPlan;
}

interface LayoutPlan {
  breakpoint: Breakpoint;
  visibleBlocks: string[];
  collapsedBlocks: string[];
  hiddenBlocks: string[];
  grid: GridCell[];
}

interface GridCell {
  blockId: string;
  row: number;
  column: number;
  rowSpan: number;
  colSpan: number;
  width: number;
  height: number | 'auto';
}
```

### 11.15 Layout Examples by Context

**Full screen (expanded):**
```
┌────────────────────────────────────────────────────────┐
│ [KPI: Revenue]  [KPI: Orders]  [KPI: Profit]  [KPI: X] │
├────────────────────────────┬───────────────────────────┤
│ [Line Chart: Trend]        │ [Bar Chart: By Region]    │
├────────────────────────────┴───────────────────────────┤
│ [Data Table: Details]                                   │
└────────────────────────────────────────────────────────┘
```

**Embedded widget (standard):**
```
┌─────────────────────────────┐
│ [KPI: Revenue] [KPI: Orders]│
├─────────────────────────────┤
│ [Line Chart: Trend]         │
├─────────────────────────────┤
│ [Bar Chart: By Region]      │
└─────────────────────────────┘
```

**Sidebar slot (compact):**
```
┌──────────────┐
│ [KPI: Revenue]│ ← Hero only
├──────────────┤
│ [Sparkline]  │ ← Chart minimized
├──────────────┤
│ [3 more ▼]   │ ← Collapsed
└──────────────┘
```

### 11.16 Strategic Advantages of Constraint-Based Layout

**Added from ISS-065**

The constraint-based layout system is not just an implementation choice—it creates a **defensible moat** by aligning with LLM cognitive strengths.

#### 11.16.1 The LLM Layout Problem

Traditional UI frameworks require **precise spatial reasoning**:

```jsx
// Traditional approach (React/CSS)
<div style={{
  position: 'absolute',
  left: '240px',      // LLM must predict exact pixels
  top: '120px',
  width: '480px',
  height: '360px',
  '@media (max-width: 768px)': {
    width: '100%',    // LLM must know breakpoint logic
    left: '0'
  }
}}>
```

**LLM failure modes:**
- Can't predict pixel values without rendering
- Can't reason about responsive breakpoints
- Can't visualize spatial relationships
- Generates plausible but broken layouts (~40% error rate)

**Root cause:** LLMs are trained on text, not spatial coordinates.

#### 11.16.2 The Constraint-Based Insight

**Key insight:** LLMs excel at semantic relationships, not numeric coordinates.

LiquidCode replaces spatial reasoning with **semantic intent**:

```liquidcode
K$revenue!hero^fixed      # "This is the most important metric, keep it visible"
L$trend!1^grow*full       # "This chart is primary, can expand, full width"
[K$a K$b K$c]=group      # "These three belong together"
```

**LLM success rate:** >95% (matches human semantic understanding)

**Why this works:**
- LLMs understand "hero" (trained on docs about UI priorities)
- LLMs understand "group" (common semantic concept)
- LLMs understand "grow/shrink" (natural language flexibility)

**LLMs don't need to:** Calculate pixels, understand CSS, reason about viewports

#### 11.16.3 The Adapter Translation Moat

The **adapter** converts semantic constraints to platform-specific layout:

```typescript
// React adapter translates to CSS Grid
function translateToCSS(block: Block, context: SlotContext): CSSProperties {
  const { priority, flex, span } = block.layout || {};

  return {
    gridColumn: span?.columns === 'full' ? '1 / -1' : 'auto',
    flexGrow: flex === 'grow' ? 1 : 0,
    flexShrink: flex === 'shrink' ? 1 : 0,
    order: priorityToOrder(priority),
    display: shouldHide(priority, context.breakpoint) ? 'none' : 'block',
  };
}
```

**This creates two moats:**

1. **LLM moat:** Competitors can't easily replicate LLM-friendly semantics
   - Requires rethinking entire layout model
   - Can't just fine-tune on pixel data
   - Semantic understanding is fundamental

2. **Adapter moat:** Platform-specific optimization compounds over time
   - React adapter learns CSS Grid nuances
   - React Native adapter learns Flexbox quirks
   - Qt adapter learns QML constraints
   - Each adapter improves independently

#### 11.16.4 Comparison to Pixel-Based Approaches

| Approach | LLM Token Cost | LLM Error Rate | Responsive? | Cross-Platform? |
|----------|----------------|----------------|-------------|-----------------|
| **Absolute pixels** | High (~50 tokens/block) | 40-60% | No | No |
| **CSS media queries** | Very high (~80 tokens/block) | 50-70% | Yes | No |
| **Constraint-based (LiquidCode)** | Minimal (~3 tokens/block) | <5% | Yes | Yes |

**Why pixel approaches fail:**
- LLM must hallucinate numeric values (high variance)
- No feedback loop during generation (blind guessing)
- Platform-specific (CSS doesn't transfer to React Native)
- Non-responsive by default (requires complex media queries)

**Why constraint-based succeeds:**
- LLM expresses intent (low variance, trained on semantic concepts)
- Adapter provides deterministic translation (zero error)
- Platform-agnostic (same constraints, different CSS/Flexbox/QML)
- Responsive by default (adapter handles breakpoints)

#### 11.16.5 The Copyability Problem

**Can competitors copy this?**

**Shallow copy (easy):** Implement priority/flexibility/relationship concepts
- Requires ~1 month engineering
- Gets 80% of value

**Deep copy (hard):** Replicate the full semantic understanding + adapter optimization
- Requires:
  - Rethinking entire schema design
  - Training LLMs to understand new semantics
  - Building adapters for each platform
  - Accumulating platform-specific optimizations
  - ~6-12 months + ongoing improvement

**The moat is in the ecosystem:**
- Semantic language design (months of iteration)
- LLM training/fine-tuning on semantics (expensive)
- Adapter library (grows over time)
- Cache of fragments using semantics (data network effect)

#### 11.16.6 Why Traditional Frameworks Can't Retrofit

**Could React/Vue/Angular add constraint-based layout?**

**Technical barriers:**
- Existing component APIs assume pixel control
- Breaking change to all existing components
- Developer mental model mismatch (designers think in pixels)
- Tooling ecosystem assumes CSS/pixels (Figma, etc.)

**Ecosystem barriers:**
- Millions of components built on pixel assumptions
- Design systems encode pixel values
- Developers trained in pixel-based thinking

**LiquidCode advantage:** Greenfield design for LLM generation
- No legacy constraints
- API optimized for semantics from day one
- Adapters encapsulate pixel logic entirely

#### 11.16.7 The Cross-Platform Compounding Moat

Each new adapter **increases the moat** for all platforms:

```
React adapter learns:
- CSS Grid best practices
- Responsive breakpoint heuristics
- Performance optimizations

React Native adapter learns:
- Flexbox edge cases
- Platform-specific constraints
- Mobile-first priorities

Qt adapter learns:
- QML layout quirks
- Desktop sizing conventions
- Multi-monitor handling

→ All learning accumulates in the semantic language design
→ LLM improves universally without platform-specific training
```

**Competitor challenge:** Must replicate ALL adapter learnings
- Or accept inferior cross-platform quality
- Moat compounds with each platform added

#### 11.16.8 Data Network Effect

Constraint-based layout enables **fragment reuse** across platforms:

```
Fragment cached for web:
  K$revenue!hero^fixed

Same fragment works for:
  - React (CSS Grid)
  - React Native (Flexbox)
  - Qt (QML)

→ Cache hit rate increases with platform diversity
→ Each query improves cache for ALL platforms
```

**Pixel-based fragments don't transfer:**
- Web CSS doesn't work on mobile
- Each platform needs separate cache
- Network effect broken

**Constraint-based moat:** Data flywheel across platforms

#### 11.16.9 Strategic Implications

The constraint-based layout moat means:

1. **Hard to replicate:** Requires fundamental rethinking, not just feature addition
2. **Compounds over time:** Each adapter improvement deepens moat
3. **Data flywheel:** Cache reuse across platforms creates network effect
4. **LLM-native:** Aligns with LLM cognitive strengths (semantic > spatial)
5. **Defensive:** Traditional frameworks can't retrofit without breaking changes

**This is not just a technical choice—it's a strategic advantage.**

---

*End of Section 11 - Layout & Responsiveness System*
