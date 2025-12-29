import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

import { generateId } from "@turbostarter/shared/utils";

import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "../lib/zod";

import { user } from "./auth";

import type * as z from "zod";

export const vocabularyStatusEnum = pgEnum("vocabulary_status", [
  "draft",
  "active",
  "archived",
]);

export const databaseTypeEnum = pgEnum("database_type", [
  "postgres",
  "mysql",
  "sqlite",
  "duckdb",
]);

export const vocabulary = pgTable("vocabulary", {
  id: text().primaryKey().$defaultFn(generateId),
  userId: text()
    .references(() => user.id, {
      onDelete: "cascade",
    })
    .notNull(),
  name: text().notNull(),
  description: text(),
  status: vocabularyStatusEnum().notNull().default("draft"),

  // Database connection info (encrypted in production)
  databaseType: databaseTypeEnum().notNull(),
  connectionName: text().notNull(),
  schemaName: text().notNull().default("public"),

  // Schema info snapshot
  schemaInfo: jsonb().$type<{
    database: string;
    type: string;
    schema: string;
    tables: number;
    extractedAt: string;
  }>(),

  // The actual vocabulary (entities, metrics, dimensions, etc.)
  vocabulary: jsonb().$type<{
    entities: unknown[];
    metrics: unknown[];
    dimensions: unknown[];
    timeFields: unknown[];
    filters: unknown[];
    relationships: unknown[];
  }>(),

  // User's confirmation answers
  confirmationAnswers: jsonb().$type<Record<string, string | string[]>>(),

  // Statistics
  entityCount: integer().notNull().default(0),
  metricCount: integer().notNull().default(0),
  dimensionCount: integer().notNull().default(0),

  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertVocabularySchema = createInsertSchema(vocabulary);
export const selectVocabularySchema = createSelectSchema(vocabulary);
export const updateVocabularySchema = createUpdateSchema(vocabulary);

export type InsertVocabulary = z.infer<typeof insertVocabularySchema>;
export type SelectVocabulary = z.infer<typeof selectVocabularySchema>;
export type UpdateVocabulary = z.infer<typeof updateVocabularySchema>;
