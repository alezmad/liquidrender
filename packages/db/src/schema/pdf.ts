import { relations } from "drizzle-orm";
import { index, integer, pgSchema, text, timestamp, vector } from "drizzle-orm/pg-core";

import { generateId } from "@turbostarter/shared/utils";

import { createInsertSchema, createSelectSchema } from "../utils/drizzle-zod";

import { user } from "./auth";

// PDF-specific schema (separate from chat schema)
export const pdfSchema = pgSchema("pdf");

export const pdfMessageRoleEnum = pdfSchema.enum("role", [
  "user",
  "assistant",
  "system",
]);

export const pdfChat = pdfSchema.table("chat", {
  id: text().primaryKey().notNull().$defaultFn(generateId),
  name: text(),
  userId: text()
    .references(() => user.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  createdAt: timestamp().defaultNow(),
});

export const pdfMessage = pdfSchema.table("message", {
  id: text().primaryKey().notNull().$defaultFn(generateId),
  chatId: text()
    .references(() => pdfChat.id, { onDelete: "cascade", onUpdate: "cascade" })
    .notNull(),
  content: text().notNull(),
  role: pdfMessageRoleEnum().notNull(),
  createdAt: timestamp().defaultNow(),
});

export const pdfDocument = pdfSchema.table("document", {
  id: text().primaryKey().notNull().$defaultFn(generateId),
  chatId: text()
    .references(() => pdfChat.id, { onDelete: "cascade", onUpdate: "cascade" })
    .notNull(),
  name: text().notNull(),
  path: text().notNull(),
  createdAt: timestamp().defaultNow(),
});

export const pdfEmbedding = pdfSchema.table(
  "embedding",
  {
    id: text().primaryKey().notNull().$defaultFn(generateId),
    documentId: text()
      .references(() => pdfDocument.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    content: text().notNull(),
    embedding: vector({ dimensions: 1536 }).notNull(),
    // Citation metadata for page navigation
    pageNumber: integer(),
    charStart: integer(),
    charEnd: integer(),
    sectionTitle: text(),
    createdAt: timestamp().defaultNow(),
  },
  (table) => ({
    embeddingIndex: index("pdf_embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  }),
);

export const pdfEmbeddingRelations = relations(pdfEmbedding, ({ one }) => ({
  document: one(pdfDocument, {
    fields: [pdfEmbedding.documentId],
    references: [pdfDocument.id],
  }),
}));

export const selectPdfChatSchema = createSelectSchema(pdfChat);
export const insertPdfChatSchema = createInsertSchema(pdfChat);
export const selectPdfMessageSchema = createSelectSchema(pdfMessage);
export const insertPdfMessageSchema = createInsertSchema(pdfMessage);
export const selectPdfDocumentSchema = createSelectSchema(pdfDocument);
export const insertPdfDocumentSchema = createInsertSchema(pdfDocument);
export const selectPdfEmbeddingSchema = createSelectSchema(pdfEmbedding);
export const insertPdfEmbeddingSchema = createInsertSchema(pdfEmbedding);

export type SelectPdfChat = typeof pdfChat.$inferSelect;
export type InsertPdfChat = typeof pdfChat.$inferInsert;
export type SelectPdfMessage = typeof pdfMessage.$inferSelect;
export type InsertPdfMessage = typeof pdfMessage.$inferInsert;
export type SelectPdfDocument = typeof pdfDocument.$inferSelect;
export type InsertPdfDocument = typeof pdfDocument.$inferInsert;
export type SelectPdfEmbedding = typeof pdfEmbedding.$inferSelect;
export type InsertPdfEmbedding = typeof pdfEmbedding.$inferInsert;
