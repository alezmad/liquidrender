import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import * as z from "zod";

import { and, eq } from "@turbostarter/db";
import { chat, message, part } from "@turbostarter/db/schema/chat";
import { db } from "@turbostarter/db/server";
import { omitBy } from "@turbostarter/shared/utils";
import { getDeleteUrl, getSignedUrl } from "@turbostarter/storage/server";

import { repairToolCall } from "../../utils/llm";

import { MODELS, PROMPTS } from "./constants";
import { modelStrategies } from "./strategies";
import { toolStrategies } from "./tools";
import { Role, Tool } from "./types";
import { generateChatName, getProviderOptions, toChatMessage } from "./utils";

import type { ChatMessagePayload } from "./schema";
import type {
  InsertChat,
  InsertMessage,
  InsertPart,
} from "@turbostarter/db/schema/chat";

const hasPath = (details: unknown): details is { path: string } =>
  z
    .object({
      path: z.string(),
    })
    .safeParse(details).success;

export const createChat = async (data: InsertChat) =>
  db
    .insert(chat)
    .values(data)
    .onConflictDoUpdate({
      target: chat.id,
      set: data,
    })
    .returning();

export const updateChat = async (id: string, data: Partial<InsertChat>) =>
  db.update(chat).set(data).where(eq(chat.id, id));

export const getChat = async (id: string) =>
  db.query["chat.chat"].findFirst({
    where: eq(chat.id, id),
  });

const deleteAttachment = async (path: string) => {
  const { url } = await getDeleteUrl({ path });

  await fetch(url, {
    method: "DELETE",
  });
};

export const deleteChat = async (id: string) => {
  const attachments = await getFileParts(id);
  const [deleted] = await db.delete(chat).where(eq(chat.id, id)).returning();

  if (!deleted) {
    return;
  }

  void Promise.allSettled(
    attachments
      .map((part) => part.details)
      .filter(hasPath)
      .map((part) => deleteAttachment(part.path)),
  );

  return deleted;
};

export const getUserChats = async (userId: string) =>
  db.query["chat.chat"].findMany({
    where: eq(chat.userId, userId),
    orderBy: (chat, { desc }) => [desc(chat.createdAt)],
  });

export const createMessage = async (data: InsertMessage) =>
  db.insert(message).values(data).onConflictDoUpdate({
    target: message.id,
    set: data,
  });

export const createParts = async (data: InsertPart[]) =>
  db.insert(part).values(data).onConflictDoNothing();

export const getFileParts = async (chatId: string) => {
  const rows = await db
    .select()
    .from(part)
    .innerJoin(message, eq(part.messageId, message.id))
    .where(and(eq(message.chatId, chatId), eq(part.type, "file")));

  return rows.flatMap((row) => row.part);
};

export const getChatMessages = async (id: string) =>
  db.query["chat.message"].findMany({
    where: eq(message.chatId, id),
    orderBy: (message, { asc }) => [asc(message.createdAt)],
    with: {
      part: {
        orderBy: (part, { asc }) => [asc(part.order)],
      },
    },
  });

export const getChatMessagesWithAttachments = async (id: string) => {
  const messages = await getChatMessages(id);

  return Promise.all(
    messages.map(async (message) => ({
      ...message,
      parts: await Promise.all(
        message.part.map(async (part) =>
          part.type === "file"
            ? {
                ...part,
                details: {
                  ...(hasPath(part.details)
                    ? {
                        ...part.details,
                        url: (
                          await getSignedUrl({
                            path: part.details.path,
                          })
                        ).url,
                      }
                    : {}),
                },
              }
            : part,
        ),
      ),
    })),
  );
};

const upsertChat = async ({
  id,
  content,
  userId,
}: {
  id: string;
  content: string;
  userId: string;
}) => {
  const [chat] = await createChat({ id, userId });

  if (!chat?.name) {
    void (async () => {
      const name = await generateChatName(content);
      await updateChat(id, { name });
    })();
  }

  return chat;
};

export const streamChat = async ({
  chatId,
  userId,
  signal,
  ...message
}: ChatMessagePayload & { signal: AbortSignal; userId: string }) => {
  await upsertChat({
    id: chatId,
    content: message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n"),
    userId,
  });

  const messages = await getChatMessagesWithAttachments(chatId);

  await createMessage({ ...message, chatId });
  await createParts(
    message.parts.map(({ type, ...details }, order) => ({
      type,
      order,
      details:
        type === "file" ? omitBy(details, (_, key) => key === "url") : details,
      messageId: message.id,
    })),
  );

  const providerOptions = getProviderOptions(message.metadata.options);

  const model = MODELS.find(
    (model) => model.id === message.metadata.options.model,
  );

  if (!model) {
    throw new Error("Model not found!");
  }

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        model: modelStrategies.languageModel(model.id),
        messages: convertToModelMessages([
          ...messages.map(toChatMessage),
          message,
        ]),
        system: PROMPTS.SYSTEM,
        stopWhen: stepCountIs(5),
        abortSignal: signal,
        ...(model.tools && {
          tools: toolStrategies(writer),
          activeTools: [
            ...(message.metadata.options.search ? [Tool.WEB_SEARCH] : []),
          ],
          experimental_repairToolCall: repairToolCall,
        }),
        providerOptions,
        experimental_transform: smoothStream({
          chunking: "word",
          delayInMs: 15,
        }),
        onError: (error) => {
          console.error(error);
        },
      });

      void result.consumeStream();

      writer.merge(
        result.toUIMessageStream({
          originalMessages: messages.map(toChatMessage),
          messageMetadata: ({ part }) => {
            if (part.type === "start") {
              return {
                options: message.metadata.options,
              };
            }
          },
          sendReasoning: message.metadata.options.reason,
        }),
      );
    },
    onFinish: async ({ responseMessage }) => {
      await createMessage({
        id: responseMessage.id,
        chatId,
        role: Role.ASSISTANT,
      });

      await createParts(
        responseMessage.parts.map(({ type, ...details }, order) => ({
          type,
          details,
          messageId: responseMessage.id,
          order,
        })),
      );
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
};
