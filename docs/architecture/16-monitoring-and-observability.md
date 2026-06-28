# 16. Monitoring and Observability

## 16.1 Structured Logging

The API emits structured JSON logs through `console.*`, which Cloudflare surfaces in `wrangler tail` and the Workers
dashboard.

- `apps/api/src/middleware/logging.ts` logs one line when a request arrives and one when it completes, with `method`,
  `path`, the authenticated `userId` (or `anonymous`), and, on completion, `statusCode` and `duration`.
- The global error handler logs the error as its first action, so a failed request produces a request log and an error
  log correlated by timestamp (see [15.3 Logging](./15-error-handling-strategy.md#153-logging)).

View logs live:

```bash
npm run tail --workspace=apps/api   # wrangler tail
```

## 16.2 Health Checks

`GET /health` (no auth) returns `{ status, timestamp }` and is the endpoint to wire an external uptime monitor to (one
per environment). The deploy runbook uses it as the first post-deploy check
([DEPLOYMENT_INSTRUCTIONS.md](../deployment/DEPLOYMENT_INSTRUCTIONS.md)).

## 16.3 Built-In Metrics

The Cloudflare Workers dashboard provides per-Worker request counts, error rates, CPU time, and invocation metrics for
both the API and web Workers at no extra cost. D1 usage (reads, writes, storage) is visible in the D1 section of the
dashboard. These cover the platform's monitoring needs without additional instrumentation.

## 16.4 Future Instrumentation

There is no third-party telemetry pipeline (tracing/metrics export) today. If structured tracing is needed later, the
natural insertion point is the logging middleware and the service layer; until then, `wrangler tail` plus the dashboard
metrics are the supported tooling.
