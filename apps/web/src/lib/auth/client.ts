import { createClient } from "@turbostarter/auth/client/web";

export const authClient = createClient({
  fetchOptions: {
    headers: {
      "x-client-platform": "web-client",
    },
    // Note: removed `throw: true` as it breaks client-side navigation
    // Errors are now handled via response status checking
  },
});
