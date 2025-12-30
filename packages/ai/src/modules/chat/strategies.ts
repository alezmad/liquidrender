import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { customProvider } from "ai";

import { cached } from "../../utils/llm";

import { Model } from "./types";

export const modelStrategies = customProvider({
  languageModels: {
    [Model.GPT_5_1]: cached(openai.responses("gpt-5.1-chat-latest")),
    [Model.GPT_4O]: cached(openai.responses("gpt-4o")),
    [Model.O3]: cached(openai.responses("o3-mini")),
    [Model.O4_MINI]: cached(openai.responses("o4-mini")),
    [Model.GEMINI_2_5_PRO]: cached(google("gemini-2.5-pro")),
    [Model.GEMINI_2_5_FLASH]: cached(google("gemini-2.5-flash")),
    [Model.CLAUDE_4_SONNET]: cached(anthropic("claude-sonnet-4-5")),
    [Model.CLAUDE_3_7_SONNET]: cached(anthropic("claude-3-7-sonnet-latest")),
    [Model.GROK_4]: cached(xai("grok-4")),
    [Model.GROK_3]: cached(xai("grok-3-mini-fast")),
    [Model.DEEPSEEK_V3]: cached(deepseek("deepseek-chat")),
    [Model.DEEPSEEK_R1]: cached(deepseek("deepseek-reasoner")),
  },
});
