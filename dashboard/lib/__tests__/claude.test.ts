import { describe, it, expect } from "vitest";
import { extractJson } from "../claude";

describe("extractJson", () => {
  it("parses a plain JSON object", () => {
    expect(extractJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses a plain JSON array", () => {
    expect(extractJson<number[]>("[1, 2, 3]")).toEqual([1, 2, 3]);
  });

  it("strips a ```json fence", () => {
    expect(extractJson<{ a: number }>('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("strips a bare ``` fence with no language tag", () => {
    expect(extractJson<{ a: number }>('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("ignores prose before and after the JSON", () => {
    const text = 'Sure, here you go:\n{"a": 1}\nHope that helps!';
    expect(extractJson<{ a: number }>(text)).toEqual({ a: 1 });
  });

  it("handles nested braces correctly", () => {
    const text = '{"a": {"b": [1, 2, {"c": 3}]}}';
    expect(extractJson<Record<string, unknown>>(text)).toEqual({ a: { b: [1, 2, { c: 3 }] } });
  });

  it("throws a descriptive error when there is no JSON at all", () => {
    expect(() => extractJson("Search returned empty. Let me retry.")).toThrow(/No JSON found in model response/);
  });

  it("includes a snippet of the offending text in the error", () => {
    expect(() => extractJson("no json here")).toThrow(/no json here/);
  });
});
