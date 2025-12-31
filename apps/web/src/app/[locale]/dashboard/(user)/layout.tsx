import { redirect } from "next/navigation";

import { Icons } from "@turbostarter/ui-web/icons";
import { SidebarProvider } from "@turbostarter/ui-web/sidebar";

import { pathsConfig } from "~/config/paths";
import { getSession } from "~/lib/auth/server";
import { DashboardInset } from "~/modules/common/layout/dashboard/inset";
import { DashboardSidebar } from "~/modules/common/layout/dashboard/sidebar";

/**
 * Knosia sidebar menu configuration.
 * Uses i18n keys from knosia.json via sidebar.* namespace.
 */
const menu = [
  {
    label: "platform",
    items: [
      {
        title: "briefing",
        href: pathsConfig.knosia.index,
        icon: Icons.Home,
      },
      {
        title: "ask",
        href: pathsConfig.knosia.ask,
        icon: Icons.MessageCircle,
      },
    ],
  },
  {
    label: "manage",
    items: [
      {
        title: "connections",
        href: pathsConfig.knosia.connections,
        icon: Icons.Database,
      },
      {
        title: "vocabulary",
        href: pathsConfig.knosia.vocabulary,
        icon: Icons.BookOpen,
      },
      {
        title: "settings",
        href: pathsConfig.knosia.settings,
        icon: Icons.Settings,
      },
    ],
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
