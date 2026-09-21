import type { JevHistory, JsonValue, RequestMatcher } from "./types.js";
import { matchesRequest } from "./request.js";
export interface MatcherResult {
  pass: boolean;
  message: () => string;
}
export const historyAssertions = {
  toHaveReceived(history: JevHistory, matcher?: RequestMatcher): MatcherResult {
    const pass = history.requests.some(({ request }) => matchesRequest(request, matcher));
    return {
      pass,
      message: () =>
        pass
          ? "Expected Jev not to have received a matching request."
          : "Expected Jev to have received a matching request.",
    };
  },
  toHaveReceivedTimes(history: JevHistory, count: number): MatcherResult {
    const pass = history.requests.length === count;
    return {
      pass,
      message: () =>
        `Expected Jev to receive ${String(count)} requests, but received ${String(history.requests.length)}.`,
    };
  },
  toHaveLastState(history: JevHistory, state: JsonValue): MatcherResult {
    const pass = JSON.stringify(history.lastRequest?.request.state) === JSON.stringify(state);
    return { pass, message: () => "Expected the last Jev request to contain the provided state." };
  },
};
