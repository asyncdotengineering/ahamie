# @ahamie/storage

Drizzle schema + migrations + pgvector for Ahamie. **Postgres everywhere** (T5) — no PGlite, no SQLite. Three exports:

- `@ahamie/storage` — top-level: `createDb`, `migrate`, every table.
- `@ahamie/storage/client` — `createDb`, `closeDb`, `AhamieDb` type.
- `@ahamie/storage/migrate` — runner.
- `@ahamie/storage/schema` — every Drizzle table.

```ts
import { createDb, migrate } from "@ahamie/storage";

const db = createDb({ url: process.env.AHAMIE_DB_URL! });
await migrate(db);
```

The schema covers every v0 table from §15 of the tech plan. v1 adds RLS policies; v2 adds schema-per-tenant; v3 adds DB-per-tenant.
