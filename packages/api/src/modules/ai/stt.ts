import { Hono } from "hono";

import { Credits } from "@turbostarter/ai/credits/utils";
import { transcribe } from "@turbostarter/ai/stt/api";
import { transcriptionOptionsSchema } from "@turbostarter/ai/stt/schema";

import { deductCredits, enforceAuth, rateLimiter } from "../../middleware";

import type { User } from "@turbostarter/auth";

export const sttRouter = new Hono<{
  Variables: {
    user: User;
  };
}>().post("/", enforceAuth, rateLimiter, async (c) => {
  console.log("[STT] Request received");

  // Use Hono's typed FormData methods to work across different runtime environments
  const formData = await c.req.formData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioFile = ((formData as any).get?.("audio") ?? (formData as any).getAll?.("audio")?.[0]) as File | null;

  console.log("[STT] Audio file:", audioFile ? `${audioFile.name} (${audioFile.size} bytes, ${audioFile.type})` : "null");

  if (!audioFile) {
    return c.json({ error: "No audio file provided" }, 400);
  }

  // Parse optional parameters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fd = formData as any;
  const language = (fd.get?.("language") ?? fd.getAll?.("language")?.[0]) as string | null;
  const prompt = (fd.get?.("prompt") ?? fd.getAll?.("prompt")?.[0]) as string | null;

  const options = transcriptionOptionsSchema.parse({
    language: language || undefined,
    prompt: prompt || undefined,
  });

  // Deduct credits
  console.log("[STT] Deducting credits...");
  await deductCredits(Credits.COST.DEFAULT, "speech-to-text")(c, async () => {});
  console.log("[STT] Credits deducted, calling OpenAI Whisper...");

  try {
    const result = await transcribe(audioFile, options);
    console.log("[STT] Transcription successful:", result.text?.substring(0, 50));
    return c.json(result);
  } catch (error) {
    console.error("[STT] Transcription error:", error);
    throw error;
  }
});
