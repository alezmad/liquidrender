import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";
import { getSession } from "~/lib/auth/server";
import { OnboardingLayout } from "~/modules/onboarding";

export default async function OnboardingRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return <OnboardingLayout>{children}</OnboardingLayout>;
}
