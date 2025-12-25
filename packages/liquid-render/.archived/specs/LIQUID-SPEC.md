# Liquid v4.0 Specification

**One language. Maximum compression. Full expressiveness.**

*Consolidated from 525 TCS iterations with 79% triangulated consistency.*

---

## §0 Design Principles

1. **Common case fast, rare case possible**
2. **Indices when known, literals when novel**
3. **Position encodes meaning, symbols escape position**
4. **Schema is context, not content**
5. **Triangulated consistency** - JSX ↔ Schema ↔ LiquidCode equivalence

---

## §1 The Unified Grammar

```
Program     := Signal* Statement+
Statement   := Block | Layer | Mutation

Block       := Type Binding* Modifier* Children?
Type        := Index | Code
Binding     := Index | Field | Expr | Literal
Modifier    := Layout | Signal | Style | State | Action
Children    := '[' (Block ',')* Block? ']'

Index       := [0-9]+
Code        := [A-Z][a-z]?[a-z]?
Field       := ':' Name | ':.' Name?
Expr        := '=' Expression
Literal     := '"' [^"]* '"'
Name        := [a-z_][a-zA-Z0-9_]*

Layout      := '!' Priority | '^' Flex | '*' Span
Signal      := '@' Declare | '>' Emit | '<' Recv | '<>' Both
Style       := '#' Color | '%' Size
State       := ':' StateName '?' Condition
Action      := '!' ActionName

Layer       := '/' Index Block
Mutation    := Op Target Value?
Op          := '+' | '-' | '~' | '^'
Target      := '@' Ref
```

---

## §2 The Type System

### §2.1 Core Types (Indexed)

Single digit for the 10 most common types:

| Index | Code | Type | Description |
|-------|------|------|-------------|
| `0` | `Cn` | container | Generic container/div |
| `1` | `Kp` | kpi | Key performance indicator |
| `2` | `Br` | bar | Bar chart |
| `3` | `Ln` | line | Line chart |
| `4` | `Pi` | pie | Pie chart |
| `5` | `Tb` | table | Data table |
| `6` | `Fm` | form | Form container |
| `7` | `Ls` | list | Repeating list |
| `8` | `Cd` | card | Card component |
| `9` | `Md` | modal | Modal/dialog |

### §2.2 Extended Types

Two-character codes for additional types:

**Layout & Structure:**
| Code | Type | Description |
|------|------|-------------|
| `Gd` | grid | Grid layout |
| `Sk` | stack | Vertical/horizontal stack |
| `Sp` | split | Split pane |
| `Dw` | drawer | Side drawer |
| `Sh` | sheet | Bottom sheet |
| `Pp` | popover | Popover/dropdown |
| `Tl` | tooltip | Tooltip |
| `Ac` | accordion | Collapsible sections |

**Data Display:**
| Code | Type | Description |
|------|------|-------------|
| `Tx` | text | Text/paragraph |
| `Hd` | heading | Heading (h1-h6) |
| `Ic` | icon | Icon |
| `Im` | image | Image |
| `Av` | avatar | User avatar |
| `Tg` | tag | Tag/badge/chip |
| `Pg` | progress | Progress bar |
| `Gn` | gauge | Gauge/meter |
| `Rt` | rating | Star rating |
| `Sp` | sparkline | Inline mini chart |

**Form Controls:**
| Code | Type | Description |
|------|------|-------------|
| `Bt` | button | Button |
| `In` | input | Text input |
| `Sl` | select | Dropdown select |
| `Sw` | switch | Toggle switch |
| `Ck` | checkbox | Checkbox |
| `Rd` | radio | Radio button |
| `Rg` | range | Slider/range |
| `Cl` | color | Color picker |
| `Dt` | date | Date picker |
| `Tm` | time | Time picker |
| `Up` | upload | File upload |
| `Ot` | otp | OTP input |

**Advanced Charts:**
| Code | Type | Description |
|------|------|-------------|
| `Hm` | heatmap | Heatmap |
| `Sn` | sankey | Sankey diagram |
| `Tr` | tree | Tree view |
| `Or` | org | Org chart |
| `Mp` | map | Geographic map |
| `Fl` | flow | Flowchart |

**Media:**
| Code | Type | Description |
|------|------|-------------|
| `Vd` | video | Video player |
| `Au` | audio | Audio player |
| `Cr` | carousel | Carousel/slider |
| `Lb` | lightbox | Lightbox overlay |

**Interactive:**
| Code | Type | Description |
|------|------|-------------|
| `St` | stepper | Step wizard |
| `Kb` | kanban | Kanban board |
| `Cl` | calendar | Calendar view |
| `Tm` | timeline | Timeline |

---

## §3 Binding System

### §3.1 Indexed Binding
```
1 0              # KPI bound to schema field 0
5 0123           # Table with columns 0,1,2,3
```

### §3.2 Named Binding
```
1 :revenue       # KPI bound to "revenue" field
3 :date :amount  # Line chart: x=date, y=amount
```

