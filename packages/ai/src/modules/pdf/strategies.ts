import { openai } from "@ai-sdk/openai";
import { customProvider } from "ai";

import { cached } from "../../utils/llm";

export const modelStrategies = customProvider({
  languageModels: {
    default: cached(openai.responses("gpt-4o-mini")),
    // Uncached for tool-using flows (PDF chat) - tools need fresh execution
    uncached: openai.responses("gpt-4o-mini"),
  },
  textEmbeddingModels: {
    default: openai.textEmbedding("text-embedding-3-small"),
  },
});
