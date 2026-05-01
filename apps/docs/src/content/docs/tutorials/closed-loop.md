---
title: Wire a closed loop
description: Cron trigger → agent run → external outcome attribution. The whole arc.
---

The closed loop is what separates an *agent runtime* from a *brain*. By the end of this tutorial you will have a cron-triggered automation that runs an agent, records outcomes from a sensor system the agent cannot write to, and the eval suite picks up the change.

## 1. Define the automation

`src/automations/daily-summary.ts`:

```ts
import { defineAutomation, on } from "@ahamie/automation";
import { engineeringSummarizer } from "../agents/engineering-summarizer";

export default defineAutomation({
  id: "daily-summary",
  trigger: on.cron("0 8 * * 1-5", { timezone: "America/New_York" }),
  actions: [
    {
      kind: "agent.run",
      agent: engineeringSummarizer,
      input: ({ event }) => ({ since: new Date(event.firedAt.getTime() - 86_400_000) }),
    },
    {
      kind: "gateway.send",
      target: "slack:#leadership",
      template: "review_card_v1",
      from: ({ steps }) => steps[0],
    },
  ],
  budget: { dimension: "ai_compute", cap_usd: 0.5, on_cap: "pause" },
  approval: { mode: "post-only" },
});
```

## 2. Define the outcome provider

`src/outcomes/linear-issue-closed.ts`:

```ts
import { defineProvider } from "@ahamie/automation";
import { recordOutcome } from "@ahamie/outcomes";
import { z } from "@ahamie/schema";

const linearIssueClosed = z.object({
  id: z.string(),
  closedBy: z.string(),
  closedAt: z.string(),
});

export default defineProvider({
  id: "linear",
  triggers: {
    "issue.closed": {
      schema: linearIssueClosed,
      async handler({ event, ahamie }) {
        const payload = event.payload as z.infer<typeof linearIssueClosed>;

        // Sensor isolation: the agent identity cannot trigger its own outcome.
        if (payload.closedBy === ahamie.agentIdentity) return;

        const runId = await ahamie.outcomes?.attribute({
          kind: "linear.issue", id: payload.id,
        });
        if (!runId) return;

        await recordOutcome(/* db injected by the host */, {
          orgId: ahamie.orgId,
          automationRunId: runId,
          subject: { kind: "linear.issue", id: payload.id },
          outcome_type: "linear_issue_closed",
          source: "linear",
          source_kind: "human_decision",
          observed_at: new Date(payload.closedAt),
        });
      },
    },
  },
});
```

The `source: "linear"` in the outcome is a system the agent does not have write access to — that's the **sensor isolation** invariant.

## 3. Wire the eval suite

`src/evals/summarizer.suite.ts`:

```ts
import { defineSuite } from "@ahamie/eval";
import { engineeringSummarizer } from "../agents/engineering-summarizer";

export default defineSuite({
  id: "summarizer.suite",
  controller: engineeringSummarizer,
  threshold: 0.8,
  hiddenGolden: {
    refs: ["s3://my-brain-eval-private/golden/summarizer/*"],
    threshold: 0.85,
  },
  loadGoldenScenarios: async (refs) => fetchGolden(refs),
  scenarios: [/* … */],
});
```

The hidden-golden refs live behind an IAM boundary the agent cannot reach.

## 4. Watch the loop close

```bash
ahamie run daily-summary
ahamie eval --suite summarizer.suite
# close a Linear issue
psql -d ahamie -c "SELECT * FROM outcomes ORDER BY observed_at DESC LIMIT 1;"
```

You should see a row attributing the issue close back to the run that proposed it.

## What you learned

- `Trigger → Event → Run → Action → Delivery` — the contract is engine-agnostic.
- Outcomes are recorded by **other systems**, not by the agent.
- The eval suite has two partitions; only the agent sees the observable one.
