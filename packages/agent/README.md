# @ahamie/agent

Wraps `@mastra/core` `Agent` with budget caps, outcome hooks, and Postgres LISTEN/NOTIFY cancellation.

```ts
import { defineAgent, registerOutcomeHook } from "@ahamie/agent";
import { z } from "@ahamie/schema";

const summarizer = defineAgent({
  name: "summarizer",
  model: "anthropic/claude-sonnet-4.6",
  instructions: "Summarize the channel.",
  scope: { org: "$ORG_ID" },
  budget: { cap_usd: 0.5, on_cap: "pause" },
  output: z.object({ bullets: z.array(z.string()).max(5) }),
});

registerOutcomeHook((env) => {
  // RunCompleted envelope — feed to @ahamie/outcomes
});
```

The escape hatch — `import { Agent } from "@mastra/core"` — keeps working.
