"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useTranslation } from "@turbostarter/i18n";
import { Button } from "@turbostarter/ui-web/button";
import { Checkbox } from "@turbostarter/ui-web/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@turbostarter/ui-web/form";
import { Icons } from "@turbostarter/ui-web/icons";
import { Input, PasswordInput } from "@turbostarter/ui-web/input";

import { getDefaultPort } from "./database-selector";

import type { ConnectionFormValues, ConnectionType } from "../../types";

/** Connection form validation schema */
const connectionFormSchema = z.object({
  type: z.enum(["postgres", "mysql", "snowflake", "bigquery", "redshift", "duckdb"]),
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().min(1).max(65535),
  database: z.string().min(1, "Database name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  schema: z.string().optional(),
  ssl: z.boolean().optional(),
});

interface ConnectionFormProps {
  databaseType: ConnectionType;
  onSubmit: (values: ConnectionFormValues) => void;
  onBack: () => void;
  isLoading?: boolean;
}

/**
 * Connection form for database credentials.
 */
export function ConnectionForm({
  databaseType,
  onSubmit,
  onBack,
  isLoading = false,
}: ConnectionFormProps) {
  const { t } = useTranslation("knosia");

  const form = useForm({
    resolver: standardSchemaResolver(connectionFormSchema),
    defaultValues: {
      type: databaseType,
      host: "",
      port: getDefaultPort(databaseType) ?? 5432,
      database: "",
      username: "",
      password: "",
      schema: "",
      ssl: true,
    },
  });

  const handleSubmit = (values: ConnectionFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit(handleSubmit)(e);
        }}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="host"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("onboarding.connect.form.host")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="db.example.com"
                  disabled={isLoading}
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("onboarding.connect.form.port")}</FormLabel>
                <FormControl>
                  <Input
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value as number}
                    type="number"
                    disabled={isLoading}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="database"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("onboarding.connect.form.database")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="mydb"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("onboarding.connect.form.username")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="readonly_user"
                  disabled={isLoading}
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("onboarding.connect.form.password")}</FormLabel>
              <FormControl>
                <PasswordInput
                  {...field}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="schema"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("onboarding.connect.form.schema")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="public"
                  disabled={isLoading}
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ssl"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
              <FormLabel className="text-sm font-normal">
                Use SSL/TLS connection
              </FormLabel>
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            {t("onboarding.connect.form.back")}
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("onboarding.connect.form.testConnect")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
