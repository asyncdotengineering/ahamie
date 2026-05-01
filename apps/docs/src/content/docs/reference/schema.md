---
title: Database schema
description: 25 tables, every one tenant-keyed.
---

## Tenancy invariant

Every tenant-scoped table carries `org_id`. The Drizzle schema widens that column with the branded `OrgId` type, so the L1 enforcement is at the type level.

## Tables

| Table | Primary purpose | Tenant key |
|---|---|---|
| `organizations`        | Tenant boundary (Better-Auth) | self |
| `users`                | Subject identity | (global) |
| `memberships`          | (user, org, role) | `org_id` |
| `delegations`          | `agent-on-behalf-of(user)` rows | `org_id` |
| `acls`                 | (subject, resource, permission) | `org_id` |
| `platform_identities`  | identity-graph edges | `org_id` |
| `automations`          | definitions registered via `defineAutomation` | `org_id` |
| `automation_events`    | canonical trigger event rows; PK includes `event_id` | `org_id` |
| `automation_runs`      | idempotent on `(automation_id, event_id)`; heartbeat | `org_id` |
| `automation_steps`     | action/delivery progression | `org_id` |
| `agents`               | definitions registered via `defineAgent` | `org_id` |
| `agent_runs`           | one row per `agent.run` invocation | `org_id` |
| `agent_steps`          | append-only turn log; pgvector embedding | `org_id` |
| `manifests`            | content-addressed app manifests | `org_id` + global hash |
| `connectors`           | adapter registrations | `org_id` |
| `credentials`          | encrypted OAuth/API key blobs (proxy-only readable) | `org_id` |
| `connector_grants`     | (app_instance, connector, scopes) | `org_id` |
| `audit_log`            | per-call rows from proxy + auth + automation | `org_id` |
| `outcomes`             | `RunOutcome` shape | `org_id` |
| `eval_suites`          | suites registered via `defineSuite` | `org_id` |
| `eval_results`         | per-suite, per-version score rows | `org_id` |
| `factory_runs`         | software-factory outer-loop iterations | `org_id` |
| `cas_objects`          | (sha256, size, parents[]) | global content + `source_org_id` |
| `blobstore_refs`       | (org_id, key, blob_kind, ref) | `org_id` |
| `secrets`              | indirection rows + rotation timestamps | `org_id` |
| `webhooks_inbound`     | HMAC-verified inbound deliveries | `org_id` |

## Critical indexes

- `(org_id, created_at)` on every tenant-scoped table
- `pgvector` HNSW on `agent_steps.embedding` (cosine)
- Partial: `automation_runs(status='pending', heartbeat_at)` for the leader sweep
- `audit_log(org_id, occurred_at DESC)` for SIEM exports
- Unique: `(automation_id, event_id)` on `automation_runs` — load-bearing for at-most-once dedupe

## Source

- Drizzle schema: [`packages/storage/src/schema/`](https://github.com/ahamie/ahamie/tree/main/packages/storage/src/schema)
- SQL migration: [`packages/storage/drizzle/0000_init.sql`](https://github.com/ahamie/ahamie/blob/main/packages/storage/drizzle/0000_init.sql)
