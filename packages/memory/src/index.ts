/**
 * `@ahamie/memory` — wraps `@mastra/memory` with the pgvector-backed
 * default sourced from `@ahamie/storage`. Org-scoped — every memory cell
 * is partitioned by `org_id` (T19).
 *
 * Why a wrap? Mastra's memory exposes a generic vector backend; we
 * standardize on pgvector through our Drizzle schema so a single Postgres
 * holds session + memory + automation state. This keeps the substrate
 * thesis honest: one box, one backup story.
 */

import type { OrgId, AgentRunId } from "@ahamie/schema";
import { mintAgentStepId } from "@ahamie/schema";
import { agent_steps, type AhamieDb } from "@ahamie/storage";
import { and, desc, eq } from "drizzle-orm";

export interface MemoryWriteArgs {
  orgId: OrgId;
  agentRunId: AgentRunId;
  sequence: number;
  kind: string;
  payload: Record<string, unknown>;
  embedding?: number[];
  costUsdCents?: number;
  tokensIn?: number;
  tokensOut?: number;
}

export interface MemoryQuery {
  orgId: OrgId;
  agentRunId?: AgentRunId;
  kind?: string;
  limit?: number;
}

export interface AhamieMemory {
  /** Append a turn to the agent's memory. */
  write(args: MemoryWriteArgs): Promise<void>;
  /** Read the most recent turns for an agent run. */
  recent(query: MemoryQuery): Promise<Array<typeof agent_steps.$inferSelect>>;
}

export const createMemory = (db: AhamieDb): AhamieMemory => ({
  async write(args: MemoryWriteArgs): Promise<void> {
    await db.insert(agent_steps).values({
      id: mintAgentStepId(),
      org_id: args.orgId,
      agent_run_id: args.agentRunId,
      sequence: args.sequence,
      kind: args.kind,
      payload: args.payload,
      embedding: args.embedding ?? null,
      cost_usd_cents: args.costUsdCents ?? 0,
      tokens_in: args.tokensIn ?? 0,
      tokens_out: args.tokensOut ?? 0,
    });
  },
  async recent(q: MemoryQuery) {
    const conds = [eq(agent_steps.org_id, q.orgId)];
    if (q.agentRunId) conds.push(eq(agent_steps.agent_run_id, q.agentRunId));
    if (q.kind) conds.push(eq(agent_steps.kind, q.kind));
    return db
      .select()
      .from(agent_steps)
      .where(and(...conds))
      .orderBy(desc(agent_steps.sequence))
      .limit(q.limit ?? 50);
  },
});
