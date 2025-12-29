/**
 * Query Engine Pattern Matcher
 *
 * The pattern matching engine that matches normalized input against vocabulary patterns.
 *
 * Algorithm:
 * 1. Sort patterns by priority (highest first)
 * 2. Parse each pattern template into segments (literals and slots)
 * 3. Try to match input by consuming text for each segment
 * 4. For slots, find matching vocabulary items
 * 5. Build LC DSL output from matched slots
 */

import type { Pattern, CompiledVocabulary, SlotType, SlotEntry } from '../vocabulary/types';
import type { MatchResult, NormalizeResult } from './types';
import { TIME_SLOTS, resolveTimeSlot } from '../vocabulary/patterns';

// =============================================================================
// Types
// =============================================================================

/** Segment of a parsed pattern template */
interface PatternSegment {
  /** Type of segment */
  type: 'literal' | 'slot';

  /** Text for literals, slot name for slots (e.g., 'm', 'd', 't') */
  value: string;
}

/** Intermediate result of slot matching */
interface SlotMatch {
  /** The slot type matched */
  slotType: SlotType;

  /** The text from input that matched */
  matchedText: string;

  /** The resolved value (e.g., slug or LC token) */
  resolvedValue: string;

  /** Confidence of this match (0-1) */
  confidence: number;
}

/** Result of attempting to match a single pattern */
interface PatternMatchResult {
  /** Whether the pattern matched */
  matched: boolean;

  /** Slot matches found */
  slotMatches?: SlotMatch[];

  /** Any unmatched text remaining */
  remainder?: string;

  /** Match confidence */
  confidence: number;
}

// =============================================================================
// Main Matcher Function
// =============================================================================

/**
 * Match normalized input against vocabulary patterns.
 *
 * Sorts patterns by priority and tries each one until a match is found.
 * Returns the first successful match with highest priority.
 *
 * @param normalized - Normalized query result
 * @param vocabulary - Compiled vocabulary with patterns and slots
 * @returns Match result with pattern, slots, and LC output
 */
export function match(
  normalized: NormalizeResult,
  vocabulary: CompiledVocabulary
): MatchResult {
  // Sort patterns by priority (highest first)
  const sortedPatterns = [...vocabulary.patterns].sort(
    (a, b) => b.priority - a.priority
  );

  // Try each pattern
  for (const pattern of sortedPatterns) {
    const result = matchPattern(normalized.normalized, pattern, vocabulary);

    if (result.matched && result.slotMatches) {
      // Build slots object from matches
      const slots = fillSlots(result.slotMatches, vocabulary);

      // Build LC output from template
      const lcOutput = buildOutput(pattern.output, slots);

      return {
        matched: true,
        pattern,
        slots,
        lcOutput,
        confidence: result.confidence,
        matchType: 'exact',
      };
    }
  }

  // No pattern matched
  return {
    matched: false,
    confidence: 0,
  };
}

// =============================================================================
// Pattern Matching
// =============================================================================

/**
 * Parse a pattern template into segments.
 *
 * Example: "{m} by {d}" -> [
 *   { type: 'slot', value: 'm' },
 *   { type: 'literal', value: ' by ' },
 *   { type: 'slot', value: 'd' }
 * ]
 *
 * @param template - Pattern template string
 * @returns Array of segments
 */
