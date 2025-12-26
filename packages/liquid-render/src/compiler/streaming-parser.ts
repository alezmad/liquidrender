// LiquidCode Streaming Parser
// Enables progressive parsing and rendering of LiquidCode as tokens arrive
// Critical for LLM streaming output with low-latency UI updates

import { UIScanner, UIToken, LiquidCodeError, ScanResult } from './ui-scanner';
import { UIParser, UIAST, BlockAST } from './ui-parser';
import { UIEmitter, LiquidSchema } from './ui-emitter';

// ============================================================================
// Streaming Parser Types
// ============================================================================

export interface StreamingResult {
  /** Current best-effort schema (always renderable) */
  schema: LiquidSchema;
  /** Is the input syntactically complete? */
  complete: boolean;
  /** Buffered partial tokens waiting for more input */
  pendingBuffer: string;
  /** Errors encountered so far */
  errors: LiquidCodeError[];
  /** Safe position to resume from on next chunk */
  checkpoint: number;
  /** Number of complete blocks parsed */
  blockCount: number;
}

export interface StreamingParserOptions {
  /** Enable lenient mode for maximum error recovery */
  lenient?: boolean;
  /** Emit checkpoint callbacks for progressive rendering */
  onCheckpoint?: (schema: LiquidSchema, blockCount: number) => void;
}

// ============================================================================
// Streaming Parser Implementation
// ============================================================================

export class StreamingParser {
  private buffer: string = '';
  private checkpoint: number = 0;
  private lastCompleteAST: UIAST | null = null;
  private errors: LiquidCodeError[] = [];
  private options: StreamingParserOptions;

  constructor(options: StreamingParserOptions = {}) {
    this.options = options;
  }

  /**
   * Feed a chunk of LiquidCode source.
   * Can be called multiple times with streaming input.
   */
  feed(chunk: string): StreamingResult {
    this.buffer += chunk;

    // Try to parse what we have
    const parseResult = this.attemptParse();

    // Emit checkpoint if we have new complete blocks
    if (this.options.onCheckpoint && parseResult.schema) {
      this.options.onCheckpoint(parseResult.schema, parseResult.blockCount);
    }

    return parseResult;
  }

  /**
   * Finalize parsing. Call after all input received.
   * Forces completion of any pending partial tokens.
   */
  finalize(): StreamingResult {
    // Add implicit closing for unclosed structures
    const patched = this.patchIncompleteInput(this.buffer);

    const scanner = new UIScanner(patched);
    const { tokens, errors: scanErrors } = scanner.scan();

    // Add newline to force any pending block to complete
    const parser = new UIParser(tokens, patched);
    let ast: UIAST;

    try {
      ast = parser.parse();
    } catch (e) {
      // On parse error, use last known good AST
      ast = this.lastCompleteAST || this.createEmptyAST();
      if (e instanceof LiquidCodeError) {
        this.errors.push(e);
      }
    }

    const schema = this.astToSchema(ast);

    return {
      schema,
      complete: true,
      pendingBuffer: '',
      errors: [...this.errors, ...scanErrors],
      checkpoint: this.buffer.length,
      blockCount: this.countBlocks(ast),
    };
  }

  /**
   * Get best-effort renderable schema at any point.
   * Always returns something that can be rendered.
   */
  getBestEffort(): LiquidSchema {
    if (this.lastCompleteAST) {
      return this.astToSchema(this.lastCompleteAST);
    }

    // Try partial parse
    const result = this.attemptParse();
    return result.schema;
  }

  /**
   * Reset parser state for new input.
   */
  reset(): void {
    this.buffer = '';
    this.checkpoint = 0;
    this.lastCompleteAST = null;
    this.errors = [];
  }

