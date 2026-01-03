"use client";

import { useMutation } from "@tanstack/react-query";

import type { ConnectionFormValues, ConnectionTestResult } from "../types";

const API_BASE = "/api/knosia/connections";

interface TestConnectionResponse {
  success: boolean;
  message?: string;
  latencyMs?: number;
  error?: string;
}

interface CreateConnectionResponse {
  id: string;
  orgId: string;
  workspaceId: string;
  name: string;
  type: string;
  host: string;
  port: number | null;
  database: string;
  schema: string | null;
  sslEnabled: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface ErrorResponse {
  error?: string;
  details?: string;
}

/**
 * Test database connection without saving.
 */
async function testConnection(data: ConnectionFormValues): Promise<TestConnectionResponse> {
  const response = await fetch(`${API_BASE}/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error((result as ErrorResponse).error ?? "Failed to test connection");
  }

  return result as TestConnectionResponse;
}

/**
 * Create a new connection (tests first, then saves).
 */
async function createConnection(
  data: ConnectionFormValues & { name: string; orgId: string }
): Promise<CreateConnectionResponse> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error((result as ErrorResponse).error ?? "Failed to create connection");
  }

  return result as CreateConnectionResponse;
}

/**
 * Hook to test database connection.
 * Tests connection without saving it.
 */
export function useConnectionTest() {
  return useMutation({
    mutationKey: ["knosia", "connections", "test"],
    mutationFn: testConnection,
    onSuccess: (data) => {
      console.log("[useConnectionTest] Connection test successful:", data);
    },
    onError: (error) => {
      console.error("[useConnectionTest] Connection test failed:", error);
    },
  });
}

/**
 * Hook to create a new connection.
 * Tests connection first, then saves it if successful.
 */
export function useCreateConnection() {
  return useMutation({
    mutationKey: ["knosia", "connections", "create"],
    mutationFn: createConnection,
    onSuccess: (data) => {
      console.log("[useCreateConnection] Connection created:", data);
    },
    onError: (error) => {
      console.error("[useCreateConnection] Failed to create connection:", error);
    },
  });
}

/**
 * Transform API response to ConnectionTestResult type
 */
export function toConnectionTestResult(
  response: TestConnectionResponse | null,
  error?: Error
): ConnectionTestResult {
  if (error || !response) {
    return {
      success: false,
      error: {
        code: "CONNECTION_ERROR",
        message: error?.message ?? "Failed to test connection",
      },
    };
  }

  return {
    success: response.success,
    message: response.message,
    latencyMs: response.latencyMs,
  };
}
