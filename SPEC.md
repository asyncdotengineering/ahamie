# Ahamie — Concrete Tech Plan (v1)

| Field | Value |
|---|---|
| **Title** | Ahamie — Concrete Tech Plan (TypeScript-first; Mastra-wrapped; self-host-first) |
| **Doc ID** | TECH-0001 |
| **Status** | Draft |
| **Created** | 2026-05-01 |
| **Authors** | TBD (principal platform engineering) |
| **Reviewers** | TBD (security, AI-platform, devrel, infra) |
| **Supersedes** | n/a |
| **Depends on** | Phase-2 OpenSail wiki ([`../phase2/`](../phase2/)), Phase-3 AI-Native wiki ([`../phase3/wiki/`](../phase3/wiki/)), Phase-4 PRD ([`../phase4/prd.md`](../phase4/prd.md)), Phase-5 Devtool product spec ([`../phase5/devtool-product.md`](../phase5/devtool-product.md)), Phase-6 RFC-0001 ([`../phase6/rfc.md`](../phase6/rfc.md)). Research: [`../../research/mastra-teardown.md`](../../research/mastra-teardown.md), [`../../research/voltagent-teardown.md`](../../research/voltagent-teardown.md). |
| **Scope** | Concrete language, package, library, and service picks for v0; the v1/v2/v3 deferral list. **Does** pick a tech stack. **Does not** redo product framing or contracts; those live upstream. |
| **Normative language** | RFC-2119 (MUST / SHOULD / MAY). |

---

## 1. Summary

Phase 6 RFC-0001 specified the Headless Company-Brain Framework as a layered, contract-first system. It deliberately deferred tech-stack picks. This document closes that gap: it picks the languages, libraries, and managed services for v0, names the package layout under the `@ahamie/*` namespace, and lays out an 8-week implementation plan anchored to a single concrete reference application.

The wedge is unchanged: a self-host-first, source-available framework that platform-engineering teams install the way they install Backstage, Inngest, or Temporal. What changes here is the *shape of the bet*: instead of writing an agent runtime from zero, we wrap Mastra (`@mastra/core` + the typed observability subsystem + the storage/memory/RAG packages + the in-process + Inngest workflow engine) and contribute the closed-loop primitives (`RunOutcome`, hidden-golden eval, software-factory mode, connector-proxy trust boundary) that Mastra deliberately omits. Everything else — durable execution, MCP wiring, sandboxing, workspace FS — is leverage we take from Mastra; the closed-loop discipline and the trust boundary are what we own.

Headline picks (each tied to one of the 19 locked decisions in §4):

- **Runtime.** Node ≥22 LTS primary; Bun supported on `core/cli` only. (T1)
- **Monorepo.** pnpm + turborepo + changesets. (T2)
- **Mastra adoption.** Hybrid wrap-and-hide: `@ahamie/agent`, `@ahamie/workflow`, `@ahamie/memory`, `@ahamie/rag` mirror Mastra packages and enforce our invariants; the escape hatch to import `@mastra/core` directly is open. (T3, T4)
- **Storage.** Postgres everywhere via Drizzle ORM + postgres-js + pgvector. No PGlite, no SQLite. Three substrate packages: `@ahamie/storage`, `@ahamie/blobstore`, `@ahamie/cas`. (T5)
- **Schema.** Standard Schema as the contract, Zod as the default. (T6)
- **Trigger DSL.** Typed `on.*` proxy + module-augmentation namespace, three first-class delivery modes (webhook, polling, schedule), public handler context. (T7)
- **Connector Proxy + MCP.** Separate Hono process from day 1, five non-negotiable invariants, MCP runs *inside* the proxy. (T8)
- **HTTP.** Hono everywhere; ORPC for typed RPC; SSE for run streams. (T9)
- **Auth.** Better-Auth as default; `@ahamie/identity` adapter contract for swap-out. (T10)
- **UI.** shadcn registry + AI Elements as real deps; `@ahamie/ui` is five v0 primitives. (T11)
- **Sandbox.** Mastra `LocalSandbox` (bubblewrap on Linux) + Docker fallback + opt-in compute SDK. (T12)
- **Eval + Outcomes.** Two packages from day 1: passive `@ahamie/outcomes`, active `@ahamie/eval`. (T13)
- **Telemetry.** Mastra's typed observability owns AI spans; `@ahamie/telemetry` thin OTel layer for everything else. (T14)
- **CLI.** Mastra alignment (commander + `@clack/prompts` + tsup). Two packages: `@ahamie/cli`, `create-ahamie`. (T15)
- **Tests + lint.** Vitest + Biome v2 + Playwright. CI matrix as below. (T16)
- **License.** Apache-2.0 framework, MIT for `@ahamie/ui` registry items. Anti-rug-pull pledge in `GOVERNANCE.md`. (T17)
- **Naming.** **Ahamie**, "ah-HAH-mee," rhymes with salami. Tamil *aham* (self / inner core) hidden inside. `@ahamie/*` on npm. (T18)
- **Multi-tenancy.** Tenant model from day 1 via Better-Auth `organization`; v0 ships L1+L2 enforcement; L3 (RLS) at v1; L4/L5 at v2/v3. (T19)

The reader of this document SHOULD be able to take it and start writing code on day 1. Where this document has no opinion (pricing, governance timing, MCP-out vs MCP-in priority, BYOK economics, marketplace cold-start), §11 says so.

---

## 2. Pronunciation + Naming

> **Ahamie** — pronounced **"ah-HAH-mee"** (rhymes with **salami**). Tamil root *aham* (அகம், meaning *self / inner core*) is hidden inside the spelling. npm namespace is `@ahamie/*`. CLI binary is `ahamie`. Trademark is clean across USPTO classes 009 (software) and 042 (SaaS) — different prefix from Akamai, no audible collision; we deliberately switched off "Akamie" to pre-empt that risk.
>
> Stylization: lowercase `ahamie` in code and CLI; capitalized `Ahamie` in prose, marketing, and the trademark filing. The wordmark uses no special characters or diacritics — ASCII-stable across keyboards.
>
> Logomark: rendered with the *aham* (the inner core) as a subtly highlighted syllable. Tagline candidate: *"the company brain you own."*

---

## 3. The 19 Locked Decisions

This table is load-bearing. Every section of this document derives from one of these rows. Read it as the index.

