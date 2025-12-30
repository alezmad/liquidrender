import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

import { env } from "../../env";

// Lazy initialization to avoid throwing at module load time
let _client: ElevenLabsClient | null = null;
export const getClient = () => {
  if (!_client) {
    if (!env.ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is required for TTS");
    }
    _client = new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY });
  }
  return _client;
};

// For backward compatibility - will throw if API key is missing
export const client = {
  get textToSpeech() {
    return getClient().textToSpeech;
  },
  get voices() {
    return getClient().voices;
  },
};
