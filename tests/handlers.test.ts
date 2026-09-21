import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createJevMock, jev } from "../src/index.js";

const server = setupServer();
const client = new TypeSafeClient({ apiKey: "test-key", retry: { maxRetries: 0 } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  jev.reset();
});
afterAll(() => server.close());

describe("answer handlers", () => {
  it("returns a choice through the real SDK and derives probabilities", async () => {
    server.use(jev.choice("category", { choice: "billing", confidence: 0.96 }));
    const result = await client.systemOne({
      state: "charged twice",
      questions: { category: choice("Classify", { billing: null, technical: null, other: null }) },
    });
    expect(result.answers.category).toEqual({
      type: "choice",
      choice: "billing",
      confidence: 0.96,
      probabilities: { billing: 0.96, technical: 0.02, other: 0.02 },
    });
  });

  it("returns noul and score answers", async () => {
    server.use(
      jev.respond({
        eligible: { type: "noul", noul: 0.82 },
        urgency: { type: "score", score: 1.5, confidence: 0.7 },
      }),
    );
    const result = await client.systemOne({
      state: {},
      questions: {
        eligible: noul("Eligible?"),
        urgency: score("Urgency", ["low", "medium", "high"]),
      },
    });
    expect(result.answers.eligible.noul).toBe(0.82);
    expect(result.answers.urgency).toMatchObject({
      type: "score",
      score: 1.5,
      confidence: 0.7,
      legend: { 0: "low", 1: "medium", 2: "high" },
    });
  });

  it("supports dynamic responses and matching", async () => {
    server.use(
      jev.mock(
        ({ request }) => ({
          answers: {
            category: {
              type: "choice",
              choice: (request.state as { expected: string }).expected,
              confidence: 1,
            },
          },
        }),
        { match: { state: { tenant: "acme" }, questions: { category: "choice" } } },
      ),
    );
    const result = await client.systemOne({
      state: { tenant: "acme", expected: "billing" },
      questions: { category: choice(null, { billing: null, other: null }) },
    });
    expect(result.answers.category.choice).toBe("billing");
  });

  it("isolates request history between instances", async () => {
    const first = createJevMock();
    const second = createJevMock();
    server.use(first.noul("ok", { noul: 1 }));
    await client.systemOne({ state: "yes", questions: { ok: noul() } });
    expect(first.history.requests).toHaveLength(1);
    expect(second.history.requests).toHaveLength(0);
  });

  it("provides low-confidence defaults and explicit artificial latency", async () => {
    server.use(jev.lowConfidence("category", { type: "choice", choice: "other" }, { delay: 1 }));
    const result = await client.systemOne({
      state: null,
      questions: { category: choice(null, { billing: null, other: null }) },
    });
    expect(result.answers.category.confidence).toBe(0.35);
  });

  it("passes nonmatching requests to a later MSW handler", async () => {
    server.use(
      jev.choice("category", { choice: "other", confidence: 1 }, { match: { model: "never" } }),
      jev.choice("category", { choice: "billing", confidence: 1 }),
    );
    const result = await client.systemOne({
      state: null,
      questions: { category: choice(null, { billing: null, other: null }) },
    });
    expect(result.answers.category.choice).toBe("billing");
    expect(jev.history.requests.map((record) => record.matched)).toEqual([false, true]);
  });
});
