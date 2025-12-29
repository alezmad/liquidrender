import { and, asc, count, desc, eq, ilike, inArray } from "@turbostarter/db";
import { vocabulary } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type { GetVocabulariesInput, GetVocabularyInput } from "./schema";

export const getVocabulariesCount = async (userId: string) =>
  db
    .select({ count: count() })
    .from(vocabulary)
    .where(eq(vocabulary.userId, userId))
    .then((res) => res[0]?.count ?? 0);

export const getVocabulary = async (input: GetVocabularyInput) => {
  const result = await db
    .select()
    .from(vocabulary)
    .where(
      and(eq(vocabulary.id, input.id), eq(vocabulary.userId, input.userId)),
    )
    .limit(1);

  return result[0] ?? null;
};

export const getVocabularies = async (input: GetVocabulariesInput) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    eq(vocabulary.userId, input.userId),
    input.q ? ilike(vocabulary.name, `%${input.q}%`) : undefined,
    input.status ? inArray(vocabulary.status, input.status) : undefined,
    input.databaseType
      ? inArray(vocabulary.databaseType, input.databaseType)
      : undefined,
  );

  const orderBy = input.sortDesc
    ? [desc(vocabulary.createdAt)]
    : [asc(vocabulary.createdAt)];

  return db.transaction(async (tx) => {
    const data = await tx
      .select()
      .from(vocabulary)
      .where(where)
      .limit(input.perPage)
      .offset(offset)
      .orderBy(...orderBy);

    const total = await tx
      .select({ count: count() })
      .from(vocabulary)
      .where(where)
      .execute()
      .then((res) => res[0]?.count ?? 0);

    return {
      data,
      total,
    };
  });
};
