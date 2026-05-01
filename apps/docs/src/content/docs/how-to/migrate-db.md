---
title: Migrate the database
description: Run, replay, and roll back v0 migrations.
---

## Apply outstanding migrations

```bash
pnpm exec ahamie db migrate
# or:
pnpm exec ahamie db migrate --url postgres://user:pass@host:5432/db
```

The runner is **idempotent** — replay against an up-to-date DB is a no-op.

## What the v0 migration does

- Installs `vector` (pgvector) and `pgcrypto`
- Creates 25 tables — see [Database schema](/reference/schema/)
- Records itself in `__ahamie_migrations`
- Creates indexes including a HNSW vector index on `agent_steps.embedding`

## Studio

```bash
pnpm exec ahamie db studio
```

Prints the Drizzle Studio command for local inspection.

## Rollbacks

v0 does not ship a rollback runner. Each migration is additive. If you need to roll back, restore from a Postgres logical backup or run a forward-fix migration.
