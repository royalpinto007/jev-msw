import { jev } from "jev-msw";

export const handler = jev.mock(({ request }) => ({
  answers: {
    route: {
      type: "choice",
      choice:
        typeof request.state === "object" && request.state && "vip" in request.state
          ? "priority"
          : "standard",
      confidence: 0.95,
    },
  },
}));

export const retryHandler = jev.sequence(
  jev.rateLimited({ retryAfterMs: 1 }),
  jev.choice("route", { choice: "priority", confidence: 1 }),
);
