/**
 * Outcome hook contract.
 *
 * Every `defineAgent`-created agent registers an outcome hook. The hook
 * fires *after* the agent's terminal step (success or failure) and is the
 * point where downstream observers (`@ahamie/outcomes`) attach attribution.
 *
 * Critical: the hook does NOT decide outcomes. It only emits `RunCompleted`
 * envelopes. Outcomes are recorded by systems the agent does not write to
 * (sensor isolation, T13).
 */

import type { AgentRunId, OrgId } from "@ahamie/schema";

export interface RunCompletedEnvelope {
  runId: AgentRunId;
  orgId: OrgId;
  agentId: string;
  status: "succeeded" | "failed" | "cancelled" | "paused";
  durationMs: number;
  costUsd: number;
  tokensTotal: number;
  /** Sanitized output (the run's final value, JSON-serializable). */
  output: unknown;
  /** Failure detail when `status === "failed"`. */
  error?: { message: string; stack?: string };
}

export type OutcomeHook = (envelope: RunCompletedEnvelope) => Promise<void> | void;

const hooks = new Set<OutcomeHook>();

export const registerOutcomeHook = (hook: OutcomeHook): (() => void) => {
  hooks.add(hook);
  return () => hooks.delete(hook);
};

export const fireOutcomeHooks = async (envelope: RunCompletedEnvelope): Promise<void> => {
  await Promise.all(Array.from(hooks).map((h) => Promise.resolve(h(envelope))));
};