| ID | Area | Pick | Rationale (1 line) | Growth path |
|---|---|---|---|---|
| **T1** | Runtime | Node ≥22 LTS primary; Bun supported on `core/cli` only | Mastra requires Node 22.13+; Bun-first kills several adapters (`@mastra/observability`, sandbox FS) | v1+: lift Bun to second-class on more packages as adapters certify |
| **T2** | Monorepo | pnpm + turborepo + changesets | Mastra alignment; the muscle memory the audience already has | v2+: split the changesets pipeline if release cadence diverges per package family |
| **T3** | Mastra adoption | Hybrid C — wrap-and-hide default, escape hatch open | Mastra is the only TS-first agent runtime with workflow + memory + storage + observability typed end-to-end; rewriting from zero is malpractice | v1+: optional `@ahamie/runtime-direct` re-export for power users; v2+: contribute upstream and shrink our own wrappers |
| **T4** | Workflow engine | Mastra in-process default + Inngest adapter; wrapped behind `@ahamie/automation` | Mastra ships both already; Trigger→Event→Run→Action→Delivery is *our* contract over either engine | v1: ship `@ahamie/automation-inngest` recipe; v2+: optional Restate/Temporal adapter |
| **T5** | Storage | Postgres everywhere; Drizzle + postgres-js + pgvector; `@ahamie/storage` + `@ahamie/blobstore` + `@ahamie/cas` | Lift-and-shift to prod; PGlite/SQLite are dev-only traps that drift schemas | v1: S3-compat blobstore adapter; v1+: full CAS impl (`fork`, `walk`, `refs`); v2: cross-region replication |
| **T6** | Schema | Standard Schema contract; Zod default | Mastra + ORPC + Better-Auth all converge on Standard Schema; Zod's familiar | v1+: Valibot/Effect-Schema contributors can plug in via Standard Schema |
| **T7** | Trigger DSL | Typed `on.*` proxy + module-augmentation `AhamieTriggerNamespace`; webhook/polling/schedule first-class | Module augmentation gives editor inference; runtime registration keeps it open | v1: connector packages augment the namespace at install; v2: third-party trigger sources |
| **T8** | Connector Proxy + MCP | Separate Hono process from day 1; five invariants; MCP through proxy | Mastra's MCP holds tokens in agent memory — RFC §8.5 violation; we MUST wrap | v1: K8s sidecar mode; v2: per-tenant proxy isolation; v3: hardware-key-backed tokens |
| **T9** | HTTP | Hono everywhere; ORPC for typed RPC; SSE for streams; WS at v1+ | Hono is the standard cross-runtime HTTP layer; ORPC is Standard-Schema native and emits OpenAPI | v1+: WebSockets for multi-user dashboards; v2: gRPC bridge for Go/Rust consumers |
| **T10** | Auth + Identity | Better-Auth default + `@ahamie/identity` adapter | Better-Auth has Drizzle + Hono first-party; organization plugin gives tenant from day 1 | v1: Authentik/Keycloak adapters; v2: SCIM provisioning; v3: FedRAMP-grade |
| **T11** | UI primitives | shadcn-ui + ai-elements as deps; `@ahamie/ui` is a 5-component shadcn registry | LiveKit pattern: own the components in your repo, theme with CSS vars, no Tailwind config of our own | v1+: 7 more primitives (`DashboardComposer`, `MarketplaceShell`, `EvalDashboard`, `AuditLogViewer`, `WorkspaceSwitcher`, `SnapshotPicker`, `BillingPanel`) |
| **T12** | Sandbox | Mastra `LocalSandbox` (bwrap) default + `@ahamie/sandbox-docker` fallback + `@ahamie/sandbox-compute-sdk` opt-in | Bwrap on Linux is the cheapest secure sandbox; Docker covers macOS/Windows; e2b/Modal/Daytona for elastic | v1: localhost+allowlist egress; v2: hard-deny + DLP; v3: microVMs (Firecracker) |
| **T13** | Eval + Outcomes | Two packages: `@ahamie/outcomes` (passive) + `@ahamie/eval` (active) | Sensor isolation REQUIRES they be separable; one writes, one reads | v1+: `eval-promptfoo`, `eval-inspect-ai`, `eval-braintrust`, `eval-langsmith` adapters |
| **T14** | Telemetry | Mastra `Observability` owns AI spans; `@ahamie/telemetry` thin OTel for non-Mastra layers | One pipeline at the exporter; bridge via `@mastra/observability` | v1+: `telemetry-otlp`, `telemetry-langfuse`, `telemetry-sentry` adapters |
| **T15** | CLI | commander + `@clack/prompts` + picocolors + yocto-spinner + execa + fs-extra + tsup | Mastra alignment; same UX vocabulary the audience already trains on | v1: plugin extensibility via `package.json` `ahamie.plugin`; v2: WASM-distributed binary |
| **T16** | Tests + lint | Vitest + Biome v2 + Playwright + simple-git-hooks + lint-staged | Biome v2 replaces eslint+prettier; Vitest matches Mastra; Playwright for UI primitives | v1+: fast-check property tests; v2: chaos tests for the proxy |
| **T17** | License | Apache-2.0 framework; MIT for `@ahamie/ui` registry items | Apache-2 = irrevocable; MIT matches shadcn norm; commercial code lives in a separate repo | v2: foundation evaluation gate at 5k stars or v2.0 release |
| **T18** | Naming | **Ahamie** ("ah-HAH-mee"), `@ahamie/*` | Tamil *aham* hidden; trademark-clean; no Akamai collision | n/a |
| **T19** | Multi-tenancy | `Organization` via Better-Auth; `org_id` on every tenant row from v0; L1+L2 enforcement at v0 | Tenant-as-afterthought is the most expensive mistake; cheap to add now, painful at v2 | v1: Postgres RLS (L3); v2: schema-per-tenant (L4); v3: DB-per-tenant (L5) |

---

## 4. Final Stack Diagram

The diagram below collapses the RFC's five-layer model onto concrete picks. The left column is the layer; the middle is the contract (RFC); the right is the v0 implementation.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Layer 5  Packaging / Reference architectures                                                 │
│    contract: solo laptop · team-shared · regulated VPC                                       │
│    pick:    `pnpm create ahamie` (auto Docker postgres) · Helm chart (v1) · Terraform (v2)   │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Layer 4  Framework SDKs + CLI                                                                │
│    contract: schema-first; bindings generatable; CLI verbs (init/dev/build/eval/…)           │
│    pick:    @ahamie/sdk (TS) · @ahamie/cli (commander+clack+tsup) · create-ahamie (T15)      │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Layer 3  UI primitives — shadcn-style, host-owned, themed                                    │
│    contract: 5 v0 primitives; CSS-var theming; a11y AA; swap-out points                      │
│    pick:    shadcn-ui registry · ai-elements · @ahamie/ui (5 components) (T11)               │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Layer 2  Runtime primitives — durable, headless                                              │
│    Workspace      → @ahamie/workspace (wraps @mastra/workspace-*: agentfs/sandbox)           │
│    Agent loop     → @ahamie/agent (wraps @mastra/core Agent; adds outcome hook)              │
│    Automation     → @ahamie/automation (wraps Mastra workflow + Inngest adapter) (T4)        │
│    App / Manifest → @ahamie/manifest + @ahamie/registry                                      │
│    Connector Proxy→ @ahamie/connector-proxy (Hono, separate process, MCP-inside) (T8)        │
│    Snapshot+CAS   → @ahamie/cas + @ahamie/blobstore (T5)                                     │
│    Identity+ACL   → @ahamie/identity (Better-Auth + organization) (T10, T19)                 │
│    Eval           → @ahamie/outcomes + @ahamie/eval (T13)                                    │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Layer 1  Substrate — properties, not products                                                │
│    Identity store  → Better-Auth on Postgres (T10)                                           │
│    Relational      → Postgres + Drizzle + postgres-js (T5)                                   │
│    KV/cache        → Postgres LISTEN/NOTIFY at v0; Redis adapter at v1                       │
│    Object/CAS      → local-FS at v0; S3-compat adapter at v1 (T5)                            │
│    Eventing/queue  → Mastra in-proc + Inngest adapter (T4)                                   │
│    Sandbox         → @mastra/local-sandbox (bwrap) + Docker fallback (T12)                   │
│    Secret manager  → .env (dev) → Postgres-encrypted credentials (team) → Vault (v1+)        │
│    Model gateway   → Mastra's model router (incl. cache, BYOK) + LiteLLM adapter (v1)        │
│    Observability   → Mastra Observability + OTel via @ahamie/telemetry (T14)                 │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**The critical structural claim:** the *Layer 2 contracts* (RFC §8) are owned by Ahamie. The *implementations* are 1:1 wrappers around Mastra at v0. The cost of Mastra is one indirection (`@ahamie/agent` re-exports `Agent` with our outcome hook attached); the benefit is the entire AI-spans observability tree, durable workflows, memory layers, RAG pipelines, sandbox/FS adapters, and MCP code we don't write.

---

## 5. Package layout (the `@ahamie/*` namespace)

The framework ships as ~25 packages at v0, with a clear v1+ growth path. Every package is Apache-2.0 (or MIT for `@ahamie/ui` registry items per T17). Every package publishes typed exports, ESM-first, with a `dist/cjs` shim for Node CJS consumers.

### 5.1 Substrate packages (Layer 1 wrappers)

| Package | Purpose | Top-3 deps | Size est. | License |
|---|---|---|---|---|
| `@ahamie/storage` | Drizzle schema, migrations, pgvector index helpers | `drizzle-orm`, `postgres`, `@ahamie/schema` | ~2k LOC | Apache-2 |
| `@ahamie/blobstore` | Byte tier interface (`put/get/delete/list/stream`); local-FS impl | `node:fs`, `@ahamie/schema` | ~600 LOC | Apache-2 |
| `@ahamie/cas` | Content-addressed object DAG (`put/get/link/walk/fork/refs`); v0 ships interface, only `put/get/link` impl | `@ahamie/blobstore`, `multiformats` | ~1k LOC | Apache-2 |
| `@ahamie/schema` | Re-exports Zod + common refinements (`Email`, `Url`, `Slug`, `ConnectorRef`); Standard-Schema-conformant | `zod`, `@standard-schema/spec` | ~400 LOC | Apache-2 |
| `@ahamie/telemetry` | Configures Mastra `Observability` + OTel for non-Mastra layers | `@mastra/observability`, `@opentelemetry/api`, `@opentelemetry/sdk-node` | ~800 LOC | Apache-2 |

### 5.2 Runtime primitive packages (Layer 2)

