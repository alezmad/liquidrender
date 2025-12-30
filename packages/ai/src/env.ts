import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig, NodeEnv } from "@turbostarter/shared/constants";

import type { Preset } from "envin/types";

export const preset = {
  id: "ai",
  server: {
    ELEVENLABS_API_KEY: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
  },
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  shared: {
    NODE_ENV: z.enum(NodeEnv).default(NodeEnv.DEVELOPMENT),
  },
  server: {
    ELEVENLABS_API_KEY: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
  },
});
