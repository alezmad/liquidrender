import { Provider } from "../../types";

import { Model } from "./types";

export const MODELS = [
  {
    id: Model.GPT_5_1,
    provider: Provider.OPENAI,
    name: "GPT-5.1",
    reason: false,
    tools: true,
    attachments: true,
  },
  {
    id: Model.GPT_4O,
    provider: Provider.OPENAI,
    name: "GPT-4o",
    reason: false,
    tools: true,
    attachments: true,
  },
  {
    id: Model.O4_MINI,
    provider: Provider.OPENAI,
    name: "o4-mini",
    reason: true,
    tools: true,
    attachments: true,
  },
  {
    id: Model.O3,
    provider: Provider.OPENAI,
    name: "o3",
    reason: true,
    tools: true,
    attachments: false,
  },
  {
    id: Model.GEMINI_2_5_PRO,
    provider: Provider.GEMINI,
    name: "Gemini 2.5 Pro",
    reason: false,
    tools: true,
    attachments: true,
  },
  {
    id: Model.GEMINI_2_5_FLASH,
    provider: Provider.GEMINI,
    name: "Gemini 2.5 Flash",
    reason: false,
    tools: true,
    attachments: true,
  },
  {
    id: Model.CLAUDE_4_SONNET,
    provider: Provider.CLAUDE,
    name: "Claude 4 Sonnet",
    reason: false,
    tools: true,
    attachments: true,
  },
  {
    id: Model.CLAUDE_3_7_SONNET,
    provider: Provider.CLAUDE,
    name: "Claude 3.7 Sonnet",
    reason: true,
    tools: true,
    attachments: true,
  },
  {
    id: Model.GROK_4,
    provider: Provider.GROK,
    name: "Grok 4",
    reason: false,
    tools: true,
    attachments: false,
  },
  {
    id: Model.GROK_3,
    provider: Provider.GROK,
    name: "Grok 3",
    reason: true,
    tools: true,
    attachments: false,
  },
  {
    id: Model.DEEPSEEK_V3,
    provider: Provider.DEEPSEEK,
    name: "DeepSeek V3",
    reason: false,
    tools: true,
    attachments: false,
  },
  {
    id: Model.DEEPSEEK_R1,
    provider: Provider.DEEPSEEK,
    name: "DeepSeek R1",
    reason: true,
    tools: false,
    attachments: false,
  },
] as const;

export const PROMPTS = {
  CHAT_NAME: `- you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - the title should creative and unique
    - do not use quotes or colons`,
  SYSTEM: `- You are a digital friend that helps users with fun and engaging conversations sometimes likes to be funny but serious at the same time. 
  - Today's date is ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit", weekday: "short" })}.
  - You can use markdown formatting with tables too when needed.
  - You can use latex formtting:
    - Use $ for inline equations
    - Use $$ for block equations
    - Use "USD" for currency (not $)
    - No need to use bold or italic formatting in tables.
    - don't use the h1 heading in the markdown response.`,
};
