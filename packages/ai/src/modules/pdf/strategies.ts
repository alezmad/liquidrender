import { openai } from "@ai-sdk/openai";
import { customProvider } from "ai";

import { cached } from "../../utils/llm";

export const modelStrategies = customProvider({
  languageModels: {
    default: cached(openai.responses("gpt-5-mini")),
  },
  textEmbeddingModels: {
    default: openai.textEmbedding("text-embedding-3-small"),
  },
});
