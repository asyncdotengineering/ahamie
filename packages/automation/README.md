# @ahamie/automation

The Trigger→Event→Run→Action→Delivery contract over a pluggable workflow engine. v0 default: in-process via `@ahamie/workflow`. v1 ships `@ahamie/automation-inngest`.

```ts
import { defineAutomation, on } from "@ahamie/automation";

export default defineAutomation({
  id: "daily-summary",
  trigger: on.cron("0 8 * * 1-5", { timezone: "America/New_York" }),
  actions: [{ kind: "agent.run", agent, input: ({ event }) => ({ since: event.firedAt }) }],
  budget: { dimension: "ai_compute", cap_usd: 0.5, on_cap: "pause" },
  approval: { mode: "post-only" },
});
```

Connector packages widen `on.*` via module augmentation:

```ts
declare module "@ahamie/automation" {
  interface AhamieTriggerNamespace {
    slack: { message: (channel: string) => Trigger<SlackMessageEvent> };
  }
}
```

Runtime helpers (`enqueueEvent`, `runOnce`, `startScheduler`) live under `@ahamie/automation/runtime`.