export function parseTemplate(template: string): PatternSegment[] {
  const segments: PatternSegment[] = [];
  const regex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    // Add literal segment before this slot (if any)
    if (match.index > lastIndex) {
      segments.push({
        type: 'literal',
        value: template.slice(lastIndex, match.index),
      });
    }

    // Add slot segment
    segments.push({
      type: 'slot',
      value: match[1],
    });

    lastIndex = regex.lastIndex;
  }

  // Add any trailing literal
  if (lastIndex < template.length) {
    segments.push({
      type: 'literal',
      value: template.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Try to match input against a single pattern.
 *
 * Parses the pattern into segments and tries to consume input text
 * by matching literals exactly and slots via vocabulary lookup.
 *
 * @param input - Normalized input text
 * @param pattern - Pattern to match against
 * @param vocabulary - Compiled vocabulary for slot resolution
 * @returns Pattern match result
 */
export function matchPattern(
  input: string,
  pattern: Pattern,
  vocabulary: CompiledVocabulary
): PatternMatchResult {
  const segments = parseTemplate(pattern.template);
  const slotMatches: SlotMatch[] = [];

  let remaining = input.trim();
  let totalConfidence = 0;
  let slotCount = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLastSegment = i === segments.length - 1;
    const nextSegment = segments[i + 1];

    if (segment.type === 'literal') {
      // Match literal text exactly
      const literalMatch = matchLiteral(remaining, segment.value);
      if (!literalMatch.matched) {
        return { matched: false, confidence: 0 };
      }
      remaining = literalMatch.remainder;
    } else {
      // Match slot
      const slotType = segment.value as SlotType;

      // Determine where this slot ends (at next literal or end of input)
      const boundary = isLastSegment
        ? remaining.length
        : findSlotBoundary(remaining, nextSegment);

      if (boundary === -1) {
        return { matched: false, confidence: 0 };
      }

      // Extract candidate text for this slot
      const candidateText = remaining.slice(0, boundary).trim();

      if (!candidateText) {
        return { matched: false, confidence: 0 };
      }

      // Try to match the slot
      const slotMatch = matchSlot(candidateText, slotType, vocabulary);

      if (!slotMatch) {
        return { matched: false, confidence: 0 };
      }

      slotMatches.push(slotMatch);
      totalConfidence += slotMatch.confidence;
      slotCount++;

      // Consume the matched text
      remaining = remaining.slice(boundary).trim();
    }
  }

  // Check if there's unmatched text remaining
  if (remaining.trim()) {
    // Some patterns may allow trailing text
    // For now, require complete match
    return { matched: false, remainder: remaining, confidence: 0 };
  }

  // Calculate average confidence
  const avgConfidence = slotCount > 0 ? totalConfidence / slotCount : 1;

  return {
    matched: true,
    slotMatches,
    confidence: avgConfidence,
  };
}

/**
 * Match a literal text segment against input.
 *
 * @param input - Input text to match against
 * @param literal - Literal text to find
 * @returns Match result with remaining text
 */
function matchLiteral(
  input: string,
  literal: string
): { matched: boolean; remainder: string } {
  const trimmedInput = input.trim();
  const trimmedLiteral = literal.trim();

  if (trimmedInput.toLowerCase().startsWith(trimmedLiteral.toLowerCase())) {
    return {
      matched: true,
      remainder: trimmedInput.slice(trimmedLiteral.length).trim(),
    };
  }

  return { matched: false, remainder: input };
}

/**
 * Find where a slot ends in the input text.
 *
 * Looks for the start of the next literal segment.
 *
 * @param input - Input text
 * @param nextSegment - Next segment in pattern
 * @returns Index where slot ends, or -1 if not found
 */
function findSlotBoundary(
  input: string,
  nextSegment: PatternSegment | undefined
): number {
  if (!nextSegment) {
    // No next segment, slot goes to end
    return input.length;
  }

  if (nextSegment.type === 'literal') {
    // Find where the next literal starts
    const literalText = nextSegment.value.trim().toLowerCase();
    const inputLower = input.toLowerCase();

    // Find the literal, but be careful with partial matches
    const index = inputLower.indexOf(` ${literalText}`);
    if (index !== -1) {
      return index;
    }

    // Try without leading space for edge cases
    const directIndex = inputLower.indexOf(literalText);
    if (directIndex !== -1) {
      return directIndex;
    }

    return -1;
  }

  // Next segment is a slot - this is a complex case
  // For simplicity, assume single-word slots when adjacent
  const words = input.split(/\s+/);
  if (words.length > 0) {
    return words[0].length;
  }

  return -1;
}

// =============================================================================
// Slot Matching
// =============================================================================

/**
 * Match text against a specific slot type.
 *
 * @param text - Text to match
 * @param slotType - Slot type to match against
 * @param vocabulary - Compiled vocabulary
 * @returns Slot match result, or undefined if no match
 */
function matchSlot(
  text: string,
  slotType: SlotType,
  vocabulary: CompiledVocabulary
): SlotMatch | undefined {
  const normalizedText = text.toLowerCase().trim();

  // Handle number slots
  if (slotType === 'n') {
    return matchNumberSlot(normalizedText);
  }

  // Handle time slots
  if (slotType === 't' || slotType === 't2') {
    return matchTimeSlot(normalizedText, slotType);
  }

  // Handle vocabulary slots (m, d, d2, f)
  return matchVocabularySlot(normalizedText, slotType, vocabulary);
}

/**
 * Match a number slot.
 *
 * @param text - Text to match
 * @returns Slot match result, or undefined if not a number
 */
function matchNumberSlot(text: string): SlotMatch | undefined {
  // Try to parse as integer
  const num = parseInt(text, 10);
  if (!isNaN(num) && num > 0) {
    return {
      slotType: 'n',
      matchedText: text,
      resolvedValue: String(num),
      confidence: 1,
    };
  }

  // Try word numbers
  const wordNumbers: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    twenty: 20,
    fifty: 50,
    hundred: 100,
  };

  const wordNum = wordNumbers[text.toLowerCase()];
  if (wordNum !== undefined) {
    return {
      slotType: 'n',
      matchedText: text,
      resolvedValue: String(wordNum),
      confidence: 0.95,
    };
  }

  return undefined;
}

/**
 * Match a time slot against TIME_SLOTS.
 *
 * @param text - Text to match
 * @param slotType - Time slot type (t or t2)
 * @returns Slot match result, or undefined if no match
 */
function matchTimeSlot(
  text: string,
  slotType: 't' | 't2'
): SlotMatch | undefined {
  // Try exact match first
  const resolved = resolveTimeSlot(text);
  if (resolved) {
    return {
      slotType,
      matchedText: text,
      resolvedValue: resolved,
      confidence: 1,
    };
  }

  // Try to match dynamic patterns like "last N days/weeks/months"
  const dynamicMatch = matchDynamicTimePattern(text);
  if (dynamicMatch) {
    return {
      slotType,
      matchedText: text,
      resolvedValue: dynamicMatch,
      confidence: 0.95,
    };
  }

  return undefined;
}

/**
 * Match dynamic time patterns like "last 45 days".
 *
 * @param text - Text to match
 * @returns LC time token, or undefined if no match
 */
function matchDynamicTimePattern(text: string): string | undefined {
  // Pattern: last/past N days/weeks/months/years
  const patterns = [
    { regex: /^(?:last|past)\s+(\d+)\s+days?$/i, unit: 'D' },
    { regex: /^(?:last|past)\s+(\d+)\s+weeks?$/i, unit: 'W' },
    { regex: /^(?:last|past)\s+(\d+)\s+months?$/i, unit: 'M' },
    { regex: /^(?:last|past)\s+(\d+)\s+years?$/i, unit: 'Y' },
    { regex: /^(?:last|past)\s+(\d+)\s+quarters?$/i, unit: 'Q' },
  ];

  for (const { regex, unit } of patterns) {
    const match = text.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      return `${unit}-${num}`;
    }
  }

  return undefined;
}

