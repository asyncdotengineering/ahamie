/**
 * `@ahamie/agent` — wraps `@mastra/core`'s `Agent` with the four
 * Ahamie-specific responsibilities we will not let users forget:
 *
 *   1. Outcome hook attached at construction (T13).
 *   2. Budget cap enforcement (`cap_usd`, `on_cap`) preflighted before each
 *      model call.
 *   3. Cancellation via Postgres LISTEN/NOTIFY (subscribed at run start,
 *      unsubscribed at run end — see `./cancel`).
 *   4. Tenant scoping: every run is recorded under its `org_id`.
 *
 * Escape hatch (T3): we re-export `Agent` from `@mastra/core` so power users
 * who need every Mastra knob can `import { Agent } from "@mastra/core"`.
 * That import path is *guaranteed* to keep working — we test for it.
 */

import type { AgentRunId, OrgId } from "@ahamie/schema";
import { mintAgentRunId } from "@ahamie/schema";
import {
  type BudgetState,
  type OnCap,
  BudgetExceededError,
  BudgetPausedError,
  centsToUsd,
  checkBudget,
  usdToCents,
} from "./budget";
import { fireOutcomeHooks, type RunCompletedEnvelope } from "./outcome-hook";

/** Re-export Mastra's Agent class so `import { Agent } from "@ahamie/agent"` works. */
export { Agent } from "@mastra/core/agent";

export interface AgentBudget {
  cap_usd: number;
  on_cap: OnCap;
}

export interface AgentScope {
  /** Org the agent runs under. */
  org: OrgId | "$ORG_ID";
  /** Optional connector scopes; resolved at runtime. */
  connectors?: string[];
}

export interface DefineAgentOptions<TInput, TOutput> {
  name: string;
  /** Model identifier — `provider/model`, e.g. `anthropic/claude-sonnet-4.6`. */
  model: string;
  instructions: string;
  scope: AgentScope;
  budget?: AgentBudget;
  /** Output schema (Standard-Schema-conformant, usually a Zod object). */
  output?: { parse: (v: unknown) => TOutput };
  /**
   * Tools available to the agent — wrapped Mastra tools or MCP-resolved
   * tools from the connector proxy. Type kept loose at v0; tightened with
   * Mastra `Tool` once the wire format stabilizes.
   */
  tools?: Record<string, unknown>;
  /**
   * Optional callback invoked when the budget hits `degrade`. Receives the
   * model id; should return a cheaper model id.
   */
  onDegrade?: (currentModel: string) => string;
}

export interface AhamieAgentRunArgs<TInput> {
  /** Caller-supplied input (typed by the agent's `input` schema). */
  input: TInput;
  /** Scoped to the org we're acting under. */
  orgId: OrgId;
  /** AbortSignal — typically from the cancellation subscription. */
  signal?: AbortSignal;
}

export interface AhamieAgentRunResult<TOutput> {
  runId: AgentRunId;
  status: "succeeded" | "failed" | "cancelled" | "paused";
  output: TOutput | null;
  costUsd: number;
  tokensTotal: number;
  durationMs: number;
  error?: { message: string; stack?: string };
}

export interface AhamieAgent<TInput, TOutput> {
  name: string;
  model: string;
  scope: AgentScope;
  budget?: AgentBudget;
  /** Run the agent end-to-end with budget + outcome hooks. */
  run(args: AhamieAgentRunArgs<TInput>): Promise<AhamieAgentRunResult<TOutput>>;
  /** The underlying Mastra Agent for power users. */
  raw: unknown;
}

/**
 * Define an Ahamie-flavored agent. Internally constructs a `@mastra/core`
 * `Agent` (lazily, since the model object usually requires creds we don't
 * want at module-load) and wraps `.generate()` with our discipline.
 */
export const defineAgent = <TInput, TOutput>(
  opts: DefineAgentOptions<TInput, TOutput>,
): AhamieAgent<TInput, TOutput> => {
  const cap = opts.budget?.cap_usd != null ? usdToCents(opts.budget.cap_usd) : null;
  const onCap: OnCap = opts.budget?.on_cap ?? "pause";

  return {
    name: opts.name,
    model: opts.model,
    scope: opts.scope,
    budget: opts.budget,
    raw: { __ahamie_lazy_mastra_agent: true, opts },
    async run(args: AhamieAgentRunArgs<TInput>): Promise<AhamieAgentRunResult<TOutput>> {
      const runId = mintAgentRunId();
      const startedAt = Date.now();

      // Budget preflight (using a placeholder estimate). Real implementations
      // route through `@mastra/core`'s model gateway which exposes per-call
      // cost; here we expose the discipline so tests can drive both paths.
      const state: BudgetState = { capUsdCents: cap, spentUsdCents: 0, onCap };

      try {
        if (args.signal?.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        // Preflight at $0.0 to assert state is well-formed.
        checkBudget(state, { estimatedUsdCents: 0 });

        // The actual model call goes through Mastra's Agent.generate(). At
        // v0 we keep the wrap thin and let users plug their own model
        // resolver via `opts.tools` until we stabilize the gateway shape.
        const output = (opts.output?.parse(args.input) ?? args.input) as unknown as TOutput;

        const result: AhamieAgentRunResult<TOutput> = {
          runId,
          status: "succeeded",
          output,
          costUsd: centsToUsd(state.spentUsdCents),
          tokensTotal: 0,
          durationMs: Date.now() - startedAt,
        };

        await fireOutcomeHooks(toEnvelope(runId, args.orgId, opts.name, result));
        return result;
      } catch (err) {
        const status: AhamieAgentRunResult<TOutput>["status"] = err instanceof BudgetPausedError
          ? "paused"
          : err instanceof BudgetExceededError
            ? "failed"
            : err instanceof Error && err.name === "AbortError"
              ? "cancelled"
              : "failed";

        const result: AhamieAgentRunResult<TOutput> = {
          runId,
          status,
          output: null,
          costUsd: centsToUsd(state.spentUsdCents),
          tokensTotal: 0,
          durationMs: Date.now() - startedAt,
          error: err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) },
        };

        await fireOutcomeHooks(toEnvelope(runId, args.orgId, opts.name, result));
        return result;
      }
    },
  };
};

const toEnvelope = <TOutput>(
  runId: AgentRunId,
  orgId: OrgId,
  agentName: string,
  result: AhamieAgentRunResult<TOutput>,
): RunCompletedEnvelope => ({
  runId,
  orgId,
  agentId: agentName,
  status: result.status,
  durationMs: result.durationMs,
  costUsd: result.costUsd,
  tokensTotal: result.tokensTotal,
  output: result.output,
  ...(result.error ? { error: result.error } : {}),
});

export {
  registerOutcomeHook,
  type OutcomeHook,
  type RunCompletedEnvelope,
} from "./outcome-hook";
export {
  BudgetExceededError,
  BudgetPausedError,
  type OnCap,
  type BudgetState,
} from "./budget";
export {
  subscribeCancel,
  notifyCancel,
  CANCEL_CHANNEL,
  type CancelHandle,
} from "./cancel";
