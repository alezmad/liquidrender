export interface Voice {
  id: string;
  name: string;
  description?: string;
  category?: string;
  details: string[];
  createdAt: string;
  usage: {
    cloned: number;
    character: number;
  };
  previewUrl?: string;
}

export const Model = {
  ELEVEN_3: "eleven_v3",
  ELEVEN_MULTILINGUAL_V2: "eleven_multilingual_v2",
  ELEVEN_FLASH_V2_5: "eleven_flash_v2_5",
  ELEVEN_FLASH_V2: "eleven_flash_v2",
  ELEVEN_TURBO_V2_5: "eleven_turbo_v2_5",
  ELEVEN_TURBO_V2: "eleven_turbo_v2",
} as const;

export type Model = (typeof Model)[keyof typeof Model];
