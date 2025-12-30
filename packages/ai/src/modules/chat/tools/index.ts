import { Tool } from "../types";

import { webSearch } from "./search";

import type { InferUITools, UIMessageStreamWriter } from "ai";

export const toolStrategies = (writer: UIMessageStreamWriter) => ({
  [Tool.WEB_SEARCH]: webSearch(writer),
});

export type ChatTools = InferUITools<ReturnType<typeof toolStrategies>>;
