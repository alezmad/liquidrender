import {
  QueryCache,
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { logger } from "@turbostarter/shared/logger";

// Errors to ignore (typically happen during navigation)
const isIgnorableError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      error.name === "AbortError" ||
      message.includes("failed to fetch") ||
      message.includes("aborted") ||
      message.includes("cancelled")
    );
  }
  return false;
};

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        // Silently ignore abort/navigation errors
        if (isIgnorableError(error)) return;
        logger.error(error);
      },
    }),
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
        // Retry logic - don't retry on abort errors
        retry: (failureCount, error) => {
          if (isIgnorableError(error)) return false;
          return failureCount < 3;
        },
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      mutations: {
        onError: (error: Error | { error: Error } | unknown) => {
          if (error && typeof error === "object" && "error" in error) {
            error = (error as { error: Error }).error;
          }

          const message =
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "An unexpected error occurred";

          logger.error(error ?? "Unknown error");
          toast.error(message);
        },
      },
    },
  });
