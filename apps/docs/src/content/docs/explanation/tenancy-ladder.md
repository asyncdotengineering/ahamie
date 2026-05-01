---
title: Multi-tenancy ladder (L1–L5)
description: Five levels of tenant isolation. v0 ships L1+L2; growth path is documented to v3.
---

| Level | Mechanism                              | Cost       | Ships in |
|-------|----------------------------------------|------------|----------|
| **L1** | Branded ID types in Drizzle schema      | free       | v0 |
| **L2** | ORPC + Hono middleware (`requireOrg`)   | free       | v0 |
| **L3** | Postgres RLS via Better-Auth claims     | low        | v1 |
| **L4** | Schema-per-tenant                       | medium     | v2 |
| **L5** | DB-per-tenant (regulated)               | high       | v3 |

## Why the ladder

Tenant-as-afterthought is the most expensive mistake a platform can make. The cost of L1 is one type definition. The cost of retrofitting L4 onto a single-tenant codebase is months of work. The decision to ship L1 + L2 from day 1 is what the plan calls **the cheapest insurance you'll ever buy**.

## What each level does

### L1 — branded types

`@ahamie/schema` exports `OrgId`, `UserId`, `AgentRunId`, etc. as nominal types. The Drizzle schema widens the column with `.$type<OrgId>()`. So a query like `eq(automation_runs.org_id, runId)` fails to typecheck — `RunId` is not assignable to `OrgId`. Cross-tenant slip-ups become compile errors.

### L2 — middleware

`requireOrg(auth)` rejects any request that doesn't carry an active org claim. The Hono context exposes `c.get("ahamie_auth").org_id` for downstream queries.

### L3 — RLS (v1)

Postgres Row-Level Security is enabled per tenant. The Drizzle adapter picks up the active session's `org_id` claim and Postgres filters every query. Defense in depth on top of L2.

### L4 — schema-per-tenant (v2)

One Postgres schema per organization. The connection's `search_path` is set per request. Useful for regulated tenants who need physical separation.

### L5 — DB-per-tenant (v3)

One Postgres database per organization. The connection pool is per-tenant. The most expensive option; reserved for tenants under FedRAMP / HIPAA boundaries.
