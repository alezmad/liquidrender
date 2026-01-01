"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { memo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@turbostarter/ui-web/form";
import { Icons } from "@turbostarter/ui-web/icons";
import { Input, PasswordInput } from "@turbostarter/ui-web/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@turbostarter/ui-web/select";

// Database types supported
const DATABASE_TYPES = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  duckdb: "DuckDB",
} as const;

type DatabaseType = keyof typeof DATABASE_TYPES;

// Zod schema for connection data validation
const connectionSchema = z.object({
  databaseType: z.enum(["postgresql", "mysql", "sqlite", "duckdb"]),
  connectionName: z
    .string()
    .min(1, "Connection name is required")
    .max(100, "Connection name must be less than 100 characters"),
  connectionString: z
    .string()
    .min(1, "Connection string is required")
    .max(500, "Connection string must be less than 500 characters"),
  schemaName: z
    .string()
    .min(1, "Schema name is required")
    .max(63, "Schema name must be less than 63 characters")
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      "Schema name must start with a letter or underscore and contain only alphanumeric characters and underscores",
    ),
});

export type ConnectionData = z.infer<typeof connectionSchema>;

export interface ConnectStepProps {
  onNext: (data: ConnectionData) => void;
  initialData?: ConnectionData;
  isLoading?: boolean;
}

export const ConnectStep = memo<ConnectStepProps>(
  ({ onNext, initialData, isLoading = false }) => {
    const [connectionTested, setConnectionTested] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);

    const form = useForm<ConnectionData>({
      resolver: standardSchemaResolver(connectionSchema),
      defaultValues: {
        databaseType: initialData?.databaseType ?? "postgresql",
        connectionName: initialData?.connectionName ?? "",
        connectionString: initialData?.connectionString ?? "",
        schemaName: initialData?.schemaName ?? "public",
      },
    });

    // Reset connection test status when form values change
    const handleFieldChange = useCallback(() => {
      if (connectionTested) {
        setConnectionTested(false);
        setTestError(null);
      }
    }, [connectionTested]);

    const testConnection = async () => {
      // Validate form first
      const isValid = await form.trigger();
      if (!isValid) return;

      setTestingConnection(true);
      setTestError(null);

      try {
        // Simulate connection test - replace with actual API call
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            const connectionString = form.getValues("connectionString");
            // Basic validation - in production, this would be an actual connection test
            if (connectionString.length < 10) {
              reject(new Error("Invalid connection string format"));
            } else {
              resolve(true);
            }
          }, 1500);
        });

        setConnectionTested(true);
      } catch (error) {
        setTestError(
          error instanceof Error ? error.message : "Connection test failed",
        );
        setConnectionTested(false);
      } finally {
        setTestingConnection(false);
      }
    };

    const handleSubmit = (data: ConnectionData) => {
      if (!connectionTested) return;
      onNext(data);
    };

    const isFormDisabled = isLoading || testingConnection;

    return (
      <div className="w-full">
        <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col gap-6"
            >
              <FormField
                control={form.control}
                name="databaseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleFieldChange();
                        }}
                        value={field.value}
                        disabled={isFormDisabled}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select database type" />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.entries(DATABASE_TYPES) as [
                              DatabaseType,
                              string,
                            ][]
                          ).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Choose the type of database you want to connect to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="connectionName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Connection Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange();
                        }}
                        placeholder="My Production Database"
                        disabled={isFormDisabled}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormDescription>
                      A friendly name to identify this connection.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="connectionString"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Connection String</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange();
                        }}
                        placeholder="postgresql://user:password@host:5432/database"
                        disabled={isFormDisabled}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormDescription>
                      Your database connection string. This will be encrypted.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schemaName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schema Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange();
                        }}
                        placeholder="public"
                        disabled={isFormDisabled}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormDescription>
                      The database schema to use. Defaults to &quot;public&quot;
                      for PostgreSQL.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {testError && (
                <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-3 text-sm">
                  <Icons.CircleX className="size-4 shrink-0" />
                  <span>{testError}</span>
                </div>
              )}

              {connectionTested && (
                <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                  <Icons.CheckCircle2 className="size-4 shrink-0" />
                  <span>Connection successful! You can now proceed.</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={testConnection}
                  disabled={isFormDisabled}
                  className={cn({
                    "border-green-500 text-green-600 dark:text-green-400":
                      connectionTested,
                  })}
                >
                  {testingConnection ? (
                    <>
                      <Icons.Loader2 className="size-4 animate-spin" />
                      Testing...
                    </>
                  ) : connectionTested ? (
                    <>
                      <Icons.CheckCircle2 className="size-4" />
                      Connected
                    </>
                  ) : (
                    <>
                      <Icons.Webhook className="size-4" />
                      Test Connection
                    </>
                  )}
                </Button>

                <Button
                  type="submit"
                  disabled={!connectionTested || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Icons.Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Next
                      <Icons.ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
      </div>
    );
  },
);

ConnectStep.displayName = "ConnectStep";
