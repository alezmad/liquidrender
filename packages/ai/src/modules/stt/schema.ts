import { z } from "zod";

export const transcriptionOptionsSchema = z.object({
  language: z.string().optional(),
  prompt: z.string().optional(),
});

export const transcriptionResultSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
  duration: z.number().optional(),
});

export type TranscriptionOptionsInput = z.infer<typeof transcriptionOptionsSchema>;
export type TranscriptionResultOutput = z.infer<typeof transcriptionResultSchema>;
