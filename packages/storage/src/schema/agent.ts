/**
 * Agent tables.
 *
 * - `agents`: definitions registered via `defineAgent`.
 * - `agent_runs`: one row per `agent.run` invocation; FK to `automation_runs`.
 * - `agent_steps`: append-only turn log (see `AgentStep`).
 *
 * `agent_steps.embedding` is a pgvector column populated by Mastra memory
 * for retrieval. The migration installs the `vector` extension and creates
 * an HNSW index on this column.
 */

import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  AgentId,
  AgentRunId,
  AgentStepId,
  AutomationRunId,
} from "@ahamie/schema";
import { brandedId, id, orgIdCol, sql, timestamps } from "./columns";

/** pgvector typed column. Dimension is fixed at 1536 (OpenAI/Anthropic small). */
export const vector = (name: string, dimensions = 1536) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value: number[]): string {
      return `[${value.join(",")}]`;
    },
    fromDriver(value: string): number[] {
      return value
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map(Number);
    },
  })(name);

export const agents = pgTable(
  "agents",
  {
    id: id().$type<AgentId>(),
    org_id: orgIdCol(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    model: text("model").notNull(),
    instructions: text("instructions").notNull(),
    definition: jsonb("definition").$type<Record<string, unknown>>().notNull(),
    ...timestamps(),
  },
  (t) => [uniqueIndex("agents_org_slug_idx").on(t.org_id, t.slug)],
);

export const agent_runs = pgTable(
  "agent_runs",
  {
    id: id().$type<AgentRunId>(),
    org_id: orgIdCol(),
    agent_id: brandedId<AgentId>("agent_id"),
    /** Parent automation run (nullable for ad-hoc agent invocations). */
    automation_run_id: text("automation_run_id").$type<AutomationRunId>(),
    status: text("status", {
      enum: ["pending", "running", "succeeded", "failed", "cancelled", "paused"],
    })
      .notNull()
      .default("pending"),
    started_at: timestamp("started_at", { withTimezone: true, mode: "date" }),
    finished_at: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    cancel_requested: text("cancel_requested", { enum: ["yes", "no"] })
      .notNull()
      .default("no"),
    cap_usd_cents: integer("cap_usd_cents"),
    /** spend, accumulated as model calls land. */
    cost_usd_cents: integer("cost_usd_cents").notNull().default(0),
    /** prompt+completion token total, accumulated. */
    tokens_total: integer("tokens_total").notNull().default(0),
    on_cap: text("on_cap", { enum: ["pause", "degrade", "fail"] })
      .notNull()
      .default("pause"),
    input: jsonb("input").$type<unknown>(),
    output: jsonb("output").$type<unknown>(),
    error: jsonb("error").$type<{ message: string; stack?: string } | null>(),
    ...timestamps(),
  },
  (t) => [
    index("agent_runs_org_created_idx").on(t.org_id, t.created_at),
    index("agent_runs_automation_run_idx").on(t.automation_run_id),
  ],
);

export const agent_steps = pgTable(
  "agent_steps",
  {
    id: id().$type<AgentStepId>(),
    org_id: orgIdCol(),
    agent_run_id: brandedId<AgentRunId>("agent_run_id"),
    sequence: integer("sequence").notNull(),
    /** `model.call`, `tool.call`, `tool.result`, `assistant.message`, `error`. */
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    /** pgvector embedding for retrieval; nullable. */
    embedding: vector("embedding", 1536),
    cost_usd_cents: integer("cost_usd_cents").notNull().default(0),
    tokens_in: integer("tokens_in").notNull().default(0),
    tokens_out: integer("tokens_out").notNull().default(0),
    occurred_at: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("agent_steps_run_seq_idx").on(t.agent_run_id, t.sequence),
    index("agent_steps_org_occurred_idx").on(t.org_id, t.occurred_at),
  ],
);

export type Agent = typeof agents.$inferSelect;
export type AgentRun = typeof agent_runs.$inferSelect;
export type AgentStep = typeof agent_steps.$inferSelect;
