# jev-msw

> Mock Jev. Test decisions without making decisions.

[![CI](https://github.com/royalpinto007/jev-msw/actions/workflows/ci.yml/badge.svg)](https://github.com/royalpinto007/jev-msw/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/jev-msw)](https://www.npmjs.com/package/jev-msw)
[![license](https://img.shields.io/npm/l/jev-msw)](LICENSE)

`jev-msw` provides contract-aware [MSW](https://mswjs.io/) handlers for the real [`@typesafe-ai/sdk`](https://www.npmjs.com/package/@typesafe-ai/sdk). Make Jev-driven tests deterministic without API calls, credentials, latency, or credits.

## 30-second quickstart

```sh
npm install -D jev-msw msw
```

```ts
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { jev } from "jev-msw";

const server = setupServer();
const client = new TypeSafeClient({ apiKey: "test-key" });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  jev.reset();
});
afterAll(() => server.close());

it("routes billing tickets", async () => {
  server.use(
    jev.choice("category", {
      choice: "billing",
      confidence: 0.96,
    }),
  );

  const result = await client.systemOne({
    state: "I was charged twice.",
    questions: {
      category: choice("What is this ticket about?", {
        billing: null,
        technical: null,
        other: null,
      }),
    },
  });

  expect(result.answers.category.choice).toBe("billing");
});
```

The missing probability map is derived from the actual labels in the incoming question. The application still runs the official SDK and its real parsing, error, timeout, and retry logic.

## Answers

```ts
server.use(jev.noul("approved", { noul: 0.91 }));

server.use(
  jev.score("urgency", {
    score: 1.7,
    confidence: 0.82,
  }),
);

server.use(
  jev.respond({
    approved: { type: "noul", noul: 0.91 },
    category: { type: "choice", choice: "billing", confidence: 0.96 },
  }),
);
```

Choice probabilities, score legends, score probabilities, model, and zero-token usage are completed from the incoming request unless you provide them explicitly.

## Dynamic decisions and matching

```ts
server.use(
  jev.mock(
    ({ request, attempt }) => ({
      answers: {
        category: {
          type: "choice",
          choice: request.state.vip ? "priority" : "standard",
          confidence: attempt === 1 ? 0.88 : 0.99,
        },
      },
    }),
    {
      match: {
        state: { tenant: "acme" },
        questions: { category: "choice" },
        model: /^jev-/,
      },
      delay: 25,
    },
  ),
);
```

State matching is deep-partial. State, question, and model matchers can also be predicates.

## Failures and retries

```ts
server.use(jev.serverError());
server.use(jev.rateLimited({ retryAfterMs: 100 }));
server.use(jev.error(422, { message: "Invalid test input" }));
server.use(jev.connectionError());
server.use(jev.timeout());
server.use(jev.malformed("missing-answers"));

server.use(
  jev.sequence(
    jev.rateLimited({ retryAfterMs: 1 }),
    jev.serverError(),
    jev.choice("category", { choice: "billing", confidence: 1 }),
  ),
);
```

`sequence()` keeps returning its final handler after the sequence is exhausted. This makes the official SDK's 408, 429, 5xx, connection, and timeout retry behavior straightforward to test.

## Inspect requests

```ts
expect(jev.history.requests).toHaveLength(1);
expect(jev.history.lastRequest?.request.state).toEqual({ ticket: "charged twice" });

import { jevMatchers } from "jev-msw/vitest"; // Also available from jev-msw/jest
expect.extend(jevMatchers);
```

Use `createJevMock()` when suites need isolated histories:

```ts
import { createJevMock } from "jev-msw";

const billingJev = createJevMock();
```

## Compatibility

- Node.js 20 or newer
- MSW 2.x
- Verified against `@typesafe-ai/sdk` 0.6.0
- ESM and CommonJS
- Vitest and Jest-compatible matcher functions

The default endpoint is exactly `POST https://api.typesafe.ai/v1/systemone`. Requests that do not satisfy a configured matcher pass through to the next MSW handler.

## Documentation

- [API reference](docs/api.md)
- [Vitest example](examples/vitest.test.ts)
- [Jest example](examples/jest.test.ts)
- [Dynamic and retry example](examples/dynamic.ts)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## Why MSW?

Your production code does not switch clients or import a fake SDK. MSW intercepts the HTTP boundary, so request validation, answer typing, retries, timeouts, and errors continue through the official client.

## License

[MIT](LICENSE)