| Package | Purpose | Top-3 deps | Size est. | License |
|---|---|---|---|---|
| `@ahamie/agent` | Wraps `@mastra/core` `Agent`; enforces budget, scope, outcome hook | `@mastra/core`, `@ahamie/schema`, `@ahamie/telemetry` | ~1.5k LOC | Apache-2 |
| `@ahamie/workflow` | Wraps Mastra workflow engine; defaults to in-proc; Inngest adapter via `@ahamie/automation-inngest` (v1) | `@mastra/core`, `@ahamie/schema` | ~1.2k LOC | Apache-2 |
| `@ahamie/memory` | Wraps `@mastra/memory`; pgvector-backed default | `@mastra/memory`, `@ahamie/storage` | ~600 LOC | Apache-2 |
| `@ahamie/rag` | Wraps `@mastra/rag` (`MDocument`, vector tools, rerankers) | `@mastra/rag`, `@ahamie/storage` | ~500 LOC | Apache-2 |
| `@ahamie/workspace` | Wraps Mastra Workspace (FS+Sandbox+Search+Skills+LSP); AgentFS default | `@mastra/workspace-fs-agentfs`, `@mastra/workspace-sandbox-computesdk`, `@ahamie/cas` | ~1k LOC | Apache-2 |
| `@ahamie/automation` | Trigger→Event→Run→Action→Delivery contract over the workflow engine; typed `on.*` namespace; `defineTrigger`, `defineProvider` | `@ahamie/workflow`, `@ahamie/schema`, `hono` | ~2k LOC | Apache-2 |
| `@ahamie/manifest` | App manifest types, `defineApp`, `defineAction`, `defineView`, `defineResource` | `@ahamie/schema`, `@ahamie/cas` | ~1k LOC | Apache-2 |
| `@ahamie/registry` | App registry client + bundle hashing; v0 local-only | `@ahamie/cas`, `@ahamie/manifest` | ~600 LOC | Apache-2 |
| `@ahamie/connector-proxy` | Standalone Hono server: token holding, allowlist, MCP-inside, audit | `hono`, `@mastra/mcp`, `@ahamie/storage` | ~2.5k LOC | Apache-2 |
| `@ahamie/identity` | Better-Auth wrapper + ACL; org from day 1 | `better-auth`, `@ahamie/storage` | ~1.2k LOC | Apache-2 |
| `@ahamie/outcomes` | Passive: `record(runId, type, value, source)`; instrumented in automation/approval/factory/proxy | `@ahamie/storage`, `@ahamie/telemetry` | ~500 LOC | Apache-2 |
| `@ahamie/eval` | Active: `defineSuite`, `run`, `defineSoftwareFactory`; hidden golden | `@mastra/evals`, `@ahamie/storage` | ~1.5k LOC | Apache-2 |

### 5.3 SDK + CLI

| Package | Purpose | Top-3 deps | Size est. | License |
|---|---|---|---|---|
| `@ahamie/sdk` | Public surface re-exporting the right subset of L2; `defineAhamieConfig` | (re-exports) | ~300 LOC | Apache-2 |
| `@ahamie/cli` | `ahamie` binary: `create | dev | build | deploy | ui add | publish | install | login | logout | run | eval | triggers | db migrate | db studio | secrets` | `@commander-js/extra-typings`, `@clack/prompts`, `execa` | ~3k LOC | Apache-2 |
| `create-ahamie` | `pnpm create ahamie my-app` scaffolder | `@clack/prompts`, `picocolors`, `fs-extra` | ~700 LOC | Apache-2 |

### 5.4 UI

| Package | Purpose | Top-3 deps | Size est. | License |
|---|---|---|---|---|
| `@ahamie/ui` | shadcn registry: `AgentRunTree`, `RunConsole`, `ApprovalInbox`, `ConnectorSetup`, `ManifestEditor` | `react`, `ai-elements`, `@radix-ui/*` | ~2k LOC, copy-pasted | MIT |

### 5.5 Adapters (v0)

| Package | Purpose | Top-3 deps | Size est. | License |
|---|---|---|---|---|
| `@ahamie/sandbox-local` | Re-exports `@mastra/local-sandbox`; `auto` rule (Linux+bwrap) | `@mastra/local-sandbox` | ~200 LOC | Apache-2 |
| `@ahamie/sandbox-docker` | Docker fallback for macOS/Windows | `dockerode`, `@ahamie/schema` | ~500 LOC | Apache-2 |
| `@ahamie/sandbox-compute-sdk` | Opt-in: e2b / Modal / Daytona via `compute-sdk` | `@mastra/workspace-sandbox-computesdk` | ~300 LOC | Apache-2 |
| `@ahamie/connector-slack` | Slack adapter (web + events + manifest); 150-LOC body | `@slack/web-api`, `@ahamie/connector-proxy` | ~600 LOC (incl. types) | Apache-2 |
| `@ahamie/connector-github` | GitHub adapter (REST + webhooks) | `@octokit/rest`, `@ahamie/connector-proxy` | ~500 LOC | Apache-2 |
| `@ahamie/connector-linear` | Linear adapter | `@linear/sdk`, `@ahamie/connector-proxy` | ~400 LOC | Apache-2 |

### 5.6 v1+ growth (deferred but reserved on npm)

| Package | Adds | Tier |
|---|---|---|
| `@ahamie/automation-inngest` | Durable workflow recipe via Inngest | v1 |
| `@ahamie/blobstore-s3` | S3-compatible blobstore | v1 |
| `@ahamie/identity-authentik`, `@ahamie/identity-keycloak` | Alternative IdPs | v1 |
| `@ahamie/eval-promptfoo`, `@ahamie/eval-inspect-ai`, `@ahamie/eval-braintrust`, `@ahamie/eval-langsmith` | Eval adapter ecosystem | v1+ |
| `@ahamie/telemetry-otlp`, `@ahamie/telemetry-langfuse`, `@ahamie/telemetry-sentry` | Telemetry exporters | v1+ |
| `@ahamie/sandbox-firecracker`, `@ahamie/sandbox-gvisor` | Stronger isolation | v2 |
| `@ahamie/connector-{notion,hubspot,drive,salesforce,gmail}` | Connector pack | v1 |
| `@ahamie/marketplace` | Federated registry server | v2 |
| `@ahamie/billing` | Spend rollups + dimension router | v2 |

### 5.7 Repo layout

```
ahamie/
├─ packages/
│   ├─ schema/        storage/        blobstore/      cas/
│   ├─ telemetry/     identity/       outcomes/       eval/
│   ├─ agent/         workflow/       memory/         rag/
│   ├─ workspace/     automation/     manifest/       registry/
│   ├─ connector-proxy/   sdk/        cli/            ui/
│   ├─ create-ahamie/
│   └─ sandbox-{local,docker,compute-sdk}/
├─ connectors/
│   └─ slack/  github/  linear/
├─ examples/
│   ├─ company-brain-in-a-box/   (the reference app, §9)
│   ├─ minimal-agent/
│   └─ approval-gate/
├─ apps/
│   └─ docs/         (Astro + Starlight; v1)
├─ .changeset/
├─ biome.json
├─ turbo.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ LICENSE  NOTICE  GOVERNANCE.md  CODE_OF_CONDUCT.md  SECURITY.md
└─ README.md
```

---

## 6. v0 Implementation Plan (Phase A — 8 weeks)

The 8-week plan compiles the locked decisions into a sequence with explicit deliverable / validation question / exit criterion per week. The plan is anchored on the "first 90 seconds" `pnpm create ahamie` flow (§6.1) and the reference app (§7).

### 6.0 Pre-week — repo bootstrap (≤ 3 days)

- pnpm + turborepo + changesets initialized.
- Biome v2 + simple-git-hooks + lint-staged + Vitest configured at root.
- CI matrix wired in GitHub Actions: `test:core` (Node 22 + Node 24 + Bun latest), `test:proxy` (Node 22+24 only), `test:ui` (Node 22 + Playwright), `lint`, `typecheck`. (T16)
- `LICENSE` (Apache-2.0), `NOTICE`, `GOVERNANCE.md` (anti-rug-pull pledge: irrevocable license; DCO sign-offs not CLA; schema repo CC0; foundation evaluation gate at v2.0 or 5k stars), `CODE_OF_CONDUCT.md` (Contributor Covenant), `SECURITY.md` (90-day disclosure).

### 6.1 The first 90 seconds — the load-bearing first impression

