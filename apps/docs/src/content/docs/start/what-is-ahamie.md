---
title: What is Ahamie?
description: A TypeScript-first headless framework for building closed-loop AI systems inside your company.
---

**Ahamie** (pronounced *"ah-HAH-mee"*, rhymes with *salami*) is a headless, source-available, self-host-first framework for building **closed-loop** AI systems that live inside your company. The Tamil root *aham* (அகம்) — *self / inner core* — is hidden inside the spelling.

You install it the way you install Backstage, Inngest, or Temporal. You own the substrate.

## The wedge

The closed-loop world has four primitives every framework eventually needs:

1. **`RunOutcome`** — a sensor-isolated row that attributes a downstream business outcome to the run that proposed it.
2. **Hidden-golden eval** — the partition the agent does not have IAM access to, so the metric cannot be gamed.
3. **Software factory** — the outer loop that revises the spec when the eval falls below a PAC threshold.
4. **Connector-proxy trust boundary** — a separate process that holds tokens, allowlists `(method, path)`, audits every call.

Mastra is the best TypeScript agent runtime today. It deliberately omits these four. Ahamie ships them.

## What it is not

- It is **not** an agent runtime from scratch. We wrap Mastra (`@mastra/core`, workflow, memory, RAG, observability, sandbox/FS).
- It is **not** a hosted product. The framework is Apache-2.0; the Cloud offering — when it ships — is a separate codebase that consumes the framework as a library.
- It is **not** a no-code tool. It is a TypeScript SDK + CLI + UI primitive registry.

## The shape

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Layer 5  Packaging:        pnpm create ahamie · Helm chart (v1)              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Layer 4  Framework SDK:    @ahamie/sdk · @ahamie/cli · create-ahamie         │
├──────────────────────────────────────────────────────────────────────────────┤
│ Layer 3  UI primitives:    @ahamie/ui (5 shadcn components)                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ Layer 2  Runtime:          agent · workflow · memory · rag · workspace ·     │
│                            automation · manifest · registry · connector-proxy│
│                            · identity · outcomes · eval                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Layer 1  Substrate:        schema · storage · blobstore · cas · telemetry    │
└──────────────────────────────────────────────────────────────────────────────┘
```

Layer 1 is Postgres + pgvector. Layer 2 wraps Mastra. Layer 3 is shadcn. Layer 4 is the SDK + CLI. Layer 5 is the install path.

Read the full plan: [`SPEC.md`](https://github.com/asyncdotengineering/ahamie/blob/main/SPEC.md).
