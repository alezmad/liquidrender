import * as z from "zod";

import { Model, Role } from "./types";

export const chatMessageOptionsSchema = z.object({
  reason: z.boolean().optional().default(false),
  search: z.boolean().optional().default(false),
  model: z.enum(Model),
});

export const chatMessageMetadataSchema = z.object({
  options: chatMessageOptionsSchema,
});

export const chatMessagePartSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("text"),
      text: z.string(),
    })
    .catchall(z.unknown()),
  z.object({
    type: z.literal("file"),
    filename: z.string(),
    mediaType: z.string(),
    url: z.string(),
    path: z.string().optional(),
  }),
]);

export const chatMessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  parts: z.array(chatMessagePartSchema),
  role: z.enum(Role).optional().default(Role.USER),
  metadata: chatMessageMetadataSchema,
});

export type ChatMessagePayload = z.infer<typeof chatMessageSchema>;
export type ChatMessagePartPayload = z.infer<typeof chatMessagePartSchema>;
export type ChatMessageOptionsPayload = z.infer<
  typeof chatMessageOptionsSchema
>;
export type ChatMessageMetadataPayload = z.infer<
  typeof chatMessageMetadataSchema
>;

// API input type aliases
export type ChatMessageInput = ChatMessagePayload;

export {
  selectChatSchema as chatSchema,
  selectMessageSchema as messageSchema,
  selectPartSchema as partSchema,
} from "@turbostarter/db/schema/chat";
