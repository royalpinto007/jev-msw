import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { jev } from "../src/index.js";

const server = setupServer();
const client = new TypeSafeClient({ apiKey: "test-key", retry: { maxRetries: 0 }, timeout: 30 });
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  jev.reset();
});
afterAll(() => server.close());

const request = () =>
  client.systemOne({
    state: null,
    questions: { category: choice(null, { billing: null, other: null }) },
  });

it("simulates API and malformed failures", async () => {
  server.use(jev.error(422, { message: "invalid fixture" }));
  await expect(request()).rejects.toMatchObject({ status: 422 });
  server.resetHandlers();
  server.use(jev.malformed("invalid-json"));
  await expect(request()).resolves.toBe("{not-json");
});

it("supports retry sequences", async () => {
  server.use(
    jev.sequence(jev.serverError(), jev.choice("category", { choice: "billing", confidence: 1 })),
  );
  const retrying = new TypeSafeClient({
    apiKey: "test-key",
    retry: { maxRetries: 1, backoffInitialMs: 1, backoffMaxMs: 1, backoffJitter: 0 },
  });
  const result = await retrying.systemOne({
    state: null,
    questions: { category: choice(null, { billing: null, other: null }) },
  });
  expect(result.answers.category.choice).toBe("billing");
  expect(jev.history.requests).toHaveLength(2);
});

it("preserves configured errors inside a retry sequence", async () => {
  server.use(jev.sequence(jev.rateLimited({ retryAfterMs: 1 }), jev.serverError()));
  const retrying = new TypeSafeClient({
    apiKey: "test-key",
    retry: { maxRetries: 1, backoffInitialMs: 1, backoffMaxMs: 1, backoffJitter: 0 },
  });
  await expect(
    retrying.systemOne({
      state: null,
      questions: { category: choice(null, { billing: null, other: null }) },
    }),
  ).rejects.toMatchObject({ status: 500 });
});

it("supports latency, rate limits, and timeouts", async () => {
  server.use(jev.rateLimited({ retryAfterMs: 5 }));
  await expect(request()).rejects.toMatchObject({ status: 429 });
  server.resetHandlers();
  server.use(jev.timeout());
  await expect(request()).rejects.toBeDefined();
});
