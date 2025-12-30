export const Provider = {
  OPENAI: "openai",
  CLAUDE: "claude",
  GEMINI: "gemini",
  GROK: "grok",
  DEEPSEEK: "deepseek",
  REPLICATE: "replicate",
  LUMA: "luma",
  STABILITY_AI: "stability-ai",
  RECRAFT: "recraft",
  ELEVEN_LABS: "eleven-labs",
  NVIDIA: "nvidia",
} as const;

export type Provider = (typeof Provider)[keyof typeof Provider];
