// AI Pipeline - End-to-end natural language to UI generation
// ============================================================================

import type { LiquidSchema } from '../compiler/ui-emitter';
import type { SchemaCatalog } from './catalog';
import type { DataContext, ResolveResult } from './resolver';
import { generateSystemPrompt, type PromptGeneratorOptions } from './prompt-generator';
import { StreamingParser } from '../compiler/streaming-parser';

// ============================================================================
// Types
// ============================================================================

/**
 * AI provider configuration
 */
export interface AIProviderConfig {
  /** Provider type */
  provider: 'anthropic' | 'openai' | 'custom';
  /** API key */
  apiKey: string;
  /** Model to use */
  model?: string;
  /** Base URL override */
  baseUrl?: string;
  /** Max tokens for response */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
}

/**
 * Pipeline generation options
 */
export interface GenerateOptions {
  /** User's natural language query */
  query: string;
  /** Additional context to include */
  context?: string;
  /** Override system prompt */
  systemPrompt?: string;
  /** Prompt generation options */
  promptOptions?: PromptGeneratorOptions;
  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Generation state
 */
export type GenerationState =
  | 'idle'
  | 'generating'    // AI is generating DSL
  | 'resolving'     // Fetching data for bindings
  | 'complete'
  | 'error';

/**
 * Progress callback data
 */
export interface GenerationProgress {
  state: GenerationState;
  /** Raw DSL text as it streams */
  rawDsl: string;
  /** Parsed schema (may be partial during streaming) */
  schema: LiquidSchema | null;
  /** Resolved data context */
  data: DataContext | null;
  /** Block count in current schema */
  blockCount: number;
  /** Error if state is 'error' */
  error?: Error;
  /** Timing information */
  timing: {
    started: number;
    aiComplete?: number;
    resolveComplete?: number;
  };
}

/**
 * Progress callback function
 */
export type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Final generation result
 */
export interface GenerationResult {
  /** Final DSL string */
  dsl: string;
  /** Parsed schema */
  schema: LiquidSchema;
  /** Resolved data */
  data: DataContext;
  /** Resolution details */
  resolution: ResolveResult;
  /** Total generation time in ms */
  totalTime: number;
  /** AI generation time in ms */
  aiTime: number;
  /** Data resolution time in ms */
  resolveTime: number;
}

// ============================================================================
// AI Pipeline
// ============================================================================

/**
 * AI Pipeline for natural language to UI generation
 *
 * Flow:
 * 1. User query + catalog → system prompt
 * 2. System prompt + query → AI → streaming DSL
 * 3. Streaming DSL → progressive parsing → partial schemas
 * 4. Final schema → binding resolution → data
 * 5. Schema + data → ready for LiquidUI
 */
export class AIPipeline {
  private config: AIProviderConfig;
  private catalog: SchemaCatalog;
  private resolver: { resolve: (schema: LiquidSchema) => Promise<ResolveResult> };

  constructor(options: {
    config: AIProviderConfig;
    catalog: SchemaCatalog;
    resolver: { resolve: (schema: LiquidSchema) => Promise<ResolveResult> };
  }) {
    this.config = options.config;
    this.catalog = options.catalog;
    this.resolver = options.resolver;
  }

  /**
   * Generate UI from natural language query
   */
  async generate(
    options: GenerateOptions,
    onProgress?: ProgressCallback
  ): Promise<GenerationResult> {
    const timing = { started: Date.now(), aiComplete: 0, resolveComplete: 0 };

    const progress: GenerationProgress = {
      state: 'generating',
      rawDsl: '',
      schema: null,
      data: null,
      blockCount: 0,
      timing,
    };

    const notify = () => onProgress?.(progress);
    notify();

    try {
      // 1. Build system prompt from catalog
      const systemPrompt = options.systemPrompt ??
        generateSystemPrompt(this.catalog, options.promptOptions);

      // 2. Create streaming parser
      const parser = new StreamingParser({
        onCheckpoint: (schema, blockCount) => {
          progress.schema = schema;
          progress.blockCount = blockCount;
          notify();
        },
      });

      // 3. Stream from AI
      const stream = await this.streamFromAI(systemPrompt, options);

      for await (const chunk of stream) {
        if (options.signal?.aborted) {
          throw new Error('Generation aborted');
        }

        progress.rawDsl += chunk;
        parser.feed(chunk);
        notify();
      }

      // 4. Finalize parsing
      const parseResult = parser.finalize();
      progress.schema = parseResult.schema;
      progress.blockCount = parseResult.blockCount;
      timing.aiComplete = Date.now();

      // 5. Resolve bindings
      progress.state = 'resolving';
      notify();

      const resolution = await this.resolver.resolve(parseResult.schema);
      progress.data = resolution.data;
      timing.resolveComplete = Date.now();

      // 6. Complete
      progress.state = 'complete';
      notify();

      return {
        dsl: progress.rawDsl,
        schema: parseResult.schema,
        data: resolution.data,
        resolution,
        totalTime: timing.resolveComplete - timing.started,
        aiTime: timing.aiComplete - timing.started,
        resolveTime: timing.resolveComplete - timing.aiComplete,
      };

    } catch (error) {
      progress.state = 'error';
      progress.error = error instanceof Error ? error : new Error(String(error));
      notify();
      throw progress.error;
    }
  }

