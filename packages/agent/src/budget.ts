/**
 * Budget enforcement.
 *
 * Per W3 deliverable: a preflight check before each model call. The cap is
 * declared as `cap_usd`; on cap hit, the policy is one of:
 *
 *   - `pause`   — the run is suspended, written back as `paused` in the DB,
 *                 and a human approval token is required to resume.
 *   - `degrade` — switch to a cheaper model (informational; we surface the
 *                 hint and let the agent's model router decide).
 *   - `fail`    — throw `BudgetExceededError` and let the workflow handle it.
 *
 * USD precision is 4 decimals (10^-4); we store cents internally.
 */

export type OnCap = "pause" | "degrade" | "fail";

export class BudgetExceededError extends Error {
  constructor(
    message: string,
    public readonly capUsd: number,
    public readonly spentUsd: number,
  ) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export class BudgetPausedError extends Error {
  constructor(public readonly runId: string) {
    super(`agent run ${runId} paused at budget cap`);
    this.name = "BudgetPausedError";
  }
}

export interface BudgetState {
  capUsdCents: number | null;
  spentUsdCents: number;
  onCap: OnCap;
}

export interface BudgetCharge {
  /** Estimate of the next call's cost. */
  estimatedUsdCents: number;
}

export const checkBudget = (state: BudgetState, charge: BudgetCharge): void => {
  if (state.capUsdCents == null) return; // unmetered
  if (state.spentUsdCents + charge.estimatedUsdCents <= state.capUsdCents) return;
  if (state.onCap === "fail") {
    throw new BudgetExceededError(
      `cap ${state.capUsdCents / 100} exceeded`,
      state.capUsdCents / 100,
      state.spentUsdCents / 100,
    );
  }
  if (state.onCap === "pause") {
    throw new BudgetPausedError("run");
  }
  // degrade: caller is expected to react via `onDegrade` hook.
};

export const usdToCents = (usd: number): number => Math.round(usd * 100);
export const centsToUsd = (cents: number): number => cents / 100;
