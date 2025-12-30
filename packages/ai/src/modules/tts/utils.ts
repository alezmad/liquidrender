import { random } from "@turbostarter/shared/utils";

import type { Voice } from "./types";
import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";

export const toVoice = (voice: ElevenLabs.Voice): Voice => {
  return {
    id: voice.voiceId,
    name: voice.name ?? "",
    description: voice.description,
    category: voice.category,
    details: Object.values(voice.labels ?? {}).filter(Boolean),
    createdAt: voice.createdAtUnix
      ? new Date(voice.createdAtUnix * 1000).toISOString()
      : new Date().toISOString(),
    usage: {
      cloned: random(25000, 1000000),
      character: random(100000, 10000000),
    },
    previewUrl: voice.previewUrl,
  };
};
