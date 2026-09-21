import { expect, it } from "vitest";
import { completeResponse } from "../src/answers.js";
import type { JevRequest } from "../src/types.js";

const request: JevRequest = {
  state: null,
  model: "test-model",
  questions: {
    category: { type: "choice", criteria: { only: null } },
    approved: { type: "noul" },
    rating: { type: "score", criteria: ["low", "high"] },
  },
};

it("handles single-choice probability and deterministic defaults", () => {
  expect(
    completeResponse(request, {
      answers: { category: { type: "choice", choice: "only", confidence: 0.4 } },
    }),
  ).toEqual({
    model: "test-model",
    answers: {
      category: { type: "choice", choice: "only", confidence: 0.4, probabilities: { only: 0.4 } },
    },
    usage: { input_tokens: 0, output_tokens: 0 },
  });
});

it("rejects invalid answer/question combinations", () => {
  expect(() =>
    completeResponse(request, { answers: { missing: { type: "noul", noul: 1 } } }),
  ).toThrow('question "missing"');
  expect(() =>
    completeResponse(request, { answers: { approved: { type: "noul", noul: 2 } } }),
  ).toThrow("between 0 and 1");
  expect(() =>
    completeResponse(request, {
      answers: { category: { type: "choice", choice: "absent", confidence: 1 } },
    }),
  ).toThrow("not present");
  expect(() =>
    completeResponse(request, {
      answers: {
        category: {
          type: "choice",
          choice: "only",
          confidence: 1,
          probabilities: { only: 2 },
        },
      },
    }),
  ).toThrow("probability");
});
