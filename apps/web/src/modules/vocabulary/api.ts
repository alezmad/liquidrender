/**
 * Vocabulary API client
 */

import type {
  ConnectionData,
  ExtractionResult,
  DetectedVocabulary,
  ConfirmationAnswers,
  SchemaInfo,
} from "./types";

const API_BASE = "/api/vocabulary";

interface VocabularyResponse {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "archived";
  databaseType: string;
  connectionName: string;
  schemaName: string;
  schemaInfo?: SchemaInfo;
  vocabulary?: DetectedVocabulary;
  confirmationAnswers?: ConfirmationAnswers;
  entityCount: number;
  metricCount: number;
  dimensionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  data: VocabularyResponse[];
  total: number;
}

interface ErrorResponse {
  error?: string;
}

export async function extractSchema(
  connection: ConnectionData
): Promise<ExtractionResult> {
  const response = await fetch(`${API_BASE}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connectionString: connection.connectionString,
      databaseType: connection.databaseType,
      schemaName: connection.schemaName,
    }),
  });

  if (!response.ok) {
    const data = (await response.json()) as ErrorResponse;
    throw new Error(data.error ?? "Failed to extract schema");
  }

  return (await response.json()) as ExtractionResult;
}

export async function createVocabulary(data: {
  name: string;
  description?: string;
  databaseType: string;
  connectionName: string;
  schemaName: string;
  schemaInfo?: SchemaInfo;
  vocabulary?: DetectedVocabulary;
  confirmationAnswers?: ConfirmationAnswers;
}): Promise<VocabularyResponse> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const responseData = (await response.json()) as ErrorResponse;
    throw new Error(responseData.error ?? "Failed to create vocabulary");
  }

  return (await response.json()) as VocabularyResponse;
}

export async function getVocabulary(id: string): Promise<VocabularyResponse> {
  const response = await fetch(`${API_BASE}/${id}`);

  if (!response.ok) {
    const data = (await response.json()) as ErrorResponse;
    throw new Error(data.error ?? "Failed to fetch vocabulary");
  }

  return (await response.json()) as VocabularyResponse;
}

export async function listVocabularies(params?: {
  page?: number;
  perPage?: number;
  q?: string;
  status?: string[];
}): Promise<ListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.perPage) searchParams.set("perPage", String(params.perPage));
  if (params?.q) searchParams.set("q", params.q);
  if (params?.status) searchParams.set("status", params.status.join(","));

  const response = await fetch(`${API_BASE}?${searchParams}`);

  if (!response.ok) {
    const data = (await response.json()) as ErrorResponse;
    throw new Error(data.error ?? "Failed to list vocabularies");
  }

  return (await response.json()) as ListResponse;
}

export async function updateVocabulary(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    status: "draft" | "active" | "archived";
    vocabulary: DetectedVocabulary;
    confirmationAnswers: ConfirmationAnswers;
  }>
): Promise<VocabularyResponse> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const responseData = (await response.json()) as ErrorResponse;
    throw new Error(responseData.error ?? "Failed to update vocabulary");
  }

  return (await response.json()) as VocabularyResponse;
}

export async function activateVocabulary(
  id: string
): Promise<VocabularyResponse> {
  const response = await fetch(`${API_BASE}/${id}/activate`, {
    method: "POST",
  });

  if (!response.ok) {
    const data = (await response.json()) as ErrorResponse;
    throw new Error(data.error ?? "Failed to activate vocabulary");
  }

  return (await response.json()) as VocabularyResponse;
}

export async function deleteVocabulary(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = (await response.json()) as ErrorResponse;
    throw new Error(data.error ?? "Failed to delete vocabulary");
  }
}
