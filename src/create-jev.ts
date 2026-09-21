import { delay as mswDelay, http, HttpResponse, passthrough, type HttpResponseResolver } from "msw";
import { completeResponse } from "./answers.js";
import { createHistory } from "./history.js";
import { matchesRequest, parseJevRequest } from "./request.js";
import type {
  ErrorOptions,
  HandlerOptions,
  JevAnswerInput,
  JevHandler,
  JevHistory,
  JevRequest,
  JevResolver,
  MalformedKind,
} from "./types.js";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
type InternalResolver = (request: JevRequest, attempt: number) => Promise<Response>;
const internals = new WeakMap<JevHandler, InternalResolver>();

export interface JevMock {
  readonly history: JevHistory;
  reset(): void;
  choice(
    name: string,
    answer: Omit<Extract<JevAnswerInput, { type: "choice" }>, "type">,
    options?: HandlerOptions,
  ): JevHandler;
  noul(
    name: string,
    answer: Omit<Extract<JevAnswerInput, { type: "noul" }>, "type">,
    options?: HandlerOptions,
  ): JevHandler;
  score(
    name: string,
    answer: Omit<Extract<JevAnswerInput, { type: "score" }>, "type">,
    options?: HandlerOptions,
  ): JevHandler;
  respond(answers: Record<string, JevAnswerInput>, options?: HandlerOptions): JevHandler;
  mock(resolver: JevResolver, options?: HandlerOptions): JevHandler;
  lowConfidence(
    name: string,
    answer: Omit<JevAnswerInput, "confidence"> & { confidence?: number },
    options?: HandlerOptions,
  ): JevHandler;
  error(status: number, options?: ErrorOptions): JevHandler;
  serverError(options?: ErrorOptions): JevHandler;
  rateLimited(options?: ErrorOptions & { retryAfterMs?: number }): JevHandler;
  timeout(options?: HandlerOptions): JevHandler;
  malformed(kind?: MalformedKind, options?: HandlerOptions): JevHandler;
  sequence(...handlers: JevHandler[]): JevHandler;
}

export function createJevMock(): JevMock {
  const history = createHistory();
  let attempts = 0;

  const make = (resolver: JevResolver, options: HandlerOptions = {}): JevHandler => {
    const internal: InternalResolver = async (request, attempt) => {
      if (options.delay !== undefined) await mswDelay(options.delay);
      return HttpResponse.json(
        completeResponse(request, await resolver({ request, attempt, history: history.requests })),
      );
    };
    const handler = http.post(ENDPOINT, async ({ request }) => {
      const parsed = parseJevRequest(await request.json());
      const matched = matchesRequest(parsed, options.match);
      history.record({ request: parsed, timestamp: Date.now(), matched });
      if (!matched) return passthrough();
      return internal(parsed, ++attempts);
    });
    internals.set(handler, internal);
    return handler;
  };

  const raw = (resolver: HttpResponseResolver): JevHandler =>
    http.post(ENDPOINT, async (info) => {
      const parsed = parseJevRequest(await info.request.clone().json());
      history.record({ request: parsed, timestamp: Date.now(), matched: true });
      attempts += 1;
      return resolver(info);
    });

  const api: JevMock = {
    history,
    reset() {
      history.clear();
      attempts = 0;
    },
    choice(name, answer, options) {
      return make(() => ({ answers: { [name]: { type: "choice", ...answer } } }), options);
    },
    noul(name, answer, options) {
      return make(() => ({ answers: { [name]: { type: "noul", ...answer } } }), options);
    },
    score(name, answer, options) {
      return make(() => ({ answers: { [name]: { type: "score", ...answer } } }), options);
    },
    respond(answers, options) {
      return make(() => ({ answers }), options);
    },
    mock: make,
    lowConfidence(name, answer, options) {
      const typed = answer as JevAnswerInput;
      const value =
        typed.type === "noul" ? typed : { ...typed, confidence: answer.confidence ?? 0.35 };
      return make(() => ({ answers: { [name]: value } }), options);
    },
    error(status, options = {}) {
      return raw(() =>
        HttpResponse.json(
          { error: { message: options.message ?? `Mock Jev error (${String(status)})` } },
          { status, ...(options.headers ? { headers: options.headers } : {}) },
        ),
      );
    },
    serverError(options) {
      return api.error(500, options);
    },
    rateLimited(options = {}) {
      const headers = {
        ...options.headers,
        ...(options.retryAfterMs === undefined
          ? {}
          : { "retry-after-ms": String(options.retryAfterMs) }),
      };
      return api.error(429, { ...options, headers });
    },
    timeout() {
      return raw(async () => {
        await mswDelay("infinite");
        return new HttpResponse(null, { status: 504 });
      });
    },
    malformed(kind = "invalid-json") {
      return raw(() => {
        if (kind === "empty") return new HttpResponse(null, { status: 200 });
        if (kind === "missing-answers")
          return HttpResponse.json({ model: "mock", usage: { input_tokens: 0, output_tokens: 0 } });
        if (kind === "wrong-types")
          return HttpResponse.json({ model: 42, answers: [], usage: "none" });
        return new HttpResponse("{not-json", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });
    },
    sequence(...handlers) {
      if (handlers.length === 0) throw new Error("jev-msw sequence requires at least one handler.");
      let index = 0;
      return raw(async ({ request }) => {
        const parsed = parseJevRequest(await request.clone().json());
        const selected = handlers[Math.min(index++, handlers.length - 1)];
        const resolver = selected && internals.get(selected);
        if (!resolver) throw new Error("jev-msw sequence only accepts jev-msw response handlers.");
        return resolver(parsed, index);
      });
    },
  };
  return api;
}
