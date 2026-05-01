/**
 * Postgres LISTEN/NOTIFY-backed cancellation.
 *
 * Channel: `ahamie:agent_runs:cancel`. Payload is the `agent_run_id`.
 * The runner subscribes per run; on receipt, the agent's `AbortController`
 * is `abort()`-ed and the next model call short-circuits.
 *
 * v0 ships the helper; the Mastra agent itself receives the AbortSignal via
 * the standard `signal` option.
 */

import type { AhamieDb } from "@ahamie/storage";
import { sql } from "drizzle-orm";

export const CANCEL_CHANNEL = "ahamie_agent_runs_cancel";

export interface CancelHandle {
  signal: AbortSignal;
  unsubscribe(): Promise<void>;
}

/**
 * Subscribe to the cancellation channel for a specific run. Returns an
 * AbortSignal you wire into the model call.
 */
export const subscribeCancel = async (
  db: AhamieDb,
  runId: string,
): Promise<CancelHandle> => {
  const controller = new AbortController();
  const sql$ = db.$client;

  // postgres-js exposes a `listen()` helper that returns an unsubscribe fn.
  const listener = await sql$.listen(CANCEL_CHANNEL, (payload) => {
    if (payload === runId) controller.abort(new Error("cancelled"));
  });

  return {
    signal: controller.signal,
    async unsubscribe() {
      await listener.unlisten();
    },
  };
};

/** Fire a cancel notification for a run. */
export const notifyCancel = async (db: AhamieDb, runId: string): Promise<void> => {
  await db.execute(sql`SELECT pg_notify(${CANCEL_CHANNEL}, ${runId})`);
};
