# API reference

All handler factories return standard MSW `HttpHandler` objects for `server.use(...)` or `setupServer(...)`.

## Answer helpers

- `jev.choice(name, answer, options?)` returns a choice answer for one incoming choice question.
- `jev.noul(name, answer, options?)` returns a calibrated yes/no probability.
- `jev.score(name, answer, options?)` returns a score answer and derives its legend from the incoming rubric.
- `jev.respond(answers, options?)` returns several named answers in one response.
- `jev.lowConfidence(name, answer, options?)` defaults choice or score confidence to `0.35`.

Explicit probability maps are supported. Confidence, probability, question-name, question-type, and choice-label mismatches throw clear errors.

## Dynamic responses

`jev.mock(resolver, options?)` receives:

```ts
{
  request: { state, questions, model },
  attempt: number,
  history: readonly JevRequestRecord[]
}
```

The resolver may return a response or a promise. `model` defaults to the incoming resolved model. `usage` defaults to zero tokens.

## Matching and latency

Every answer handler accepts:

```ts
{
  match?: {
    state?: deepPartial | predicate,
    questions?: Record<string, "choice" | "noul" | "score" | predicate>,
    model?: string | RegExp | predicate,
  },
  delay?: number | "real" | "infinite"
}
```

Nonmatching requests pass through to the next MSW handler.

## Failure helpers

- `jev.error(status, options?)`
- `jev.serverError(options?)`
- `jev.rateLimited({ retryAfterMs, ...options })`
- `jev.connectionError()`
- `jev.timeout()`
- `jev.malformed(kind?)`
- `jev.sequence(...handlers)`

Malformed kinds are `invalid-json`, `empty`, `missing-answers`, and `wrong-types`. The official SDK is intentionally lenient about malformed successful responses, so use these to exercise validation in your application.

## History

`jev.history.requests` contains parsed requests, timestamps, and whether each request matched. `jev.history.lastRequest` returns the newest record. `jev.reset()` clears history and attempt counters.

## Test integrations

`setupJevServer(...handlers)` is exported from `jev-msw/node`. Framework-neutral matchers are exported as `jevMatchers` from `jev-msw/vitest` and `jev-msw/jest`.
