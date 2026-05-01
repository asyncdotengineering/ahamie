# Next-up — pick one and ship

> A short, opinionated work queue. Each item is sized so a single Claude Code session (or one human-week) can land it cleanly. Listed in **leverage order** — top of file is highest impact for the least work.
>
> SPEC reference for every item is in parentheses. Do not pick anything not covered by SPEC §7 (v1+) without writing an RFC first.

---

## Tier 1 — fast wins (1–2 days each)

### `@ahamie/blobstore-s3` (SPEC §7.1, T5)
The `Blobstore` interface already exists in `@ahamie/blobstore`. Add a sibling package that implements the same interface against S3-compatible APIs (R2, MinIO, S3 itself). Drop-in for cloud deployments.

**Files to create.**
```
packages/blobstore-s3/
  package.json          (deps: @aws-sdk/client-s3, @ahamie/blobstore)
  src/index.ts          (~250 LOC — implement put/get/delete/list/stream)
  test/s3.test.ts       (use @aws-sdk/client-s3 with @localstack or minio in CI)
  README.md
```

**Acceptance.**
- All `Blobstore` interface methods implemented
- Tests parity with `@ahamie/blobstore` local-fs tests
- Doc page added at `apps/docs/src/content/docs/how-to/use-s3-blobstore.md`

---

### `@ahamie/eval-promptfoo` (SPEC §7.1, T13)
Most popular external eval framework. The adapter is a thin shim that lets users run promptfoo evals through Ahamie's `defineSuite`.

**Files to create.**
```
packages/eval-promptfoo/
  package.json
  src/index.ts          (~150 LOC — convert Ahamie suite shape ↔ promptfoo config)
  test/adapter.test.ts
  README.md
```

**Acceptance.**
- A user can `defineSuite({ controller, scenarios: promptfoo.fromYaml('./eval.yaml') })`
- Hidden-golden partition still applies (the adapter doesn't bypass it)

---

### GitHub Actions release workflow (SPEC §6.0)
Replaces `scripts/publish.sh`. Removes `--no-provenance` (OIDC). Eliminates the workspace:* leak class of bugs.

**Files to create.**
```
.github/workflows/release.yml         (changesets-action + pnpm publish -r)
.github/workflows/test.yml            (lint + typecheck + test on Node 22+24+Bun)
```

**Acceptance.**
- Merging a "Version Packages" PR triggers `pnpm publish -r` with provenance
- Per-package CHANGELOG.md auto-updates
- `publishing-doc.md` updated to reference the workflow as the canonical path

---

## Tier 2 — meaningful structural work (3–5 days each)

### Postgres RLS (T19 L3)
Enable Row-Level Security per-org via Drizzle policies + Better-Auth `org_id` claims.

**Files to touch.**
```
packages/storage/drizzle/0001_rls.sql           (new — enable RLS per table)
packages/storage/src/client.ts                  (set session var on connection: SET app.current_org)
packages/identity/src/middleware.ts             (call SET app.current_org from requireOrg)
packages/storage/test/rls.test.ts               (new — proves cross-tenant queries return 0 rows)
```

**Acceptance.**
- Two-org isolation test in `packages/storage/test/tenancy.test.ts` STILL passes
- Plus a new test that proves RLS catches a query that "forgot" to filter on `org_id` at the app layer
- `ahamie doctor` warns when RLS is disabled

---

### `@ahamie/automation-inngest` (SPEC §7.1, T4)
Durable workflow engine recipe. Mastra already supports Inngest; we ship the adapter + opinionated config.

**Files to create.**
```
packages/automation-inngest/
  package.json          (deps: @ahamie/automation, inngest)
  src/index.ts          (~400 LOC — Inngest workflow engine adapter + cron→Inngest event bridge)
  test/inngest.test.ts  (use inngest's local dev server in CI)
  README.md
```

**Acceptance.**
- `defineAhamieConfig({ automation: { engine: "inngest" } })` switches the runtime cleanly
- Existing automation tests still pass with the Inngest engine
- A new how-to doc shows the prod self-host story

---

### 7 more UI primitives (SPEC §7.1, T11)
Add `DashboardComposer`, `MarketplaceShell`, `EvalDashboard`, `AuditLogViewer`, `WorkspaceSwitcher`, `SnapshotPicker`, `BillingPanel` to `@ahamie/ui`. Each is an isolated shadcn-style component with a typed state hook.

**Files to add (per primitive).**
```
packages/ui/src/<primitive>.tsx
packages/ui/registry.json                       (entry per primitive)
packages/ui/test/<primitive>.test.ts            (axe-core a11y check)
apps/docs/src/content/docs/reference/ui-<primitive>.md
```

**Acceptance.**
- Each primitive ≤ 300 LOC, axe-clean, themed via CSS vars
- `pnpm exec ahamie ui add <primitive>` works for each

---

## Tier 3 — strategic (1+ week each)

### Helm chart + Terraform modules (SPEC §7.1)
The single thing every prospective production user asks for. Without these, "self-host-first" is a slogan.

**Files to create.**
```
charts/ahamie/                         (Helm chart with NetworkPolicy default-deny + cert-manager)
terraform/aws/                         (RDS + ElastiCache + S3 + EKS modules)
terraform/gcp/                         (CloudSQL + Memorystore + GCS + GKE)
apps/docs/src/content/docs/how-to/deploy-helm.md
apps/docs/src/content/docs/how-to/deploy-terraform.md
```

**Acceptance.**
- A regulated VPC tenant can install via `helm install ahamie ./charts/ahamie -f values.yaml` and have a working stack
- Terraform modules are tested in a sandbox AWS account end-to-end
- `ahamie doctor` validates Helm-installed deployments (NetworkPolicy presence, image-policy admission, etc.)

---

### Connector pack: Notion / HubSpot / Drive / Salesforce / Gmail / Jira (SPEC §7.1)
Six adapters, ~50 LOC each (the trust boundary mechanics live in `connector-proxy`). Plus six how-to docs.

Drop-in followup once `@ahamie/connector-{slack,github,linear}` patterns are stable.

---

### `@ahamie/marketplace` MVP (SPEC §7.2)
Federated app registry server. v0 ships local-only via `@ahamie/registry`; v2 federates via `@ahamie/marketplace`.

This is genuinely v2 work (per SPEC §7.2) — only pick this up if the foundation evaluation is on the horizon.

---

## What NOT to pick up (yet)

These are SPEC §7.2 / §7.3 — wait until v1 ships first.

- Schema-per-tenant (T19 L4)
- Firecracker / gVisor sandbox adapters
- Foundation evaluation
- Air-gap installer
- FedRAMP package
- HIPAA BAA work
- Distillation pipeline

---

## When you finish a tier-1 item

1. Update [`HANDOFF.md`](./HANDOFF.md) §2 (current state)
2. Add a new entry to the top of [`decisions.md`](./decisions.md) if you made any non-trivial structural call
3. Strike the item from this file (don't delete — leave a `~~strikethrough~~` so the history is visible)
4. Cut a release per [`../publishing-doc.md`](../publishing-doc.md)
