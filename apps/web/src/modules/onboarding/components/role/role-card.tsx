"use client";

import { cn } from "@turbostarter/ui";
import { Icons } from "@turbostarter/ui-web/icons";

import type { UserRole } from "../../types";

/** Icon mapping for each role */
const roleIcons: Record<UserRole, keyof typeof Icons> = {
  executive: "Crown",
  finance: "TrendingUp",
  sales: "Target",
  marketing: "Megaphone",
  product: "Package",
  support: "Headphones",
};

interface RoleCardProps {
  role: UserRole;
  title: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Individual role selection card.
 * Shows icon, title, and description with selection state.
 */
export function RoleCard({
  role,
  title,
  description,
  isSelected,
  onSelect,
}: RoleCardProps) {
  const iconName = roleIcons[role];
  const Icon = Icons[iconName];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
        "hover:border-primary/50 hover:bg-muted/50",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-background"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
