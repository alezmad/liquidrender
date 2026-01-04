"use client";

import { SidebarInset } from "@turbostarter/ui-web/sidebar";

import { ExpirationBanner } from "~/modules/onboarding/components/layout/expiration-banner";
import { DashboardActionBar } from "./action-bar";
import { ScrollContainer } from "./scroll-container";

export const DashboardInset = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarInset className="relative flex h-dvh flex-col sm:h-[calc(100dvh-1rem)]">
      <DashboardActionBar />
      <ExpirationBanner className="m-4 mb-0" />
      <ScrollContainer>
        {children}
      </ScrollContainer>
    </SidebarInset>
  );
};
