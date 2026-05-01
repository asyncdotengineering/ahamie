# @ahamie/outcomes

Passive outcome recorder. Two operations:

```ts
await recordOutcome(db, { orgId, automationRunId, subject, outcome_type, source, source_kind });
const runId = await attribute(db, { orgId, subject });
```

Sensor-isolation guard rejects any write where `source` is a system the agent has write access to (T13).
