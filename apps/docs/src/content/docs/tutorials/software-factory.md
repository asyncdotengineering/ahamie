---
title: Run the software factory
description: The outer loop — when the eval fails, revise the spec.
---

The software factory composes the agent loop, the eval suite, the snapshot+CAS, and the connector proxy into the six-tuple `(Spec, Test, Eval, Agent, Code, Loop)`.

## 1. Define the factory

```ts
import { defineSoftwareFactory } from "@ahamie/eval";
import { engineeringSummarizer } from "../agents/engineering-summarizer";
import summarizerSuite from "../evals/summarizer.suite";

export default defineSoftwareFactory({
  spec: {
    id: "summarizer.spec",
    description: "Summarize yesterday's #engineering channel into ≤ 5 bullets.",
  },
  agent: engineeringSummarizer,
  suite: summarizerSuite,
  threshold: 0.85,
  maxIterations: 5,
  reviseSpec: async (currentSpec, failingReport) => {
    return {
      ...currentSpec,
      description: `${currentSpec.description}\n\n— Address: ${failingReport.observable.scenarios.find((s) => !s.passed)?.results[0]?.reason}`,
    };
  },
});
```

## 2. Run it

```bash
ahamie factory run --file ./src/factories/summarizer.factory.ts
```

You'll see iterations roll past the tabu list:

```
iter 0   spec_hash=8f… score=0.62  → revising
iter 1   spec_hash=a3… score=0.78  → revising
iter 2   spec_hash=2c… score=0.91  ✓ above threshold
SUCCEEDED (best 0.91 after 3 iter)
```

## What you learned

- The factory is **PAC-disciplined**: the loop cannot retry an identical revision (tabu list).
- Spec mutation is yours — `reviseSpec` is a callback the factory invokes when the suite falls below threshold.
- `maxIterations` is a hard cap — the loop will abandon rather than run forever.