### §3.3 Computed Binding
```
1 =revenue/orders           # Computed value
1 =sum(items.price)         # Aggregation
```

### §3.4 Literal Binding
```
Tx "Hello World"            # Static text
Bt "Submit"                  # Button label
```

### §3.5 Iterator Binding
```
7 :items [8 :.]             # List items, :. = current item
7 :items [Tx :.name]        # Access item.name
7 :items [Tx :# Tx :.name]  # :# = current index (0-based)
```

---

## §4 Modifier System

### §4.1 Layout Modifiers

**Priority:** `!` controls importance
```
!h    # Hero (highest)
!p    # Primary
!s    # Secondary
!0-9  # Numeric priority
```

**Flex:** `^` controls flexibility
```
^f    # Fixed size
^s    # Shrink
^g    # Grow
^c    # Collapse
^ms   # Masonry
^sp   # Split
^st   # Sticky
```

**Span:** `*` controls width
```
*1-9  # Column span
*f    # Full width
*h    # Half width
*t    # Third
*q    # Quarter
```

### §4.2 Signal Modifiers

**Declaration:** `@` at program start
```
@dr             # Declare dateRange signal
@tab @filter    # Multiple signals
```

**Emit:** `>` sends signal
```
Bt "Click" >action           # Emit on click
Bt "Tab1" >tab=0             # Emit with value
Bt "+" >count++              # Increment
Bt "-" >count--              # Decrement
```

**Receive:** `<` listens to signal
```
5 :orders <dr               # Table receives dateRange
0 <filter [...]             # Container receives filter
```

**Bidirectional:** `<>` for two-way binding
```
Sl :options <>sel           # Select emits and receives
In :search <>query          # Input with live binding
```

### §4.3 Style Modifiers

**Color:** `#`
```
Tx "Error" #red             # Red text
1 :value #?>=80:green,<80:red   # Conditional color
Bt "Primary" #blue          # Blue button
```

**Size:** `%`
```
Tx "Title" %lg              # Large text
Ic "star" %sm               # Small icon
```

### §4.4 State Modifiers

**Hover:** `:hover`
```
Bt "Action" :hover#blue     # Blue on hover
8 :card :hover^grow         # Scale on hover
```

**Focus:** `:focus`
```
In :email :focus#blue       # Focus outline
```

**Active:** `:active`
```
Bt "Tab" :active#primary    # Active state
```

### §4.5 Action Modifiers

**Form actions:** `!`
```
Bt "Save" !submit           # Form submit
Bt "Reset" !reset           # Form reset
Bt "Cancel" !cancel         # Cancel
```

**UI actions:**
```
Bt "×" !dismiss             # Dismiss toast
Bt "Close" !close           # Close modal
Bt "Clear" !clear           # Clear input
```

**Transitions:**
```
0 !fade [...]               # Fade transition
0 !slide [...]              # Slide transition
```

---

## §5 Conditions

### §5.1 Signal Conditions
```
0 ?@tab=0 [...]             # Show if tab equals 0
0 ?@filter [...]            # Show if filter is truthy
1 ?value>0 [...]            # Show if value > 0
```

### §5.2 Array Conditions
```
7 :items ?items [...]       # Show if items not empty
0 ?@results.length>0 [...]  # Check array length
```

### §5.3 Index Conditions
```
7 :items [0 ?:#=@sel [...]] # Highlight selected index
```

---

## §6 Layers

### §6.1 Layer Declaration
```
/1 9 [...]                  # Layer 1: modal
/2 Dw [...]                 # Layer 2: drawer
```

### §6.2 Layer Triggers
```
Bt "Open" >/1               # Open layer 1
8 :item >/2                 # Card opens layer 2
```

### §6.3 Layer Close
```
Bt "Close" /<               # Close current layer
Bt "Back" >/0               # Return to main layer
```

---

## §7 Lists and Iteration

### §7.1 Basic List
```
7 :items [8 :.]             # List of cards
7 :users [Tx :.name]        # List of names
```

### §7.2 List with Template
```
7 :orders [
  0 [
    Tx :.id
    Tx :.customer
    1 :.amount
  ]
]
```

### §7.3 List Separators
```
7 :path "/" [Bt :.label]    # Breadcrumb with /
7 :tags ", " [Tg :.]        # Tags with comma
```

### §7.4 Sortable/Draggable
```
7 :items ~sort [...]        # Sortable list
7 :items ~drag [...]        # Draggable items
Kb :columns [:tasks]        # Kanban board
```

---

## §8 Input Types

### §8.1 Basic Inputs
```
In :name                    # Text input
In :email @email            # Email input
In :password @password      # Password input
In :amount @number          # Number input
```

### §8.2 Specialized Inputs
```
Dt :date                    # Date picker
Tm :time                    # Time picker
Cl :color                   # Color picker
Rg :volume *100             # Range slider 0-100
Up :files                   # File upload
Ot :code *6                 # 6-digit OTP
```

