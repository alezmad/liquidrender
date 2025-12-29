"use client";

import { useTranslation } from "@turbostarter/i18n";
import { cn } from "@turbostarter/ui";
import { Card, CardContent } from "@turbostarter/ui-web/card";
import { Icons } from "@turbostarter/ui-web/icons";

import type { ConnectionType, DatabaseOption } from "../../types";

interface DatabaseSelectorProps {
  selectedType?: ConnectionType;
  onSelect: (type: ConnectionType) => void;
  disabled?: boolean;
}

/**
 * Database options with icons and default ports.
 */
const DATABASE_OPTIONS: DatabaseOption[] = [
  { id: "postgres", label: "PostgreSQL", icon: "🐘", defaultPort: 5432 },
  { id: "snowflake", label: "Snowflake", icon: "❄️", defaultPort: 443 },
  { id: "bigquery", label: "BigQuery", icon: "🔷" },
  { id: "mysql", label: "MySQL", icon: "🐬", defaultPort: 3306 },
  { id: "redshift", label: "Redshift", icon: "🔴", defaultPort: 5439 },
];

/**
 * Database type selector grid.
 * Shows 6 database cards in a 3x2 grid layout.
 */
export function DatabaseSelector({
  selectedType,
  onSelect,
  disabled = false,
}: DatabaseSelectorProps) {
  const { t } = useTranslation("knosia");

  return (
    <div className="grid grid-cols-3 gap-4">
      {DATABASE_OPTIONS.map((db) => (
        <DatabaseCard
          key={db.id}
          database={db}
          isSelected={selectedType === db.id}
          onSelect={() => onSelect(db.id)}
          disabled={disabled}
          label={t(`onboarding.connect.databases.${db.id}`)}
        />
      ))}

      {/* "More" card */}
      <MoreCard disabled={disabled} />
    </div>
  );
}

interface DatabaseCardProps {
  database: DatabaseOption;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
  label: string;
}

function DatabaseCard({
  database,
  isSelected,
  onSelect,
  disabled,
  label,
}: DatabaseCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
        isSelected && "border-primary ring-2 ring-primary/20",
        disabled && "cursor-not-allowed opacity-50"
      )}
      onClick={() => !disabled && onSelect()}
    >
      <CardContent className="flex flex-col items-center justify-center p-6">
        <span className="text-4xl">{database.icon}</span>
        <span className="mt-3 text-sm font-medium">{label}</span>
      </CardContent>
    </Card>
  );
}

interface MoreCardProps {
  disabled: boolean;
}

function MoreCard({ disabled }: MoreCardProps) {
  const { t } = useTranslation("knosia");

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
        disabled && "cursor-not-allowed opacity-50"
      )}
      onClick={() => {
        // TODO: Show more database options modal
        if (!disabled) {
          console.log("Show more databases");
        }
      }}
    >
      <CardContent className="flex flex-col items-center justify-center p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Icons.Plus className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className="mt-3 text-sm font-medium text-muted-foreground">
          {t("onboarding.connect.databases.more")}
        </span>
      </CardContent>
    </Card>
  );
}

/**
 * Get default port for a database type.
 */
export function getDefaultPort(type: ConnectionType): number | undefined {
  const option = DATABASE_OPTIONS.find((db) => db.id === type);
  return option?.defaultPort;
}
