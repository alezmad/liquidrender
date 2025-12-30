import { Hono } from "hono";
import * as z from "zod";

import { Credits } from "@turbostarter/ai/credits/utils";
import {
  createChat,
  deleteChat,
  getChat,
  getChatDocuments,
  getChatMessages,
  getUserChats,
  streamChat,
} from "@turbostarter/ai/pdf/api";
import { pdfMessageSchema } from "@turbostarter/ai/pdf/schema";
import {
  insertPdfChatSchema,
  insertPdfDocumentSchema,
} from "@turbostarter/db/schema/pdf";

import { deductCredits, enforceAuth, rateLimiter, validate } from "../../middleware";

import type { User } from "@turbostarter/auth";
import type { PdfMessageInput } from "@turbostarter/ai/pdf/schema";

const createChatSchema = z.object({
  ...insertPdfChatSchema.omit({ userId: true }).shape,
  ...insertPdfDocumentSchema.omit({ chatId: true }).shape,
});

type CreateChatInput = z.infer<typeof createChatSchema>;

const chatsRouter = new Hono<{
  Variables: {
    user: User;
  };
}>()
  .post(
    "/",
    enforceAuth,
    rateLimiter,
    validate("json", createChatSchema),
    async (c) => {
      const input = c.req.valid("json") as CreateChatInput;

      // Deduct credits
      await deductCredits(Credits.COST.DEFAULT)(c, async () => {});

      return c.json(
        await createChat({
          ...input,
          userId: c.var.user.id,
        }),
      );
    },
  )
  .get("/", enforceAuth, async (c) => c.json(await getUserChats(c.var.user.id)))
  .get("/:id", enforceAuth, async (c) =>
    c.json((await getChat(c.req.param("id"))) ?? null),
  )
  .delete("/:id", enforceAuth, async (c) =>
    c.json(await deleteChat(c.req.param("id"))),
  )
  .post(
    "/:id/messages",
    enforceAuth,
    rateLimiter,
    validate("json", pdfMessageSchema),
    async (c) => {
      const input = c.req.valid("json") as PdfMessageInput;

      // Deduct credits
      await deductCredits(Credits.COST.DEFAULT)(c, async () => {});

      return streamChat({
        ...input,
        signal: c.req.raw.signal,
        chatId: c.req.param("id"),
      });
    },
  )
  .get("/:id/messages", enforceAuth, async (c) =>
    c.json(await getChatMessages(c.req.param("id"))),
  )
  .get("/:id/documents", enforceAuth, async (c) =>
    c.json(await getChatDocuments(c.req.param("id"))),
  );

export const pdfRouter = new Hono().route("/chats", chatsRouter);
