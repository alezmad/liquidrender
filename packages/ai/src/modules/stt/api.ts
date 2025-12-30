import OpenAI from "openai";

import type { TranscriptionOptions, TranscriptionResult } from "./types";

// Lazy initialization to avoid issues at module load
let _openai: OpenAI | null = null;
const getOpenAI = () => {
  if (!_openai) {
    _openai = new OpenAI();
  }
  return _openai;
};

/**
 * Transcribe audio to text using OpenAI Whisper
 */
export async function transcribe(
  audioFile: File | Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const openai = getOpenAI();

  // Convert Blob to File if needed
  const file =
    audioFile instanceof File
      ? audioFile
      : new File([audioFile], "audio.webm", { type: audioFile.type || "audio/webm" });

  const response = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: options.language,
    prompt: options.prompt,
    response_format: "verbose_json",
  });

  return {
    text: response.text,
    language: response.language,
    duration: response.duration,
  };
}

/**
 * Transcribe audio from a URL
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const response = await fetch(audioUrl);
  const blob = await response.blob();
  return transcribe(blob, options);
}
