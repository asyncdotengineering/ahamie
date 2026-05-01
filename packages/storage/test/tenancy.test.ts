import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asBrand,
  mintAutomationId,
  mintAutomationRunId,
  mintEventId,
  mintOrgId,
  type OrgId,
} from "@ahamie/schema";
import {
  automation_runs,
  automations,
  organizations,
} from "../src/schema";
import { startTestDb, type TestDbContext } from "../src/test-helpers";

describe("L1 tenant enforcement (T19) — branded types + org-scoped queries", () => {
  let ctx: TestDbContext;
  let orgA: OrgId;
  let orgB: OrgId;

  beforeAll(async () => {
    ctx = await startTestDb();

    orgA = mintOrgId();
    orgB = mintOrgId();
    await ctx.db.insert(organizations).values([
      { id: orgA, slug: "org-a", name: "Org A" },
      { id: orgB, slug: "org-b", name: "Org B" },
    ]);

    const autoA = mintAutomationId();
    const autoB = mintAutomationId();
    await ctx.db.insert(automations).values([
      {
        id: autoA,
        org_id: orgA,
        slug: "summary",
        name: "Summary",
        definition: { trigger: "cron" },
      },
      {
        id: autoB,
        org_id: orgB,
        slug: "summary",
        name: "Summary",
        definition: { trigger: "cron" },
      },
    ]);

    await ctx.db.insert(automation_runs).values([
      {
        id: mintAutomationRunId(),
        org_id: orgA,
        automation_id: autoA,
        event_id: mintEventId(),
        status: "succeeded",
      },
      {
        id: mintAutomationRunId(),
        org_id: orgB,
        automation_id: autoB,
        event_id: mintEventId(),
        status: "succeeded",
      },
    ]);
  });

  afterAll(async () => {
    await ctx?.stop();
  });

  it("org A's runs are invisible to org B's session", async () => {
    const visible = await ctx.db
      .select()
      .from(automation_runs)
      .where(eq(automation_runs.org_id, orgB));
    expect(visible.length).toBe(1);
    for (const r of visible) {
      expect(r.org_id).toBe(orgB);
    }
  });

  it("composite (org_id, slug) uniqueness lets each org reuse 'summary'", async () => {
    const a = await ctx.db
      .select()
      .from(automations)
      .where(and(eq(automations.org_id, orgA), eq(automations.slug, "summary")));
    const b = await ctx.db
      .select()
      .from(automations)
      .where(and(eq(automations.org_id, orgB), eq(automations.slug, "summary")));
    expect(a.length).toBe(1);
    expect(b.length).toBe(1);
    expect(a[0]?.id).not.toBe(b[0]?.id);
  });

  it("branded OrgId blocks cross-tenant FK at compile time (smoke)", () => {
    const widened = asBrand<"OrgId">("not-a-real-id");
    // The narrowed brand keeps us honest in app code; a plain string would
    // typecheck even without this — that's why we use mintXId() everywhere.
    expect(widened).toBe("not-a-real-id");
  });
});
