# Knosia Authenticated User Experience

> Complete reference for auth, onboarding, dashboards, sidebar, and UI patterns.
> Created: 2025-12-29

---

## Route Architecture

```
/auth/                         ← Public auth pages
├── login                      ← Login (email, social, passkey, 2FA)
├── register                   ← Registration
├── join                       ← Invitation accept
├── password/forgot            ← Password reset request
├── password/update            ← Password reset complete
└── error                      ← Auth error page

/dashboard/                    ← User dashboard (requires auth)
├── (user)/                    ← Personal account
│   ├── page.tsx               ← Home (org picker)
│   ├── ai/                    ← AI features
│   └── settings/              ← Account settings
│       ├── page.tsx           ← General (profile)
│       ├── security/          ← Password, 2FA, sessions
│       └── billing/           ← Subscription, invoices

├── [organization]/            ← Organization dashboard
│   ├── page.tsx               ← Org home
│   ├── members/               ← Team members
│   └── settings/              ← Org settings

/admin/                        ← Super admin (requires hasAdminPermission)
├── page.tsx                   ← Admin home
├── users/                     ← User management
├── organizations/             ← Org management
└── customers/                 ← Billing customers
```

---

## Paths Configuration

```typescript
// apps/web/src/config/paths.ts

const pathsConfig = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    join: "/auth/join",
    forgotPassword: "/auth/password/forgot",
    updatePassword: "/auth/password/update",
    error: "/auth/error",
  },
  dashboard: {
    user: {
      index: "/dashboard",
      ai: "/dashboard/ai",
      settings: {
        index: "/dashboard/settings",
        security: "/dashboard/settings/security",
        billing: "/dashboard/settings/billing",
      },
    },
    organization: (slug: string) => ({
      index: `/dashboard/${slug}`,
      settings: { index: `/dashboard/${slug}/settings` },
      members: `/dashboard/${slug}/members`,
    }),
  },
  admin: {
    index: "/admin",
    users: { index: "/admin/users", user: (id) => `/admin/users/${id}` },
    organizations: { index: "/admin/organizations" },
    customers: { index: "/admin/customers" },
  },
};
```

---

## Sidebar Menus

### User Dashboard Sidebar

```typescript
// apps/web/src/app/[locale]/dashboard/(user)/layout.tsx

const menu = [
  {
    label: "platform",
    items: [
      { title: "home", href: "/dashboard", icon: Icons.Home },
      { title: "ai", href: "/dashboard/ai", icon: Icons.Brain },
    ],
  },
  {
    label: "account",
    items: [
      { title: "settings", href: "/dashboard/settings", icon: Icons.Settings },
    ],
  },
];
```

### Organization Dashboard Sidebar

```typescript
// apps/web/src/app/[locale]/dashboard/[organization]/layout.tsx

const menu = (slug: string) => [
  {
    label: "platform",
    items: [
      { title: "home", href: `/dashboard/${slug}`, icon: Icons.Home },
    ],
  },
  {
    label: "organization",
    items: [
      { title: "settings", href: `/dashboard/${slug}/settings`, icon: Icons.Settings },
      { title: "members", href: `/dashboard/${slug}/members`, icon: Icons.UsersRound },
    ],
  },
];
```

### Admin Sidebar

```typescript
// apps/web/src/app/[locale]/admin/layout.tsx

const menu = [
  {
    label: "admin",
    items: [
      { title: "home", href: "/admin", icon: Icons.Home },
      { title: "users", href: "/admin/users", icon: Icons.UsersRound },
      { title: "organizations", href: "/admin/organizations", icon: Icons.Building },
      { title: "customers", href: "/admin/customers", icon: Icons.HandCoins },
    ],
  },
];
```

### Common Sidebar Footer (all dashboards)

```
┌─────────────────────────────────────┐
│  Support          Icons.LifeBuoy    │
│  Feedback         Icons.MessageCircle│
├─────────────────────────────────────┤
│  [Avatar] User Name                 │
│           user@email.com        ... │
└─────────────────────────────────────┘
```

---

## Visual Components

### Auth Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo] Knosia                                               │
│                                                              │
│                                                              │
│        ┌────────────────────────┐        ┌────────────────┐ │
│        │                        │        │                │ │
│        │  Welcome back          │        │                │ │
│        │  Sign in to continue   │        │   (muted bg)   │ │
│        │                        │        │                │ │
│        │  [Google] [GitHub]     │        │                │ │
│        │                        │        │                │ │
│        │  ─── or ───            │        │                │ │
│        │                        │        │                │ │
│        │  Email: [_________]    │        │                │ │
│        │  Password: [_______]   │        │                │ │
│        │                        │        │                │ │
│        │  [Sign In]             │        │                │ │
│        │                        │        │                │ │
│        │  Don't have account?   │        │                │ │
│        │  Register              │        │                │ │
│        │                        │        │                │ │
│        └────────────────────────┘        └────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Auth Features:**
- Social providers: Google, GitHub, Apple (configurable)
- Passkey authentication
- Magic link
- Email/password
- Two-factor authentication (TOTP, backup codes)
- Anonymous login (optional)