### §8.3 Input Masks
```
In :phone "(###) ###-####"  # Phone mask
In :card "#### #### #### ####"  # Credit card
```

---

## §9 Data Display

### §9.1 KPI with Trend
```
1 :revenue                  # Basic KPI
1 :revenue ^+12.5%          # With up trend
1 :revenue v-5.2%           # With down trend
1 :revenue ~0%              # Neutral
```

### §9.2 Tables
```
5 :data                     # Auto columns
5 :data [:name :email :role]  # Explicit columns
5 :data [0 1 2 3]           # Indexed columns
```

### §9.3 Charts
```
2 :sales                    # Bar chart
3 :trend                    # Line chart
4 :distribution             # Pie chart
Sp :history *7              # 7-point sparkline
```

---

## §10 Complete Examples

### §10.1 Simple Dashboard
```
1 0, 1 1, 1 2, 1 3, 3 4 5
```
4 KPIs + line chart in 5 tokens.

### §10.2 Tabbed Interface
```
@tab
0 [Bt "Overview" >tab=0, Bt "Details" >tab=1, Bt "Settings" >tab=2]
0 ?@tab=0 [1 :revenue, 1 :orders, 3 :trend]
0 ?@tab=1 [5 :orders [:id :customer :amount :status]]
0 ?@tab=2 [6 [In :name, In :email @email, Sw :notifications, Bt "Save" !submit]]
```

### §10.3 Data Table with Modal
```
@sel
5 :users [:name :email :role] >sel
/1 9 "Edit User" [
  6 [
    In :name
    In :email @email
    Sl :role [:options]
    0 [Bt "Cancel" /<, Bt "Save" !submit]
  ]
]
```

### §10.4 E-commerce Card Grid
```
@cart
Gd 4 :products [
  8 [
    Im :.image
    Tx :.name %lg
    Tx :.price #green
    Rt :.rating *5
    Bt "Add to Cart" >cart=:.id
  ]
]
```

### §10.5 Command Dashboard
```
@dr @view
0 !h [Tx "Command Center", Tx "Operational" #green]
0 [Bt "Dashboard" <>view, Bt "Pilots" <>view, Bt "Alerts" <>view]
0 ?@view=0 [
  Gd 4 [1 :pilots, 1 :hours, 1 :flights ^+12%, 1 :ops]
  Gd 2 [7 :pilots [8 :. >/1], 3 :activity <dr]
]
/1 9 [1 :.hours, 1 :.ops, Bt "Assign" >/2, Bt "Close" /<]
```

---

## §11 Token Efficiency

| Scenario | Tokens | Example |
|----------|--------|---------|
| 4 KPIs | 4 | `1 0, 1 1, 1 2, 1 3` |
| Dashboard | 6 | `1 0, 1 1, 3 2 3, 5 4` |
| Tabbed UI | 25 | See §10.2 |
| Full app | 50-100 | See §10.5 |

**Principle:** Pay only for what you customize.

---

## §12 LiquidSchema Target

```typescript
interface LiquidSchema {
  version: "4.0";
  signals: Signal[];
  layers: Layer[];
}

interface Signal {
  name: string;
  type?: "string" | "number" | "boolean" | "array";
  initial?: any;
}

interface Layer {
  id: number;
  visible: boolean;
  root: Block;
}

interface Block {
  uid: string;
  type: string;
  binding?: Binding;
  label?: string;
  layout?: Layout;
  signals?: SignalBinding;
  condition?: Condition;
  style?: Style;
  state?: StateBinding;
  action?: string;
  children?: Block[];
  template?: Block;
}
```

---

## §13 Type Reference (Complete)

### Core (Indexed)
`0`=container, `1`=kpi, `2`=bar, `3`=line, `4`=pie, `5`=table, `6`=form, `7`=list, `8`=card, `9`=modal

### Layout
`Gd`=grid, `Sk`=stack, `Sp`=split, `Dw`=drawer, `Sh`=sheet, `Pp`=popover, `Tl`=tooltip, `Ac`=accordion

### Display
`Tx`=text, `Hd`=heading, `Ic`=icon, `Im`=image, `Av`=avatar, `Tg`=tag, `Pg`=progress, `Gn`=gauge, `Rt`=rating, `Sp`=sparkline

### Form
`Bt`=button, `In`=input, `Sl`=select, `Sw`=switch, `Ck`=checkbox, `Rd`=radio, `Rg`=range, `Cl`=color, `Dt`=date, `Tm`=time, `Up`=upload, `Ot`=otp

### Charts
`Br`=bar, `Ln`=line, `Pi`=pie, `Hm`=heatmap, `Sn`=sankey, `Tr`=tree, `Or`=org, `Mp`=map, `Fl`=flow

### Media
`Vd`=video, `Au`=audio, `Cr`=carousel, `Lb`=lightbox

### Interactive
`St`=stepper, `Kb`=kanban, `Cl`=calendar, `Tm`=timeline

---

*Liquid v4.0: One language. Every token earns its place.*