```
$ pnpm create ahamie my-brain
◇ Use existing Postgres or auto-spin Docker?  ▸ auto-spin Docker
◇ AI provider?                                ▸ Anthropic (paste key, or skip → Ollama)
◇ Connectors to scaffold?                     ▸ slack, github
◇ Add UI primitives (shadcn)?                 ▸ yes
◇ Install Better-Auth?                        ▸ yes
✓ scaffolded my-brain (47 files)
✓ docker compose up -d ahamie-postgres
✓ pnpm install
✓ pnpm exec ahamie db migrate
✓ pnpm exec shadcn init
✓ pnpm exec ai-elements add
✓ pnpm exec ahamie ui add agent-run-tree run-console approval-inbox
✓ pnpm exec ahamie identity init           # better-auth schema + first org
$ cd my-brain && pnpm dev
▸ ahamie-proxy   listening on http://127.0.0.1:7787  (bearer: $AHAMIE_PROXY_TOKEN)
▸ ahamie-app     listening on http://127.0.0.1:3000
▸ ahamie-runner  in-proc (Mastra workflow)
✓ first-app health check: green
```

Each step is independently reproducible — a developer who runs `pnpm exec shadcn init` separately, or `pnpm exec ai-elements add` separately, MUST get the same result the wizard produced.

### 6.2 Week-by-week

| Week | Deliverable | Validation question | Exit criterion |
|---|---|---|---|
| **W1 — Substrate + schema** | `@ahamie/storage` (Drizzle + postgres-js + pgvector); `@ahamie/schema` (Zod re-export + Standard-Schema conformance); migrations CLI (`ahamie db migrate`, `ahamie db studio`); base tables: `organizations`, `users`, `memberships`, `delegations`, `runs`, `automation_events`, `automation_runs`, `agent_steps`, `outcomes`, `manifests`, `connectors`, `credentials`, `audit_log`. | Can a fresh checkout produce a green migration against a Docker Postgres in < 60s? | `pnpm test:core` green on Node 22+24+Bun; migration replay idempotent; pgvector extension installed by migration. |
| **W2 — Identity + multi-tenancy** | `@ahamie/identity` wrapping Better-Auth with the `organization`, `magic-link`, `passkey`, `2fa`, `bearer`, `multi-session` plugins; `org_id` on every tenant-scoped row; L1 enforcement (branded types in Drizzle) + L2 enforcement (ORPC/Hono middleware that rejects requests without `org_id` claim). | Can a v0 install create two orgs and prove they cannot read each other's `automation_runs`? | Two-org isolation test in `test:core`; `delegation` row written when `agent-on-behalf-of(user)` issues a request. |
| **W3 — Agent + workflow + memory + RAG (Mastra wrap)** | `@ahamie/agent`, `@ahamie/workflow`, `@ahamie/memory`, `@ahamie/rag` 1:1 mirror Mastra; outcome hook attached to every agent run; budget enforcement (`cap_usd`, `on_cap`); cancellation flag wired through Postgres LISTEN/NOTIFY. | Can a developer write `defineAgent({...})` from `@ahamie/agent` and get the same DX as Mastra, with a budget that pauses on cap? | A budget-cap integration test passes; the same test using `import { Agent } from '@mastra/core'` directly also passes (escape hatch verified). |
| **W4 — Connector Proxy + MCP** | `@ahamie/connector-proxy` standalone Hono server; `Proxy.Forward`, `Proxy.RegisterAdapter`, `Proxy.Grant`, `Proxy.Revoke`; five invariants enforced (I1..I5); `@mastra/mcp` `MCPClient` runs *inside* the proxy; agents call `ahamie.mcp.tools(id)` over HTTP; HMAC ingress for webhooks; allowlist linter. | Can a security review verify all five invariants by reading test cases (no token in audit row, no token in logs, no token in response body, response Authorization stripped, HMAC required on inbound)? | Five `proxy.invariant.*` tests; child-process spawn-on-`ahamie dev`; `@ahamie/connector-slack` adapter passes the lint. |
| **W5 — Automation + Trigger DSL** | `@ahamie/automation`: `defineAutomation`, `defineTrigger`, `defineProvider`; typed `on.*` proxy via module augmentation (`AhamieTriggerNamespace`); built-ins `on.cron`, `on.webhook`, `on.manual.button`, `on.manual.api`, `on.appEvent`, `on.channel.message`; public handler context (`event`, `run`, `actor`, `ahamie`); idempotent `(automation_id, event_id)` insert; heartbeat + leader sweep. | Can a developer add a Slack-channel trigger via module augmentation and have the editor infer the event type without a separate codegen step? | Module augmentation snapshot tests; replay of a duplicated `event_id` produces zero side-effects. |
| **W6 — Eval + Outcomes + software-factory** | `@ahamie/outcomes` (`record`, `attribute`); instrumentation in automation runtime, approval gates, software-factory, connector proxy; `@ahamie/eval` (`defineSuite`, `run`, built-in metrics: `exactMatch`, `regex`, `jsonSchemaValid`, `toolCallContains`, `costUnder`, `latencyUnder`, `tokensUnder`, `customJudge`); hidden-golden partition via separate object-store prefix; `defineSoftwareFactory({spec, agent, suite, threshold})` outer loop; `ahamie eval` CLI verb; `ahamie factory run`. | Can a developer write a 30-line eval suite, run it locally, see hidden-golden score *separate* from observable score? | The reference app's eval suite passes; a sensor-isolation test confirms `RunOutcome.source` is a system the agent has no write access to. |
| **W7 — UI primitives + CLI polish** | `@ahamie/ui` shadcn registry with five components (`AgentRunTree`, `RunConsole`, `ApprovalInbox`, `ConnectorSetup`, `ManifestEditor`); `ahamie ui add <name>` verb; `@ahamie/cli` complete: `create | dev | build | deploy | ui add | publish | install | login | logout | run | eval | triggers | db migrate | db studio | secrets`; `create-ahamie` flow in §6.1 fully working. | Does `pnpm create ahamie my-brain` produce a running app with embedded UI primitives in < 90 s? (target excludes Docker pull on first run) | Playwright test: launch `create-ahamie`, navigate to /runs, see the agent run tree render against a sample run. |
| **W8 — Reference app + docs + cut v0.1** | `examples/company-brain-in-a-box`: `on.cron` automation, Slack-connector agent, `RunOutcome` attribution to a Linear issue close, eval suite, UI mounted at `/brain`. README is the tutorial. `apps/docs` v0 (Diátaxis: tutorial / how-to / reference / explanation). Changeset cut → publish v0.1 of all packages. | Can a senior platform engineer at a 200-person company *clone, run, ingest, compile, ship* in under 90 minutes with no help beyond the README and `ahamie doctor`? | Three external alpha installers reach the second connector; median TTFL < 4 hours; zero data-loss incidents in `ahamie export`. |

### 6.3 Build order rationale (why this order, not another)

- W1 first because storage is the spine. Without `@ahamie/storage`, identity, outcomes, and the proxy have nowhere to write.
- W2 (identity) before W3 (agent) so the agent's outcome hook can write under an `org_id` from the first commit. Tenant retrofitting is the #1 platform mistake.
- W3 (Mastra wrap) before W4 (proxy) so we have something to *call through* the proxy. The proxy without an agent is a reverse proxy demo.
- W4 (proxy) before W5 (automation) because automation triggers (especially `on.webhook`) MUST land at the proxy edge for HMAC verification; the automation runtime is downstream.
- W5 before W6 because eval needs runs to evaluate. (The eval harness without an automation is a unit test.)
- W7 (UI) and W8 (reference app) last because they consume everything. UI in the v0 wedge is *not* the front door — it's the proof the SDK is composable.

### 6.4 Per-week task breakdown (concrete tickets, not prose)

The granularity below is what the issue tracker should look like in week 0. Each bullet is one tracer-bullet PR.

**W1 — Substrate + schema**
- `@ahamie/schema`: re-export Zod; ship `Email`, `Url`, `Slug`, `ConnectorRef` refinements; assert Standard-Schema conformance with a type-level test.
- `@ahamie/storage`: Drizzle config + postgres-js client + `pgvector` migration; `tables/` files, one per concept.
- `@ahamie/storage`: typed migration runner (`ahamie db migrate`); idempotent replay assertion.
- `@ahamie/storage`: branded type generator (`OrgId`, `RunId`, `AutomationId`, …) for L1 tenant enforcement.
- `@ahamie/cli` (skeleton): wire `commander` + `@clack/prompts`; only `db migrate` and `db studio` verbs work this week.
- CI: green `test:core` matrix on Node 22 + Node 24 + Bun latest; Postgres ephemeral via `@testcontainers/postgresql`.

