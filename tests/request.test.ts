import { describe, expect, it } from "vitest";
import { matchesRequest, parseJevRequest } from "../src/request.js";

const request = parseJevRequest({
  state: { tenant: "acme", nested: { active: true } },
  questions: { category: { type: "choice", criteria: { billing: null } } },
  model: "jev-1.0-mini",
});

describe("request parsing and matching", () => {
  it("rejects malformed request boundaries", () => {
    expect(() => parseJevRequest({ state: null, questions: {}, model: "x" })).toThrow(
      "at least one question",
    );
    expect(() =>
      parseJevRequest({ state: null, questions: { x: { type: "unknown" } }, model: "x" }),
    ).toThrow('question named "x"');
  });

  it("matches deep partial state, model, and questions", () => {
    expect(
      matchesRequest(request, {
        state: { nested: { active: true } },
        model: /^jev-/,
        questions: { category: "choice" },
      }),
    ).toBe(true);
    expect(matchesRequest(request, { state: { tenant: "other" } })).toBe(false);
    expect(
      matchesRequest(request, {
        state: (state) => (state as { tenant: string }).tenant === "acme",
      }),
    ).toBe(true);
    expect(
      matchesRequest(request, {
        questions: { category: (question) => question.type === "choice" },
      }),
    ).toBe(true);
    expect(matchesRequest(request, { model: (model) => model.endsWith("mini") })).toBe(true);
    expect(matchesRequest(request, { questions: { missing: "noul" } })).toBe(false);
  });
});
