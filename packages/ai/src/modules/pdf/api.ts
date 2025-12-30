import {
  convertToModelMessages,
  generateId,
  smoothStream,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import * as z from "zod";

import { eq } from "@turbostarter/db";
import {
  pdfChat,
  pdfDocument,
  pdfEmbedding,
  pdfMessage,
} from "@turbostarter/db/schema/pdf";
import { db } from "@turbostarter/db/server";
import { getDeleteUrl } from "@turbostarter/storage/server";

import { repairToolCall } from "../../utils/llm";

import { PROMPTS } from "./constants";
import { findRelevantContent, generateDocumentEmbeddings } from "./embeddings";
import { modelStrategies } from "./strategies";
import { Role } from "./types";

import type { PdfMessagePayload } from "./schema";
import type {
  InsertPdfChat,
  InsertPdfDocument,
  InsertPdfMessage,
} from "@turbostarter/db/schema/pdf";

const createDocument = async (data: InsertPdfDocument) => {
  const [documentData] = await db.insert(pdfDocument).values(data).returning();

  if (!documentData) {
    return null;
  }

  void (async () => {
    const generated = await generateDocumentEmbeddings(documentData.path);

    if (!generated.length) {
      return;
    }

    await db
      .insert(pdfEmbedding)
      .values(
        generated.map(([value, embedding]) => ({
          content: value,
          documentId: documentData.id,
          embedding,
        })),
      )
      .onConflictDoNothing();
  })();

  return documentData;
};

const deleteDocument = async (path: string) => {
  const { url } = await getDeleteUrl({ path });

  await fetch(url, {
    method: "DELETE",
  });
};

export const createChat = async (
  data: InsertPdfChat & Omit<InsertPdfDocument, "chatId">,
) => {
  const [chatData] = await db
    .insert(pdfChat)
    .values(data)
    .returning()
    .onConflictDoUpdate({
      target: pdfChat.id,
      set: data,
    });

  if (!chatData) {
    return null;
  }

  await createDocument({
    ...data,
    chatId: chatData.id,
  });

  return chatData;
};

export const createMessage = async (data: InsertPdfMessage) =>
  db.insert(pdfMessage).values(data).onConflictDoUpdate({
    target: pdfMessage.id,
    set: data,
  });

export const createMessages = async (data: InsertPdfMessage[]) =>
  db.insert(pdfMessage).values(data).onConflictDoNothing();

export const getChat = async (id: string) =>
  db.query["pdf.pdfChat"].findFirst({
    where: eq(pdfChat.id, id),
  });

export const deleteChat = async (id: string) => {
  const documents = await getChatDocuments(id);
  const [deleted] = await db.delete(pdfChat).where(eq(pdfChat.id, id)).returning();

  if (!deleted) {
    return;
  }

  void Promise.allSettled(
    documents.map((document) => deleteDocument(document.path)),
  );

  return deleted;
};

export const getUserChats = async (userId: string) =>
  db.query["pdf.pdfChat"].findMany({
    where: eq(pdfChat.userId, userId),
    orderBy: (chat, { desc }) => [desc(chat.createdAt)],
  });

export const getChatMessages = async (id: string) => {
  return db.query["pdf.pdfMessage"].findMany({
    where: eq(pdfMessage.chatId, id),
    orderBy: (message, { asc }) => [asc(message.createdAt)],
  });
};

export const getChatDocuments = async (id: string) =>
  db.query["pdf.pdfDocument"].findMany({
    where: eq(pdfDocument.chatId, id),
    orderBy: (document, { asc }) => [asc(document.createdAt)],
  });

export const tools = {
  findRelevantContent: tool({
    description: `Get information from the PDF document to answer questions.`,
    inputSchema: z.object({
      query: z
        .string()
        .describe("The user's query to find relevant information for."),
    }),
    execute: async ({ query }) => findRelevantContent(query),
  }),
};

export const streamChat = async ({
  chatId,
  signal,
  ...message
}: PdfMessagePayload & { signal: AbortSignal; chatId: string }) => {
  await createMessage({ ...message, chatId });

  const messages = await getChatMessages(chatId);

  const result = streamText({
    model: modelStrategies.languageModel("default"),
    messages: convertToModelMessages([
      ...messages.map((m) => ({
        ...m,
        parts: [
          {
            type: "text" as const,
            text: m.content,
          },
        ],
      })),
      {
        ...message,
        parts: [
          {
            type: "text" as const,
            text: message.content,
          },
        ],
      },
    ]),
    system: PROMPTS.SYSTEM,
    stopWhen: stepCountIs(3),
    abortSignal: signal,
    tools,
    experimental_transform: smoothStream({
      chunking: "word",
      delayInMs: 15,
    }),
    experimental_repairToolCall: repairToolCall,
    onError: (error) => {
      console.error(error);
    },
  });

  void result.consumeStream();

  return result.toUIMessageStreamResponse({
    onFinish: async ({ responseMessage }) => {
      await createMessage({
        id: responseMessage.id || generateId(),
        chatId,
        content: responseMessage.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n"),
        role: Role.ASSISTANT,
      });
    },
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
};
