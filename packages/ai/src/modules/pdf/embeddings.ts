import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embed, embedMany } from "ai";

import { desc, gt } from "@turbostarter/db";
import { cosineDistance, sql } from "@turbostarter/db";
import { pdfEmbedding } from "@turbostarter/db/schema/pdf";
import { db } from "@turbostarter/db/server";
import { getSignedUrl } from "@turbostarter/storage/server";

import { modelStrategies } from "./strategies";

import type { Document } from "@langchain/core/documents";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const loadDocument = async (path: string) => {
  const { url } = await getSignedUrl({ path });

  const response = await fetch(url);
  const blob = await response.blob();

  const loader = new PDFLoader(blob);
  return loader.load();
};

export const splitDocument = async (documents: Document[]) => {
  return textSplitter.splitDocuments(documents);
};

export const generateDocumentEmbeddings = async (
  path: string,
): Promise<[string, number[]][]> => {
  const document = await loadDocument(path);
  const chunks = await splitDocument(document);

  const { embeddings, values } = await embedMany({
    model: modelStrategies.textEmbeddingModel("default"),
    values: chunks.map((chunk) => chunk.pageContent),
  });

  return values.map((value, index) => [value, embeddings[index] ?? []]);
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: modelStrategies.textEmbeddingModel("default"),
    value: input,
  });
  return embedding;
};

export const findRelevantContent = async (query: string) => {
  const userQueryEmbedded = await generateEmbedding(query);
  const similarity = sql<number>`1 - (${cosineDistance(
    pdfEmbedding.embedding,
    userQueryEmbedded,
  )})`;

  const similarGuides = await db
    .select({ name: pdfEmbedding.content, similarity })
    .from(pdfEmbedding)
    .where(gt(similarity, 0.3)) // choose an appropriate threshold for your data
    .orderBy((t) => desc(t.similarity))
    .limit(6); // choose the number of matches

  return similarGuides;
};
