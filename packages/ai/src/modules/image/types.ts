export {
  type SelectGeneration as Generation,
  type SelectImage as Image,
} from "@turbostarter/db/schema/image";

import { aspectRatioEnum } from "@turbostarter/db/schema/image";

import type { EnumToConstant } from "@turbostarter/shared/types";

export const Model = {
  GPT_IMAGE_1: "gpt-image-1",
  DALL_E_2: "dall-e-2",
  DALL_E_3: "dall-e-3",
  RECRAFT_V3: "recraft-v3",
  PHOTON: "photon",
  STABLE_DIFFUSION_3_5_LARGE: "stable-diffusion-3-5-large",
  STABLE_DIFFUSION_3_5_MEDIUM: "stable-diffusion-3-5-medium",
} as const;

export type Model = (typeof Model)[keyof typeof Model];

export const AspectRatio = Object.fromEntries(
  aspectRatioEnum.enumValues.map((aspectRatio) => [
    aspectRatio.replace(/-/g, "_").toUpperCase(),
    aspectRatio,
  ]),
) as EnumToConstant<typeof aspectRatioEnum.enumValues>;

export type AspectRatio = (typeof AspectRatio)[keyof typeof AspectRatio];
