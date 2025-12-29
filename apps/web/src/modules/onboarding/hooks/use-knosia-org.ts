"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { authClient } from "~/lib/auth/client";

const API_BASE = "/api/knosia/organization";

/** Warning threshold: show warning when less than 2 days remain */
const WARNING_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000;

interface KnosiaOrganization {
  id: string;
  name: string;
  isGuest: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface ErrorResponse {
  error?: string;
}

interface ExpirationInfo {
  /** Whether the workspace will expire */
  willExpire: boolean;
  /** When the workspace expires (null if never) */
  expiresAt: Date | null;
  /** Days remaining until expiration (null if never expires) */
  daysRemaining: number | null;
  /** Hours remaining until expiration (null if never expires) */
  hoursRemaining: number | null;
  /** Whether to show expiration warning (less than 2 days) */
  showWarning: boolean;
  /** Whether the workspace is already expired */
  isExpired: boolean;
}

/**
 * Get or create the user's knosia organization.
 * For guest users, auto-creates an org on first access with 7-day TTL.
 */
async function getOrCreateOrganization(): Promise<KnosiaOrganization> {
  const response = await fetch(`${API_BASE}/me`, {
    method: "POST", // POST to get-or-create
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new Error(errorData.error ?? "Failed to get organization");
  }

  return (await response.json()) as KnosiaOrganization;
}

/**
 * Calculate expiration info from the organization data.
 */
function calculateExpiration(org: KnosiaOrganization | null): ExpirationInfo {
  if (!org || !org.expiresAt) {
    return {
      willExpire: false,
      expiresAt: null,
      daysRemaining: null,
      hoursRemaining: null,
      showWarning: false,
      isExpired: false,
    };
  }

  const expiresAt = new Date(org.expiresAt);
  const now = Date.now();
  const msRemaining = expiresAt.getTime() - now;
  const isExpired = msRemaining <= 0;

  if (isExpired) {
    return {
      willExpire: true,
      expiresAt,
      daysRemaining: 0,
      hoursRemaining: 0,
      showWarning: true,
      isExpired: true,
    };
  }

  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  const showWarning = msRemaining < WARNING_THRESHOLD_MS;

  return {
    willExpire: true,
    expiresAt,
    daysRemaining,
    hoursRemaining,
    showWarning,
    isExpired: false,
  };
}

/**
 * Hook to get the user's knosia organization.
 * Auto-creates one if it doesn't exist.
 *
 * For guest users:
 * - Creates a "Guest Workspace" with 7-day TTL
 * - Returns expiration info for UI warnings
 *
 * For registered users:
 * - Creates workspace with no expiration
 */
export function useKnosiaOrg() {
  const session = authClient.useSession();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["knosia", "organization", "me"],
    queryFn: getOrCreateOrganization,
    enabled: !!session.data?.user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["knosia", "organization", "me"] });
  };

  // Calculate expiration info (memoized to avoid recalc on every render)
  const expiration = useMemo(
    () => calculateExpiration(query.data ?? null),
    [query.data],
  );

  return {
    // Organization data
    org: query.data ?? null,
    orgId: query.data?.id ?? null,
    orgName: query.data?.name ?? null,
    isGuest: query.data?.isGuest ?? false,

    // Expiration info
    expiration,

    // Query state
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}
