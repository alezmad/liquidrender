import { Hono } from "hono";

import { enforceAuth } from "../../middleware";

import {
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
  activateVocabulary,
} from "./mutations";
import { getVocabulary, getVocabularies, getVocabulariesCount } from "./queries";
import {
  createVocabularyInputSchema,
  updateVocabularyInputSchema,
  getVocabulariesInputSchema,
  extractSchemaInputSchema,
} from "./schema";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const vocabularyRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)
  // Get all vocabularies for current user
  .get("/", async (c) => {
    const user = c.get("user");
    const query = c.req.query();

    const input = getVocabulariesInputSchema.parse({
      userId: user.id,
      page: query.page ? parseInt(query.page) : 1,
      perPage: query.perPage ? parseInt(query.perPage) : 10,
      q: query.q,
      status: query.status ? query.status.split(",") : undefined,
      databaseType: query.databaseType
        ? query.databaseType.split(",")
        : undefined,
      sortDesc: query.sortDesc !== "false",
    });

    return c.json(await getVocabularies(input));
  })
  // Get vocabulary count
  .get("/count", async (c) => {
    const user = c.get("user");
    return c.json({ count: await getVocabulariesCount(user.id) });
  })
  // Get single vocabulary
  .get("/:id", async (c) => {
    const user = c.get("user");
    const vocab = await getVocabulary({
      id: c.req.param("id"),
      userId: user.id,
    });

    if (!vocab) {
      return c.json({ error: "Vocabulary not found" }, 404);
    }

    return c.json(vocab);
  })
  // Create vocabulary
  .post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const input = createVocabularyInputSchema.parse({
      ...body,
      userId: user.id,
    });

    const vocab = await createVocabulary(input);
    return c.json(vocab, 201);
  })
  // Update vocabulary
  .patch("/:id", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const input = updateVocabularyInputSchema.parse({
      ...body,
      id: c.req.param("id"),
      userId: user.id,
    });

    const vocab = await updateVocabulary(input);
    if (!vocab) {
      return c.json({ error: "Vocabulary not found" }, 404);
    }

    return c.json(vocab);
  })
  // Activate vocabulary (sets as active, archives others)
  .post("/:id/activate", async (c) => {
    const user = c.get("user");

    const vocab = await activateVocabulary({
      id: c.req.param("id"),
      userId: user.id,
    });

    if (!vocab) {
      return c.json({ error: "Vocabulary not found" }, 404);
    }

    return c.json(vocab);
  })
  // Delete vocabulary
  .delete("/:id", async (c) => {
    const user = c.get("user");

    const vocab = await deleteVocabulary({
      id: c.req.param("id"),
      userId: user.id,
    });

    if (!vocab) {
      return c.json({ error: "Vocabulary not found" }, 404);
    }

    return c.json({ success: true });
  })
  // Extract schema from database connection (uses UVB)
  .post("/extract", async (c) => {
    const body = await c.req.json();

    const input = extractSchemaInputSchema.parse(body);

    // Dynamic import to avoid bundling issues
    const { createPostgresAdapter, extractSchema, applyHardRules } =
      await import("@repo/liquid-connect/uvb");

    if (input.databaseType !== "postgres") {
      return c.json(
        { error: "Only PostgreSQL is currently supported" },
        400,
      );
    }

    try {
      const adapter = createPostgresAdapter(input.connectionString);
      const schema = await extractSchema(adapter, {
        schema: input.schemaName,
        excludeTables: input.excludeTables,
        includeTables: input.includeTables,
      });

      const { detected, confirmations, stats } = applyHardRules(schema);

      return c.json({
        schemaInfo: {
          database: schema.database,
          type: schema.type,
          schema: schema.schema,
          tables: schema.tables.length,
          extractedAt: schema.extractedAt,
        },
        detected,
        confirmations,
        stats,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to extract schema";
      return c.json({ error: message }, 500);
    }
  });
