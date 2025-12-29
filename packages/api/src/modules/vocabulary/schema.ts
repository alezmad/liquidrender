import { z } from "zod";

// Database types matching the enum
const databaseTypeSchema = z.enum(["postgres", "mysql", "sqlite", "duckdb"]);
const vocabularyStatusSchema = z.enum(["draft", "active", "archived"]);

// Schema info structure
const schemaInfoSchema = z.object({
  database: z.string(),
  type: z.string(),
  schema: z.string(),
  tables: z.number(),
  extractedAt: z.string(),
});

// Vocabulary structure (detected entities, metrics, etc.)
const detectedVocabularySchema = z.object({
  entities: z.array(z.unknown()),
  metrics: z.array(z.unknown()),
  dimensions: z.array(z.unknown()),
  timeFields: z.array(z.unknown()),
  filters: z.array(z.unknown()),
  relationships: z.array(z.unknown()),
});

// Query schemas
export const getVocabularyInputSchema = z.object({
  id: z.string(),
  userId: z.string(),
});

export const getVocabulariesInputSchema = z.object({
  userId: z.string(),
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(10),
  q: z.string().optional(),
  status: z.array(vocabularyStatusSchema).optional(),
  databaseType: z.array(databaseTypeSchema).optional(),
  sortDesc: z.boolean().optional().default(true),
});

// Mutation schemas
export const createVocabularyInputSchema = z.object({
  userId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  databaseType: databaseTypeSchema,
  connectionName: z.string().min(1),
  schemaName: z.string().default("public"),
  schemaInfo: schemaInfoSchema.optional(),
  vocabulary: detectedVocabularySchema.optional(),
  confirmationAnswers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
});

export const updateVocabularyInputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: vocabularyStatusSchema.optional(),
  vocabulary: detectedVocabularySchema.optional(),
  confirmationAnswers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
});

export const deleteVocabularyInputSchema = z.object({
  id: z.string(),
  userId: z.string(),
});

// Extract schema from database connection
export const extractSchemaInputSchema = z.object({
  connectionString: z.string().min(1),
  databaseType: databaseTypeSchema,
  schemaName: z.string().default("public"),
  excludeTables: z.array(z.string()).optional(),
  includeTables: z.array(z.string()).optional(),
});

// Types
export type GetVocabularyInput = z.infer<typeof getVocabularyInputSchema>;
export type GetVocabulariesInput = z.infer<typeof getVocabulariesInputSchema>;
export type CreateVocabularyInput = z.infer<typeof createVocabularyInputSchema>;
export type UpdateVocabularyInput = z.infer<typeof updateVocabularyInputSchema>;
export type DeleteVocabularyInput = z.infer<typeof deleteVocabularyInputSchema>;
export type ExtractSchemaInput = z.infer<typeof extractSchemaInputSchema>;
