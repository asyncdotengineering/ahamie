# @ahamie/workflow

## 0.2.0

### Minor Changes

- # v0.1.0 — the wedge (straight out of the oven)

  The v0 build per [`SPEC.md`](../SPEC.md). 27 packages, 117 tests.

  - **Substrate**: `@ahamie/{schema,storage,blobstore,cas,telemetry}` — Postgres + pgvector, branded ID types, content-addressed object DAG, OTel.
  - **Identity**: `@ahamie/identity` — Better-Auth + ACL + L1+L2 tenancy from day 1.
  - **Runtime (Mastra wrap)**: `@ahamie/{agent,workflow,memory,rag,workspace}` — wrap-and-hide with escape hatch open.
  - **Trust boundary**: `@ahamie/connector-proxy` — separate Hono process, **five invariants I1–I5** unit-tested.
  - **Connectors**: Slack, GitHub, Linear adapters.
  - **Automation**: `@ahamie/automation` — Trigger→Event→Run→Action→Delivery, typed `on.*` proxy via module augmentation.
  - **Closed loop**: `@ahamie/outcomes` (sensor isolation) + `@ahamie/eval` (8 metrics + hidden-golden + software factory).
  - **SDK + CLI + UI**: `@ahamie/sdk`, `@ahamie/cli` (16 verbs), `@ahamie/ui` (5 shadcn primitives), `create-ahamie` scaffolder.
  - **Sandboxes**: local-bwrap, docker, compute-sdk adapters.

  Reference app: [`examples/company-brain-in-a-box`](https://github.com/ahamie/ahamie/tree/main/examples/company-brain-in-a-box).

### Patch Changes

- Updated dependencies
  - @ahamie/schema@0.2.0
  - @ahamie/telemetry@0.2.0
  - @ahamie/storage@0.2.0
