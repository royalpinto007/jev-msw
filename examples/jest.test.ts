import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import { setupServer } from "msw/node";
import { jev } from "jev-msw";

const server = setupServer();
const client = new TypeSafeClient({ apiKey: "test-key", retry: { maxRetries: 0 } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  jev.reset();
});
afterAll(() => server.close());

test("classifies a ticket", async () => {
  server.use(jev.choice("category", { choice: "billing", confidence: 0.96 }));
  const result = await client.systemOne({
    state: "charged twice",
    questions: { category: choice(null, { billing: null, other: null }) },
  });
  expect(result.answers.category.choice).toBe("billing");
});