**W2 — Identity + multi-tenancy**
- `@ahamie/identity`: Better-Auth instance with `organization`, `magic-link`, `passkey`, `2fa`, `bearer`, `multi-session` plugins.
- `@ahamie/identity`: Drizzle adapter wired to `@ahamie/storage`'s `users`, `organizations`, `memberships` tables; `delegations` table added in this PR.
- `@ahamie/identity`: ACL `check(subject, action, resource)` returning `{allowed, reason}`; v0 supports the eight resource kinds (`project, automation, app, connector, credential, manifest, run, snapshot`).
- ORPC + Hono middleware: every route REQUIRES an `org_id` claim; reject 401 if absent. (T19 L2.)
- Two-org isolation integration test: org A creates a run; org B's session cannot read it via ORPC, raw SQL through the ORM (branded types prevent the query at compile time), or the audit-log endpoint.

**W3 — Agent + workflow + memory + RAG**
- `@ahamie/agent`: re-export `Agent` from `@mastra/core`; attach our outcome-hook in the constructor; assert that direct `from '@mastra/core'` import still works (escape hatch).
- `@ahamie/agent`: budget enforcement layer — preflight before each model call; `on_cap` policy (`pause | degrade | fail`).
- `@ahamie/agent`: cancellation flag via Postgres `LISTEN/NOTIFY` on `agent_runs.cancel_requested`.
- `@ahamie/workflow`: re-export Mastra workflow primitives; default to in-process engine; thin wrapper enforces the suspend/resume + idempotency contract.
- `@ahamie/memory`: re-export `@mastra/memory` configured against the storage package; pgvector default for vector backend.
- `@ahamie/rag`: re-export `@mastra/rag` (`MDocument`, `createVectorQueryTool`, rerankers); v0 path: PDF + markdown + plaintext.

**W4 — Connector Proxy + MCP**
- `@ahamie/connector-proxy`: standalone Hono server bootable as `ahamie proxy`; child-process spawn integrated into `ahamie dev`.
- Five invariant tests (one PR each):
  - I1: credentials resolved server-side; agent process never sees raw token.
  - I2: per-connector method+path allowlist; 403 on miss; allowlist linter in CI.
  - I3: caller `Authorization` header stripped *before* upstream forward.
  - I4: response auth headers stripped *before* return to caller.
  - I5: HMAC-verified inbound webhooks; mismatch → 401 + audit row.
- `@mastra/mcp` `MCPClient` runs *inside* the proxy; agents call `ahamie.mcp.tools(id)` over HTTP.
- `@ahamie/connector-slack` first adapter: 150-LOC body proves the shape.

**W5 — Automation + Trigger DSL**
- `@ahamie/automation`: `defineAutomation`, `defineProvider`, `defineTrigger` exports.
- Module augmentation prototype: `AhamieTriggerNamespace` extended by `@ahamie/connector-slack` to add `on.slack.message`.
- Built-in providers: `cron` (croner-backed), `webhook` (proxy-fronted), `manual.{button, api}`, `appEvent`, `channel.message`.
- Public handler context (`event`, `run`, `actor`, `ahamie`) — typed, not OTel side-channel.
- Idempotent run insertion (`INSERT … ON CONFLICT DO NOTHING` on `(automation_id, event_id)`).
- Heartbeat updater (every 10s) + leader sweep (every 30s, `heartbeat_at < now() - 30s` → reclaim).

**W6 — Eval + Outcomes + software-factory**
- `@ahamie/outcomes`: `record(runId, type, value, source)` + `attribute(runId, subject)`; instrumentation packages auto-register.
- `@ahamie/eval`: `defineSuite`, `run`, eight built-in metrics (`exactMatch`, `regex`, `jsonSchemaValid`, `toolCallContains`, `costUnder`, `latencyUnder`, `tokensUnder`, `customJudge`).
- Hidden-golden partition: separate object-store prefix; IAM excludes the agent's tools by construction.
- `defineSoftwareFactory({spec, agent, suite, threshold})`: wraps the outer loop; PAC threshold; tabu list across iterations.
- `ahamie eval` and `ahamie factory run` CLI verbs.
- Sensor-isolation test: assert `RunOutcome.source` is not in the agent's writable set.

**W7 — UI primitives + CLI polish**
- `@ahamie/ui` shadcn registry skeleton (`registry.json`); five components scaffolded: `AgentRunTree`, `RunConsole`, `ApprovalInbox`, `ConnectorSetup`, `ManifestEditor`.
- Each component: typed state hook (`useAgentRunTree()` etc.), CSS-var theming, a11y AA (axe-core in CI), swap-out points documented.
- `pnpm exec ahamie ui add <name>` verb (calls the shadcn CLI under the hood).
- `create-ahamie` wizard finalizes (§6.1 flow); reproducibility test: each step also reproducible standalone.
- Playwright fixture mounts each primitive against a sample fixture; visual regression baselines snapshotted.

**W8 — Reference app + docs + cut v0.1**
- `examples/company-brain-in-a-box`: see §8.
- README is the tutorial; verbatim copy of the §8.6 walkthrough.
- `apps/docs` v0: Astro + Starlight; four Diátaxis quadrants seeded with the substrate / runtime-primitive / SDK / UI subsystems.
- Three external alpha installers run the §8.6 walkthrough and report TTFL.
- Changeset cut: all packages bump to `0.1.0`; provenance enabled on npm publish.

---

## 7. What's deferred to v1, v2, v3

The RFC's Phase B/C/D framing translates as follows.

### 7.1 v1 (4–6 months from v0; "production-ish")

| Capability | Concrete pick |
|---|---|
| Helm chart | `charts/ahamie` — default-deny NetworkPolicy, cert-manager, Ingress |
| Terraform modules | `terraform/aws`, `terraform/gcp` (RDS + ElastiCache + S3 + EKS) |
| Durable workflow recipe | `@ahamie/automation-inngest` — drop-in alternative for prod |
| S3-compat blobstore | `@ahamie/blobstore-s3` (works with R2, MinIO, S3) |
| Postgres RLS (T19 L3) | enabled per tenant via Drizzle policies + Better-Auth claims |
| Eval adapters | `@ahamie/eval-promptfoo`, `@ahamie/eval-inspect-ai`, `@ahamie/eval-braintrust`, `@ahamie/eval-langsmith` |
| Telemetry exporters | `@ahamie/telemetry-otlp`, `@ahamie/telemetry-langfuse`, `@ahamie/telemetry-sentry` |
| 7 more UI primitives | `DashboardComposer`, `MarketplaceShell`, `WorkspaceSwitcher`, `SnapshotPicker`, `EvalDashboard`, `AuditLogViewer`, `BillingPanel` |
| Connector pack | `@ahamie/connector-{notion,hubspot,drive,salesforce,gmail,jira}` |
| WebSocket layer | replaces SSE for multi-user dashboards |
| CAS full impl | `walk`, `fork`, `refs` (snapshots, marketplace) |
| Egress policy | localhost + allowlist (T12) |
| Docs site | Diátaxis-discipline; Astro + Starlight |
| Open Cloud waitlist | hosted Helm release; BYOK |

### 7.2 v2 (6–9 months from v1; "managed cloud + marketplace")

| Capability | Concrete pick |
|---|---|
| Schema-per-tenant (T19 L4) | one Postgres schema per org for regulated tenants |
| Federated marketplace | `@ahamie/marketplace` — public + private registries |
| Billing | `@ahamie/billing` — dimensional spend rollup; BYOK/pooled split |
| Hard-deny + DLP egress | T12 v2 |
| Microsandboxes | `@ahamie/sandbox-firecracker`, `@ahamie/sandbox-gvisor` |
| SCIM | `@ahamie/identity-scim` |
| SOC2 Type II | for the Cloud offering |
| Meta-controller MVP | read-only fleet sensor surfacing eval-rot + cost-per-outcome |
| Foundation evaluation | LF AI / CNCF / Apache (gate: v2.0 or 5k stars) |

### 7.3 v3 (9–12 months from v2; "enterprise + regulated")

| Capability | Concrete pick |
|---|---|
| Air-gap installer | offline `pnpm create ahamie` with mirrored npm registry + signed tarballs |
| FedRAMP Moderate package | controls baseline + signed binaries (Cosign) |
| HIPAA BAA | for the Cloud offering |
| DB-per-tenant (T19 L5) | regulated tenants get their own Postgres instance |
| Cross-tenant marketplace | signed embed tokens (asymmetric, scoped, short-TTL) |
| 24×7 on-call | named SRE per enterprise customer |
| Distillation pipeline | per-tenant model fine-tuning (opt-in) |

