import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";

/**
 * Onboarding index page - redirects to connect step.
 */
export default function OnboardingIndexPage() {
  redirect(pathsConfig.onboarding.connect);
}
