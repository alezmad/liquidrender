# Admin Panel Snippets - Quick Reference

## Summary
5 production-ready LiquidCode snippets for admin panels - **100% verification pass rate**

---

## Snippet 1: Simple User Management
**Use Case:** Basic user table with search and role-based access
```liquid
@role @filter
Fm [In :username <>search, Se :roleFilter <>role, Bt "Export" !export]
?@role=admin: Tb :users [:id :username :email :role :status] ~1m [Ck :selected, Tx :.username, Tx :.email, Tg :.role, Sw :.isActive]
?@role!=admin: Tx "Access Denied"
```
**Stats:** 2 signals, 1 layer, streaming 1m

---

## Snippet 2: Data Table + Modal Log Viewer
**Use Case:** Transaction table with date filters and modal for logs
```liquid
@dateRange @search
0 [0 [Dt :startDate "From", Dt :endDate "To", Se :status <>status]
Tb :transactions [:id :user :amount :type :timestamp] ~30s [Tx :.id, Tx :.user, Kp :.amount, Tg :.type #?success:green,error:red,pending:yellow, Tx :.timestamp]]
/1 9 [Tx "Event Log" Tb :logs [:level :message :time] ~1m]
```
**Stats:** 2 signals, 2 layers, streaming 30s & 1m

---

## Snippet 3: Multi-Role Dashboard
**Use Case:** Different dashboards for superadmin, admin, and user roles
```liquid
@role @visibility
?@role=superadmin: 0 [Hd "System Admin" Kp :totalUsers, Kp :activeUsers, Kp :totalRevenue, Kp :systemHealth Ln :userGrowth ~5m Tb :allUsers [:id :name :role :status :lastLogin] ~2m Tb :activityLog [:action :user :timestamp :details] ~1m]
?@role=admin: 0 [Hd "Admin Dashboard" Kp :teamUsers, Kp :activeRequests, Kp :pendingApprovals Br :departmentStats Tb :teamMembers [:id :name :department :role] ~5m]
?@role=user: 0 [Tx "You don't have admin access"]
```
**Stats:** 2 signals, 1 layer, 3 role-based views, streaming 1m-5m

---

## Snippet 4: Real-Time Log Streaming
**Use Case:** Role-specific log viewer with severity and component filters
```liquid
@severity @component @role
Fm [Se :severity "Log Level" <>severity, Se :component "Component" <>component, In :search "Search" <>searchTerm]
?@role=admin: Tb :adminLogs [:timestamp :level :component :message :userId :action] ~5s [Tx :.timestamp %sm, Tg :.level #?error:red,warn:orange,info:blue,debug:gray, Tx :.component, Tx :.message, Tx :.userId, Bt "View" !openDetail]
?@role=viewer: Tb :viewerLogs [:timestamp :level :message] ~30s [Tx :.timestamp, Tg :.level #?error:red,warn:orange,info:blue, Tx :.message]
?@role!=admin,!=viewer: Tx "Access Denied"
```
**Stats:** 3 signals, 1 layer, streaming 5s & 30s

---

## Snippet 5: User Management Form + Activity Log
**Use Case:** Two-column layout with user table and activity feed
```liquid
@tab @role
Hd "User Management"
0 ^row [
  0 ^col *h [Hd "Users" Fm [In :email <>emailFilter, Se :department <>deptFilter, Ck :activeOnly <>activeFilter]
  ?@role=admin: Tb :users [:id :name :email :department :role :joinDate] ~2m [Tx :.id %sm, Tx :.name, Tx :.email, Tx :.department, Se :.role [Tg "Admin" Tg "Manager" Tg "User"], Tx :.joinDate %sm]]
  0 ^col *h [Hd "Activity Log" Tb :activityLog [:user :action :timestamp :details] ~1m [Tx :.user, Tg :.action #?create:green,update:blue,delete:red,login:purple, Tx :.timestamp %sm, Tx :.details]]
]
```
**Stats:** 2 signals, 1 layer, two-column layout, streaming 1m & 2m

---

## Key Features Used

### Signals (Role-Based Access)
```
@role           # Declare role signal
?@role=admin    # Show if admin
?@role!=admin   # Show if NOT admin
?@role=admin,super  # Multiple roles (OR logic)
?@role!=admin,!=viewer  # Multiple negations
```

### Streaming (Real-Time Data)
```
~5s             # Update every 5 seconds (fast logs)
~30s            # Update every 30 seconds
~1m             # Update every 1 minute (standard)
~2m             # Update every 2 minutes (lower freq)
~5m             # Update every 5 minutes (charts)
```

