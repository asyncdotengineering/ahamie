/**
 * `outcomes` table — RunOutcome shape (T13, RFC §8.8).
 *
 * **Invariant** (enforced by `@ahamie/outcomes`, not by the table itself):
 *   The `source` value MUST be a system that the agent identified by
 *   `agent_run_id` does not have write access to. This is the sensor-isolation
 *   contract that makes outcomes credible.
 */

import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { AgentRunId, AutomationRunId, OutcomeId } from "@ahamie/schema";
import { brandedId, id, orgIdCol, sql, timestamps } from "./columns";

export const outcomes = pgTable(
  "outcomes",
  {
    id: id().$type<OutcomeId>(),
    org_id: orgIdCol(),
    /** The run we are attributing the outcome to. */
    automation_run_id: brandedId<AutomationRunId>("automation_run_id"),
    agent_run_id: text("agent_run_id").$type<AgentRunId>(),
    /** Subject the outcome is about: `linear.issue`, `salesforce.opportunity`, `pagerduty.incident`. */
    subject_kind: text("subject_kind").notNull(),
    subject_id: text("subject_id").notNull(),
    /**
     * Outcome semantic kind: `linear_issue_closed`, `pr_merged`,
     * `appointment_booked`, `incident_resolved`, `human_thumbs_up`, …
     */
    outcome_type: text("outcome_type").notNull(),
    /** Free-form value (numeric, string, bool — jsonb so we don't lose precision). */
    value: jsonb("value").$type<unknown>(),
    /**
     * The system that emitted the outcome. MUST NOT equal a system the agent
     * can write to. Enforced at write time by `@ahamie/outcomes`.
     */
    source: text("source").notNull(),
    /** `human_decision`, `system_event`, `metric_threshold`, `external_signal`. */
    source_kind: text("source_kind").notNull(),
    observed_at: timestamp("observed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("outcomes_unique_idx").on(t.org_id, t.automation_run_id, t.outcome_type, t.subject_id),
    index("outcomes_subject_idx").on(t.org_id, t.subject_kind, t.subject_id),
    index("outcomes_observed_idx").on(t.org_id, t.observed_at),
  ],
);

export type Outcome = typeof outcomes.$inferSelect;
