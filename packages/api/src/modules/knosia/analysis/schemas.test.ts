import { describe, expect, it } from "vitest";

import { getAnalysisSchema, runAnalysisSchema } from "./schemas";

describe("runAnalysisSchema", () => {
  it("should accept valid input with alphanumeric connectionId", () => {
    const input = { connectionId: "connabc123def456" };
    expect(runAnalysisSchema.parse(input)).toEqual(input);
  });

  it("should reject missing connectionId", () => {
    expect(() => runAnalysisSchema.parse({})).toThrow();
  });

  it("should reject invalid format for connectionId (contains special characters)", () => {
    expect(() =>
      runAnalysisSchema.parse({ connectionId: "not-a-valid-id" }),
    ).toThrow();
  });

  it("should reject empty string for connectionId", () => {
    expect(() => runAnalysisSchema.parse({ connectionId: "" })).toThrow();
  });

  it("should reject non-string connectionId", () => {
    expect(() => runAnalysisSchema.parse({ connectionId: 123 })).toThrow();
  });

  it("should strip extra fields", () => {
    const input = {
      connectionId: "connabc123def456",
      extraField: "should be ignored",
    };
    const result = runAnalysisSchema.parse(input);
    expect(result).toEqual({
      connectionId: "connabc123def456",
    });
    expect(result).not.toHaveProperty("extraField");
  });
});

describe("getAnalysisSchema", () => {
  it("should accept valid input with string id", () => {
    const input = { id: "analysis123" };
    expect(getAnalysisSchema.parse(input)).toEqual(input);
  });

  it("should accept alphanumeric id", () => {
    const input = { id: "analysisabc123def456" };
    expect(getAnalysisSchema.parse(input)).toEqual(input);
  });

  it("should reject missing id", () => {
    expect(() => getAnalysisSchema.parse({})).toThrow();
  });

  it("should reject non-string id", () => {
    expect(() => getAnalysisSchema.parse({ id: 123 })).toThrow();
    expect(() => getAnalysisSchema.parse({ id: null })).toThrow();
    expect(() => getAnalysisSchema.parse({ id: undefined })).toThrow();
  });

  it("should accept empty string id (no minimum length constraint)", () => {
    const input = { id: "" };
    expect(getAnalysisSchema.parse(input)).toEqual(input);
  });

  it("should strip extra fields", () => {
    const input = {
      id: "analysis123",
      extraField: "should be ignored",
    };
    const result = getAnalysisSchema.parse(input);
    expect(result).toEqual({ id: "analysis123" });
    expect(result).not.toHaveProperty("extraField");
  });
});