### Bidirectional Binding (Live Filters)
```
<>signal        # Input/Select connects to signal
<>roleFilter    # Dropdown
<>searchTerm    # Input field
<>activeFilter  # Checkbox
```

### Conditional Styling
```
#?admin:blue,user:gray      # Color by value
#?success:green,error:red   # Status colors
#?error:red,warn:orange,info:blue,debug:gray  # Multi-state
```

### Table Column Types
```
Tx :.field      # Text display
Kp :.field      # Number/metric
Tg :.field      # Tag/badge (with colors)
Sw :.field      # Toggle switch
Ck :.field      # Checkbox
Se :.field      # Editable select
Bt "Label" !action  # Action button
```

---

## Compiler Validation Results

| Feature | Status | Example |
|---------|--------|---------|
| Signal parsing | ✓ Pass | `@role @filter` |
| Role conditions | ✓ Pass | `?@role=admin:` |
| Streaming modifiers | ✓ Pass | `~1m`, `~5s` |
| Bidirectional binding | ✓ Pass | `<>signal` |
| Conditional colors | ✓ Pass | `#?admin:blue,user:gray` |
| Layer definitions | ✓ Pass | `/1 9 [...]` |
| Table iteration | ✓ Pass | `Tb :data [:cols]` |
| Form components | ✓ Pass | `Fm [In, Se, Ck]` |
| Layout modifiers | ✓ Pass | `^row`, `*h` |
| Roundtrip conversion | ✓ Pass | All 5 snippets |

---

## Type Codes Reference

### Layout
- `Cn` = Container (0)
- `Sk` = Stack
- `Gd` = Grid
- `0` = Generic container

### Data Display
- `Kp` = KPI/metric (1)
- `Tx` = Text
- `Hd` = Heading
- `Tg` = Tag/badge
- `Im` = Image
- `Ic` = Icon

### Forms
- `Fm` = Form container (6)
- `In` = Input text
- `Se` = Select dropdown
- `Ck` = Checkbox
- `Sw` = Toggle switch
- `Rd` = Radio button
- `Dt` = Date picker
- `Bt` = Button

### Charts
- `Ln` = Line chart (3)
- `Br` = Bar chart (2)
- `Pi` = Pie chart (4)
- `Hm` = Heatmap

### Tables & Lists
- `Tb` = Table (5)
- `Ls` = List (7)
- `Kb` = Kanban

### Overlays
- `9` = Modal (9)
- `Md` = Modal
- `Dw` = Drawer
- `Pp` = Popover

---

## How to Use

### Parse a snippet
```typescript
import { parseUI } from './src/compiler/compiler';
const schema = parseUI(snippetText);
```

### Verify roundtrip
```typescript
import { roundtripUI } from './src/compiler/compiler';
const { isEquivalent, differences } = roundtripUI(schema);
```

### Run tests
```bash
npx tsx admin-panel-test.ts
```

---

## Common Patterns

### Admin-only form
```liquid
@role
Fm [In :name, In :email, Bt "Save" !submit]
?@role!=admin: Tx "You don't have permission"
```

### Filtered table with streaming
```liquid
@status @search
Fm [Se :status <>status, In :search <>query]
Tb :users [:id :name :status] ~1m [
  Tx :.id, Tx :.name, Tg :.status
]
```

### Modal action
```liquid
Bt "Details" >/1
/1 9 [
  Hd "Details"
  Fm [...]
]
```

### Role-based visibility
```liquid
@role
?@role=admin: Bt "Delete" !delete
?@role!=admin: Tx "No delete access"
```

### Conditional color
```liquid
Tg :.status #?active:green,inactive:gray,pending:yellow
```

---

## Test Command
```bash
cd /Users/agutierrez/Desktop/liquidrender/packages/liquid-render
npx tsx admin-panel-test.ts
```

**Expected Output:**
```
Testing 5 Admin Panel LiquidCode Snippets

==========================================

✓ Snippet 1: PASS
  Layers: 1, Signals: 2

✓ Snippet 2: PASS
  Layers: 2, Signals: 2

✓ Snippet 3: PASS
  Layers: 1, Signals: 2

✓ Snippet 4: PASS
  Layers: 1, Signals: 3

✓ Snippet 5: PASS
  Layers: 1, Signals: 2

==========================================
Summary: 5 passed, 0 failed
Success Rate: 100.0%
```

---

## Files

- `admin-panel-test.ts` - Test harness
- `ADMIN-PANEL-SNIPPETS.md` - Full documentation
- `ADMIN-SNIPPETS-QUICK-REF.md` - This file

---

**Last Updated:** December 24, 2025
**Compiler:** LiquidCode v1.0
