---
title: Roadmap (v0 → v3)
description: What ships when. v0 wedge already shipped; v1 is "production-ish"; v2 is managed cloud + marketplace; v3 is enterprise + regulated.
---

## v0 — the wedge (shipped)

- 27 packages
- Full substrate (`schema`, `storage`, `blobstore`, `cas`, `telemetry`)
- Identity + L1+L2 tenancy
- Mastra wrap (`agent`, `workflow`, `memory`, `rag`, `workspace`)
- Connector proxy (5 invariants) + Slack / GitHub / Linear adapters
- Automation engine (cron + manual + appEvent + channel.message + webhook) with module-augmented `on.*`
- Outcomes (sensor isolation) + Eval (8 metrics + hidden-golden + software factory)
- CLI (16 verbs) + UI primitives (5 shadcn components)
- Reference app: `examples/company-brain-in-a-box`
- 117 tests passing on Postgres+pgvector

## v1 — production-ish (4–6 months)

- Helm chart + Terraform modules (AWS / GCP)
- `@ahamie/automation-inngest` durable workflow recipe
- `@ahamie/blobstore-s3`
- Postgres RLS (T19 L3)
- Eval adapters: `promptfoo`, `inspect-ai`, `braintrust`, `langsmith`
- Telemetry exporters: `otlp`, `langfuse`, `sentry`
- 7 more UI primitives (`DashboardComposer`, `MarketplaceShell`, `EvalDashboard`, `AuditLogViewer`, `WorkspaceSwitcher`, `SnapshotPicker`, `BillingPanel`)
- Connector pack: Notion / HubSpot / Drive / Salesforce / Gmail / Jira
- WebSocket layer (replaces SSE for multi-user dashboards)
- CAS full impl (`walk`, `fork`, `refs`)
- Egress policy: `localhost+allowlist`
- Diátaxis docs site (this site)
- Open Cloud waitlist; BYOK

## v2 — managed cloud + marketplace (6–9 months from v1)

- Schema-per-tenant (T19 L4)
- `@ahamie/marketplace` — federated registry (public + private)
- `@ahamie/billing` — dimensional spend rollup
- Hard-deny + DLP egress
- `@ahamie/sandbox-firecracker`, `@ahamie/sandbox-gvisor`
- `@ahamie/identity-scim`
- SOC2 Type II for the Cloud offering
- Meta-controller MVP (read-only fleet sensor for eval-rot + cost-per-outcome)
- Foundation evaluation (gate: v2.0 release or 5k stars)

## v3 — enterprise + regulated (9–12 months from v2)

- Air-gap installer (offline `pnpm create ahamie` + signed tarballs)
- FedRAMP Moderate package (controls baseline + Cosign signing)
- HIPAA BAA for Cloud
- DB-per-tenant (T19 L5)
- Cross-tenant marketplace (signed embed tokens)
- 24×7 on-call (named SRE per enterprise customer)
- Distillation pipeline (per-tenant model fine-tuning, opt-in)
