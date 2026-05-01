---
title: Build your first agent
description: Define an agent, attach a budget cap, and run it under tenant scope.
---

This is a **learning-oriented tutorial** (Diataxis). By the end, you will have an Ahamie agent that runs end-to-end with a budget cap and a typed output schema.

## 1. Add the agent

Create `src/agents/echo.ts`:

```ts
import { defineAgent } from "@ahamie/agent";
import { z } from "@ahamie/schema";

export const echo = defineAgent({
  name: "echo",
  model: "anthropic/claude-sonnet-4.6",
  instructions: "Echo the user's message verbatim.",
  scope: { org: "$ORG_ID" },
  budget: { cap_usd: 0.10, on_cap: "pause" },
  output: z.object({ message: z.string() }),
});
```

What's happening:

- `scope.org` resolves to the active org at runtime; the agent cannot leave its tenant.
- `budget.cap_usd` enforces a $0.10 spending ceiling. On hit, `on_cap: "pause"` suspends the run so a human can approve resume.
- `output` is a Zod schema — Standard-Schema-conformant, so the eval framework can hand it to `jsonSchemaValid` directly.

## 2. Run it

```ts
import { mintOrgId } from "@ahamie/schema";
import { echo } from "./agents/echo";

const orgId = mintOrgId();
const result = await echo.run({ orgId, input: { message: "hello" } });
console.log(result.status, result.output, `$${result.costUsd}`);
```

## 3. Listen for completion

```ts
import { registerOutcomeHook } from "@ahamie/agent";

registerOutcomeHook((envelope) => {
  // RunCompleted — feed to @ahamie/outcomes' recordOutcome later.
});
```

## 4. Test it

```ts
import { describe, expect, it } from "vitest";
import { echo } from "./agents/echo";
import { mintOrgId } from "@ahamie/schema";

describe("echo", () => {
  it("succeeds with parsed output", async () => {
    const r = await echo.run({ orgId: mintOrgId(), input: { message: "hi" } });
    expect(r.status).toBe("succeeded");
    expect(r.output).toEqual({ message: "hi" });
  });
});
```

## What you learned

- `defineAgent` returns an `AhamieAgent<TInput, TOutput>` with `.run()`.
- `budget.cap_usd` + `on_cap: "pause" | "degrade" | "fail"` — three policies.
- The outcome hook is a registry — many subscribers, each fires on every run.

Next: [Wire a closed loop](/tutorials/closed-loop/).