  /**
   * Get current buffer content (for debugging).
   */
  getBuffer(): string {
    return this.buffer;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private attemptParse(): StreamingResult {
    // Find the last safe parsing point (complete statement)
    const safePoint = this.findSafeParsePoint(this.buffer);
    const parseableContent = this.buffer.slice(0, safePoint);
    const pendingBuffer = this.buffer.slice(safePoint);

    if (parseableContent.trim().length === 0) {
      // Nothing complete to parse yet
      return {
        schema: this.lastCompleteAST
          ? this.astToSchema(this.lastCompleteAST)
          : this.createEmptySchema(),
        complete: false,
        pendingBuffer: this.buffer,
        errors: this.errors,
        checkpoint: 0,
        blockCount: this.lastCompleteAST ? this.countBlocks(this.lastCompleteAST) : 0,
      };
    }

    // Scan and parse the safe content
    const scanner = new UIScanner(parseableContent);
    const { tokens, errors: scanErrors } = scanner.scan();
    this.errors.push(...scanErrors);

    const parser = new UIParser(tokens, parseableContent);
    let ast: UIAST;
    let parseComplete = true;

    try {
      ast = parser.parse();
      this.lastCompleteAST = ast;
      this.checkpoint = safePoint;
    } catch (e) {
      // Parse failed - use last known good
      ast = this.lastCompleteAST || this.createEmptyAST();
      parseComplete = false;
      if (e instanceof LiquidCodeError) {
        // Don't accumulate duplicate errors
        if (!this.errors.some(err => err.message === e.message)) {
          this.errors.push(e);
        }
      }
    }

    const schema = this.astToSchema(ast);

    // Check if input looks complete (ends with proper termination)
    const looksComplete = this.inputLooksComplete(this.buffer);

    return {
      schema,
      complete: looksComplete && parseComplete && pendingBuffer.trim().length === 0,
      pendingBuffer,
      errors: this.errors,
      checkpoint: this.checkpoint,
      blockCount: this.countBlocks(ast),
    };
  }

  /**
   * Find the last position in buffer that represents a complete statement.
   * Safe points are: newlines, closing brackets, commas (outside strings/brackets)
   */
  private findSafeParsePoint(input: string): number {
    let safePoint = 0;
    let inString = false;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      const prev = i > 0 ? input[i - 1] : '';

      // Track string boundaries
      if (c === '"' && prev !== '\\') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      // Track bracket depth
      if (c === '[') bracketDepth++;
      if (c === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      if (c === '{') braceDepth++;
      if (c === '}') braceDepth = Math.max(0, braceDepth - 1);

      // Safe points at depth 0
      if (bracketDepth === 0 && braceDepth === 0) {
        if (c === '\n' || c === ',') {
          safePoint = i + 1;
        }
        // Closing bracket at depth 0 is also safe
        if (c === ']' || c === '}') {
          safePoint = i + 1;
        }
      }
    }

    // If we're in an unclosed string, don't include it
    if (inString) {
      // Find start of the unclosed string
      let lastQuote = input.lastIndexOf('"');
      while (lastQuote > 0 && input[lastQuote - 1] === '\\') {
        lastQuote = input.lastIndexOf('"', lastQuote - 1);
      }
      if (lastQuote >= 0 && lastQuote < safePoint) {
        // Trim back to before the string
        safePoint = lastQuote;
      }
    }

    // If brackets are unclosed, trim back to last safe point before open
    if (bracketDepth > 0 || braceDepth > 0) {
      // The safePoint should already be correct from the loop
    }

    return safePoint;
  }

  /**
   * Check if input looks syntactically complete.
   */
  private inputLooksComplete(input: string): boolean {
    const trimmed = input.trim();
    if (trimmed.length === 0) return true;

    // Check for balanced brackets
    let bracketDepth = 0;
    let braceDepth = 0;
    let inString = false;

    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      const prev = i > 0 ? trimmed[i - 1] : '';

      if (c === '"' && prev !== '\\') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (c === '[') bracketDepth++;
      if (c === ']') bracketDepth--;
      if (c === '{') braceDepth++;
      if (c === '}') braceDepth--;
    }

    // Complete if all brackets balanced and not in string
    return bracketDepth === 0 && braceDepth === 0 && !inString;
  }

  /**
   * Patch incomplete input for final parsing.
   * Closes unclosed strings and brackets.
   */
  private patchIncompleteInput(input: string): string {
    let result = input;
    let bracketDepth = 0;
    let braceDepth = 0;
    let inString = false;

    for (let i = 0; i < result.length; i++) {
      const c = result[i];
      const prev = i > 0 ? result[i - 1] : '';

      if (c === '"' && prev !== '\\') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (c === '[') bracketDepth++;
      if (c === ']') bracketDepth--;
      if (c === '{') braceDepth++;
      if (c === '}') braceDepth--;
    }

    // Close unclosed string
    if (inString) {
      result += '"';
    }

    // Close unclosed brackets
    result += ']'.repeat(Math.max(0, bracketDepth));
    result += '}'.repeat(Math.max(0, braceDepth));

    return result;
  }

  private astToSchema(ast: UIAST): LiquidSchema {
    const emitter = new UIEmitter({ format: 'liquidschema' });
    return emitter.emit(ast) as LiquidSchema;
  }

  private createEmptyAST(): UIAST {
    return {
      mainBlocks: [],
      mainBlocksSeparator: 'newline',
      layers: [],
      signals: [],
      surveys: [],
      comments: [],
      warnings: [],
    };
  }

  private createEmptySchema(): LiquidSchema {
    return {
      version: '1.0',
      signals: [],
      layers: [{
        id: 0,
        visible: true,
        root: {
          uid: 'root',
          type: 'container',
          children: [],
        },
      }],
    };
  }

  private countBlocks(ast: UIAST): number {
    let count = 0;

    const countInBlock = (block: BlockAST): number => {
      let c = 1;
      if (block.children) {
        for (const child of block.children) {
          c += countInBlock(child);
        }
      }
      return c;
    };

    for (const block of ast.mainBlocks) {
      count += countInBlock(block);
    }

    for (const layer of ast.layers) {
      count += countInBlock(layer.root);
    }

    return count;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a streaming parser with default options.
 */
export function createStreamingParser(options?: StreamingParserOptions): StreamingParser {
  return new StreamingParser(options);
}

/**
 * Parse a complete string in streaming mode (for API compatibility).
 */
export function parseStreaming(source: string): StreamingResult {
  const parser = new StreamingParser();
  parser.feed(source);
  return parser.finalize();
}

/**
 * Simulate streaming by chunking input.
 * Useful for testing progressive rendering.
 */
export function* simulateStreaming(
  source: string,
  chunkSize: number = 10
): Generator<StreamingResult> {
  const parser = new StreamingParser();

  for (let i = 0; i < source.length; i += chunkSize) {
    const chunk = source.slice(i, i + chunkSize);
    yield parser.feed(chunk);
  }

  yield parser.finalize();
}
