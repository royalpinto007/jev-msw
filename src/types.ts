import type { HttpHandler } from "msw";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface JevQuestion {
  type: "choice" | "noul" | "score";
  instructions?: JsonValue;
  criteria?: Record<string, JsonValue> | JsonValue[] | null;
}

export interface JevRequest {
  state: JsonValue;
  questions: Record<string, JevQuestion>;
  model: string;
}

export interface JevUsage {
  input_tokens: number;
  output_tokens: number;
}
export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities?: Record<string, number>;
}
export interface NoulAnswer {
  type: "noul";
  noul: number;
}
export interface ScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  legend?: Record<string, JsonValue>;
  probabilities?: Record<string, number>;
}
export type JevAnswer = ChoiceAnswer | NoulAnswer | ScoreAnswer;
export type JevAnswerInput = JevAnswer;

export interface JevResponse {
  model?: string;
  answers: Record<string, JevAnswerInput>;
  usage?: JevUsage;
}
export type Predicate<T> = (value: T) => boolean;
export type ValueMatcher<T> = T | Predicate<T>;
export interface RequestMatcher {
  state?: JsonValue | Record<string, unknown> | Predicate<JsonValue>;
  model?: string | RegExp | Predicate<string>;
  questions?: Record<string, JevQuestion["type"] | Predicate<JevQuestion>>;
}
export interface HandlerOptions {
  match?: RequestMatcher;
  delay?: number | "real" | "infinite";
}
export interface ResolverContext {
  request: JevRequest;
  attempt: number;
  history: readonly JevRequestRecord[];
}
export type JevResolver = (context: ResolverContext) => JevResponse | Promise<JevResponse>;
export interface JevRequestRecord {
  request: JevRequest;
  timestamp: number;
  matched: boolean;
}
export interface JevHistory {
  readonly requests: readonly JevRequestRecord[];
  readonly lastRequest: JevRequestRecord | undefined;
  clear(): void;
}
export type JevHandler = HttpHandler;
export interface ErrorOptions {
  message?: string;
  headers?: Record<string, string>;
  delay?: number;
}
export type MalformedKind = "invalid-json" | "empty" | "missing-answers" | "wrong-types";
