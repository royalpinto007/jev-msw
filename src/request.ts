import type { JevQuestion, JevRequest, JsonValue, RequestMatcher } from "./types.js";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isJson = (value: unknown): value is JsonValue =>
  value === null ||
  ["string", "number", "boolean"].includes(typeof value) ||
  (Array.isArray(value)
    ? value.every(isJson)
    : isObject(value) && Object.values(value).every(isJson));

export function parseJevRequest(value: unknown): JevRequest {
  if (
    !isObject(value) ||
    !isJson(value.state) ||
    typeof value.model !== "string" ||
    !isObject(value.questions) ||
    Object.keys(value.questions).length === 0
  )
    throw new Error(
      "jev-msw received an invalid Jev request. Expected state, model, and at least one question.",
    );
  const questions: Record<string, JevQuestion> = {};
  for (const [name, candidate] of Object.entries(value.questions)) {
    if (!isObject(candidate) || !["choice", "noul", "score"].includes(String(candidate.type)))
      throw new Error(`jev-msw received an invalid question named "${name}".`);
    questions[name] = candidate as unknown as JevQuestion;
  }
  return { state: value.state, questions, model: value.model };
}

function partialMatch(actual: unknown, expected: unknown): boolean {
  if (typeof expected === "function") return (expected as (value: unknown) => boolean)(actual);
  if (expected instanceof RegExp) return typeof actual === "string" && expected.test(actual);
  if (isObject(expected))
    return (
      isObject(actual) &&
      Object.entries(expected).every(([key, value]) => partialMatch(actual[key], value))
    );
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((value, index) => partialMatch(actual[index], value))
    );
  return Object.is(actual, expected);
}

export function matchesRequest(request: JevRequest, matcher?: RequestMatcher): boolean {
  if (!matcher) return true;
  if (matcher.state !== undefined && !partialMatch(request.state, matcher.state)) return false;
  if (matcher.model !== undefined && !partialMatch(request.model, matcher.model)) return false;
  return Object.entries(matcher.questions ?? {}).every(([name, expected]) => {
    const question = request.questions[name];
    return (
      question !== undefined &&
      (typeof expected === "function" ? expected(question) : question.type === expected)
    );
  });
}