### Dashboard Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR                    │  MAIN CONTENT                            │
│                            │                                          │
│ ┌────────────────────────┐ │  ┌────────────────────────────────────┐  │
│ │ [Avatar] Personal      │ │  │  Page Title                        │  │
│ │          Free     ▼    │ │  │  Description text here             │  │
│ └────────────────────────┘ │  └────────────────────────────────────┘  │
│                            │                                          │
│ PLATFORM                   │  ┌────────────────────────────────────┐  │
│   🏠 Home                  │  │                                    │  │
│   🧠 AI                    │  │     Page content area              │  │
│                            │  │                                    │  │
│ ACCOUNT                    │  │                                    │  │
│   ⚙️ Settings              │  │                                    │  │
│                            │  │                                    │  │
│                            │  │                                    │  │
│                            │  └────────────────────────────────────┘  │
│ ─────────────────────────  │                                          │
│   🛟 Support               │                                          │
│   💬 Feedback              │                                          │
│ ─────────────────────────  │                                          │
│ [Avatar] John Doe          │                                          │
│          john@example.com  │                                          │
└────────────────────────────────────────────────────────────────────────┘
```

### Account Switcher

```
┌────────────────────────────────┐
│  Search...                     │
├────────────────────────────────┤
│  [Avatar] Personal Account  ✓  │
├────────────────────────────────┤
│  ORGANIZATIONS (2)             │
│  [A] Acme Corp                 │
│  [B] Beta Labs                 │
├────────────────────────────────┤
│  [+] Create organization       │
└────────────────────────────────┘
```

### User Navigation Dropdown

```
┌────────────────────────────────┐
│  [Avatar] John Doe             │
│           john@example.com     │
├────────────────────────────────┤
│  🏠 Dashboard                  │
│  ⚙️ Settings                   │
├────────────────────────────────┤
│  ☀️ Theme                  🟢  │
├────────────────────────────────┤
│  🛡️ Admin                      │  ← Only if hasAdminPermission
├────────────────────────────────┤
│  🚪 Log out                    │
└────────────────────────────────┘
```

### Settings Sub-navigation

```
┌─────────────────────────────────────────────────────────────────────┐
│  Account Settings                                                   │
│  Manage your account preferences                                    │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────────────────────────────┐│
│  │ General       ◀  │  │                                          ││
│  │ Security         │  │  Settings content area                   ││
│  │ Billing          │  │                                          ││
│  │                   │  │                                          ││
│  └──────────────────┘  └──────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Reference

### Dashboard Components

```typescript
// Page header
import {
  DashboardHeader,
  DashboardHeaderTitle,
  DashboardHeaderDescription,
} from "~/modules/common/layout/dashboard/header";

// Sidebar
import { DashboardSidebar } from "~/modules/common/layout/dashboard/sidebar";
import { DashboardInset } from "~/modules/common/layout/dashboard/inset";
import { SidebarLink } from "~/modules/common/layout/dashboard/sidebar-link";

// Settings
import { SettingsCard } from "~/modules/common/layout/dashboard/settings-card";
import { SettingsNav } from "~/modules/user/settings/layout/nav";
```

### Auth Components

```typescript
// Login flow
import { LoginFlow } from "~/modules/auth/login";

// Auth layout elements
import { AuthHeader } from "~/modules/auth/layout/header";
import { AuthDivider } from "~/modules/auth/layout/divider";
import { InvitationDisclaimer } from "~/modules/auth/layout/invitation-disclaimer";

// Form components
import { SocialProviders } from "~/modules/auth/form/social-providers";
import { LoginForm } from "~/modules/auth/form/login/form";
import { PasskeyLogin } from "~/modules/auth/form/login/passkey";
import { TwoFactorForm } from "~/modules/auth/form/two-factor";
```

### Organization Components

```typescript
import { AccountSwitcher } from "~/modules/organization/account-switcher";
import { OrganizationPicker } from "~/modules/organization/organization-picker";
import { CreateOrganizationModal } from "~/modules/organization/create-organization";
import { UserOrganizationInvitationsBanner } from "~/modules/organization/invitations/user/user-organization-invitations";
```

### User Components

```typescript
import { UserNavigation } from "~/modules/user/user-navigation";
```

---

## Auth Flow

