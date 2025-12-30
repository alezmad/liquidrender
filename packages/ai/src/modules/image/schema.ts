import * as z from "zod";

import { AspectRatio } from "./types";

export const imageGenerationOptionsSchema = z.object({
  aspectRatio: z.enum(AspectRatio),
  model: z.string(),
  count: z.number().min(1).max(5),
});

export const imageGenerationSchema = z.object({
  id: z.string().optional(),
  prompt: z.string().min(1).max(5000),
  options: imageGenerationOptionsSchema,
});

export type ImageGenerationOptionsPayload = z.infer<
  typeof imageGenerationOptionsSchema
>;
export type ImageGenerationPayload = z.infer<typeof imageGenerationSchema>;

// API input type aliases
export type ImageGenerationInput = ImageGenerationPayload;

export {
  selectGenerationSchema as generationSchema,
  selectImageSchema as imageSchema,
} from "@turbostarter/db/schema/image";
