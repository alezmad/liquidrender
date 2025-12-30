import * as z from "zod";

export const ttsOptionsSchema = z.object({
  model: z.string(),
  voice: z.object({
    id: z.string(),
    stability: z.number().min(0).max(1).default(0.5).optional(),
    speed: z.number().min(0.7).max(1.2).default(1).optional(),
    similarity: z.number().min(0).max(1).default(0.5).optional(),
    boost: z.boolean().default(false).optional(),
  }),
});

export const ttsSchema = z.object({
  text: z.string().min(1).max(5000),
  options: ttsOptionsSchema,
});

export type TtsOptionsPayload = z.infer<typeof ttsOptionsSchema>;
export type TtsPayload = z.infer<typeof ttsSchema>;

// API input type aliases
export type TtsInput = TtsPayload;
