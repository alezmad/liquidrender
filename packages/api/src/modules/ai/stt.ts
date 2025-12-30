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

  const formData = await c.req.formData();
  const audioFile = formData.get("audio") as File | null;

  console.log("[STT] Audio file:", audioFile ? `${audioFile.name} (${audioFile.size} bytes, ${audioFile.type})` : "null");

  if (!audioFile) {
    return c.json({ error: "No audio file provided" }, 400);
  }

  // Parse optional parameters
  const language = formData.get("language") as string | null;
  const prompt = formData.get("prompt") as string | null;

  const options = transcriptionOptionsSchema.parse({
    language: language || undefined,
    prompt: prompt || undefined,
  });

  // Deduct credits
  console.log("[STT] Deducting credits...");
  await deductCredits(Credits.COST.DEFAULT)(c, async () => {});
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
