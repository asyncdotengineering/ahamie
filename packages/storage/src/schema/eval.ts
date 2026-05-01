/**
 * Eval + software-factory tables.
 *
 * - `eval_suites`: registered via `defineSuite`. Hidden-golden refs live in
 *   the `hidden_golden` jsonb (the real bytes live in a separate object-
 *   store prefix; see T13 + RFC §13.4).
 * - `eval_results`: per-suite, per-version score rows.
 * - `factory_runs`: software-factory outer-loop iterations.
 */

import { index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type {
  EvalResultId,
  EvalSuiteId,
  FactoryRunId,
} from "@ahamie/schema";
import { brandedId, id, orgIdCol, sql, timestamps } from "./columns";

export const eval_suites = pgTable(
  "eval_suites",
  {
    id: id().$type<EvalSuiteId>(),
    org_id: orgIdCol(),
    slug: text("slug").notNull(),
    /** Frozen scenario list, judge rubric, threshold. */
    definition: jsonb("definition").$type<Record<string, unknown>>().notNull(),
    /** `{ refs: string[]; threshold: number }` — bytes live elsewhere. */
    hidden_golden: jsonb("hidden_golden").$type<{
      refs: string[];
      threshold: number;
    } | null>(),
    threshold: real("threshold").notNull().default(0.8),
    ...timestamps(),
  },
  (t) => [uniqueIndex("eval_suites_org_slug_idx").on(t.org_id, t.slug)],
);

export const eval_results = pgTable(
  "eval_results",
  {
    id: id().$type<EvalResultId>(),
    org_id: orgIdCol(),
    suite_id: brandedId<EvalSuiteId>("suite_id"),
    /** Hash of the controller (agent) under test. */
    controller_hash: text("controller_hash").notNull(),
    /** `observable` vs `hidden_golden`. */
    partition: text("partition", { enum: ["observable", "hidden_golden"] }).notNull(),
    score: real("score").notNull(),
    passed: text("passed", { enum: ["yes", "no"] }).notNull(),
    /** Per-scenario outcomes (jsonb so the suite can grow). */
    scenarios: jsonb("scenarios").$type<Array<Record<string, unknown>>>().notNull().default([]),
    ran_at: timestamp("ran_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...timestamps(),
  },
  (t) => [
    index("eval_results_suite_partition_idx").on(t.suite_id, t.partition, t.ran_at),
    index("eval_results_org_ran_idx").on(t.org_id, t.ran_at),
  ],
);

export const factory_runs = pgTable(
  "factory_runs",
  {
    id: id().$type<FactoryRunId>(),
    org_id: orgIdCol(),
    spec_hash: text("spec_hash").notNull(),
    suite_id: brandedId<EvalSuiteId>("suite_id"),
    iteration: integer("iteration").notNull().default(0),
    status: text("status", {
      enum: ["pending", "running", "succeeded", "failed", "abandoned"],
    })
      .notNull()
      .default("pending"),
    /** PAC threshold target. */
    target_score: real("target_score").notNull().default(0.85),
    /** Actual best score reached. */
    best_score: real("best_score"),
    tabu_list: jsonb("tabu_list").$type<string[]>().notNull().default([]),
    output: jsonb("output").$type<unknown>(),
    error: jsonb("error").$type<{ message: string; stack?: string } | null>(),
    started_at: timestamp("started_at", { withTimezone: true, mode: "date" }),
    finished_at: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    ...timestamps(),
  },
  (t) => [index("factory_runs_org_status_idx").on(t.org_id, t.status, t.created_at)],
);

export type EvalSuite = typeof eval_suites.$inferSelect;
export type EvalResult = typeof eval_results.$inferSelect;
export type FactoryRun = typeof factory_runs.$inferSelect;
