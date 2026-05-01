---
title: Define a hidden-golden eval partition
description: The default partition — protected from agent IAM.
---

A hidden-golden partition is the eval discipline that keeps the metric honest. The agent has no IAM access to the bytes that define it.

## Pattern

```ts
import { defineSuite } from "@ahamie/eval";

export default defineSuite({
  id: "summarizer.suite",
  controller: agent,
  threshold: 0.8,
  hiddenGolden: {
    refs: ["s3://my-brain-eval-private/golden/summarizer/*"],
    threshold: 0.85,
  },
  loadGoldenScenarios: async (refs) => {
    // The host process has IAM access to this prefix.
    // The agent process does not.
    return loadFromS3WithProtectedRole(refs);
  },
  scenarios: [
    /* observable scenarios — agent CAN see these */
  ],
});
```

## IAM separation

Two prefixes, two roles:

| Prefix                                                | Role        | Agent can read? |
|-------------------------------------------------------|-------------|-----------------|
| `s3://my-brain-eval-public/observable/*`             | `eval-read` | yes             |
| `s3://my-brain-eval-private/golden/*`                | `eval-host` | **no**          |

The agent's tool catalog must not include any tool that uses `eval-host`. The `ahamie doctor` command warns when it detects shared roles.

## When to add scenarios to golden vs observable

| Scenario property                              | Add to               |
|------------------------------------------------|----------------------|
| Useful for the agent to learn from             | observable           |
| Reveals a known failure mode without hinting   | hidden_golden        |
| User report from production                    | hidden_golden        |
| Synthetic edge case                            | observable           |
