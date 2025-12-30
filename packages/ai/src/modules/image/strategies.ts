import { openai } from "@ai-sdk/openai";
import { customProvider } from "ai";

import { Model } from "./types";

import type { ImageModel } from "ai";

// Lazy load replicate to avoid errors when REPLICATE_API_TOKEN is not set
const getReplicateModel = (model: string): ImageModel => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { replicate } = require("@ai-sdk/replicate") as typeof import("@ai-sdk/replicate");
  return replicate.image(model);
};

export const modelStrategies = customProvider({
  imageModels: {
    [Model.GPT_IMAGE_1]: openai.image("gpt-image-1-mini"),
    [Model.DALL_E_2]: openai.image("dall-e-2"),
    [Model.DALL_E_3]: openai.image("dall-e-3"),
  },
});

// Replicate models - only available when REPLICATE_API_TOKEN is set
export const replicateModelStrategies = process.env.REPLICATE_API_TOKEN
  ? customProvider({
      imageModels: {
        [Model.RECRAFT_V3]: getReplicateModel("recraft-ai/recraft-v3"),
        [Model.PHOTON]: getReplicateModel("luma/photon"),
        [Model.STABLE_DIFFUSION_3_5_LARGE]: getReplicateModel(
          "stability-ai/stable-diffusion-3.5-large",
        ),
        [Model.STABLE_DIFFUSION_3_5_MEDIUM]: getReplicateModel(
          "stability-ai/stable-diffusion-3.5-medium",
        ),
      },
    })
  : null;