```
                    ┌─────────────┐
                    │   /login    │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │   Social    │ │   Passkey   │ │   Email/    │
    │   OAuth     │ │             │ │   Password  │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ┌──────▼──────┐
                    │  2FA Check  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────▼──────┐          ┌───────▼───────┐
       │  No 2FA     │          │   2FA Form    │
       │  Continue   │          │  TOTP/Backup  │
       └──────┬──────┘          └───────┬───────┘
              │                         │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │  Dashboard  │
                    │  /dashboard │
                    └─────────────┘
```

---

## Layout Protection Patterns

### User Dashboard

```typescript
export default async function DashboardLayout({ children }) {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return (
    <SidebarProvider>
      <DashboardSidebar user={user} menu={menu} />
      <DashboardInset>{children}</DashboardInset>
    </SidebarProvider>
  );
}
```

### Organization Dashboard

```typescript
export default async function OrgDashboardLayout({ children, params }) {
  const { user } = await getSession();
  if (!user) return redirect(pathsConfig.auth.login);

  const slug = (await params).organization;
  const org = await getOrganization({ slug });
  if (!org) return redirect(pathsConfig.dashboard.user.index);

  // Hydrate org data for client components
  const queryClient = getQueryClient();
  queryClient.setQueryData(organization.queries.get({ slug }).queryKey, org);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarProvider>
        <DashboardSidebar user={user} menu={menu(slug)} />
        <DashboardInset>{children}</DashboardInset>
      </SidebarProvider>
    </HydrationBoundary>
  );
}
```

### Admin Dashboard

```typescript
export default async function AdminLayout({ children }) {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  if (!hasAdminPermission(user)) {
    return redirect(pathsConfig.dashboard.user.index);
  }

  return (
    <SidebarProvider>
      <AdminSidebar user={user} menu={menu} />
      <DashboardInset>{children}</DashboardInset>
    </SidebarProvider>
  );
}
```

---

## Icons Reference

```typescript
import { Icons } from "@turbostarter/ui-web/icons";

// Navigation
Icons.Home          // Dashboard home
Icons.Settings      // Settings pages
Icons.UsersRound    // Members/users
Icons.Building      // Organizations
Icons.Brain         // AI features
Icons.HandCoins     // Billing/customers

// Footer
Icons.LifeBuoy      // Support
Icons.MessageCircle // Feedback

// User
Icons.UserRound     // User avatar fallback
Icons.LogOut        // Logout
Icons.EllipsisVertical // Menu trigger

// Theme
Icons.Sun           // Light mode
Icons.Moon          // Dark mode

// Auth
Icons.Github        // GitHub OAuth
Icons.Google        // Google OAuth
Icons.Apple         // Apple OAuth
Icons.Loader2       // Loading spinner (animate-spin)

// Actions
Icons.Plus          // Create new
Icons.Check         // Selected/active
Icons.ChevronsUpDown // Dropdown trigger
Icons.ShieldUser    // Admin access
```

---

## UI Components Used

| Component | Package | Usage |
|-----------|---------|-------|
| `Sidebar*` | `@turbostarter/ui-web/sidebar` | Dashboard navigation |
| `Avatar` | `@turbostarter/ui-web/avatar` | User/org images |
| `Button` | `@turbostarter/ui-web/button` | Actions, CTAs |
| `Badge` | `@turbostarter/ui-web/badge` | Labels, tags |
| `Command*` | `@turbostarter/ui-web/command` | Account switcher search |
| `DropdownMenu*` | `@turbostarter/ui-web/dropdown-menu` | User navigation menu |
| `Popover*` | `@turbostarter/ui-web/popover` | Account switcher popup |
| `Skeleton` | `@turbostarter/ui-web/skeleton` | Loading states |

---

## Knosia-Specific Extensions

For Knosia, we'll add:

### Additional Sidebar Items (User Dashboard)

```typescript
const menu = [
  {
    label: "platform",
    items: [
      { title: "home", href: "/dashboard", icon: Icons.Home },
      { title: "briefings", href: "/dashboard/briefings", icon: Icons.Newspaper },
      { title: "ask", href: "/dashboard/ask", icon: Icons.MessageSquare },
    ],
  },
  {
    label: "data",
    items: [
      { title: "connections", href: "/dashboard/connections", icon: Icons.Database },
      { title: "vocabulary", href: "/dashboard/vocabulary", icon: Icons.BookOpen },
    ],
  },
  {
    label: "account",
    items: [
      { title: "settings", href: "/dashboard/settings", icon: Icons.Settings },
    ],
  },
];
```

### Onboarding Flow

```
/onboarding/
├── connect/     ← Database connection
├── vocabulary/  ← Review detected vocabulary
├── confirm/     ← Answer 5-10 questions
└── ready/       ← First briefing preview
```

---

*Reference for building Knosia authenticated experience*
