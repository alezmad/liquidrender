import { Provider } from "../../types";

import { Model } from "./types";

export const MODELS = [
  // {
  //   id: Model.ELEVEN_3,
  //   provider: Provider.ELEVEN_LABS,
  //   name: "Eleven 3",
  // },
  {
    id: Model.ELEVEN_MULTILINGUAL_V2,
    provider: Provider.ELEVEN_LABS,
    name: "Eleven Multilingual v2",
  },
  {
    id: Model.ELEVEN_FLASH_V2_5,
    provider: Provider.ELEVEN_LABS,
    name: "Eleven Flash v2.5",
  },
  {
    id: Model.ELEVEN_FLASH_V2,
    provider: Provider.ELEVEN_LABS,
    name: "Eleven Flash v2",
  },
  {
    id: Model.ELEVEN_TURBO_V2_5,
    provider: Provider.ELEVEN_LABS,
    name: "Eleven Turbo v2.5",
  },
  {
    id: Model.ELEVEN_TURBO_V2,
    provider: Provider.ELEVEN_LABS,
    name: "Eleven Turbo v2",
  },
] as const;