---

## 8. First-app reference — the "Ahamie company-brain in a box"

The reference app at `examples/company-brain-in-a-box` is the single load-bearing tutorial. Walking from `pnpm create ahamie my-brain` to a working closed loop in under one hour MUST be reproducible. Below is the pseudocode + manifest sketch.

### 8.1 Project layout (after `pnpm create ahamie`)

```
my-brain/
├─ ahamie.config.ts                 # see Appendix C
├─ src/
│   ├─ agents/
│   │   └─ engineering-summarizer.ts
│   ├─ automations/
│   │   └─ daily-eng-leadership-summary.ts
│   ├─ connectors/
│   │   ├─ slack.ts                 # imports @ahamie/connector-slack
│   │   └─ linear.ts                # imports @ahamie/connector-linear
│   ├─ evals/
│   │   └─ summarizer.suite.ts
│   ├─ outcomes/
│   │   └─ linear-issue-closed.ts
│   └─ app/
│       ├─ layout.tsx
│       ├─ page.tsx                 # uses ai-elements <Conversation/>
│       └─ runs/[id]/page.tsx       # uses @ahamie/ui <AgentRunTree/>
├─ drizzle/                         # auto-generated migrations
├─ .env.local
└─ package.json
```

### 8.2 The agent (`src/agents/engineering-summarizer.ts`)

```ts
import { defineAgent } from "@ahamie/agent";
import { z } from "@ahamie/schema";
import { slackConnector } from "../connectors/slack";

export const engineeringSummarizer = defineAgent({
  name: "engineering-summarizer",
  model: "anthropic/claude-sonnet-4.6",
  instructions: `
    Summarize yesterday's #engineering Slack channel.
    Output: <= 5 bullet points, each citing a message permalink.
  `,
  scope: {
    org: "$ORG_ID",
    connectors: [slackConnector.read("#engineering")],
  },
  budget: { cap_usd: 0.50, on_cap: "pause" },
  output: z.object({
    bullets: z.array(z.object({
      summary: z.string(),
      permalink: z.string().url(),
    })).max(5),
  }),
});
```

### 8.3 The automation (`src/automations/daily-eng-leadership-summary.ts`)

```ts
import { defineAutomation, on } from "@ahamie/automation";
import { engineeringSummarizer } from "../agents/engineering-summarizer";

export default defineAutomation({
  id: "daily-eng-leadership-summary",
  // typed `on.*` from T7 — `on.cron` is built-in; editor infers the args
  trigger: on.cron("0 8 * * 1-5", { timezone: "America/New_York" }),
  actions: [
    {
      kind: "agent.run",
      agent: engineeringSummarizer,
      input: ({ event }) => ({ since: event.firedAt.minus({ days: 1 }) }),
    },
    {
      kind: "gateway.send",
      target: "slack:#leadership",
      template: "review_card_v1",
      from: ({ steps }) => steps[0].output,
    },
  ],
  budget: { dimension: "ai_compute", cap_usd: 0.50, on_cap: "pause" },
  approval: { mode: "post-only" },
});
```

### 8.4 The outcome (`src/outcomes/linear-issue-closed.ts`)

```ts
import { defineProvider } from "@ahamie/automation";
import { recordOutcome } from "@ahamie/outcomes";

// Linear webhook → outcome attribution
export default defineProvider({
  id: "linear",
  triggers: {
    "issue.closed": {
      schema: linearIssueClosedSchema,
      handler: async ({ event, ahamie }) => {
        // attribute to the run that LAST proposed work on this issue,
        // *if and only if* the closer is not the agent itself
        if (event.closedBy === ahamie.agentIdentity) return;     // sensor isolation
        const runId = await ahamie.outcomes.attribute({
          subject: { kind: "linear.issue", id: event.id },
        });
        if (!runId) return;
        await recordOutcome({
          runId,
          outcome_type: "linear_issue_closed",
          value: event.id,
          source: "linear",                     // T13 invariant: not a system the agent writes to
          source_kind: "human_decision",
          observed_at: event.closedAt,
        });
      },
    },
  },
});
```

### 8.5 The eval suite (`src/evals/summarizer.suite.ts`)

```ts
import { defineSuite } from "@ahamie/eval";
import { engineeringSummarizer } from "../agents/engineering-summarizer";

export default defineSuite({
  id: "summarizer.suite",
  controller: engineeringSummarizer,
  scenarios: [
    {
      id: "happy.5-messages",
      input: { messages: fixtures.fiveBenignMessages },
      assertions: [
        { kind: "jsonSchemaValid" },
        { kind: "toolCallContains", tool: "slack.search" },
        { kind: "costUnder", usd: 0.10 },
        { kind: "latencyUnder", ms: 8000 },
        { kind: "customJudge", rubric: rubrics.fivePointBulletList },
      ],
    },
    // 9 more scenarios…
  ],
  hiddenGolden: {
    // Stored in a *separate* object-store prefix with IAM that
    // engineeringSummarizer's tools cannot reach (T13, RFC §13.4).
    refs: ["s3://my-brain-eval-private/golden/summarizer/*"],
    threshold: 0.85,
  },
  threshold: 0.80,
});
```

### 8.6 The "first hour" walkthrough (the 7-step user story)

```
0:00  $ pnpm create ahamie my-brain                   # §6.1, < 90 s
0:02  $ ahamie connect slack                           # OAuth dance through proxy
0:05  $ ahamie ingest slack --channel '#engineering' --since '7d'
0:08  $ ahamie run daily-eng-leadership-summary --shadow
       ✓ Shadow run completed in 12s, $0.04
0:12  $ ahamie eval summarizer.suite
       ✓ 10/10 scenarios pass; hidden golden 5/5
0:16  $ ahamie factory run summarizer.spec --models claude-sonnet-4.6,gpt-5
       ...iter 0 fail; iter 1 fail; iter 2 pass; PR #142 opened
0:30  open http://localhost:3000/runs                  # @ahamie/ui mounted
0:45  $ ahamie connect linear && ahamie deploy outcome linear-issue-closed
0:55  # close a Linear issue; observe RunOutcome row land in `outcomes` table
1:00  ✓ Closed loop. Setpoint, plant, sensor, controller, actuator, eval all wired.
```

That walkthrough is the validation question for v0. If a senior platform engineer cannot reach minute 60 with the reference app and the README alone, v0 ships are not declared.

---

## 9. Risks + mitigations

The RFC §16 risk table covered the conceptual risks. This section adds the **tech-specific** risks that emerge once libraries and versions are picked, and consolidates both into a single matrix.

