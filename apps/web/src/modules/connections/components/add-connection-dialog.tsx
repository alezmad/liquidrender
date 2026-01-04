"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@turbostarter/ui-web/dialog";
import { Button } from "@turbostarter/ui-web/button";
import { Plus } from "lucide-react";
import {
  DatabaseSelector,
  ConnectionForm,
  ConnectionTest,
  useConnectionTest,
  useCreateConnection,
  toConnectionTestResult,
} from "~/modules/onboarding";
import type { ConnectionType, ConnectionFormValues, ConnectionTestResult } from "~/modules/onboarding";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AddConnectionDialogProps {
  orgId: string;
}

export function AddConnectionDialog({ orgId }: AddConnectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedType, setSelectedType] = useState<ConnectionType | undefined>(undefined);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const queryClient = useQueryClient();
  const connectionTest = useConnectionTest();
  const createConnection = useCreateConnection();

  const handleTypeSelect = useCallback((type: ConnectionType) => {
    setSelectedType(type);
    setTestResult(null);
    setStep("form");
  }, []);

  const handleFormSubmit = useCallback(
    async (values: ConnectionFormValues) => {
      setTestResult(null);

      try {
        const result = await connectionTest.mutateAsync(values);
        const testRes = toConnectionTestResult(result);
        setTestResult(testRes);

        if (testRes.success) {
          // Create the connection
          const connectionName = `${values.type} - ${values.host}`;
          await createConnection.mutateAsync({
            ...values,
            name: connectionName,
            orgId,
          });

          // Invalidate connections query to refetch
          queryClient.invalidateQueries({ queryKey: ["connections", orgId] });
          toast.success("Connection added", {
            description: "Your database connection has been added successfully.",
          });
          handleClose();
        }
      } catch (error) {
        setTestResult({
          success: false,
          error: {
            code: "CONNECTION_ERROR",
            message: error instanceof Error ? error.message : "Connection test failed",
          },
        });
      }
    },
    [connectionTest, createConnection, queryClient, orgId]
  );

  const handleRetry = useCallback(() => {
    setTestResult(null);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setStep("select");
    setSelectedType(undefined);
    setTestResult(null);
  }, []);

  const isLoading = connectionTest.isPending || createConnection.isPending;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Connection
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {step === "select" && "Select Database Type"}
              {step === "form" && "Connection Details"}
            </DialogTitle>
          </DialogHeader>

          {step === "select" && (
            <DatabaseSelector
              onSelect={handleTypeSelect}
              selectedType={selectedType}
            />
          )}

          {step === "form" && selectedType && (
            <div className="space-y-6">
              <ConnectionForm
                databaseType={selectedType}
                onSubmit={handleFormSubmit}
                onBack={() => setStep("select")}
                isLoading={isLoading}
              />

              <ConnectionTest
                result={testResult}
                isLoading={connectionTest.isPending}
                onRetry={handleRetry}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
