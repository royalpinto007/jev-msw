# Contributing

Thanks for helping make Jev tests easier to trust.

## Development

Use Node.js 20 or newer.

```sh
npm ci
npm run check
```

Behavior changes start with a failing test. Keep handlers compatible with the real `@typesafe-ai/sdk` contract and MSW 2.x. Do not add production dependencies without explaining why the behavior cannot be implemented with the current stack.

Use Conventional Commits. Open a focused pull request with the behavior, motivation, and exact verification commands.