| # | Risk | Severity | Source | Mitigation |
|---|---|---|---|---|
| R1 | **Mastra version churn.** `@mastra/core@1.x` ships frequent minor releases; breaking changes have hit `Agent.stream` and `MCPClient` shape | High | T3, T4 | Pin minor in `peerDependencies`; weekly upstream-track CI job; integration tests against `@mastra/core@latest`; if Mastra rev breaks our wrapper, we hold the previous minor and ship a hotfix wrapper |
| R2 | **Better-Auth ABI churn.** Better-Auth is pre-1.0; the `organization` plugin and the Drizzle adapter still iterate | High | T10, T19 | Pin patch; `@ahamie/identity` adapter contract designed so Authentik/Keycloak can be swapped without changing upstream code; integration test asserts session/membership shape monthly |
| R3 | **Inngest dependency for production durability.** v0 default is in-process Mastra workflow; teams will hit ceilings around tens of thousands of runs/day | Medium | T4 | `@ahamie/automation-inngest` shipped at v1; the contract (`Trigger→Event→Run→Action→Delivery`) is engine-agnostic; growth path documented from day 1 |
| R4 | **AgentFS scale ceiling.** AgentFS (the Mastra workspace FS provider) is fine on a laptop but scaling story for cluster is unproven | Medium | T5 | Workspace FS is pluggable via `@mastra/workspace-fs-*`; v1 ships an S3-backed adapter; the contract is what we ship, not the impl |
| R5 | **ORPC newer than tRPC.** ORPC has a smaller ecosystem; some adopters will reach for tRPC | Medium | T9 | We pick ORPC for Standard-Schema native + OpenAPI emission; tRPC adapter MAY ship as a third-party package; we will not block it |
| R6 | **shadcn registry brittleness.** `shadcn add` writes into the consumer's repo; future versions of Radix/Tailwind can drift | Medium | T11 | We pin Radix peers; we publish a `shadcn-registry.json` versioned per `@ahamie/ui` minor; reproducibility test runs `pnpm exec shadcn add` against a clean fixture in CI |
| R7 | **Bun parity drift.** Bun fast-tracks releases; subtle differences in `node:` shims may break `core/cli` | Low | T1 | Bun is "code runs, examples work, results published" — not a hard contract; CI matrix keeps it visible; we do not gate releases on Bun |
| R8 | **License-stable schema repo.** If schemas drift, every consumer downstream churns | Medium | T17 | `ahamie/specs` published under CC0 (separate repo); semver with 12-month sunset; CI in the framework checks every wire format against the schema repo |
| R9 | **Akamai-similar trademark risk.** "Akamie" was the close-call name; we pre-empted by switching to "Ahamie" | Pre-empted | T18 | USPTO clearance done across classes 009 + 042; logomark intentionally distinct; registered defensively in EU + UK |
| R10 | **Adoption fragmentation.** Teams use only the connector proxy, never close the loop | High | RFC F1 | Reference starter leads with the integrated experience; modular but opinionated defaults; `ahamie doctor` warns on missing eval suites |
| R11 | **DX cliff at production.** Weekend prototype works; production with SSO + audit + DLP needs a full-time SRE | High | RFC F2 | Helm chart + Terraform + observability bundle as P0 in v1; published case studies; paid jumpstart in enterprise tier |
| R12 | **Marketplace cold-start.** Registry is empty | High | RFC F3 | Seed with 30 first-party apps from the maintainer team at v2 |
| R13 | **Eval-harness Goodhart.** Published metrics get gamed | Medium | RFC F6 | Hidden-golden partition is *default*; counter-metrics surfaced; sensor-isolation audit metric tracked at 0% target |
| R14 | **Agent-loop versioning churn.** Model APIs and MCP versions break | High | RFC F7 | Mastra owns the model gateway abstraction; we own the loop ABI semver; 12-month sunset |
| R15 | **License erosion temptation.** "Let's add a BSL clause" | Medium | RFC F8 | `GOVERNANCE.md` charter (signed by founding team); foundation move at v2.0; commercial code lives in a separate repo (`ahamie/cloud-private`) and consumes the framework as a library |
| R16 | **Self-host security incidents.** Customer misconfigures and blames us | Medium | RFC F9 | Default-deny everywhere; `ahamie doctor` covers NetworkPolicy + image policy; CVE process for the framework specifically; security advisory channel |
| R17 | **Documentation debt.** Primitives outpace docs | Medium | RFC F10 | Diátaxis-discipline docs from week 8; doc CI on every primitive; the reference starter doubles as the tutorial |
| R18 | **Runtime fork.** A hyperscaler forks the framework | Low | RFC F11 | Apache-2 means we can't stop it; we win by being best-in-class upstream; trademark covers the "Ahamie" name |
| R19 | **Headless-but-not-really UI drift.** UI primitives drift from SDK and become a soft lock-in | Medium | RFC F12 | Versioning matrix in CI; UI primitives consume `@ahamie/sdk` only (no internal-only APIs); types pulled from a published `.d.ts` set |

---

## 10. Open questions deferred to a later RFC

The RFC §16 noted these explicitly and this tech plan does NOT resolve any of them. They are listed here so reviewers do not mistake silence for a position.

1. **Pricing.** The Phase-5 pricing model (§10) is illustrative; the exact tier prices and metering split (per-seat vs usage vs platform-fee) require a pricing RFC.
2. **Governance timing.** The foundation move at v2.0 or 5k stars is conditional; the choice between LF AI, CNCF, Apache, and a new foundation is open.
3. **MCP-out vs MCP-in priority.** Should Ahamie ship `@ahamie/mcp-server` (exposing our agents as MCP servers to *other* tools) before or after v1? Phase 5 implies "after"; some adopters want it now.
4. **BYOK economics.** How is BYOK metered when the framework cannot see the model spend? Answered partially by Mastra's gateway, but the platform-fee dimension needs a dedicated RFC.
5. **Marketplace cold-start.** Seeding 30 apps is the stated mitigation but the cold-start playbook (which 30, in what order, with what revenue share) is open.
6. **Org-vs-tenant in regulated deployments.** When a customer has 10 internal "orgs" but one IT tenancy, the boundary lines blur. T19's L4/L5 picks the substrate but not the policy.
7. **Distillation pipeline.** Per-tenant fine-tuning (v3) needs a lifecycle: how is golden data partitioned? How does the customer audit what was distilled?

---

## 11. Cross-references

- Phase 2 — OpenSail wiki: [`../phase2/`](../phase2/) (donor architecture)
- Phase 3 — AI-Native wiki: [`../phase3/wiki/`](../phase3/wiki/) (closed-loop, queryable org, software factory)
- Phase 4 — PRD: [`../phase4/prd.md`](../phase4/prd.md) (the end-user promise)
- Phase 5 — Devtool product: [`../phase5/devtool-product.md`](../phase5/devtool-product.md) (the buyer reframe; the four layers)
- Phase 6 — RFC-0001: [`../phase6/rfc.md`](../phase6/rfc.md) (the tech-agnostic contracts this document satisfies)
- Research — Mastra teardown: [`../../research/mastra-teardown.md`](../../research/mastra-teardown.md) (the wrap rationale)
- Research — VoltAgent teardown: [`../../research/voltagent-teardown.md`](../../research/voltagent-teardown.md) (the alternative we did not pick)

---

## 12. Appendix A — Glossary (canonical, `@ahamie/*`-prefixed)

| Term | Definition | Package |
|---|---|---|
| **Workspace** | The unit of compute. One persistent volume + one isolation boundary + one config graph. | `@ahamie/workspace` |
| **Project** | Synonym for Workspace at the SDK surface. The CLI uses "project"; the substrate uses "workspace." | `@ahamie/workspace` |
| **Automation** | An `AutomationDefinition` + `Trigger` + `Action[]` + `DeliveryTarget[]` bound by an execution contract. | `@ahamie/automation` |
| **Run** (`AutomationRun`) | One execution of an automation, idempotent on `(automation_id, event_id)`. | `@ahamie/automation` |
| **Action** | One of `agent.run`, `app.invoke`, `gateway.send`. | `@ahamie/automation` |
| **Delivery** | A typed envelope routed to Slack, email, webhook, inbox, or another app. | `@ahamie/automation` |
| **Trigger** | A source of `AutomationEvent`s: `cron`, `webhook`, `manual`, `appEvent`, `channel.message`. | `@ahamie/automation` |
| **Event** (`AutomationEvent`) | The canonical row produced by a trigger; deduplicated on `event_id`. | `@ahamie/automation` |
| **Connector** | A typed declaration on a manifest with kind (`oauth | api_key | mcp | webhook`), scopes, and exposure mode. | `@ahamie/manifest` |
| **Connector Proxy** | The separate Hono process that holds tokens, allowlists `(method, path)`, audits every call, and strips the `Authorization` header on both legs. | `@ahamie/connector-proxy` |
| **Manifest** | The declarative description of an app's actions, views, data resources, connectors, schedules, and bills. | `@ahamie/manifest` |
| **Snapshot** | An immutable, hash-named, content-addressed bundle of workspace state. | `@ahamie/workspace` (v0); `@ahamie/cas` (v1+) |
| **CAS** | Content-Addressed Store. The object-store layer holding snapshot bundles, large artifacts, and immutable assets. | `@ahamie/cas` |
| **Outcome** (`RunOutcome`) | A row attributing a downstream business outcome to a run; `source` MUST be a system the agent does not write to. | `@ahamie/outcomes` |
| **Eval Suite** | A frozen scenario set + scoring runtime + judge rubric for a controller. Hidden-golden partition is the default. | `@ahamie/eval` |
| **Software Factory** | Composition of agent loop, eval primitive, snapshot+CAS, and connector proxy into the six-tuple `(Spec, Test, Eval, Agent, Code, Loop)`. | `@ahamie/eval` (`defineSoftwareFactory`) |
| **Identity** | A subject (human or agent) bound to one or more platform identities. | `@ahamie/identity` |
| **Organization** | The tenant boundary unit; a Better-Auth `organization` row. Every tenant-scoped row carries `org_id`. | `@ahamie/identity` |
| **Delegation** | A row representing `agent-on-behalf-of(user)`; cleaner audit trail than tagging the agent as the actor. | `@ahamie/identity` |
| **DRRI** | Directly Responsible Individual on a Result. The named human owner of a closed loop. | n/a (modeling concept) |
| **Escape hatch** | The covenant that every layer admits an export and a swap-out. Operationally: `ahamie export`, raw SQL, S3 access, OIDC tokens. | `@ahamie/cli`, `@ahamie/storage` |
| **Adapter** | A 150-LOC plugin: connector adapter, model adapter, IdP adapter, channel adapter. The unit of extension. | (various) |
| **AhamieTriggerNamespace** | The TS module-augmented namespace that gives the typed `on.*` proxy. Connector packages augment it on install. | `@ahamie/automation` |
| **defineAhamieConfig** | The single root config function exported by `@ahamie/sdk`; replaces Phase-5's `defineBrainConfig`. | `@ahamie/sdk` |

