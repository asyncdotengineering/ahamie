# @ahamie/telemetry

Thin OTel layer for everything that is **not** an AI span. AI spans are owned by Mastra's `Observability`; this package wraps storage queries, the automation runtime, the connector proxy, identity middleware, eval runs, and outcome writes. One pipeline at the exporter.

```ts
import { initTelemetry, withSpan } from "@ahamie/telemetry";
const t = initTelemetry({ serviceName: "my-brain", exporter: "console" });
await withSpan(t.tracer("auto"), "automation.run", { id: "atm_x" }, async () => doWork());
```
