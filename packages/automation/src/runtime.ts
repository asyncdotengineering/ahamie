/**
 * Automation runtime.
 *
 * - `enqueueEvent()` — idempotent insert into `automation_events` and
 *   `automation_runs` on `(automation_id, event_id)`.
 * - `runOnce()` — claim a pending run, execute its action sequence, mark
 *   succeeded / failed.
 * - `startScheduler()` — spawns the cron loop (croner-backed) plus the
 *   heartbeat updater (every 10s) and leader sweep (every 30s, reclaiming
 *   stale runs whose heartbeat predates `now() - 30s`).
 *
 * Heartbeat + leader sweep are required for at-most-once-by-claim behavior
 * across multiple workers.
 */

import { Cron } from "croner";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import {
  automation_events,
  automation_runs,
  automation_steps,
  automations,
  type AhamieDb,
} from "@ahamie/storage";
import {
  mintAutomationEventId,
  mintAutomationRunId,
  mintAutomationStepId,
  type AutomationId,
  type AutomationRunId,
  type EventId,
  type OrgId,
} from "@ahamie/schema";
import type { ActionDefinition, AutomationDefinition, HandlerContext } from "./types";

const HEARTBEAT_INTERVAL_MS = 10_000;
const LEADER_SWEEP_MS = 30_000;
const STALE_AFTER_MS = 30_000;

export interface EnqueueArgs {
  orgId: OrgId;
  automationId: AutomationId;
  eventId: EventId;
  triggerKind: string;
  payload: Record<string, unknown>;
  firedAt?: Date;
}

export const enqueueEvent = async (db: AhamieDb, args: EnqueueArgs): Promise<{ runId: string; deduped: boolean }> => {
  const eventRowId = mintAutomationEventId();
  await db
    .insert(automation_events)
    .values({
      id: eventRowId,
      org_id: args.orgId,
      automation_id: args.automationId,
      event_id: args.eventId,
      trigger_kind: args.triggerKind,
      payload: args.payload,
      fired_at: args.firedAt ?? new Date(),
    })
    .onConflictDoNothing({
      target: [automation_events.automation_id, automation_events.event_id],
    });

  const runId = mintAutomationRunId();
  const inserted = await db
    .insert(automation_runs)
    .values({
      id: runId,
      org_id: args.orgId,
      automation_id: args.automationId,
      event_id: args.eventId,
      status: "pending",
    })
    .onConflictDoNothing({
      target: [automation_runs.automation_id, automation_runs.event_id],
    })
    .returning({ id: automation_runs.id });

  if (inserted.length === 0) {
    const existing = await db
      .select()
      .from(automation_runs)
      .where(
        and(
          eq(automation_runs.automation_id, args.automationId),
          eq(automation_runs.event_id, args.eventId),
        ),
      )
      .limit(1);
    return { runId: existing[0]?.id ?? runId, deduped: true };
  }
  return { runId, deduped: false };
};

const runAction = async (action: ActionDefinition, ctx: HandlerContext): Promise<unknown> => {
  switch (action.kind) {
    case "agent.run": {
      const input = await action.input(ctx);
      return action.agent.run({ input, orgId: ctx.actor.orgId });
    }
    case "app.invoke": {
      // v0: app invocation is a no-op contract; v1 wires manifests in.
      const input = await action.input(ctx);
      return { invoked: action.app, action: action.action, input };
    }
    case "gateway.send": {
      const body = action.from({ ...ctx, steps: [] });
      return { sent: action.target, template: action.template, body };
    }
  }
};

export interface RuntimeContext {
  db: AhamieDb;
  /** Workers identify themselves so heartbeats can be attributed. */
  workerId: string;
  /** Resolve a definition by automation_id (the runtime calls this every claim). */
  resolveDefinition: (automationId: AutomationId) => AutomationDefinition | undefined;
  /** Outcome attribution helper. Wired by the host app. */
  attribute?: (
    runId: string,
    subject: { kind: string; id: string },
  ) => Promise<string | null>;
}