---

## 13. Appendix B — `package.json` starter for `@ahamie/core` (illustrative)

> Note: at v0 the SDK surface lives in `@ahamie/sdk` and the runtime primitives are split into separate packages; `@ahamie/core` is reserved on npm for a future bundler-friendly aggregate. The shape below is what an internal package looks like under our conventions.

```json
{
  "name": "@ahamie/sdk",
  "version": "0.1.0",
  "description": "Ahamie SDK — public surface for the headless company-brain framework.",
  "license": "Apache-2.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".":            { "types": "./dist/index.d.ts",            "import": "./dist/index.js" },
    "./agent":      { "types": "./dist/agent/index.d.ts",      "import": "./dist/agent/index.js" },
    "./workflow":   { "types": "./dist/workflow/index.d.ts",   "import": "./dist/workflow/index.js" },
    "./automation": { "types": "./dist/automation/index.d.ts", "import": "./dist/automation/index.js" },
    "./eval":       { "types": "./dist/eval/index.d.ts",       "import": "./dist/eval/index.js" },
    "./outcomes":   { "types": "./dist/outcomes/index.d.ts",   "import": "./dist/outcomes/index.js" }
  },
  "files": ["dist", "README.md", "LICENSE", "NOTICE"],
  "scripts": {
    "build":     "tsup",
    "dev":       "tsup --watch",
    "test":      "vitest run",
    "test:watch":"vitest",
    "lint":      "biome check .",
    "format":    "biome format --write .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ahamie/agent":      "workspace:*",
    "@ahamie/workflow":   "workspace:*",
    "@ahamie/automation": "workspace:*",
    "@ahamie/eval":       "workspace:*",
    "@ahamie/outcomes":   "workspace:*",
    "@ahamie/schema":     "workspace:*"
  },
  "peerDependencies": {
    "@mastra/core": "^1.31.0",
    "zod":          "^3.23.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.0.0",
    "tsup":           "^8.3.0",
    "typescript":     "^5.6.0",
    "vitest":         "^2.1.0"
  },
  "engines": {
    "node": ">=22.0.0"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "ahamie": {
    "kind": "sdk",
    "specVersion": "0.1.0"
  },
  "repository": {
    "type": "git",
    "url":  "https://github.com/ahamie/ahamie.git",
    "directory": "packages/sdk"
  }
}
```

---

## 14. Appendix C — `ahamie.config.ts` starter template

```ts
// ahamie.config.ts — root config for an Ahamie project.
// Replaces the Phase-5 `defineBrainConfig`; see T18 for the rename.

import { defineAhamieConfig } from "@ahamie/sdk";

export default defineAhamieConfig({
  // ─────────────────────── Identity (T10, T19) ───────────────────────
  identity: {
    provider: "better-auth",
    organization: { enabled: true },                  // T19: org from day 1
    plugins: ["magic-link", "passkey", "2fa", "bearer", "multi-session"],
    sessionTtl: "7d",
  },

  // ───────────────────────── Storage (T5) ─────────────────────────
  storage: {
    url: process.env.AHAMIE_DB_URL ?? "auto-spin-docker", // dev-default
    pgvector: true,
    blobstore: { kind: "local-fs", path: "./.ahamie/blobs" },
    cas: { kind: "local-fs", path: "./.ahamie/cas" },
  },

  // ───────────────────── Connector proxy (T8) ─────────────────────
  connectorProxy: {
    listen: "127.0.0.1:7787",
    bearer: process.env.AHAMIE_PROXY_TOKEN,           // per-launch
    invariants: {
      stripAuthOnRequest:   true,                     // I3
      stripAuthOnResponse:  true,                     // I4
      hmacOnIngress:        true,                     // I5
    },
    mcp: { mode: "inside-proxy" },                    // T8
  },

  // ────────────────────── Sandbox (T12) ──────────────────────
  sandbox: {
    rule: "auto",                                     // bwrap → docker → no-op
    egress: { policy: "unrestricted" },               // v0; v1 → "localhost+allowlist"
  },

  // ───────────────────── Workflow / automation (T4, T7) ─────────────────────
  automation: {
    engine: "in-process",                             // v0; v1 → "inngest"
    triggers: { allow: ["cron", "webhook", "manual", "appEvent", "channel"] },
  },

  // ────────────────────── Telemetry (T14) ──────────────────────
  telemetry: {
    mastra:  { enabled: true },
    otel:    { exporter: "console" },                 // v1+: otlp / langfuse / sentry
  },

  // ───────────────────── Eval + Outcomes (T13) ─────────────────────
  eval: {
    hiddenGoldenPrefix: "ahamie://golden",            // separate IAM
  },
  outcomes: {
    instrument: ["automation", "approval", "factory", "proxy"],
  },

  // ─────────────────────── UI primitives (T11) ───────────────────────
  ui: {
    registry: "@ahamie/ui",
    components: ["AgentRunTree", "RunConsole", "ApprovalInbox",
                 "ConnectorSetup", "ManifestEditor"],
  },
});
```

---

## 15. Appendix D — Drizzle table list (v0 schema sketch)

The base schema is intentionally narrow at v0 — every table here exists because the v0 build plan (§6) requires it. v1 adds RLS policies; v2 adds schema-per-tenant; v3 adds DB-per-tenant.

| Table | Primary purpose | Tenant key |
|---|---|---|
| `organizations` | Tenant boundary (Better-Auth) | self |
| `users` | Subject identity | (global) |
| `memberships` | (user, org, role) | `org_id` |
| `delegations` | `agent-on-behalf-of(user)` rows for cleaner audit | `org_id` |
| `acls` | (subject, resource, permission) | `org_id` |
| `platform_identities` | Identity-graph edges (`slack:U07…` ≡ `github:author`) | `org_id` |
| `automations` | Definitions registered via `defineAutomation` | `org_id` |
| `automation_events` | Canonical trigger event rows; PK includes `event_id` | `org_id` |
| `automation_runs` | Idempotent on `(automation_id, event_id)`; heartbeat fields | `org_id` |
| `automation_steps` | Action/delivery progression of a run | `org_id` |
| `agents` | Definitions registered via `defineAgent` | `org_id` |
| `agent_runs` | One row per `agent.run` invocation; FK to `automation_runs` | `org_id` |
| `agent_steps` | Append-only turn log (`AgentStep`) | `org_id` |
| `manifests` | App manifests, content-addressed | `org_id` (source) + global hash |
| `connectors` | Adapter registrations | `org_id` |
| `credentials` | Encrypted OAuth/API key blobs (proxy-only readable) | `org_id` |
| `connector_grants` | (app_instance, connector, scopes, grant_id) | `org_id` |
| `audit_log` | Per-call rows from the proxy + auth + automation | `org_id` |
| `outcomes` (`run_outcomes`) | `RunOutcome` shape (T13, RFC §8.8) | `org_id` |
| `eval_suites` | Suites registered via `defineSuite` | `org_id` |
| `eval_results` | Per-suite, per-version score rows | `org_id` |
| `factory_runs` | Software-factory outer-loop iterations | `org_id` |
| `cas_objects` | (sha256, size, parents[]) | global content + `org_id` source |
| `blobstore_refs` | (org_id, key, blob_kind, ref) | `org_id` |
| `secrets` | Indirection rows pointing into `credentials`; rotation timestamps | `org_id` |
| `webhooks_inbound` | Delivered+pending HMAC-verified inbound deliveries | `org_id` |

Indexes (v0 minimum): `(org_id, created_at)` on every tenant-scoped table; pgvector index on `agent_steps.embedding` and on RAG-managed memory tables; partial indexes on `automation_runs(status='pending', heartbeat_at)` for the leader sweep; `audit_log(org_id, occurred_at DESC)` for SIEM exports.

---

*— End of Tech Plan v1.*
