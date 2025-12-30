import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import * as z from "zod";

import { Credits } from "../credits/utils";

import { MODELS, PROMPTS } from "./constants";

import type {
  ChatMessagePartPayload,
  ChatMessageOptionsPayload,
} from "./schema";
import type { Message, Part, ChatMessage, ChatMessagePart } from "./types";
import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import type { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import type { XaiProviderOptions } from "@ai-sdk/xai";

export const generateChatName = async (content: string) => {
  const { object } = await generateObject({
    model: openai.responses("gpt-4.1-mini"),
    schema: z.object({
      name: z.string().min(1),
    }),
    system: PROMPTS.CHAT_NAME,
    prompt: `User message: ${content}`,
  });

  return object.name;
};

export const getProviderOptions = (options: ChatMessageOptionsPayload) => {
  const model = MODELS.find((model) => model.id === options.model);
  const reasoning = !!model?.reason && !!options.reason;

  return {
    anthropic: {
      thinking: {
        type: reasoning ? "enabled" : "disabled",
        budgetTokens: 1200,
      },
    } satisfies AnthropicProviderOptions,
    openai: {
      ...(reasoning
        ? { reasoningEffort: "medium", reasoningSummary: "detailed" }
        : {}),
      textVerbosity: "medium",
    } satisfies OpenAIResponsesProviderOptions,
    xai: {
      ...(reasoning ? { reasoningEffort: "low" } : {}),
    } satisfies XaiProviderOptions,
  };
};

export const getCreditsDeduction = (
  options: ChatMessageOptionsPayload,
  parts?: ChatMessagePartPayload[],
) => {
  const model = MODELS.find((model) => model.id === options.model);

  const searchDeduction = options.search
    ? Credits.COST.DEFAULT
    : Credits.COST.FREE;
  const reasoningDeduction =
    options.reason && model?.reason ? Credits.COST.DEFAULT : Credits.COST.FREE;

  const attachments = parts?.filter((part) => part.type === "file");
  const attachmentDeduction = (attachments?.length ?? 0) * Credits.COST.DEFAULT;

  return (
    Credits.COST.DEFAULT +
    searchDeduction +
    reasoningDeduction +
    attachmentDeduction
  );
};

export const toChatMessagePart = ({
  type,
  details,
}: Part): ChatMessagePart | null => {
  if (typeof details !== "object" || details === null) {
    return null;
  }

  return {
    type,
    ...details,
  } as ChatMessagePart;
};

export const toChatMessage = (
  message: Message & {
    parts?: Part[];
  },
): ChatMessage => {
  return {
    ...message,
    parts: message.parts?.map(toChatMessagePart).filter(Boolean) ?? [],
  };
};
