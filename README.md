<div align="center">

<img src=".assets/logo.png" alt="Ahamie chibi mascot" width="220" />

# Ahamie

**the company brain you own.**

[![npm](https://img.shields.io/npm/v/%40ahamie%2Fsdk?label=%40ahamie%2Fsdk&color=e58a3a)](https://www.npmjs.com/package/@ahamie/sdk)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-e58a3a.svg)](./LICENSE)
[![Status: alpha](https://img.shields.io/badge/status-alpha-ff9d86)](#status)
[![Docs](https://img.shields.io/badge/docs-ahamie--docs.vercel.app-2ecc71)](https://ahamie-docs.vercel.app)
[![Straight out of the oven](https://img.shields.io/badge/🔥-straight%20out%20of%20the%20oven-ff7a45)](#status)
[![Active development](https://img.shields.io/badge/active-development-2ecc71)](#status)
[![Node ≥22](https://img.shields.io/badge/node-%E2%89%A522-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm 10](https://img.shields.io/badge/pnpm-10-f69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![TypeScript 5.6](https://img.shields.io/badge/typescript-5.6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Wraps Mastra 1.31](https://img.shields.io/badge/wraps-mastra%201.31-ff9d86)](https://mastra.ai)

</div>

> **Ahamie** (pronounced *"ah-HAH-mee"*, rhymes with *salami*) is a TypeScript-first, source-available, self-host-first framework for building **closed-loop AI systems** inside your company. The Tamil root *aham* (அகம் — *self / inner core*) is hidden inside the spelling.

You install it the way you install Backstage, Inngest, or Temporal:

```bash
pnpm create ahamie my-brain
```

Ahamie wraps **Mastra** (`@mastra/core`, workflow, memory, RAG, observability, sandbox/FS) and contributes the closed-loop primitives Mastra deliberately omits:

- 🎯 **`RunOutcome`** — sensor-isolated outcome attribution
- 🥇 **Hidden-golden eval** suites (the metric the agent can't game)
- 🏭 **Software-factory mode** — the outer loop that revises the spec when the eval fails
- 🛡️ **Connector-proxy trust boundary** with five non-negotiable invariants

Read the v0 plan in [`SPEC.md`](./SPEC.md). Live docs: [**ahamie-docs.vercel.app**](https://ahamie-docs.vercel.app).

---

## Status

| | |
|---|---|
| Version | `0.1.1` (the v0 wedge — **straight out of the oven**) |
| Repo | [github.com/octalpixel/ahamie](https://github.com/octalpixel/ahamie) |
| Docs | [ahamie-docs.vercel.app](https://ahamie-docs.vercel.app) |
| npm | [npmjs.com/~ahamie](https://www.npmjs.com/search?q=%40ahamie) — 27 packages live |
| Maturity | **alpha** — APIs may shift before v1; semver discipline applies |
| Cadence | **active development** — daily commits, weekly releases via changesets |
| Runtime | Node ≥22 LTS primary; Bun supported on `core/cli` |
| License | Apache-2.0 (framework) · MIT (`@ahamie/ui` registry items) |
| Tested on | macOS · Linux · Postgres 15+ with `pgvector` |
| Build | 27 packages green via `pnpm build` |
| Tests | **117 passing** across 38 test files |

---

## Quickstart

```bash
pnpm create ahamie my-brain
cd my-brain
pnpm exec ahamie db migrate
pnpm dev
```

The wizard prompts for Postgres source (auto-spin Docker / paste URL), AI provider, connectors to scaffold, UI primitives, and Better-Auth.

The `dev` command boots three things:

```
▸ ahamie-proxy   listening on http://127.0.0.1:7787  (bearer: $AHAMIE_PROXY_TOKEN)
▸ ahamie-app     listening on http://127.0.0.1:3000
▸ ahamie-runner  in-proc (Mastra workflow)
```

---

## A 30-second tour of the surface

```ts
import { defineAgent }       from "@ahamie/agent";
import { defineAutomation, on } from "@ahamie/automation";
import { defineSuite }       from "@ahamie/eval";
import { recordOutcome }     from "@ahamie/outcomes";
import { z }                 from "@ahamie/schema";

// 1. Define an agent with a budget cap.
export const summarizer = defineAgent({
  name: "engineering-summarizer",
  model: "anthropic/claude-sonnet-4.6",
  instructions: "Summarize yesterday's #engineering channel.",
  scope: { org: "$ORG_ID" },
  budget: { cap_usd: 0.5, on_cap: "pause" },
  output: z.object({
    bullets: z.array(z.object({
      summary: z.string(), permalink: z.string().url(),
    })).max(5),
  }),
});

// 2. Wire it into an automation. `on.cron` is editor-typed via module augmentation.
export default defineAutomation({
  id: "daily-eng-summary",
  trigger: on.cron("0 8 * * 1-5", { timezone: "America/New_York" }),
  actions: [
    { kind: "agent.run", agent: summarizer, input: ({ event }) => ({ since: event.firedAt }) },
    { kind: "gateway.send", target: "slack:#leadership", template: "review_card_v1",
      from: ({ steps }) => steps[0] },
  ],
  budget: { dimension: "ai_compute", cap_usd: 0.5, on_cap: "pause" },
  approval: { mode: "post-only" },
});
```

---

## What you get

| Layer | Packages |
|---|---|
| **Substrate**   | `@ahamie/{schema, storage, blobstore, cas, telemetry}` |
| **Identity**    | `@ahamie/identity` — Better-Auth + ACL + L1+L2 tenancy |
| **Runtime**     | `@ahamie/{agent, workflow, memory, rag, workspace}` (Mastra wrap) |
| **Trust boundary** | `@ahamie/connector-proxy` — separate process, **5 invariants I1–I5** |
| **Connectors**  | `@ahamie/connector-{slack, github, linear}` |
| **Automation**  | `@ahamie/automation` — Trigger→Event→Run→Action→Delivery, typed `on.*` |
| **Closed loop** | `@ahamie/{outcomes, eval}` — sensor isolation + hidden-golden + software factory |
| **SDK + CLI**   | `@ahamie/sdk`, `@ahamie/cli`, `create-ahamie` |
| **UI primitives** | `@ahamie/ui` — 5 shadcn components |
| **Sandbox adapters** | `@ahamie/sandbox-{local, docker, compute-sdk}` |

---

## Repo layout

```
ahamie/
├─ packages/         # 22 framework packages
├─ connectors/       # slack, github, linear
├─ examples/
│   ├─ company-brain-in-a-box/     # the canonical reference app
│   ├─ minimal-agent/
│   └─ approval-gate/
├─ apps/
│   └─ docs/         # Astro + Starlight (Diataxis)
├─ SPEC.md           # the full v0 tech plan
├─ GOVERNANCE.md     # anti-rug-pull pledge
└─ README.md
```

---

## Documentation

**Live → [ahamie-docs.vercel.app](https://ahamie-docs.vercel.app)**

Source in [`apps/docs`](./apps/docs) (Astro + Starlight, Diataxis-discipline):

- **Tutorials** — first-agent, closed-loop, software-factory
- **How-to guides** — connect-slack, add-connector, hidden-golden, migrate-db, multi-tenant
- **Reference** — packages, config, cli, schema, trigger-dsl, proxy-invariants, eval-metrics
- **Explanation** — closed-loop, wrap-mastra, sensor-isolation, tenancy-ladder, naming

Run locally:

```bash
pnpm --filter @ahamie/docs dev
```

---

## Contributing

We use **DCO** (`Signed-off-by:`), not a CLA. See [`GOVERNANCE.md`](./GOVERNANCE.md).

```bash
git clone https://github.com/octalpixel/ahamie
cd ahamie
pnpm install
pnpm build
AHAMIE_TEST_PG_URL=postgres://localhost:5432/ahamie_test pnpm test
```

---

## License

Framework: [Apache-2.0](./LICENSE). UI registry items in `@ahamie/ui`: MIT.

---

<div align="center">
<sub>built with care · self-host-first · the company brain you own</sub>
</div>
