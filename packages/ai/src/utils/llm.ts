import { openai } from "@ai-sdk/openai";
import {
  generateObject,
  NoSuchToolError,
  simulateReadableStream,
  wrapLanguageModel,
} from "ai";
import fs from "fs";
import path from "path";

import { NodeEnv } from "@turbostarter/shared/constants";

import { env } from "../env";

import type {
  LanguageModelV2,
  LanguageModelV2Middleware,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import type { ToolCallRepairFunction, ToolSet } from "ai";

const CACHE_FILE = path.join(process.cwd(), ".cache/ai.json");

export const cached = (model: LanguageModelV2) =>
  env.NODE_ENV === NodeEnv.DEVELOPMENT
    ? wrapLanguageModel({
        middleware: cacheMiddleware,
        model,
      })
    : model;

const ensureCacheFile = () => {
  const cacheDir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  if (!fs.existsSync(CACHE_FILE)) {
    fs.writeFileSync(CACHE_FILE, "{}");
  }
};

const getCachedResult = (key: string | object) => {
  ensureCacheFile();
  const cacheKey = typeof key === "object" ? JSON.stringify(key) : key;
  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, "utf-8");

    const cache = JSON.parse(cacheContent) as Record<string, unknown>;

    const result = cache[cacheKey];

    return result ?? null;
  } catch {
    return null;
  }
};

const updateCache = (key: string, value: unknown) => {
  ensureCacheFile();
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as Record<
    string,
    unknown
  >;
  const updatedCache = { ...cache, [key]: value };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2));
};

const cleanPrompt = (prompt: LanguageModelV2Prompt) => {
  return prompt.map((m) => {
    if (m.role === "assistant") {
      return m.content.map((part) =>
        part.type === "tool-call" ? { ...part, toolCallId: "cached" } : part,
      );
    }
    if (m.role === "tool") {
      return m.content.map((tc) => ({
        ...tc,
        toolCallId: "cached",
        result: {},
      }));
    }

    return m;
  });
};

export const cacheMiddleware: LanguageModelV2Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const cacheKey = JSON.stringify({
      ...cleanPrompt(params.prompt),
      _function: "generate",
    });

    const cached = getCachedResult(cacheKey) as Awaited<
      ReturnType<LanguageModelV2["doGenerate"]>
    > | null;

    if (cached) {
      console.log("🎯 Cache HIT");
      return {
        ...cached,
        response: {
          ...cached.response,
          timestamp: cached.response?.timestamp
            ? new Date(cached.response.timestamp)
            : undefined,
        },
      };
    }

    console.log("🔍 Cache MISS");
    const result = await doGenerate();

    updateCache(cacheKey, result);

    return result;
  },
  wrapStream: async ({ doStream, params }) => {
    const cacheKey = JSON.stringify({
      ...cleanPrompt(params.prompt),
      _function: "stream",
    });

    // Check if the result is in the cache
    const cached = getCachedResult(cacheKey);

    // If cached, return a simulated ReadableStream that yields the cached result
    if (cached) {
      console.log("🎯 Cache HIT");
      // Format the timestamps in the cached response
      const formattedChunks = (cached as LanguageModelV2StreamPart[]).map(
        (p) => {
          if (p.type === "response-metadata" && p.timestamp) {
            return { ...p, timestamp: new Date(p.timestamp) };
          } else return p;
        },
      );
      return {
        stream: simulateReadableStream({
          initialDelayInMs: 0,
          chunkDelayInMs: 10,
          chunks: formattedChunks,
        }),
        rawCall: { rawPrompt: null, rawSettings: {} },
      };
    }

    console.log("🔍 Cache MISS");
    // If not cached, proceed with streaming
    const { stream, ...rest } = await doStream();

    const fullResponse: LanguageModelV2StreamPart[] = [];

    const transformStream = new TransformStream<
      LanguageModelV2StreamPart,
      LanguageModelV2StreamPart
    >({
      transform(chunk, controller) {
        fullResponse.push(chunk);
        controller.enqueue(chunk);
      },
      flush() {
        // Store the full response in the cache after streaming is complete
        updateCache(cacheKey, fullResponse);
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};

export const repairToolCall: ToolCallRepairFunction<ToolSet> = async ({
  toolCall,
  tools,
  inputSchema,
  error,
}) => {
  if (NoSuchToolError.isInstance(error)) {
    return null;
  }

  const tool = tools[toolCall.toolName];

  if (!tool?.inputSchema) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { object: repairedArgs } = await generateObject({
    model: openai.responses("gpt-4o"),
    schema: tool.inputSchema,
    prompt: [
      `The model tried to call the tool "${toolCall.toolName}"` +
        ` with the following arguments:`,
      JSON.stringify(toolCall.input),
      `The tool accepts the following schema:`,
      JSON.stringify(inputSchema(toolCall)),
      "Please fix the arguments.",
      `Today's date is ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    ].join("\n"),
  });

  return { ...toolCall, args: JSON.stringify(repairedArgs) };
};