  /**
   * Stream response from AI provider
   */
  private async *streamFromAI(
    systemPrompt: string,
    options: GenerateOptions
  ): AsyncGenerator<string> {
    const { provider, apiKey, model, baseUrl, maxTokens, temperature } = this.config;

    if (provider === 'anthropic') {
      yield* this.streamFromAnthropic(systemPrompt, options, {
        apiKey,
        model: model ?? 'claude-sonnet-4-20250514',
        baseUrl,
        maxTokens: maxTokens ?? 2048,
        temperature: temperature ?? 0.3,
      });
    } else if (provider === 'openai') {
      yield* this.streamFromOpenAI(systemPrompt, options, {
        apiKey,
        model: model ?? 'gpt-4o',
        baseUrl,
        maxTokens: maxTokens ?? 2048,
        temperature: temperature ?? 0.3,
      });
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Stream from Anthropic API
   */
  private async *streamFromAnthropic(
    systemPrompt: string,
    options: GenerateOptions,
    config: { apiKey: string; model: string; baseUrl?: string; maxTokens: number; temperature: number }
  ): AsyncGenerator<string> {
    // Always call Anthropic directly - use dangerous-browser-access header for CORS
    const url = config.baseUrl ?? 'https://api.anthropic.com/v1/messages';

    // Build headers with browser access header for direct browser calls
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: this.buildUserMessage(options),
          },
        ],
        stream: true,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);
            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield event.delta.text;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }

  /**
   * Stream from OpenAI API
   */
  private async *streamFromOpenAI(
    systemPrompt: string,
    options: GenerateOptions,
    config: { apiKey: string; model: string; baseUrl?: string; maxTokens: number; temperature: number }
  ): AsyncGenerator<string> {
    const url = `${config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: this.buildUserMessage(options) },
        ],
        stream: true,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);
            const content = event.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }

  /**
   * Build user message from options
   */
  private buildUserMessage(options: GenerateOptions): string {
    let message = options.query;

    if (options.context) {
      message = `Context: ${options.context}\n\nRequest: ${message}`;
    }

    // Add instruction to output only DSL
    message += '\n\nRespond with only LiquidCode DSL, no explanation or markdown.';

    return message;
  }
}

// ============================================================================
// React Hook (for use in components)
// ============================================================================

/**
 * Hook state for useLiquidAI
 */
export interface UseLiquidAIState {
  /** Current generation state */
  state: GenerationState;
  /** Whether currently generating */
  isGenerating: boolean;
  /** Raw DSL being generated */
  dsl: string;
  /** Current schema (may be partial during streaming) */
  schema: LiquidSchema | null;
  /** Resolved data */
  data: DataContext | null;
  /** Block count */
  blockCount: number;
  /** Error if any */
  error: Error | null;
  /** Generate from query */
  generate: (query: string, context?: string) => Promise<GenerationResult | null>;
  /** Cancel current generation */
  cancel: () => void;
  /** Reset state */
  reset: () => void;
}

/**
 * Create initial state for the hook
 */
export function createInitialState(): Omit<UseLiquidAIState, 'generate' | 'cancel' | 'reset'> {
  return {
    state: 'idle',
    isGenerating: false,
    dsl: '',
    schema: null,
    data: null,
    blockCount: 0,
    error: null,
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Simple non-streaming generation for testing
 */
export async function generateOnce(
  pipeline: AIPipeline,
  query: string
): Promise<GenerationResult> {
  return pipeline.generate({ query });
}

/**
 * Validate that a DSL string can be parsed
 */
export function validateDsl(dsl: string): { valid: boolean; error?: string } {
  try {
    const parser = new StreamingParser();
    parser.feed(dsl);
    const result = parser.finalize();
    return { valid: result.schema.layers.length > 0 };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
