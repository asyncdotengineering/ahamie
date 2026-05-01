import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, createDb, type AhamieDb } from "../src/client";
import { migrate } from "../src/migrate";
import { startTestDb, type TestDbContext } from "../src/test-helpers";

describe("@ahamie/storage migrate", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await startTestDb();
  });

  afterAll(async () => {
    await ctx?.stop();
  });

  it("applies all migrations and is idempotent on replay", async () => {
    const first = await migrate(ctx.db);
    expect(first.length).toBeGreaterThan(0);

    // Replay against the same DB; no migration should be applied again.
    const second = await migrate(ctx.db);
    for (const r of second) {
      expect(r.appliedNow).toBe(false);
    }
  });

  it("installs the pgvector extension", async () => {
    const rows = (await ctx.db.execute(
      sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`,
    )) as unknown as Array<{ extname: string }>;
    expect(rows.find((r) => r.extname === "vector")).toBeDefined();
  });

  it("creates every v0 table from §15", async () => {
    const expected = [
      "organizations",
      "users",
      "memberships",
      "delegations",
      "acls",
      "platform_identities",
      "automations",
      "automation_events",
      "automation_runs",
      "automation_steps",
      "agents",
      "agent_runs",
      "agent_steps",
      "manifests",
      "connectors",
      "credentials",
      "connector_grants",
      "audit_log",
      "outcomes",
      "eval_suites",
      "eval_results",
      "factory_runs",
      "cas_objects",
      "blobstore_refs",
      "secrets",
      "webhooks_inbound",
    ];
    const rows = (await ctx.db.execute(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = ${ctx.schema}`,
    )) as unknown as Array<{ tablename: string }>;
    const present = new Set(rows.map((r) => r.tablename));
    for (const t of expected) {
      expect(present.has(t), `missing table: ${t}`).toBe(true);
    }
  });
});
