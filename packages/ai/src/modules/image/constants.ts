import { Provider } from "../../types";

import { AspectRatio, Model } from "./types";

export const MODELS = [
  {
    id: Model.GPT_IMAGE_1,
    provider: Provider.OPENAI,
    name: "GPT Image 1",
    dimensionFormat: "size",
    dimensions: [
      {
        id: AspectRatio.SQUARE,
        value: "1024x1024",
      },
    ],
  },
  {
    id: Model.DALL_E_2,
    provider: Provider.OPENAI,
    name: "DALL-E 2",
    dimensionFormat: "size",
    dimensions: [
      {
        id: AspectRatio.SQUARE,
        value: "1024x1024",
      },
    ],
  },
  {
    id: Model.DALL_E_3,
    provider: Provider.OPENAI,
    name: "DALL-E 3",
    dimensionFormat: "size",
    dimensions: [
      {
        id: AspectRatio.SQUARE,
        value: "1024x1024",
      },
    ],
  },
  {
    id: Model.RECRAFT_V3,
    provider: Provider.RECRAFT,
    name: "Recraft v3",
    dimensionFormat: "aspectRatio",
    dimensions: [
      {
        id: AspectRatio.SQUARE,
        value: "1:1",
      },
      {
        id: AspectRatio.STANDARD,
        value: "4:3",
      },
      {
        id: AspectRatio.LANDSCAPE,
        value: "16:9",
      },
      {
        id: AspectRatio.PORTRAIT,
        value: "9:16",
      },
    ],
  },
  {
    id: Model.PHOTON,
    provider: Provider.LUMA,
    name: "Photon",
    dimensionFormat: "aspectRatio",
    dimensions: [
      {
        id: AspectRatio.SQUARE,
        value: "1:1",
      },
      {
        id: AspectRatio.STANDARD,
        value: "4:3",
      },
      {
        id: AspectRatio.LANDSCAPE,
        value: "16:9",
      },
      {
        id: AspectRatio.PORTRAIT,
        value: "9:16",
      },
    ],
  },
  {
    id: Model.STABLE_DIFFUSION_3_5_LARGE,
    provider: Provider.STABILITY_AI,
    name: "Stable Diffusion 3.5 Large",
    dimensionFormat: "aspectRatio",
    dimensions: [
      {
        id: AspectRatio.SQUARE,
        value: "1:1",
      },
      {
        id: AspectRatio.STANDARD,
        value: "4:3",
      },
      {
        id: AspectRatio.LANDSCAPE,
        value: "16:9",
      },
      {
        id: AspectRatio.PORTRAIT,
        value: "9:16",
      },
    ],
  },
  {
    id: Model.STABLE_DIFFUSION_3_5_MEDIUM,
    provider: Provider.STABILITY_AI,
    name: "Stable Diffusion 3.5 Medium",
    dimensionFormat: "aspectRatio",
    dimensions: [
      {
        id: AspectRatio.SQUARE,
        value: "1:1",
      },
      {
        id: AspectRatio.STANDARD,
        value: "4:3",
      },
      {
        id: AspectRatio.LANDSCAPE,
        value: "16:9",
      },
      {
        id: AspectRatio.PORTRAIT,
        value: "9:16",
      },
    ],
  },
] as const;
