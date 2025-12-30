import { client } from "./client";
import { toVoice } from "./utils";

import type { TtsPayload } from "./schema";

export const textToSpeech = async ({ text, options }: TtsPayload) => {
  const { voice, model } = options;

  return client.textToSpeech.stream(voice.id, {
    modelId: model,
    text,
    voiceSettings: {
      stability: voice.stability,
      similarityBoost: voice.similarity,
      useSpeakerBoost: voice.boost,
      speed: voice.speed,
    },
  });
};

export const getVoices = async () => {
  const { voices } = await client.voices.getAll();
  return voices.map(toVoice);
};
