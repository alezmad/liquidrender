import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  confirmVocabularySchema,
  getVocabularySchema,
  reportMismatchSchema,
} from "../schemas";

describe("getVocabularySchema", () => {
  it("should accept valid analysisId", () => {
    const input = { analysisId: "analysis_123" };
    expect(getVocabularySchema.parse(input)).toEqual(input);
  });

  it("should accept analysisId with various formats", () => {
    const inputs = [
      { analysisId: "analysis_abc123" },
      { analysisId: "a" },
      { analysisId: "uuid-like-12345678-1234-1234-1234-123456789012" },
    ];
    for (const input of inputs) {
      expect(getVocabularySchema.parse(input)).toEqual(input);
    }
  });

  it("should reject empty analysisId", () => {
    const input = { analysisId: "" };
    expect(() => getVocabularySchema.parse(input)).toThrow(ZodError);
  });

  it("should have correct error message for empty analysisId", () => {
    const input = { analysisId: "" };
    try {
      getVocabularySchema.parse(input);
      expect.fail("Should have thrown ZodError");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const zodError = error as ZodError;
      expect(zodError.issues[0]?.message).toBe("Analysis ID is required");
    }
  });

  it("should reject missing analysisId", () => {
    const input = {};
    expect(() => getVocabularySchema.parse(input)).toThrow(ZodError);
  });

  it.each([[null], [undefined], [123], [true], [{}], [[]]])(
    "should reject non-string analysisId: %s",
    (analysisId) => {
      expect(() => getVocabularySchema.parse({ analysisId })).toThrow(ZodError);
    }
  );
});

describe("confirmVocabularySchema", () => {
  it("should accept valid confirmation with answers", () => {
    const input = {
      answers: [
        { questionId: "q1", selectedOptionId: "opt1" },
        { questionId: "q2", selectedOptionId: "opt2" },
      ],
    };
    const result = confirmVocabularySchema.parse(input);
    expect(result.answers).toEqual(input.answers);
    expect(result.skipped).toBe(false); // default value
  });

  it("should accept empty answers array", () => {
    const input = { answers: [] };
    const result = confirmVocabularySchema.parse(input);
    expect(result.answers).toEqual([]);
    expect(result.skipped).toBe(false);
  });

  it("should accept skipped as true", () => {
    const input = {
      answers: [],
      skipped: true,
    };
    const result = confirmVocabularySchema.parse(input);
    expect(result.skipped).toBe(true);
  });

  it("should accept skipped as false", () => {
    const input = {
      answers: [],
      skipped: false,
    };
    const result = confirmVocabularySchema.parse(input);
    expect(result.skipped).toBe(false);
  });

  it("should default skipped to false when not provided", () => {
    const input = {
      answers: [{ questionId: "q1", selectedOptionId: "opt1" }],
    };
    const result = confirmVocabularySchema.parse(input);
    expect(result.skipped).toBe(false);
  });

  it("should reject missing answers field", () => {
    const input = {};
    expect(() => confirmVocabularySchema.parse(input)).toThrow(ZodError);
  });

  it("should reject non-array answers", () => {
    const input = { answers: "not-an-array" };
    expect(() => confirmVocabularySchema.parse(input)).toThrow(ZodError);
  });

  it("should reject answers with missing questionId", () => {
    const input = {
      answers: [{ selectedOptionId: "opt1" }],
    };
    expect(() => confirmVocabularySchema.parse(input)).toThrow(ZodError);
  });

  it("should reject answers with missing selectedOptionId", () => {
    const input = {
      answers: [{ questionId: "q1" }],
    };
    expect(() => confirmVocabularySchema.parse(input)).toThrow(ZodError);
  });

  it("should reject answers with empty questionId", () => {
    const input = {
      answers: [{ questionId: "", selectedOptionId: "opt1" }],
    };
    expect(() => confirmVocabularySchema.parse(input)).toThrow(ZodError);
  });

  it("should reject answers with empty selectedOptionId", () => {
    const input = {
      answers: [{ questionId: "q1", selectedOptionId: "" }],
    };
    expect(() => confirmVocabularySchema.parse(input)).toThrow(ZodError);
  });

  it.each([[null], [undefined], [123], [true]])(
    "should reject non-string questionId: %s",
    (questionId) => {
      const input = {
        answers: [{ questionId, selectedOptionId: "opt1" }],
      };
      expect(() => confirmVocabularySchema.parse(input)).toThrow(ZodError);
    }
  );

  it.each([[null], [undefined], [123], [true]])(
    "should reject non-string selectedOptionId: %s",
    (selectedOptionId) => {
      const input = {
        answers: [{ questionId: "q1", selectedOptionId }],
      };
      expect(() => confirmVocabularySchema.parse(input)).toThrow(ZodError);
    }
  );

  it("should accept multiple valid answers", () => {
    const input = {
      answers: [
        { questionId: "question_1", selectedOptionId: "option_a" },
        { questionId: "question_2", selectedOptionId: "option_b" },
        { questionId: "question_3", selectedOptionId: "option_c" },
      ],
    };
    const result = confirmVocabularySchema.parse(input);
    expect(result.answers).toHaveLength(3);
  });
});

