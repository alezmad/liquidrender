import { tavily } from "@tavily/core";
import { tool } from "ai";
import * as z from "zod";

import { env } from "../../../env";

import type { TavilyClient } from "@tavily/core";
import type { InferUITool, UIMessageStreamWriter } from "ai";

// Lazy initialization to avoid throwing at module load time
let _client: TavilyClient | null = null;
const getClient = () => {
  if (!_client) {
    if (!env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is required for web search");
    }
    _client = tavily({ apiKey: env.TAVILY_API_KEY });
  }
  return _client;
};

const sanitizeUrl = (url: string): string => url.replace(/\s+/g, "%20");

const isValidImageUrl = async (url: string) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return (
      response.ok &&
      (response.headers.get("content-type")?.startsWith("image/") ?? false)
    );
  } catch {
    return false;
  }
};

const extractDomain = (url: string): string => {
  const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
  return urlPattern.exec(url)?.[1] ?? url;
};

const processDomains = (domains?: string[]): string[] | undefined => {
  if (!domains || domains.length === 0) return undefined;

  const processedDomains = domains.map((domain) => extractDomain(domain));
  return processedDomains.every((domain) => domain.trim() === "")
    ? undefined
    : processedDomains;
};

const deduplicateByDomainAndUrl = <T extends { url: string }>(
  items: T[],
): T[] => {
  const seenDomains = new Set<string>();
  const seenUrls = new Set<string>();

  return items.filter((item) => {
    const domain = extractDomain(item.url);
    const isNewUrl = !seenUrls.has(item.url);
    const isNewDomain = !seenDomains.has(domain);

    if (isNewUrl && isNewDomain) {
      seenUrls.add(item.url);
      seenDomains.add(domain);
      return true;
    }
    return false;
  });
};

export const webSearch = (writer: UIMessageStreamWriter) =>
  tool({
    description:
      "Search the web for information with multiple queries, max results and time range.",
    inputSchema: z.object({
      queries: z
        .array(
          z.object({
            q: z
              .string()
              .describe(
                "Search query to look up on the web. At least 5 characters length.",
              ),
            topic: z
              .enum(["general", "news"])
              .describe("Topic type to search for."),
            maxResults: z
              .number()
              .describe(
                "Maximum number of results to return. Up to 10, 3 by default.",
              ),
          }),
        )
        .describe(
          "Array of search queries to look up on the web. At least 2 items, at most 5.",
        ),
      excludeDomains: z
        .array(z.string())
        .describe(
          "A list of domains to exclude from all search results. Default is [] (empty array).",
        ),
      timeRange: z
        .enum(["year", "month", "week", "day", "y", "m", "w", "d"])
        .describe(
          "The time range to search for. Defaults to undefined - all time.",
        ),
    }),
    execute: async ({ queries, excludeDomains, timeRange }) => {
      try {
        const searchPromises = queries.map(async (query, index) => {
          try {
            writer.write({
              type: "data-query_completion",
              data: {
                query,
                index,
                total: queries.length,
                status: "started",
                resultsCount: 0,
                imagesCount: 0,
              },
            });

            const data = await getClient().search(query.q, {
              topic: query.topic,
              days: query.topic === "news" ? 7 : undefined,
              maxResults: query.maxResults,
              searchDepth: "basic",
              includeAnswer: true,
              includeImages: true,
              includeImageDescriptions: true,
              excludeDomains: processDomains(excludeDomains),
              timeRange,
            });

            writer.write({
              type: "data-query_completion",
              data: {
                query,
                index,
                total: queries.length,
                status: "completed",
                resultsCount: data.results.length,
                imagesCount: data.images.length,
              },
            });

            const results = deduplicateByDomainAndUrl(data.results).map(
              (result) => ({
                url: result.url,
                title: result.title,
                content: result.content,
                rawContent: result.rawContent,
                publishedDate:
                  query.topic === "news" ? result.publishedDate : undefined,
              }),
            );

            const images = await Promise.all(
              deduplicateByDomainAndUrl(data.images).map(
                async ({ url, description }) => {
                  const sanitizedUrl = sanitizeUrl(url);
                  return (await isValidImageUrl(sanitizedUrl))
                    ? { url: sanitizedUrl, description: description ?? "" }
                    : null;
                },
              ),
            );

            return {
              query,
              results,
              images: images.filter(
                (img): img is { url: string; description: string } =>
                  img !== null && img.description !== "",
              ),
            };
          } catch (error) {
            console.error(error);

            writer.write({
              type: "data-query_completion",
              data: {
                query,
                index,
                total: queries.length,
                status: "error",
                resultsCount: 0,
                imagesCount: 0,
              },
            });

            return {
              query,
              results: [],
              images: [],
            };
          }
        });

        return {
          searches: await Promise.all(searchPromises),
        };
      } catch (error) {
        console.error(error);
        return {
          searches: [],
        };
      }
    },
  });

export type WebSearchTool = InferUITool<ReturnType<typeof webSearch>>;
export interface DataQueryCompletionPart {
  query: {
    q: string;
    topic: string;
    maxResults: number;
  };
  index: number;
  total: number;
  status: "started" | "completed" | "error";
  resultsCount: number;
  imagesCount: number;
}
