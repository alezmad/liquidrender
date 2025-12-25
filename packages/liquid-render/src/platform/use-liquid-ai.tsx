// useLiquidAI - React hook for AI-powered UI generation
// ============================================================================

import { useState, useCallback, useRef, useMemo } from 'react';
import type { LiquidSchema } from '../compiler/ui-emitter';
import type { DataContext } from './resolver';
import type { LiquidPlatform } from './index';
import {
  AIPipeline,
  type AIProviderConfig,
  type GenerationState,
  type GenerationResult,
  type GenerationProgress,
} from './ai-pipeline';
import type { PromptGeneratorOptions } from './prompt-generator';

// ============================================================================
// Types
// ============================================================================

export interface UseLiquidAIOptions {
  /** AI provider configuration */
  ai: AIProviderConfig;
  /** Liquid Platform instance */
  platform: LiquidPlatform;
  /** Prompt generation options */
  promptOptions?: PromptGeneratorOptions;
  /** Callback when generation completes */
  onComplete?: (result: GenerationResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseLiquidAIReturn {
  /** Current state */
  state: GenerationState;
  /** Whether currently generating */
  isGenerating: boolean;
  /** Whether currently resolving data */
  isResolving: boolean;
  /** Raw DSL being generated */
  dsl: string;
  /** Current schema (partial during streaming, complete after) */
  schema: LiquidSchema | null;
  /** Resolved data context */
  data: DataContext | null;
  /** Number of blocks parsed so far */
  blockCount: number;
  /** Error if state is 'error' */
  error: Error | null;
  /** Last successful result */
  result: GenerationResult | null;
  /** Generate UI from natural language query */
  generate: (query: string, context?: string) => Promise<GenerationResult | null>;
  /** Cancel current generation */
  cancel: () => void;
  /** Reset to initial state */
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useLiquidAI(options: UseLiquidAIOptions): UseLiquidAIReturn {
  const { ai, platform, promptOptions, onComplete, onError } = options;

  // State
  const [state, setState] = useState<GenerationState>('idle');
  const [dsl, setDsl] = useState('');
  const [schema, setSchema] = useState<LiquidSchema | null>(null);
  const [data, setData] = useState<DataContext | null>(null);
  const [blockCount, setBlockCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize pipeline creation
  const pipeline = useMemo(() => {
    // Need to get catalog synchronously for pipeline creation
    // Pipeline will fetch catalog when needed
    return {
      config: ai,
      platform,
    };
  }, [ai, platform]);

  // Generate function
  const generate = useCallback(async (
    query: string,
    context?: string
  ): Promise<GenerationResult | null> => {
    // Cancel any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Reset state
    setState('generating');
    setDsl('');
    setSchema(null);
    setData(null);
    setBlockCount(0);
    setError(null);

    try {
      // Get catalog
      const catalog = await platform.catalog.getCatalog();

      // Create pipeline
      const aiPipeline = new AIPipeline({
        config: ai,
        catalog,
        resolver: platform.resolver,
      });

      // Progress callback
      const onProgress = (progress: GenerationProgress) => {
        setDsl(progress.rawDsl);
        setSchema(progress.schema);
        setData(progress.data);
        setBlockCount(progress.blockCount);
        setState(progress.state);

        if (progress.error) {
          setError(progress.error);
        }
      };

      // Generate
      const genResult = await aiPipeline.generate(
        { query, context, signal, promptOptions },
        onProgress
      );

      setResult(genResult);
      onComplete?.(genResult);

      return genResult;

    } catch (err) {
      if (signal.aborted) {
        setState('idle');
        return null;
      }

      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      setState('error');
      onError?.(errorObj);

      return null;

    } finally {
      abortControllerRef.current = null;
    }
  }, [ai, platform, promptOptions, onComplete, onError]);

  // Cancel function
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState('idle');
  }, []);

  // Reset function
  const reset = useCallback(() => {
    cancel();
    setDsl('');
    setSchema(null);
    setData(null);
    setBlockCount(0);
    setError(null);
    setResult(null);
    setState('idle');
  }, [cancel]);

  return {
    state,
    isGenerating: state === 'generating',
    isResolving: state === 'resolving',
    dsl,
    schema,
    data,
    blockCount,
    error,
    result,
    generate,
    cancel,
    reset,
  };
}

// ============================================================================
// Simplified Hook (with defaults)
// ============================================================================

export interface UseSimpleLiquidAIOptions {
  /** Anthropic API key */
  apiKey: string;
  /** Model (default: claude-sonnet-4-20250514) */
  model?: string;
  /** Platform instance */
  platform: LiquidPlatform;
}

/**
 * Simplified hook with sensible defaults for Anthropic
 */
export function useSimpleLiquidAI(options: UseSimpleLiquidAIOptions): UseLiquidAIReturn {
  return useLiquidAI({
    ai: {
      provider: 'anthropic',
      apiKey: options.apiKey,
      model: options.model ?? 'claude-sonnet-4-20250514',
      maxTokens: 2048,
      temperature: 0.3,
    },
    platform: options.platform,
  });
}

// ============================================================================
// Provider Component (optional context-based usage)
// ============================================================================

import { createContext, useContext, type ReactNode } from 'react';

interface LiquidAIContextValue {
  platform: LiquidPlatform;
  ai: AIProviderConfig;
}

const LiquidAIContext = createContext<LiquidAIContextValue | null>(null);

export interface LiquidAIProviderProps {
  children: ReactNode;
  platform: LiquidPlatform;
  ai: AIProviderConfig;
}

/**
 * Provider component for LiquidAI context
 */
export function LiquidAIProvider({
  children,
  platform,
  ai,
}: LiquidAIProviderProps): React.ReactElement {
  const value = useMemo(() => ({ platform, ai }), [platform, ai]);

  return (
    <LiquidAIContext.Provider value={value}>
      {children}
    </LiquidAIContext.Provider>
  );
}

/**
 * Hook to use LiquidAI from context
 */
export function useLiquidAIFromContext(): UseLiquidAIReturn {
  const context = useContext(LiquidAIContext);

  if (!context) {
    throw new Error('useLiquidAIFromContext must be used within a LiquidAIProvider');
  }

  return useLiquidAI({
    ai: context.ai,
    platform: context.platform,
  });
}