describe("reportMismatchSchema", () => {
  it("should accept valid mismatch report with wrong_mapping issue", () => {
    const input = {
      itemId: "item_123",
      issue: "wrong_mapping" as const,
    };
    expect(reportMismatchSchema.parse(input)).toEqual(input);
  });

  it("should accept valid mismatch report with wrong_name issue", () => {
    const input = {
      itemId: "item_123",
      issue: "wrong_name" as const,
    };
    expect(reportMismatchSchema.parse(input)).toEqual(input);
  });

  it("should accept valid mismatch report with missing issue", () => {
    const input = {
      itemId: "item_123",
      issue: "missing" as const,
    };
    expect(reportMismatchSchema.parse(input)).toEqual(input);
  });

  it("should accept valid mismatch report with other issue", () => {
    const input = {
      itemId: "item_123",
      issue: "other" as const,
    };
    expect(reportMismatchSchema.parse(input)).toEqual(input);
  });

  it.each(["wrong_mapping", "wrong_name", "missing", "other"] as const)(
    "should accept issue type: %s",
    (issue) => {
      const input = { itemId: "item_123", issue };
      expect(reportMismatchSchema.parse(input)).toEqual(input);
    }
  );

  it("should accept optional description", () => {
    const input = {
      itemId: "item_123",
      issue: "wrong_mapping" as const,
      description: "The column was mapped incorrectly to another entity",
    };
    expect(reportMismatchSchema.parse(input)).toEqual(input);
  });

  it("should accept empty description", () => {
    const input = {
      itemId: "item_123",
      issue: "other" as const,
      description: "",
    };
    expect(reportMismatchSchema.parse(input)).toEqual(input);
  });

  it("should reject description exceeding 500 characters", () => {
    const input = {
      itemId: "item_123",
      issue: "other" as const,
      description: "x".repeat(501),
    };
    expect(() => reportMismatchSchema.parse(input)).toThrow(ZodError);
  });

  it("should accept description at exactly 500 characters", () => {
    const input = {
      itemId: "item_123",
      issue: "other" as const,
      description: "x".repeat(500),
    };
    expect(reportMismatchSchema.parse(input)).toEqual(input);
  });

  it("should reject empty itemId", () => {
    const input = {
      itemId: "",
      issue: "wrong_mapping" as const,
    };
    expect(() => reportMismatchSchema.parse(input)).toThrow(ZodError);
  });

  it("should have correct error message for empty itemId", () => {
    const input = { itemId: "", issue: "wrong_mapping" as const };
    try {
      reportMismatchSchema.parse(input);
      expect.fail("Should have thrown ZodError");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const zodError = error as ZodError;
      expect(zodError.issues[0]?.message).toBe("Item ID is required");
    }
  });

  it("should reject missing itemId", () => {
    const input = { issue: "wrong_mapping" as const };
    expect(() => reportMismatchSchema.parse(input)).toThrow(ZodError);
  });

  it("should reject missing issue", () => {
    const input = { itemId: "item_123" };
    expect(() => reportMismatchSchema.parse(input)).toThrow(ZodError);
  });

  it("should reject invalid issue type", () => {
    const input = {
      itemId: "item_123",
      issue: "invalid_issue",
    };
    expect(() => reportMismatchSchema.parse(input)).toThrow(ZodError);
  });

  it.each([
    ["not_valid"],
    ["WRONG_MAPPING"],
    ["Wrong_Name"],
    [""],
    ["unknown"],
  ])("should reject invalid issue type: %s", (issue) => {
    const input = { itemId: "item_123", issue };
    expect(() => reportMismatchSchema.parse(input)).toThrow(ZodError);
  });

  it.each([[null], [undefined], [123], [true], [{}], [[]]])(
    "should reject non-string itemId: %s",
    (itemId) => {
      expect(() =>
        reportMismatchSchema.parse({ itemId, issue: "wrong_mapping" })
      ).toThrow(ZodError);
    }
  );

  it("should reject non-string description", () => {
    const input = {
      itemId: "item_123",
      issue: "other" as const,
      description: 123,
    };
    expect(() => reportMismatchSchema.parse(input)).toThrow(ZodError);
  });
});
