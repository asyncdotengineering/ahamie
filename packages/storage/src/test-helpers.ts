/**
 * Test helpers for any package that needs an ephemeral Postgres against the
 * real schema.
 *
 * Two modes:
 *   1. **Local Postgres** (default if `AHAMIE_TEST_PG_URL` is set or
 *      `AHAMIE_TEST_USE_LOCAL_PG=1`): each test creates an isolated schema
 *      inside the configured database, runs migrations there, drops it on
 *      `stop()`. Fast — no Docker spin-up cost.
 *   2. **Testcontainers** (default otherwise): pulls `pgvector/pgvector:pg16`
 *      and runs the same migrations. Used in CI environments where Docker
 *      is the lowest-friction primitive.
 *
 * The DB **MUST** have the `vector` extension installed (Postgres.app on
 * macOS bundles it; on Ubuntu install `postgresql-16-pgvector`).
 *
 * Pattern:
 *   const ctx = await startTestDb();
 *   try { /* use ctx.db *​/ } finally { await ctx.stop(); }
 */

import { sql } from "drizzle-orm";
import { closeDb, createDb, type AhamieDb } from "./client";
import { migrate } from "./migrate";

export interface TestDbContext {
  db: AhamieDb;
  url: string;
  /** Schema name used to scope this test run; dropped on `stop()`. */
  schema: string;
  stop(): Promise<void>;
}

const adminUrl = (): string =>
  process.env.AHAMIE_TEST_PG_URL ?? "postgres://localhost:5432/ahamie_test";

const isolatedSchema = (): string =>
  `t_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

export const startTestDb = async (): Promise<TestDbContext> => {
  if (process.env.AHAMIE_TEST_PG_URL || process.env.AHAMIE_TEST_USE_LOCAL_PG) {
    return startSchemaDb();
  }
  return startTestcontainersDb();
};

const startSchemaDb = async (): Promise<TestDbContext> => {
  const url = adminUrl();
  const schema = isolatedSchema();

  const adminDb = createDb({ url, max: 1, appName: "ahamie-test-admin" });
  await adminDb.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schema}"`));
  await closeDb(adminDb);

  // Append search_path option so all queries land in the schema, but keep
  // `public` in the path so pgvector's `vector` type resolves.
  const u = new URL(url);
  u.searchParams.set("options", `-c search_path=${schema},public`);

  const db = createDb({ url: u.toString(), max: 4, appName: "ahamie-test" });
  await migrate(db);

  return {
    db,
    url: u.toString(),
    schema,
    async stop() {
      await closeDb(db);
      const cleanup = createDb({ url, max: 1, appName: "ahamie-test-cleanup" });
      try {
        await cleanup.execute(sql.raw(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`));
      } finally {
        await closeDb(cleanup);
      }
    },
  };
};

const startTestcontainersDb = async (): Promise<TestDbContext> => {
  // Dynamic import keeps `@testcontainers/postgresql` from being required
  // when AHAMIE_TEST_PG_URL is in use.
  // biome-ignore lint/suspicious/noExplicitAny: external dynamic import
  const mod: any = await import("@testcontainers/postgresql");
  const container = await new mod.PostgreSqlContainer("pgvector/pgvector:pg16")
    .withDatabase("ahamie_test")
    .withUsername("ahamie")
    .withPassword("ahamie")
    .start();

  const url: string = container.getConnectionUri();
  const db = createDb({ url, max: 4, appName: "ahamie-test" });
  await migrate(db);

  return {
    db,
    url,
    schema: "public",
    async stop() {
      await closeDb(db);
      await container.stop();
    },
  };
};
