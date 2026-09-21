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
      category: { type: "choice", choice: "only", confidence: 0.4, probabilities: { only: 1 } },
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
  expect(() =>
    completeResponse(
      {
        ...request,
        questions: {
          ...request.questions,
          category: { type: "choice", criteria: { only: null, other: null } },
        },
      },
      {
        answers: {
          category: {
            type: "choice",
            choice: "only",
            confidence: 0.5,
            probabilities: { only: 0.5 },
          },
        },
      },
    ),
  ).toThrow("every incoming criterion");
  expect(() =>
    completeResponse(request, {
      answers: { rating: { type: "score", score: Number.NaN, confidence: 0.5 } },
    }),
  ).toThrow("finite");
});

it("preserves explicit score metadata and token usage", () => {
  expect(
    completeResponse(request, {
      model: "custom",
      usage: { input_tokens: 4, output_tokens: 2 },
      answers: {
        rating: {
          type: "score",
          score: 0.25,
          confidence: 0.8,
          legend: { 0: "cold", 1: "hot" },
          probabilities: { 0: 0.75, 1: 0.25 },
        },
      },
    }),
  ).toMatchObject({
    model: "custom",
    usage: { input_tokens: 4, output_tokens: 2 },
    answers: { rating: { legend: { 0: "cold", 1: "hot" } } },
  });
});

it("rejects answers for the wrong incoming question type", () => {
  expect(() =>
    completeResponse(request, {
      answers: { approved: { type: "choice", choice: "yes", confidence: 1 } },
    }),
  ).toThrow("incoming choice question");
  expect(() =>
    completeResponse(request, {
      answers: { approved: { type: "score", score: 1, confidence: 1 } },
    }),
  ).toThrow("incoming score question");
});
