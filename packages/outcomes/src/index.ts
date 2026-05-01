/**
 * `@ahamie/outcomes` — passive outcome recorder.
 *
 * Two operations:
 *   - `record(runId, type, value, source, …)` — write a `RunOutcome` row.
 *   - `attribute(runId, subject)` — find the run that last *proposed* work
 *     on a subject. Used by Linear/PagerDuty/etc. webhooks.
 *
 * **Sensor-isolation invariant** (T13, RFC §13.4): the `source` value MUST
 * be a system the agent identified by `agent_run_id` does not have write
 * access to. Enforced by the runtime via `setSensorIsolationGuard()` —
 * the host wires it during boot.
 */

import { and, desc, eq } from "drizzle-orm";
import {
  outcomes,
  type AhamieDb,
  type Outcome,
} from "@ahamie/storage";
import {
  type AgentRunId,
  type AutomationRunId,
  type OrgId,
  mintOutcomeId,
} from "@ahamie/schema";

export class SensorIsolationViolationError extends Error {
  constructor(public readonly source: string, public readonly agentRunId: string) {
    super(`sensor isolation: agent run ${agentRunId} cannot write to source '${source}'`);
    this.name = "SensorIsolationViolationError";
  }
}

export type SensorIsolationGuard = (args: {
  agentRunId?: AgentRunId | null;
  source: string;
}) => Promise<boolean> | boolean;

let activeGuard: SensorIsolationGuard = () => true;

/** Wire a sensor-isolation guard at boot. */
export const setSensorIsolationGuard = (guard: SensorIsolationGuard): void => {
  activeGuard = guard;
};

export interface RecordOutcomeArgs {
  orgId: OrgId;
  automationRunId: AutomationRunId;
  agentRunId?: AgentRunId | null;
  subject: { kind: string; id: string };
  outcome_type: string;
  value?: unknown;
  source: string;
  source_kind: "human_decision" | "system_event" | "metric_threshold" | "external_signal";
  observed_at?: Date;
  metadata?: Record<string, unknown>;
}

export const recordOutcome = async (db: AhamieDb, args: RecordOutcomeArgs): Promise<Outcome> => {
  const isolated = await activeGuard({ agentRunId: args.agentRunId, source: args.source });
  if (!isolated) {
    throw new SensorIsolationViolationError(args.source, args.agentRunId ?? "");
  }
  const inserted = await db
    .insert(outcomes)
    .values({
      id: mintOutcomeId(),
      org_id: args.orgId,
      automation_run_id: args.automationRunId,
      agent_run_id: args.agentRunId ?? null,
      subject_kind: args.subject.kind,
      subject_id: args.subject.id,
      outcome_type: args.outcome_type,
      value: args.value,
      source: args.source,
      source_kind: args.source_kind,
      observed_at: args.observed_at ?? new Date(),
      metadata: args.metadata ?? {},
    })
    .onConflictDoNothing({
      target: [outcomes.org_id, outcomes.automation_run_id, outcomes.outcome_type, outcomes.subject_id],
    })
    .returning();
  return inserted[0]!;
};

export interface AttributeArgs {
  orgId: OrgId;
  subject: { kind: string; id: string };
}

/**
 * Find the most recent automation run that proposed work on the subject.
 * v0 looks for any prior outcome row referencing the subject — adopters
 * can refine this once they wire their own subject→run index.
 */
export const attribute = async (
  db: AhamieDb,
  args: AttributeArgs,
): Promise<AutomationRunId | null> => {
  const rows = await db
    .select()
    .from(outcomes)
    .where(
      and(
        eq(outcomes.org_id, args.orgId),
        eq(outcomes.subject_kind, args.subject.kind),
        eq(outcomes.subject_id, args.subject.id),
      ),
    )
    .orderBy(desc(outcomes.observed_at))
    .limit(1);
  return rows[0]?.automation_run_id ?? null;
};
