/**
 * Automation tables.
 *
 * - `automations`: definitions registered via `defineAutomation`.
 * - `automation_events`: canonical trigger event rows; deduplicated on `event_id`.
 * - `automation_runs`: idempotent on `(automation_id, event_id)`; heartbeat fields.
 * - `automation_steps`: action/delivery progression of a run.
 *
 * The unique constraint on `(automation_id, event_id)` is what makes
 * `INSERT … ON CONFLICT DO NOTHING` produce zero side-effects on duplicate
 * deliveries. Every webhook source is at-least-once, so this is load-bearing.
 */

import { jsonb, pgTable, text, timestamp, uniqueIndex, integer, index } from "drizzle-orm/pg-core";
import type {
  AutomationEventId,
  AutomationId,
  AutomationRunId,
  AutomationStepId,
  EventId,
} from "@ahamie/schema";
import { brandedId, id, orgIdCol, sql, timestamps } from "./columns";

export const automations = pgTable(
  "automations",
  {
    id: id().$type<AutomationId>(),
    org_id: orgIdCol(),
    /** kebab-case slug, unique within the org. */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** Frozen manifest snapshot of the trigger + actions, for replay safety. */
    definition: jsonb("definition").$type<Record<string, unknown>>().notNull(),
    enabled: text("enabled", { enum: ["enabled", "paused"] }).notNull().default("enabled"),
    ...timestamps(),
  },
  (t) => [uniqueIndex("automations_org_slug_idx").on(t.org_id, t.slug)],
);

export const automation_events = pgTable(
  "automation_events",
  {
    id: id().$type<AutomationEventId>(),
    org_id: orgIdCol(),
    automation_id: brandedId<AutomationId>("automation_id"),
    /** Provider-supplied dedupe key (e.g. Slack `event_id`, Linear delivery id). */
    event_id: brandedId<EventId>("event_id"),
    /** Trigger kind: `cron`, `webhook`, `manual.button`, `manual.api`, `appEvent`, `channel.message`. */
    trigger_kind: text("trigger_kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    fired_at: timestamp("fired_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("automation_events_dedup_idx").on(t.automation_id, t.event_id),
    index("automation_events_org_fired_idx").on(t.org_id, t.fired_at),
  ],
);

export const automation_runs = pgTable(
  "automation_runs",
  {
    id: id().$type<AutomationRunId>(),
    org_id: orgIdCol(),
    automation_id: brandedId<AutomationId>("automation_id"),
    event_id: brandedId<EventId>("event_id"),
    status: text("status", {
      enum: ["pending", "running", "succeeded", "failed", "cancelled", "paused"],
    })
      .notNull()
      .default("pending"),
    started_at: timestamp("started_at", { withTimezone: true, mode: "date" }),
    finished_at: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    /** Heartbeat for leader sweep — leader updates every 10s, sweep reclaims < now()-30s. */
    heartbeat_at: timestamp("heartbeat_at", { withTimezone: true, mode: "date" }),
    cancel_requested: text("cancel_requested", { enum: ["yes", "no"] })
      .notNull()
      .default("no"),
    error: jsonb("error").$type<{ message: string; stack?: string } | null>(),
    output: jsonb("output").$type<unknown>(),
    /** Spend roll-up; updated as actions accrue cost. */
    cost_usd_cents: integer("cost_usd_cents").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("automation_runs_dedup_idx").on(t.automation_id, t.event_id),
    index("automation_runs_org_created_idx").on(t.org_id, t.created_at),
    index("automation_runs_pending_heartbeat_idx").on(t.status, t.heartbeat_at),
  ],
);

export const automation_steps = pgTable(
  "automation_steps",
  {
    id: id().$type<AutomationStepId>(),
    org_id: orgIdCol(),
    run_id: brandedId<AutomationRunId>("run_id"),
    /** 0-indexed position in the action array. */
    sequence: integer("sequence").notNull(),
    /** Action kind: `agent.run`, `app.invoke`, `gateway.send`. */
    kind: text("kind").notNull(),
    status: text("status", {
      enum: ["pending", "running", "succeeded", "failed", "skipped"],
    })
      .notNull()
      .default("pending"),
    input: jsonb("input").$type<unknown>(),
    output: jsonb("output").$type<unknown>(),
    error: jsonb("error").$type<{ message: string; stack?: string } | null>(),
    started_at: timestamp("started_at", { withTimezone: true, mode: "date" }),
    finished_at: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("automation_steps_run_seq_idx").on(t.run_id, t.sequence),
    index("automation_steps_org_run_idx").on(t.org_id, t.run_id),
  ],
);

export type Automation = typeof automations.$inferSelect;
export type AutomationEvent = typeof automation_events.$inferSelect;
export type AutomationRun = typeof automation_runs.$inferSelect;
export type AutomationStep = typeof automation_steps.$inferSelect;