/**
 * Match text against vocabulary slots (metrics, dimensions, filters).
 *
 * @param text - Text to match
 * @param slotType - Slot type (m, d, d2, f)
 * @param vocabulary - Compiled vocabulary
 * @returns Slot match result, or undefined if no match
 */
function matchVocabularySlot(
  text: string,
  slotType: SlotType,
  vocabulary: CompiledVocabulary
): SlotMatch | undefined {
  // Map d2 to d for lookup
  const lookupType = slotType === 'd2' ? 'd' : slotType;

  // Get entries for this slot type
  const entries = vocabulary.slots[lookupType as keyof typeof vocabulary.slots];
  if (!entries || !Array.isArray(entries)) {
    return undefined;
  }

  // Try to find a matching entry
  for (const entry of entries) {
    const match = matchSlotEntry(text, entry);
    if (match) {
      return {
        slotType,
        matchedText: text,
        resolvedValue: entry.slug,
        confidence: match.confidence,
      };
    }
  }

  // Try synonym lookup as fallback
  const synonymMatch = matchSynonym(text, vocabulary);
  if (synonymMatch && isSynonymForSlotType(synonymMatch, slotType, vocabulary)) {
    return {
      slotType,
      matchedText: text,
      resolvedValue: synonymMatch,
      confidence: 0.9,
    };
  }

  return undefined;
}

/**
 * Match text against a single slot entry.
 *
 * Checks: canonical name, slug, abbreviation, aliases.
 *
 * @param text - Text to match
 * @param entry - Slot entry to match against
 * @returns Match result with confidence, or undefined if no match
 */
function matchSlotEntry(
  text: string,
  entry: SlotEntry
): { confidence: number } | undefined {
  const normalizedText = text.toLowerCase().trim();

  // Exact slug match (highest confidence)
  if (normalizedText === entry.slug.toLowerCase()) {
    return { confidence: 1 };
  }

  // Canonical name match
  if (normalizedText === entry.canonical.toLowerCase()) {
    return { confidence: 1 };
  }

  // Abbreviation match
  if (entry.abbreviation && normalizedText === entry.abbreviation.toLowerCase()) {
    return { confidence: 0.98 };
  }

  // Alias match
  for (const alias of entry.aliases) {
    if (normalizedText === alias.toLowerCase()) {
      return { confidence: 0.95 };
    }
  }

  // Partial match for multi-word entries
  const entryWords = entry.canonical.toLowerCase().split(/\s+/);
  const textWords = normalizedText.split(/\s+/);

  // Check if all text words are in entry
  if (textWords.every((w) => entryWords.includes(w))) {
    return { confidence: 0.85 };
  }

  // Check if text is a significant prefix
  if (entry.canonical.toLowerCase().startsWith(normalizedText) && normalizedText.length >= 3) {
    return { confidence: 0.8 };
  }

  return undefined;
}

