# @ahamie/workflow

Wraps Mastra's workflow engine. v0 default is in-process; `@ahamie/automation-inngest` ships at v1 as a drop-in.

```ts
import { defineWorkflow, defineStep, runWorkflow } from "@ahamie/workflow";

const wf = defineWorkflow({
  id: "review",
  steps: [
    defineStep({ id: "draft",  async execute(c) { return draft(c.input); } }),
    defineStep({ id: "approve", async execute(c) { await c.suspend("human"); return c.input; } }),
  ],
});
```
