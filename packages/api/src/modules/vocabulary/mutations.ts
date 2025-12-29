import { and, eq } from "@turbostarter/db";
import { vocabulary } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type {
  CreateVocabularyInput,
  UpdateVocabularyInput,
  DeleteVocabularyInput,
} from "./schema";

export const createVocabulary = async (input: CreateVocabularyInput) => {
  const result = await db
    .insert(vocabulary)
    .values({
      userId: input.userId,
      name: input.name,
      description: input.description,
      databaseType: input.databaseType,
      connectionName: input.connectionName,
      schemaName: input.schemaName ?? "public",
      schemaInfo: input.schemaInfo as typeof vocabulary.$inferInsert.schemaInfo,
      vocabulary: input.vocabulary as typeof vocabulary.$inferInsert.vocabulary,
      confirmationAnswers: input.confirmationAnswers as typeof vocabulary.$inferInsert.confirmationAnswers,
      entityCount: input.vocabulary?.entities?.length ?? 0,
      metricCount: input.vocabulary?.metrics?.length ?? 0,
      dimensionCount: input.vocabulary?.dimensions?.length ?? 0,
      status: "draft",
    })
    .returning();

  return result[0];
};

export const updateVocabulary = async (input: UpdateVocabularyInput) => {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.vocabulary !== undefined) {
    updateData.vocabulary = input.vocabulary;
    updateData.entityCount = input.vocabulary?.entities?.length ?? 0;
    updateData.metricCount = input.vocabulary?.metrics?.length ?? 0;
    updateData.dimensionCount = input.vocabulary?.dimensions?.length ?? 0;
  }
  if (input.confirmationAnswers !== undefined) {
    updateData.confirmationAnswers = input.confirmationAnswers;
  }

  const result = await db
    .update(vocabulary)
    .set(updateData)
    .where(
      and(eq(vocabulary.id, input.id), eq(vocabulary.userId, input.userId)),
    )
    .returning();

  return result[0];
};

export const deleteVocabulary = async (input: DeleteVocabularyInput) => {
  const result = await db
    .delete(vocabulary)
    .where(
      and(eq(vocabulary.id, input.id), eq(vocabulary.userId, input.userId)),
    )
    .returning();

  return result[0];
};

export const activateVocabulary = async (input: {
  id: string;
  userId: string;
}) => {
  // First, deactivate all other vocabularies for this user
  await db
    .update(vocabulary)
    .set({ status: "archived" })
    .where(
      and(
        eq(vocabulary.userId, input.userId),
        eq(vocabulary.status, "active"),
      ),
    );

  // Then activate this one
  const result = await db
    .update(vocabulary)
    .set({ status: "active" })
    .where(
      and(eq(vocabulary.id, input.id), eq(vocabulary.userId, input.userId)),
    )
    .returning();

  return result[0];
};
