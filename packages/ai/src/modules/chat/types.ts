export type {
  SelectChat as Chat,
  SelectMessage as Message,
  SelectPart as Part,
} from "@turbostarter/db/schema/chat";

import { messageRoleEnum } from "@turbostarter/db/schema/chat";

import type { ChatMessageMetadataPayload } from "./schema";
import type { ChatTools } from "./tools";
import type { DataQueryCompletionPart } from "./tools/search";
import type { EnumToConstant } from "@turbostarter/shared/types";
import type { UIMessage } from "ai";

export const Role = Object.fromEntries(
  messageRoleEnum.enumValues.map((role) => [
    role.replace(/-/g, "_").toUpperCase(),
    role,
  ]),
) as EnumToConstant<typeof messageRoleEnum.enumValues>;

export type Role = (typeof Role)[keyof typeof Role];

export const Model = {
  O3: "o3",
  O4_MINI: "o4-mini",
  GPT_5_1: "gpt-5-1",
  GPT_4O: "gpt-4o",
  GEMINI_2_5_PRO: "gemini-2-5-pro",
  GEMINI_2_5_FLASH: "gemini-2-5-flash",
  CLAUDE_4_SONNET: "claude-4-sonnet",
  CLAUDE_3_7_SONNET: "claude-3-7-sonnet",
  GROK_4: "grok-4",
  GROK_3: "grok-3",
  DEEPSEEK_V3: "deepseek-v3",
  DEEPSEEK_R1: "deepseek-r1",
} as const;

export type Model = (typeof Model)[keyof typeof Model];

export const Tool = {
  WEB_SEARCH: "web-search",
} as const;

export type Tool = (typeof Tool)[keyof typeof Tool];

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ChatDataParts = {
  query_completion: DataQueryCompletionPart;
};

export type ChatMessage = UIMessage<
  ChatMessageMetadataPayload,
  ChatDataParts,
  ChatTools
>;
export type ChatMessagePart = UIMessage["parts"][number];

export type { ChatTools };
