# Liquid Render Spec Checklist

Extracted from `LIQUID-RENDER-SPEC.md` for compiler audit.

## §1 Grammar

- [ ] Program := Signal* Statement+
- [ ] Statement := Block | Layer | Survey
- [ ] Block := Type Binding* Modifier* Children?
- [ ] Type := Index (0-9) | Code (2-char)
- [ ] Binding := Index | Field | Expr | Literal
- [ ] Modifier := Layout | Signal | Style | State | Action | Stream | Fidelity
- [ ] Children := '[' (Block ',')* Block? ']'

## §2 Type System

### §2.1 Core Types (0-9)
| Index | Code | Type | Check |
|-------|------|------|-------|
| 0 | Cn | container | [ ] |
| 1 | Kp | kpi | [ ] |
| 2 | Br | bar | [ ] |
| 3 | Ln | line | [ ] |
| 4 | Pi | pie | [ ] |
| 5 | Tb | table | [ ] |
| 6 | Fm | form | [ ] |
| 7 | Ls | list | [ ] |
| 8 | Cd | card | [ ] |
| 9 | Md | modal | [ ] |

### §2.2 Extended Types
| Code | Type | Check |
|------|------|-------|
| Gd | grid | [ ] |
| Sk | stack | [ ] |
| Sp | split | [ ] |
| Dw | drawer | [ ] |
| Sh | sheet | [ ] |
| Pp | popover | [ ] |
| Tl | tooltip | [ ] |
| Ac | accordion | [ ] |
| Sd | sidebar | [ ] |
| Hr | header | [ ] |
| Ts | tabs | [ ] |
| Bc | breadcrumb | [ ] |
| Nv | nav | [ ] |
| Tx | text | [ ] |
| Hd | heading | [ ] |
| Ic | icon | [ ] |
| Im | image | [ ] |
| Av | avatar | [ ] |
| Tg | tag | [ ] |
| Bg | badge | [ ] |
| Pg | progress | [ ] |
| Gn | gauge | [ ] |
| Rt | rating | [ ] |
| Sl | sparkline | [ ] |
| Bt | button | [ ] |
| In | input | [ ] |
| Ta | textarea | [ ] |
| Se | select | [ ] |
| Sw | switch | [ ] |
| Ck | checkbox | [ ] |
| Rd | radio | [ ] |
| Rg | range | [ ] |
| Cl | color | [ ] |
| Dt | date | [ ] |
| Dr | daterange | [ ] |
| Tm | time | [ ] |
| Up | upload | [ ] |
| Ot | otp | [ ] |
| Hm | heatmap | [ ] |
| Sn | sankey | [ ] |
| Tr | tree | [ ] |
| Or | org | [ ] |
| Mp | map | [ ] |
| Fl | flow | [ ] |
| Vd | video | [ ] |
| Au | audio | [ ] |
| Cr | carousel | [ ] |
| Lb | lightbox | [ ] |
| St | stepper | [ ] |
| Kb | kanban | [ ] |
| Ca | calendar | [ ] |
| Ti | timeline | [ ] |
| Custom | custom | [ ] |

### Child Types
| Code | Type | Parent | Check |
|------|------|--------|-------|
| opt | option | Select, Radio | [ ] |
| preset | preset | DateRange | [ ] |
| step | step | Stepper | [ ] |
| tab | tab | Tabs | [ ] |
| crumb | crumb | Breadcrumb | [ ] |
| nav | nav | Sidebar | [ ] |

## §3 Binding System

| Binding | Syntax | Example | Check |
|---------|--------|---------|-------|
| Indexed | digits | `1 0` | [ ] |
| Named Field | `:name` | `Kp :revenue` | [ ] |
| Computed | `=expr` | `Kp =revenue/orders` | [ ] |
| Literal | `"text"` | `Bt "Submit"` | [ ] |
| Iterator | `:.` or `:.name` | `Tx :.name` | [ ] |
| Index Ref | `:#` | `Tx :#` | [ ] |

## §4 Modifier System

### §4.1 Layout Modifiers

**Priority (!)**
| Modifier | Value | Check |
|----------|-------|-------|
| !h | hero (100) | [ ] |
| !p | primary (75) | [ ] |
| !s | secondary (50) | [ ] |
| !0-9 | numeric | [ ] |

