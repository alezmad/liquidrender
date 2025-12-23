import { Mastra } from "@mastra/core";
import { agents } from "./agents";

// ─────────────────────────────────────────────────────────────────────────────
// MASTRA INSTANCE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const mastra = new Mastra({
  agents,
  // Enable telemetry for observability
  telemetry: {
    serviceName: "triangulated-compiler-synthesis",
    enabled: process.env.NODE_ENV === "production",
  },
});

export default mastra;
