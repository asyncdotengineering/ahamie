---
title: Package map
description: Every @ahamie/* package, what it does, and which layer it lives in.
---

## Substrate (Layer 1)

| Package | Purpose |
|---|---|
| `@ahamie/schema`    | Standard-Schema-conformant Zod re-export, branded ID types, common refinements |
| `@ahamie/storage`   | Drizzle schema + migrations + pgvector helpers; postgres-js driver |
| `@ahamie/blobstore` | Byte tier interface (`put/get/delete/list/stream`); local-FS impl |
| `@ahamie/cas`       | Content-addressed object DAG; `put/get/link` at v0 |
| `@ahamie/telemetry` | OTel SDK init + Mastra-Observability bridge |

## Runtime (Layer 2)

| Package | Purpose |
|---|---|
| `@ahamie/identity`        | Better-Auth wrap + ACL + `requireOrg` Hono middleware |
| `@ahamie/agent`           | Wraps `@mastra/core` `Agent` with budget caps + outcome hooks + LISTEN/NOTIFY cancel |
| `@ahamie/workflow`        | Wraps Mastra workflow engine; in-process default |
| `@ahamie/memory`          | Wraps `@mastra/memory` against pgvector |
| `@ahamie/rag`             | Wraps `@mastra/rag` (`MDocument`, vector tools, rerankers) |
| `@ahamie/workspace`       | FS + Sandbox + Search + Skills + LSP; CAS-backed snapshots |
| `@ahamie/automation`      | `Trigger → Event → Run → Action → Delivery`; typed `on.*` proxy via module augmentation |
| `@ahamie/manifest`        | App manifest types (`defineApp`, `defineAction`, `defineView`, `defineResource`) |
| `@ahamie/registry`        | Local app registry; v2 federates |
| `@ahamie/connector-proxy` | Standalone Hono server; the trust boundary; **five invariants I1–I5** |
| `@ahamie/outcomes`        | `record` + `attribute`; sensor isolation guard |
| `@ahamie/eval`            | `defineSuite`, `runSuite`, 8 metrics, `defineSoftwareFactory` outer loop |

## SDK + CLI (Layer 4)

| Package | Purpose |
|---|---|
| `@ahamie/sdk`     | Public surface re-exporting L2; `defineAhamieConfig` |
| `@ahamie/cli`     | The `ahamie` binary; 16 verbs |
| `create-ahamie`   | `pnpm create ahamie my-brain` scaffolder |

## UI (Layer 3)

| Package | Purpose |
|---|---|
| `@ahamie/ui` | Five v0 shadcn primitives: `AgentRunTree`, `RunConsole`, `ApprovalInbox`, `ConnectorSetup`, `ManifestEditor` |

## Sandbox adapters

| Package | Purpose |
|---|---|
| `@ahamie/sandbox-local`       | bwrap on Linux; auto rule |
| `@ahamie/sandbox-docker`      | macOS / Windows fallback |
| `@ahamie/sandbox-compute-sdk` | Opt-in: e2b / Modal / Daytona |

## Connectors

| Package | Purpose |
|---|---|
| `@ahamie/connector-slack`  | Slack web + events |
| `@ahamie/connector-github` | REST + webhooks |
| `@ahamie/connector-linear` | GraphQL + webhooks |