**Flex (^)**
| Modifier | Value | Check |
|----------|-------|-------|
| ^f | fixed | [ ] |
| ^s | shrink | [ ] |
| ^g | grow | [ ] |
| ^c | collapse | [ ] |
| ^r | row | [ ] |
| ^row | row (full) | [ ] |
| ^col | column | [ ] |
| ^column | column (full) | [ ] |

**Span (*)**
| Modifier | Value | Check |
|----------|-------|-------|
| *1-9 | column span | [ ] |
| *f | full | [ ] |
| *h | half | [ ] |
| *t | third | [ ] |
| *q | quarter | [ ] |

### §4.2 Signal Modifiers

| Modifier | Syntax | Example | Check |
|----------|--------|---------|-------|
| Declare | @name | @tab | [ ] |
| Emit | >name | >action | [ ] |
| Emit value | >name=val | >tab=0 | [ ] |
| Receive | <name | <dr | [ ] |
| Bidirectional | <>name | <>sel | [ ] |

### §4.3 Style Modifiers

**Color (#)**
| Modifier | Expands To | Check |
|----------|------------|-------|
| #r | red | [ ] |
| #g | green | [ ] |
| #b | blue | [ ] |
| #y | yellow | [ ] |
| #o | orange | [ ] |
| #p | purple | [ ] |
| #w | white | [ ] |
| #k | black | [ ] |
| #gy | gray | [ ] |
| #cy | cyan | [ ] |
| #mg | magenta | [ ] |
| #?cond | conditional | [ ] |

**Size (%)**
| Modifier | Example | Check |
|----------|---------|-------|
| %lg | large | [ ] |
| %sm | small | [ ] |

### §4.5 Action Modifiers

| Modifier | Action | Check |
|----------|--------|-------|
| !submit | form submit | [ ] |
| !reset | form reset | [ ] |
| !close | close modal | [ ] |

### §4.6 Range Parameters

| Syntax | Check |
|--------|-------|
| `Rg :field min max` | [ ] |
| `Rg :field min max step` | [ ] |

### §4.7 Streaming Modifiers (~)

| Modifier | Description | Check |
|----------|-------------|-------|
| ~5s | interval seconds | [ ] |
| ~1m | interval minutes | [ ] |
| ~ws://url | WebSocket | [ ] |
| ~sse://url | Server-Sent Events | [ ] |
| ~poll | default polling | [ ] |

### §4.8 Fidelity Modifiers ($)

| Modifier | Description | Check |
|----------|-------------|-------|
| $lo | low fidelity | [ ] |
| $hi | high fidelity | [ ] |
| $auto | adaptive | [ ] |
| $skeleton | skeleton loading | [ ] |
| $defer | lazy rendering | [ ] |

### §4.9 Custom Components

| Syntax | Check |
|--------|-------|
| `Custom "componentId" :data` | [ ] |

## §5 Layers

| Feature | Syntax | Check |
|---------|--------|-------|
| Layer declaration | `/1 Block` | [ ] |
| Layer trigger | `>/1` | [ ] |
| Layer close | `/<` | [ ] |
| Return to main | `>/0` | [ ] |

## §6 Special Features

### Repetition Shorthand
| Syntax | Expands To | Check |
|--------|------------|-------|
| `Kp :a :b :c` | 3 KPIs | [ ] |
| `In :x :y :z` | 3 inputs | [ ] |

### Chart Multi-binding (no expansion)
| Syntax | Meaning | Check |
|--------|---------|-------|
| `Ln :date :revenue` | x=date, y=revenue | [ ] |

### Table Columns
| Syntax | Check |
|--------|-------|
| `Tb :data [:col1 :col2]` | [ ] |

### Conditional Rendering
| Syntax | Check |
|--------|-------|
| `?@signal=value [blocks]` | [ ] |

### Auto-labels
| Field | Label | Check |
|-------|-------|-------|
| :revenue | "Revenue" | [ ] |
| :totalRevenue | "Total Revenue" | [ ] |
| :order_count | "Order Count" | [ ] |

## §7-10 Survey Nodes (Separate Parser)

- [ ] Start node (>)
- [ ] Question node (?)
- [ ] Message node (!)
- [ ] End node (<)
- [ ] Survey embedding: `Survey { ... }`

---

**Total Features: 120+**
