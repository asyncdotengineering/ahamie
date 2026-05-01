---
title: Trigger DSL — `on.*`
description: Typed via TypeScript module augmentation. Connector packages widen the namespace at install.
---

## Built-ins

| Trigger | Purpose |
|---|---|
| `on.cron(expr, opts?)`           | croner-backed schedule |
| `on.webhook(path)`               | HTTP webhook routed through the proxy |
| `on.manual.button(id)`           | button-press from the UI |
| `on.manual.api(id)`              | programmatic invocation |
| `on.appEvent(event)`             | app-internal event |
| `on.channel.message(channel)`    | first-class channel-message family |

## Module augmentation

Connector packages widen the trigger namespace at module load time so editor inference works without codegen:

```ts
declare module "@ahamie/automation" {
  interface AhamieTriggerNamespace {
    slack: {
      message: (channel: string) => Trigger<{ text: string; sender: string }>;
    };
    github: {
      pullRequest: (filter: { state: "opened" | "merged" }) => Trigger<GitHubPR>;
    };
  }
}
```

Then `on.slack.message("#engineering")` is editor-typed.

## Public handler context

User-defined `handler` callbacks receive a typed context — **no OTel side-channel**:

```ts
interface HandlerContext {
  event: { firedAt: Date; eventId: EventId; payload: unknown };
  run:   { id: AutomationRunId; idempotencyKey: string };
  actor: { kind: "user" | "system" | "agent"; id: string; orgId: OrgId };
  ahamie: {
    orgId: OrgId;
    outcomes?: { attribute: (subject: { kind: string; id: string }) => Promise<AutomationRunId | null> };
    agentIdentity?: string;
  };
}
```

## Idempotency

Every event row is uniquely `(automation_id, event_id)`. The runtime uses `INSERT … ON CONFLICT DO NOTHING`, which means duplicate webhook deliveries produce **zero side-effects** — the second run is dropped before any action fires.
