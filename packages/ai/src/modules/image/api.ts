import { generateId, experimental_generateImage as generateImage } from "ai";

import { and, desc, eq, inArray, lt } from "@turbostarter/db";
import { generation, image } from "@turbostarter/db/schema/image";
import { db } from "@turbostarter/db/server";
import { HttpStatusCode } from "@turbostarter/shared/constants";
import { HttpException } from "@turbostarter/shared/utils";
import { getPublicUrl, getUploadUrl } from "@turbostarter/storage/server";

import { MODELS } from "./constants";
import { modelStrategies } from "./strategies";

import type {
  InsertGeneration,
  InsertImage,
} from "@turbostarter/db/schema/image";

export const createGeneration = async (data: InsertGeneration) =>
  db.insert(generation).values(data).returning();

export const getGeneration = async (id: string) =>
  db.query["image.generation"].findFirst({
    where: eq(generation.id, id),
  });

export const getGenerationWithImages = async (id: string) =>
  db.query["image.generation"].findFirst({
    where: eq(generation.id, id),
    with: {
      image: true,
    },
  });

export const updateGeneration = async (
  id: string,
  data: Partial<InsertGeneration>,
) => db.update(generation).set(data).where(eq(generation.id, id));

export const getGenerationImages = async (id: string) =>
  db.query["image.image"].findMany({
    where: eq(image.generationId, id),
  });

export const deleteGenerationImages = async (id: string) =>
  db.delete(image).where(eq(image.generationId, id));

export const createImages = async (data: InsertImage[]) =>
  db.insert(image).values(data).returning();

export const getImages = async ({
  userId,
  limit = 10,
  cursor,
}: {
  userId: string;
  limit?: number;
  cursor?: Date;
}) => {
  return db.query["image.image"].findMany({
    orderBy: (t) => desc(t.createdAt),
    with: {
      generation: true,
    },
    limit,
    where: and(
      inArray(
        image.generationId,
        db
          .select({ id: generation.id })
          .from(generation)
          .innerJoin(image, eq(generation.id, image.generationId))
          .where(eq(generation.userId, userId)),
      ),
      ...(cursor ? [lt(image.createdAt, cursor)] : []),
    ),
  });
};

const resetGeneration = async (id: string) => {
  await deleteGenerationImages(id);
  await updateGeneration(id, {
    createdAt: new Date(),
    completedAt: null,
  });
};

const saveImages = async ({
  images,
  generationId,
}: {
  images: string[];
  generationId: string;
}) => {
  const results = await Promise.allSettled(
    images.map(async (image) => {
      const path = `images/${generateId()}.png`;
      const { url: uploadUrl } = await getUploadUrl({
        path,
      });

      await fetch(uploadUrl, {
        method: "PUT",
        body: Buffer.from(image, "base64"),
      });

      const { url } = await getPublicUrl({
        path,
      });

      return url;
    }),
  );

  await createImages(
    results
      .filter((result) => result.status === "fulfilled")
      .map((result) => ({
        url: result.value,
        generationId,
      })),
  );
};

export const generateImages = async ({
  id,
  abortSignal,
}: {
  id: string;
  abortSignal?: AbortSignal;
}) => {
  const generation = await getGenerationWithImages(id);
  const model = MODELS.find((m) => m.id === generation?.model);
  const dimension = model?.dimensions.find(
    (d) => d.id === generation?.aspectRatio,
  );

  if (!generation || !model || !dimension) {
    throw new HttpException(HttpStatusCode.NOT_FOUND);
  }

  if (generation.image.length) {
    await resetGeneration(generation.id);
  }

  if (abortSignal) {
    abortSignal.onabort = async () => {
      await updateGeneration(generation.id, {
        completedAt: new Date(),
      });
    };
  }

  const { images, warnings } = await generateImage({
    model: modelStrategies.imageModel(generation.model),
    prompt: generation.prompt,
    ...(model.dimensionFormat === "size"
      ? { size: dimension.value as `${number}x${number}` }
      : { aspectRatio: dimension.value as `${number}:${number}` }),
    ...(model.provider !== "openai" && {
      seed: Math.floor(Math.random() * 1000000),
    }),
    n: generation.count,
    abortSignal,
  });

  if (warnings.length) {
    console.warn(warnings);
  }

  void saveImages({
    images: images.map((image) => image.base64),
    generationId: generation.id,
  });

  await updateGeneration(generation.id, {
    completedAt: new Date(),
  });

  return images.map(
    (image) => (image as unknown as { base64Data: string }).base64Data,
  );
};
