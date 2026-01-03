import { generateId } from "@turbostarter/shared/utils";
import { db } from "@turbostarter/db/server";
import { knosiaConnection, knosiaAnalysis } from "@turbostarter/db/schema";
import { eq } from "drizzle-orm";

// Dynamic import to avoid Turbopack issues with native modules
const getUVB = async () => {
  const {
    DuckDBUniversalAdapter,
    extractSchema: extractSchemaFn,
    applyHardRules: applyHardRulesFn,
  } = await import("@repo/liquid-connect/uvb");
  return { DuckDBUniversalAdapter, extractSchema: extractSchemaFn, applyHardRules: applyHardRulesFn };
};

// LiquidConnect imports
import {
  detectBusinessType,
  mapToTemplate,
  getTemplate,
  type BusinessType,
  type MappingResult,
  type DetectionResult,
} from "@repo/liquid-connect/business-types";
import {
  generateSemanticLayer,
  type ResolvedVocabulary,
  type SemanticLayer,
} from "@repo/liquid-connect/semantic";
import { generateDashboardSpec, type DashboardSpec } from "@repo/liquid-connect/dashboard";
import { dashboardSpecToLiquidSchema } from "@repo/liquid-render/dashboard";
import type {
  ExtractedSchema,
  DetectedVocabulary,
} from "@repo/liquid-connect/uvb";
import type { LiquidSchema } from "@repo/liquid-render";

// Knosia imports
import { saveDetectedVocabulary } from "../vocabulary/from-detected";
import { resolveVocabulary } from "../vocabulary/resolution";

interface PipelineOptions {
  skipSaveVocabulary?: boolean;
  skipDashboardGeneration?: boolean;
  forceBusinessType?: BusinessType;
  debug?: boolean;
}

interface PipelineResult {
  success: boolean;
  analysisId: string;
  businessType: BusinessType | null;
  businessTypeConfidence: number;
  vocabularyStats: { metrics: number; dimensions: number; entities: number };
  dashboardSpec: DashboardSpec | null;
  liquidSchema: LiquidSchema | null;
  warnings: string[];
  errors: string[];
  debug?: {
    extractedSchema: ExtractedSchema;
    detectedVocabulary: DetectedVocabulary;
    resolvedVocabulary: ResolvedVocabulary;
    semanticLayer: SemanticLayer;
    mappingResult: MappingResult;
  };
}

