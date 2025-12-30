"use client";

import { useTranslation } from "@turbostarter/i18n";
import { Button } from "@turbostarter/ui-web/button";

import { RoleCard } from "./role-card";

import type { UserRole } from "../../types";

/** All available roles */
const ROLES: UserRole[] = [
  "executive",
  "finance",
  "sales",
  "marketing",
  "product",
  "support",
];

interface RoleSelectorProps {
  selectedRole: UserRole | null;
  onSelectRole: (role: UserRole) => void;
  onContinue: () => void;
}

/**
 * Role selection grid with 6 role options.
 * User must select a role before continuing.
 */
export function RoleSelector({
  selectedRole,
  onSelectRole,
  onContinue,
}: RoleSelectorProps) {
  const { t } = useTranslation("knosia");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">{t("onboarding.role.title")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("onboarding.role.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {ROLES.map((role) => (
          <RoleCard
            key={role}
            role={role}
            title={t(`onboarding.role.roles.${role}.title`)}
            description={t(`onboarding.role.roles.${role}.description`)}
            isSelected={selectedRole === role}
            onSelect={() => onSelectRole(role)}
          />
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("onboarding.role.changeNote")}
      </p>

      <Button
        className="w-full"
        onClick={onContinue}
        disabled={!selectedRole}
      >
        Continue
      </Button>
    </div>
  );
}