export const runOnce = async (
  rc: RuntimeContext,
  runId: AutomationRunId,
): Promise<"succeeded" | "failed"> => {
  const row = (
    await rc.db.select().from(automation_runs).where(eq(automation_runs.id, runId)).limit(1)
  )[0];
  if (!row) throw new Error(`run not found: ${runId}`);

  const def = rc.resolveDefinition(row.automation_id);
  if (!def) {
    await rc.db
      .update(automation_runs)
      .set({ status: "failed", error: { message: "no_definition" }, finished_at: new Date() })
      .where(eq(automation_runs.id, runId));
    return "failed";
  }

  await rc.db
    .update(automation_runs)
    .set({ status: "running", started_at: new Date(), heartbeat_at: new Date() })
    .where(eq(automation_runs.id, runId));

  const ctx: HandlerContext = {
    event: { firedAt: new Date(), eventId: row.event_id, payload: {} },
    run: { id: row.id, idempotencyKey: `${row.automation_id}-${row.event_id}` },
    actor: { kind: "system", id: "automation-runtime", orgId: row.org_id },
    ahamie: {
      orgId: row.org_id,
      outcomes: rc.attribute
        ? {
            attribute: async (subject) =>
              ((await rc.attribute!(row.id, subject)) as never) ?? null,
          }
        : undefined,
    },
  };

  try {
    let seq = 0;
    for (const action of def.actions) {
      await rc.db.insert(automation_steps).values({
        id: mintAutomationStepId(),
        org_id: row.org_id,
        run_id: row.id,
        sequence: seq,
        kind: action.kind,
        status: "running",
        started_at: new Date(),
      });
      const out = await runAction(action, ctx);
      await rc.db
        .update(automation_steps)
        .set({ status: "succeeded", output: out, finished_at: new Date() })
        .where(
          and(eq(automation_steps.run_id, row.id), eq(automation_steps.sequence, seq)),
        );
      seq++;
    }
    await rc.db
      .update(automation_runs)
      .set({ status: "succeeded", finished_at: new Date() })
      .where(eq(automation_runs.id, runId));
    return "succeeded";
  } catch (err) {
    const e = err as Error;
    await rc.db
      .update(automation_runs)
      .set({
        status: "failed",
        error: { message: e.message, stack: e.stack },
        finished_at: new Date(),
      })
      .where(eq(automation_runs.id, runId));
    return "failed";
  }
};

export interface SchedulerHandle {
  stop(): void;
}

export interface SchedulerOptions {
  /** Cron expressions that should be ticked into events. */
  crons?: Array<{
    automationId: AutomationId;
    orgId: OrgId;
    expr: string;
    timezone?: string;
  }>;
}

/**
 * Start cron triggers + heartbeat + leader sweep. Returns a handle.
 */
export const startScheduler = (rc: RuntimeContext, opts: SchedulerOptions = {}): SchedulerHandle => {
  const crons = (opts.crons ?? []).map(
    (c) =>
      new Cron(
        c.expr,
        { timezone: c.timezone ?? "UTC", paused: false },
        async () => {
          await enqueueEvent(rc.db, {
            orgId: c.orgId,
            automationId: c.automationId,
            eventId: `cron-${c.automationId}-${Date.now()}` as EventId,
            triggerKind: "cron",
            payload: { firedAt: new Date().toISOString() },
            firedAt: new Date(),
          });
        },
      ),
  );

  const heartbeat = setInterval(async () => {
    await rc.db
      .update(automation_runs)
      .set({ heartbeat_at: new Date() })
      .where(eq(automation_runs.status, "running"));
  }, HEARTBEAT_INTERVAL_MS);

  const sweep = setInterval(async () => {
    const cutoff = new Date(Date.now() - STALE_AFTER_MS);
    await rc.db
      .update(automation_runs)
      .set({ status: "pending", heartbeat_at: null })
      .where(and(eq(automation_runs.status, "running"), lt(automation_runs.heartbeat_at, cutoff)));
  }, LEADER_SWEEP_MS);

  return {
    stop() {
      for (const c of crons) c.stop();
      clearInterval(heartbeat);
      clearInterval(sweep);
    },
  };
};