export async function runKnosiaPipeline(
  connectionId: string,
  userId: string,
  workspaceId: string,
  options?: PipelineOptions,
): Promise<PipelineResult> {
  const analysisId = generateId();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Step 1: Get connection details
    const [connection] = await db
      .select()
      .from(knosiaConnection)
      .where(eq(knosiaConnection.id, connectionId))
      .limit(1);

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Step 2: Parse credentials and build connection string
    let credentials: { username?: string; password?: string };
    try {
      credentials = JSON.parse(connection.credentials ?? "{}") as {
        username?: string;
        password?: string;
      };
    } catch {
      credentials = {};
    }

    let connectionString: string;
    switch (connection.type) {
      case "postgres": {
        const port = connection.port ?? 5432;
        const auth =
          credentials.username && credentials.password
            ? `${credentials.username}:${credentials.password}@`
            : "";
        connectionString = `postgresql://${auth}${connection.host}:${port}/${connection.database}`;
        break;
      }

      case "mysql": {
        const port = connection.port ?? 3306;
        const auth =
          credentials.username && credentials.password
            ? `${credentials.username}:${credentials.password}@`
            : "";
        connectionString = `mysql://${auth}${connection.host}:${port}/${connection.database}`;
        break;
      }

      case "duckdb": {
        connectionString = connection.database; // database field contains file path
        break;
      }

      default:
        throw new Error(
          `Connection type '${connection.type}' is not supported`,
        );
    }

    // Step 3: Get UVB modules dynamically
    const { DuckDBUniversalAdapter, extractSchema, applyHardRules } =
      await getUVB();

    // Step 4: Create database adapter
    const duckdbAdapter = new DuckDBUniversalAdapter();
    await duckdbAdapter.connect(connectionString);

    // Step 5: Extract schema
    // Note: We pass duckdbAdapter directly - TypeScript will complain about the
    // connect() signature mismatch, but it works at runtime since we've already called connect()
    const extractedSchema = await extractSchema(
      duckdbAdapter as any,
      {
        schema: connection.schema || "public",
      },
    );

    // Step 6: Apply hard rules → DetectedVocabulary
    const rulesResult = await applyHardRules(extractedSchema);
    const detectedVocabulary: DetectedVocabulary = {
      entities: rulesResult.detected.entities,
      metrics: rulesResult.detected.metrics,
      dimensions: rulesResult.detected.dimensions,
      timeFields: rulesResult.detected.timeFields,
      filters: rulesResult.detected.filters,
      relationships: rulesResult.detected.relationships,
    };

    // Step 7: Detect business type
    const detection: DetectionResult = options?.forceBusinessType
      ? {
          primary: {
            type: options.forceBusinessType,
            confidence: 100,
            signals: [],
            templateId: options.forceBusinessType.toLowerCase(),
          },
          matches: [],
          ambiguous: false,
        }
      : detectBusinessType(extractedSchema);

    if (!detection.primary) {
      warnings.push("No business type detected with sufficient confidence");
    }

    // Step 8: Save vocabulary to DB
    if (!options?.skipSaveVocabulary) {
      await saveDetectedVocabulary(
        detectedVocabulary,
        connection.orgId,
        workspaceId,
      );
    }

    // Step 9: Resolve vocabulary
    const resolvedVocabulary = await resolveVocabulary(userId, workspaceId);

    // Step 10: Generate semantic layer
    const semanticLayer = generateSemanticLayer(
      resolvedVocabulary,
      extractedSchema,
    );

    // Step 11: Map to template & generate dashboard spec
    let dashboardSpec: DashboardSpec | null = null;
    let liquidSchema: LiquidSchema | null = null;
    let mappingResult: MappingResult | null = null;

    if (!options?.skipDashboardGeneration && detection.primary) {
      const template = getTemplate(detection.primary.type);
      mappingResult = mapToTemplate(detectedVocabulary, template);

      if (mappingResult.coverage < 50) {
        warnings.push(`Low KPI coverage: ${mappingResult.coverage}%`);
      }

      dashboardSpec = generateDashboardSpec(mappingResult);
      liquidSchema = dashboardSpecToLiquidSchema(dashboardSpec);
    }

    // Step 12: Store analysis results
    await db.insert(knosiaAnalysis).values({
      connectionId,
      workspaceId,
      status: "completed",
      businessType: detection.primary
        ? {
            detected: detection.primary.type,
            confidence: detection.primary.confidence,
          }
        : null,
      completedAt: new Date(),
    });

    return {
      success: true,
      analysisId,
      businessType: detection.primary?.type || null,
      businessTypeConfidence: detection.primary?.confidence || 0,
      vocabularyStats: {
        metrics: detectedVocabulary.metrics.length,
        dimensions: detectedVocabulary.dimensions.length,
        entities: detectedVocabulary.entities.length,
      },
      dashboardSpec,
      liquidSchema,
      warnings,
      errors,
      debug: options?.debug
        ? {
            extractedSchema,
            detectedVocabulary,
            resolvedVocabulary,
            semanticLayer,
            mappingResult: mappingResult!,
          }
        : undefined,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));

    // Store failed analysis
    try {
      await db.insert(knosiaAnalysis).values({
        connectionId,
        workspaceId,
        status: "failed",
        error: {
          code: "PIPELINE_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
        completedAt: new Date(),
      });
    } catch {
      // Ignore errors when storing failed analysis
    }

    return {
      success: false,
      analysisId,
      businessType: null,
      businessTypeConfidence: 0,
      vocabularyStats: { metrics: 0, dimensions: 0, entities: 0 },
      dashboardSpec: null,
      liquidSchema: null,
      warnings,
      errors,
    };
  }
}
