---
title: Why we wrap Mastra
description: The hybrid wrap-and-hide pattern, and why we keep the escape hatch open forever.
---

## The decision (T3)

We **wrap-and-hide** Mastra. The default surface is `@ahamie/agent`, `@ahamie/workflow`, `@ahamie/memory`, `@ahamie/rag`, `@ahamie/workspace`. Each is a 1:1 mirror of the corresponding Mastra package, with our invariants attached at construction.

## Why wrap

- Mastra is the only TypeScript-first agent runtime with workflow + memory + storage + observability typed end-to-end. Rewriting from zero is malpractice.
- The closed-loop discipline (`RunOutcome`, hidden-golden, software factory, connector-proxy trust boundary) is what we contribute. Mastra deliberately omits it. Wrapping is the cheapest way to add it without forking.

## Why hide

- The wrapper enforces invariants users will otherwise forget — the budget cap, the outcome hook, the LISTEN/NOTIFY cancel, the org scope.
- If you import `Agent` from `@ahamie/agent`, you get the constructor that has all four pre-attached. There is no way to opt out by accident.

## Why the escape hatch stays open

- Power users who need every Mastra knob can always `import { Agent } from "@mastra/core/agent"`. The test suite has a smoke test that asserts this import path keeps working.
- Wrapping vs. forking. We never fork. If Mastra fixes a bug, we get the fix. If they break us, we publish a hotfix wrapper while pinning the previous minor.

## What we never wrap

- Mastra's **model gateway**. They own the model adapters; we re-export them.
- Mastra's **observability**. AI spans live in `@mastra/observability`; non-AI spans live in `@ahamie/telemetry`. One pipeline at the exporter.