/**
 * Look up a synonym in the vocabulary.
 *
 * Checks: user > org > global (priority order).
 *
 * @param text - Text to look up
 * @param vocabulary - Compiled vocabulary
 * @returns Resolved slug, or undefined if no match
 */
function matchSynonym(
  text: string,
  vocabulary: CompiledVocabulary
): string | undefined {
  const normalized = text.toLowerCase().trim();
  const { synonyms } = vocabulary;

  // Check user synonyms first (highest priority)
  if (synonyms.user[normalized]) {
    return synonyms.user[normalized];
  }

  // Check org synonyms
  if (synonyms.org[normalized]) {
    return synonyms.org[normalized];
  }

  // Check global synonyms
  if (synonyms.global[normalized]) {
    return synonyms.global[normalized];
  }

  return undefined;
}

/**
 * Check if a resolved synonym is valid for a slot type.
 *
 * @param slug - Resolved slug from synonym
 * @param slotType - Expected slot type
 * @param vocabulary - Compiled vocabulary
 * @returns Whether the slug exists in the expected slot type
 */
function isSynonymForSlotType(
  slug: string,
  slotType: SlotType,
  vocabulary: CompiledVocabulary
): boolean {
  const lookupType = slotType === 'd2' ? 'd' : slotType;
  const entries = vocabulary.slots[lookupType as keyof typeof vocabulary.slots];

  if (!entries || !Array.isArray(entries)) {
    return false;
  }

  return entries.some((entry) => entry.slug === slug);
}

// =============================================================================
// Slot Resolution
// =============================================================================

/**
 * Convert slot matches into a slot values object.
 *
 * @param slotMatches - Array of slot matches
 * @param vocabulary - Compiled vocabulary (for future enhancements)
 * @returns Object mapping slot types to resolved values
 */
export function fillSlots(
  slotMatches: SlotMatch[],
  vocabulary: CompiledVocabulary
): Record<string, string> {
  const slots: Record<string, string> = {};

  for (const match of slotMatches) {
    // For d2, store as d2 not d
    slots[match.slotType] = match.resolvedValue;
  }

  return slots;
}

// =============================================================================
// Output Building
// =============================================================================

/**
 * Build LC DSL output from template and slot values.
 *
 * Example:
 *   template: "Q @{m} #{d} ~{t}"
 *   slots: { m: "revenue", d: "region", t: "M-1" }
 *   result: "Q @revenue #region ~M-1"
 *
 * @param template - LC output template
 * @param slots - Resolved slot values
 * @returns Complete LC DSL string
 */
export function buildOutput(
  template: string,
  slots: Record<string, string>
): string {
  let output = template;

  // Replace all slot placeholders
  for (const [slotType, value] of Object.entries(slots)) {
    const placeholder = `{${slotType}}`;
    output = output.replace(new RegExp(escapeRegExp(placeholder), 'g'), value);
  }

  return output;
}

/**
 * Escape special regex characters in a string.
 *
 * @param str - String to escape
 * @returns Escaped string safe for regex
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// Utility Exports
// =============================================================================

/**
 * Get all slot types from a pattern template.
 *
 * @param template - Pattern template
 * @returns Array of slot types found
 */
export function getSlotTypes(template: string): SlotType[] {
  const segments = parseTemplate(template);
  return segments
    .filter((s) => s.type === 'slot')
    .map((s) => s.value as SlotType);
}

/**
 * Validate that all required slots are present in vocabulary.
 *
 * @param pattern - Pattern to validate
 * @param vocabulary - Compiled vocabulary
 * @returns Whether all required slots have at least one entry
 */
export function validatePatternSlots(
  pattern: Pattern,
  vocabulary: CompiledVocabulary
): boolean {
  for (const slotType of pattern.requiredSlots) {
    // Skip number and time slots (built-in)
    if (slotType === 'n' || slotType === 't' || slotType === 't2') {
      continue;
    }

    // Map d2 to d
    const lookupType = slotType === 'd2' ? 'd' : slotType;
    const entries = vocabulary.slots[lookupType as keyof typeof vocabulary.slots];

    if (!entries || entries.length === 0) {
      return false;
    }
  }

  return true;
}
