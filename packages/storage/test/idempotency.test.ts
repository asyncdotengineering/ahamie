import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  mintAutomationId,
  mintAutomationRunId,
  mintEventId,
  mintOrgId,
  type AutomationId,
  type EventId,
  type OrgId,
} from "@ahamie/schema";
import { automation_runs, automations, organizations } from "../src/schema";
import { startTestDb, type TestDbContext } from "../src/test-helpers";

describe("automation idempotency on (automation_id, event_id) — RFC §8.5", () => {
  let ctx: TestDbContext;
  let orgId: OrgId;
  let automationId: AutomationId;

  beforeAll(async () => {
    ctx = await startTestDb();
    orgId = mintOrgId();
    automationId = mintAutomationId();
    await ctx.db
      .insert(organizations)
      .values({ id: orgId, slug: "org", name: "Org" });
    await ctx.db.insert(automations).values({
      id: automationId,
      org_id: orgId,
      slug: "auto",
      name: "Auto",
      definition: {},
    });
  });

  afterAll(async () => {
    await ctx?.stop();
  });

  it("ON CONFLICT DO NOTHING produces zero side effects on duplicate event", async () => {
    const eventId: EventId = mintEventId();
    const first = mintAutomationRunId();
    const second = mintAutomationRunId();

    await ctx.db
      .insert(automation_runs)
      .values({
        id: first,
        org_id: orgId,
        automation_id: automationId,
        event_id: eventId,
        status: "pending",
      })
      .onConflictDoNothing({ target: [automation_runs.automation_id, automation_runs.event_id] });

    await ctx.db
      .insert(automation_runs)
      .values({
        id: second,
        org_id: orgId,
        automation_id: automationId,
        event_id: eventId,
        status: "pending",
      })
      .onConflictDoNothing({ target: [automation_runs.automation_id, automation_runs.event_id] });

    const rows = await ctx.db
      .select()
      .from(automation_runs)
      .where(
        and(
          eq(automation_runs.automation_id, automationId),
          eq(automation_runs.event_id, eventId),
        ),
      );
    expect(rows.length).toBe(1);
    expect(rows[0]?.id).toBe(first);
  });
});
