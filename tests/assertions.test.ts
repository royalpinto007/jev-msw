import { expect, it } from "vitest";
import { historyAssertions } from "../src/assertions.js";
import { createHistory } from "../src/history.js";

it("reports request count and state assertions", () => {
  const history = createHistory();
  history.record({
    timestamp: 1,
    matched: true,
    request: { state: { id: 7 }, model: "m", questions: { ok: { type: "noul" } } },
  });
  expect(historyAssertions.toHaveReceivedTimes(history, 1).pass).toBe(true);
  expect(historyAssertions.toHaveReceived(history, { questions: { ok: "noul" } }).pass).toBe(true);
  expect(historyAssertions.toHaveLastState(history, { id: 7 }).pass).toBe(true);
  history.clear();
  expect(history.requests).toHaveLength(0);
});
