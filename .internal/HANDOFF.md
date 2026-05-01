# HANDOFF — read me before you write code

> **Audience:** the next Claude Code (or human) session that opens this repo.
> **Purpose:** ship the next feature without re-deriving everything we already decided.
> **Last update:** 2026-05-02 (after the v0.1.1 publish + asyncdotengineering transfer).

If you read nothing else, read this file plus [`SPEC.md`](../SPEC.md).

---

## 0. The 60-second mental model

**Ahamie** is a TypeScript-first, source-available, self-host-first framework for building **closed-loop** AI systems inside companies. We **wrap Mastra** for the runtime and **own** the closed-loop primitives Mastra deliberately omits:

1. `RunOutcome` — sensor-isolated outcome attribution
2. Hidden-golden eval suites (the metric the agent can't game)
3. Software-factory mode — the outer loop that revises the spec when the eval fails
4. Connector-proxy trust boundary with five non-negotiable invariants (I1–I5)

Everything else is leverage from Mastra (`@mastra/core`, `@mastra/memory`, `@mastra/rag`, `@mastra/workspace-*`). We never fork upstream — only wrap.

The **load-bearing decision document** is [`SPEC.md`](../SPEC.md) (v0 tech plan; the 19 locked decisions T1–T19 derive everything). Read sections 3, 5, 6, 8, 12 first if you have ten minutes.

---

## 1. Artifact map — where everything lives

| Thing | Where |
|---|---|
| **GitHub repo** | https://github.com/asyncdotengineering/ahamie (org-owned; previously `octalpixel/ahamie`, redirect persists) |
| **Live docs** | https://asyncdotengineering.github.io/ahamie/ (Astro + Starlight, Diataxis-discipline, 29 pages, hosted on GitHub Pages via `.github/workflows/docs.yml`) |
| **Marketing redirect** | https://asyncdot.com/ahamie → repo · https://asyncdot.com/ahamie-docs → docs (Vercel `vercel.json` of the `asyncdot-marketing` project) |
| **npm packages** | https://www.npmjs.com/search?q=%40ahamie — 27 published at `0.1.1` |
| **GitHub Pages** | `asyncdotengineering/ahamie` repo, deployed by `.github/workflows/docs.yml` on every push to `main` (paths-filter: `apps/docs/**`, `packages/**`, `connectors/**`, `examples/**`, `SPEC.md`, `README.md`, `GOVERNANCE.md`, `publishing-doc.md`, `pnpm-lock.yaml`) |
| **Old Vercel project (deprecated)** | `octalpixels-projects/ahamie-docs` — superseded by GitHub Pages on 2026-05-02. Project still exists but no longer the canonical URL. Safe to delete. |
| **Local Postgres for tests** | `postgres://localhost:5432/ahamie_test` — Postgres.app on macOS; pgvector pre-installed; schema-isolated per test run |
| **Spec / source of truth** | [`../SPEC.md`](../SPEC.md) — the v0 tech plan (854 lines). Treat as immutable for v0; propose edits via RFC for v1+ |
| **Publishing runbook** | [`../publishing-doc.md`](../publishing-doc.md) — read this **before** any release |
| **Image asset** | `.assets/logo.png` — chibi mascot generated via fal.ai (Flux Schnell). Backup SVG at `.assets/logo.svg` |
| **Marketing repo** | `/Users/mithushancj/Documents/asyncdot/marketing/asyncdot-ai-native-website` — has the redirect rules in `vercel.json` |

---

## 2. Current state at a glance

| | |
|---|---|
| Version | `0.1.1` (the v0 wedge) |
| Packages published | 27 (all `@ahamie/*` + `create-ahamie`) |
| Build | `pnpm build` → 27 + docs, all green |
| Tests | `AHAMIE_TEST_PG_URL=postgres://localhost:5432/ahamie_test pnpm test` → **117 passing across 38 test files** |
| Docs site | 29 pages, Diataxis quadrants seeded, live |
| Repo stars | 1 (octalpixel) |
| Open issues / PRs | 0 (no contributors yet — alpha state) |

### What v0 already shipped (per SPEC §6)

- ✅ W1 — Substrate (`schema`, `storage`, `blobstore`, `cas`, `telemetry`)
- ✅ W2 — Identity + L1+L2 multi-tenancy (`identity`, Better-Auth wrap, ACL, `requireOrg` middleware)
- ✅ W3 — Mastra wrap (`agent`, `workflow`, `memory`, `rag`, `workspace`)
- ✅ W4 — Connector proxy + Slack/GitHub/Linear adapters; **5 invariants I1–I5 unit-tested**
- ✅ W5 — Automation engine + typed `on.*` proxy via module augmentation
- ✅ W6 — Outcomes (sensor isolation) + eval (8 metrics + hidden-golden + software factory)
- ✅ W7 — UI primitives (5 shadcn components) + CLI (16 verbs) + `create-ahamie`
- ✅ W8 — Reference app (`examples/company-brain-in-a-box`) + docs

### What v0 deferred to v1 (per SPEC §7.1)

These are the next obvious work blocks. Pick one and ship it.

- Helm chart (`charts/ahamie`) + Terraform modules (AWS/GCP) — most-requested for prod self-host
- `@ahamie/automation-inngest` — durable workflow recipe; lots of teams need this
- `@ahamie/blobstore-s3` — drop-in for cloud
- Postgres RLS (T19 L3) — enables true tenant-per-row isolation
- Eval adapters: `@ahamie/eval-{promptfoo,inspect-ai,braintrust,langsmith}`
- Telemetry exporters: `@ahamie/telemetry-{otlp,langfuse,sentry}`
- 7 more UI primitives (`DashboardComposer`, `MarketplaceShell`, `EvalDashboard`, `AuditLogViewer`, `WorkspaceSwitcher`, `SnapshotPicker`, `BillingPanel`)
- Connector pack: Notion / HubSpot / Drive / Salesforce / Gmail / Jira
- WebSocket layer (replaces SSE for multi-user dashboards)
- CAS full impl: `walk`, `fork`, `refs`
- Egress policy: `localhost+allowlist`
- Open Cloud waitlist / BYOK

---

## 3. How to develop locally

```bash
# 1. Clone
git clone https://github.com/asyncdotengineering/ahamie
cd ahamie

# 2. Install (pnpm 10, Node 22)
pnpm install

# 3. Build
pnpm build                                 # 27 packages + docs

# 4. Test (needs Postgres + pgvector)
psql -d postgres -c "CREATE DATABASE ahamie_test;" 2>/dev/null
psql -d ahamie_test -c "CREATE EXTENSION IF NOT EXISTS vector;"
AHAMIE_TEST_PG_URL=postgres://localhost:5432/ahamie_test pnpm test

# 5. Live docs while editing
pnpm --filter @ahamie/docs dev             # http://localhost:4321
```

**You will need:** Postgres 15+ with `pgvector` (Postgres.app on macOS bundles it; on Ubuntu install `postgresql-16-pgvector`). Docker is optional — only needed if you don't have local Postgres and prefer testcontainers.

---

## 4. The non-negotiable invariants (do not break these)

These are derived from SPEC.md but worth restating because they're the soul of the project:

### Trust boundary (I1–I5, in `@ahamie/connector-proxy`)

1. **I1** — Credentials resolved server-side. The agent process never sees raw tokens.
2. **I2** — Per-connector (method, path) allowlist. 403 on miss.
3. **I3** — Caller `Authorization` header stripped before upstream forward.
4. **I4** — Response auth headers stripped before return to caller.
5. **I5** — HMAC-verified inbound webhooks. Mismatch → 401 + audit row.

These are unit-testable as pure functions in `packages/connector-proxy/src/invariants.ts`. **If you change `connector-proxy`, run those tests and add new ones for any new attack surface you introduce.**

### Sensor isolation (in `@ahamie/outcomes`)

The `source` value on every `RunOutcome` row MUST be a system the agent cannot write to. Without this, the agent manufactures its own win conditions and the metric becomes hortative. The runtime guard is `setSensorIsolationGuard(...)`. **Do not weaken it.**

### Hidden-golden eval (in `@ahamie/eval`)

The eval suite has two partitions: `observable` (the agent can see) and `hidden_golden` (separate IAM, the agent cannot reach). Removing `hiddenGolden` from `defineSuite` is technically allowed but **`ahamie doctor` should warn** when it sees a suite without one. Keep this discipline.

### Tenant scoping (T19 L1+L2)

Every Drizzle row carries `org_id` (a branded type — L1 enforcement). Every Hono/ORPC handler passes through `requireOrg` middleware (L2). **New tables MUST add `org_id`.** New routes MUST go through `requireOrg`. RLS (L3) is v1; do not skip L1+L2 in the meantime.

### Mastra wrap discipline

Every `@ahamie/{agent,workflow,memory,rag,workspace}` is a 1:1 wrapper of the corresponding Mastra package. The escape hatch — `import { Agent } from "@mastra/core/agent"` — is **forever open**. There's a smoke test that asserts this in `packages/agent/test/escape-hatch.test.ts`. **If you find yourself adding logic that breaks the escape hatch, you're forking — stop.**

---

## 5. Tribal knowledge (gotchas you'll learn the hard way)

### `npm publish` does NOT substitute `workspace:*`

Single most expensive footgun. Always publish via `bash scripts/publish.sh` (which rewrites + restores). Read [`../publishing-doc.md`](../publishing-doc.md) before any release.

### Test concurrency + Postgres extensions race

`CREATE EXTENSION IF NOT EXISTS` races inside `pg_extension`'s unique index when multiple test files run migrations in parallel. The fix is in `packages/storage/vitest.config.ts`: `fileParallelism: false`. **Do not flip this on for storage.**

### Schema isolation needs `public` in search_path

Test schemas use `search_path=<schema>,public` so the pgvector `vector` type (defined in `public`) resolves. If you ever drop `public`, vector columns will not type-check. See `packages/storage/src/test-helpers.ts`.

### Mastra peer-dep zod conflict (warning only)

`@mastra/core@1.31` declares `zod ^3.25 || ^4.0` but a transitive `@ai-sdk/ui-utils@1.2.11` pins `zod ^3.23.8`. We're on Zod 4.4. The peer-dep warning is benign; runtime works. Don't be tempted to downgrade Zod to make the warning go away — Zod 4 is intentional.

### Vercel + monorepo root-directory trap

When linking a Vercel project from the monorepo root, Vercel auto-discovers `apps/docs` as the root and then *appends* it to the `cwd`, so the build path becomes `apps/docs/apps/docs` and fails. Fix: link from the git root and set the build/install/output explicitly in root `vercel.json`. See `vercel.json` for the working config.

### Astro v5 redirects to external URLs in static mode

Use Vercel's `redirects` in `vercel.json` (308 at the edge), not Astro's `redirects` config (HTML meta refresh — works but slower and worse SEO). The marketing site (`asyncdot.com/ahamie` and `/ahamie-docs`) uses the Vercel approach.

### Image generator hardcoded key

The `image-generator` skill has a hardcoded fal.ai fallback key at `~/.claude/skills/image-generator/scripts/generate.py:208`. The chibi mascot was generated this way. Don't rely on it for production work — set `FAL_KEY` properly.

---

## 6. Reading order for a new contributor

1. **`README.md`** — the public face; understand the pitch
2. **`SPEC.md`** — the 19 locked decisions; this is the constitution
3. **`apps/docs/src/content/docs/explanation/closed-loop.md`** — the *why*
4. **`apps/docs/src/content/docs/explanation/wrap-mastra.md`** — why we don't fork
5. **`apps/docs/src/content/docs/reference/proxy-invariants.md`** — the load-bearing security model
6. **`packages/storage/src/schema/`** — every table; the data model
7. **`packages/connector-proxy/src/invariants.ts`** — the five invariants as code
8. **`examples/company-brain-in-a-box/`** — see the whole arc end-to-end
9. **`publishing-doc.md`** — when ready to ship

---

## 7. How to add a new feature without breaking anything

1. **Read the relevant SPEC section.** If it's deferred to v1+, the SPEC tells you the contract; honor it.
2. **Add a package or a file under an existing one.** Don't refactor Mastra wraps unless the SPEC says to.
3. **Tests first.** `packages/<your-package>/test/*.test.ts`. The repo's discipline is real.
4. **Add a `.changeset/<name>.md`** — `pnpm changeset` is the right way; pick the smallest semver bump that's correct.
5. **Update docs.** Either a new page under `apps/docs/src/content/docs/` (right Diataxis quadrant) or update an existing one.
6. **Run the full check:**
   ```bash
   pnpm install && pnpm build && \
     AHAMIE_TEST_PG_URL=postgres://localhost:5432/ahamie_test pnpm test && \
     pnpm lint && pnpm typecheck
   ```
7. **Commit with DCO:** `git commit -s -m "feat: …"` — the `-s` adds the `Signed-off-by:` line. We do **not** use a CLA.
8. **Publish:** see [`publishing-doc.md`](../publishing-doc.md).

---

## 8. What I would do next if I were continuing

If you want a fast win that demonstrates real value, ship one of these in order of leverage:

1. **`@ahamie/blobstore-s3`** (~1 day) — drop-in S3 backend. The interface already exists in `@ahamie/blobstore`. This unblocks every adopter who can't run on local FS.
2. **`@ahamie/automation-inngest`** (~3 days) — the durable workflow recipe. Mastra already supports Inngest as a workflow engine; we just need the adapter package + a doc.
3. **Postgres RLS (T19 L3)** (~2 days) — enable per-tenant row-level security via Drizzle policies + Better-Auth claims. Defense in depth on top of L2.
4. **GitHub Actions release workflow** (~1 day) — replaces `scripts/publish.sh`, removes the `--no-provenance` flag (OIDC), uses `pnpm publish -r` properly. Eliminates an entire class of release-time mistakes.
5. **`@ahamie/eval-promptfoo`** (~1 day) — most popular external eval framework; adapter is a thin shim.

For each, the SPEC tells you the package name, the rough LOC estimate, and what it depends on. **Trust the SPEC**; don't redesign.

---

## 9. What NOT to do

- Don't fork Mastra. Wrap it. If wrapping doesn't work, file an issue upstream.
- Don't add a CLA. We use DCO.
- Don't move to BSL / SSPL / Commons Clause. Apache-2.0 is irrevocable per `GOVERNANCE.md`.
- Don't add telemetry by default. No phone-home. Ever.
- Don't break the escape hatch. Test that `import { Agent } from "@mastra/core/agent"` works after every change.
- Don't publish without reading `publishing-doc.md`. The workspace:* leak is real and expensive.
- Don't add new public-facing names that conflict with `aham*` (USPTO classes 009 / 042 are clean — keep it that way).

---

## 10. Environment cheat sheet

```bash
# Required for tests
export AHAMIE_TEST_PG_URL="postgres://localhost:5432/ahamie_test"

# Optional — for the proxy + creds (only needed when running ahamie dev end-to-end)
export AHAMIE_DB_URL="postgres://localhost:5432/ahamie"
export AHAMIE_PROXY_TOKEN="<random-32-bytes>"
export AHAMIE_KMS_KEY_B64="<base64-encoded-32-bytes>"  # AES-256 key
export AUTH_SECRET="<random>"

# Optional — for connector adapters
export ANTHROPIC_API_KEY="..."
export SLACK_SIGNING_SECRET="..."
export GITHUB_WEBHOOK_SECRET="..."
export LINEAR_WEBHOOK_SECRET="..."
```

---

## 11. People + accounts

- **GitHub org:** [`asyncdotengineering`](https://github.com/asyncdotengineering) (the user `octalpixel` is admin)
- **npm scope:** `@ahamie` — `octalpixel` has publish access via the npm CLI auth; the org membership isn't visible via `npm org ls` from this account but `npm publish` works
- **Vercel team:** `octalpixels-projects` — owns `ahamie-docs` and `asyncdot-marketing`
- **Maintainer council:** TBD per `GOVERNANCE.md`. As of v0.1.1 the founding council is unannounced; this is fine for alpha but blocks the foundation evaluation gate at v2.0/5k stars

---

## 12. Closing note

The framework is alpha. APIs may change. The closed-loop primitives (sensor isolation, hidden-golden, software factory, connector proxy invariants) are **not** alpha — they are the bet. Every other surface can move; those should not.

When in doubt, re-read [`SPEC.md`](../SPEC.md) §3 (the 19 locked decisions). If you're about to make a decision that contradicts one of them, **stop and write an RFC instead**.

— last session, 2026-05-02
