---
title: Multi-tenant deployment
description: Org-scoped from day 1. RLS at v1. Schema-per-tenant at v2. DB-per-tenant at v3.
---

Ahamie ships **L1 + L2** tenant enforcement at v0. The growth path is documented:

| Level | Mechanism                              | Ships in |
|-------|----------------------------------------|----------|
| L1    | Branded ID types in Drizzle schema     | v0       |
| L2    | ORPC + Hono middleware (`requireOrg`)  | v0       |
| L3    | Postgres RLS via Better-Auth claims    | v1       |
| L4    | Schema-per-tenant                      | v2       |
| L5    | DB-per-tenant (regulated)              | v3       |

## Wire L1 + L2 today

L1 is automatic — every Drizzle row carries a branded `OrgId`.

L2 — mount the Hono middleware:

```ts
import { Hono } from "hono";
import { createAuth, requireOrg } from "@ahamie/identity";

const auth = createAuth({ db, baseUrl: "http://localhost:3000", secret: process.env.AUTH_SECRET! });

const app = new Hono();
app.use(requireOrg(auth));
app.get("/runs", async (c) => {
  const { org_id } = c.get("ahamie_auth");
  // every query MUST filter on org_id
});
```

## Verify isolation

```bash
pnpm exec ahamie doctor
```

Two-org isolation is also asserted by `packages/storage/test/tenancy.test.ts` — a row written under org A must not be visible to org B's session.

## Don't do

- Do **not** read from a Drizzle table without filtering on `org_id`. The L1 brand catches some misuse at compile time, but the runtime contract is yours.
- Do **not** share `credentials` rows across orgs — even if the underlying token would technically work.
