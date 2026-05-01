/**
 * Approval-gate example: a workflow that suspends mid-flight pending
 * human approval. The same shape `ApprovalInbox` consumes (T11).
 */

import { defineStep, defineWorkflow } from "@ahamie/workflow";

export const approvalWorkflow = defineWorkflow<{ proposal: string }, { proposal: string; approved: boolean }>({
  id: "approval-gate",
  steps: [
    defineStep<{ proposal: string }, { proposal: string }>({
      id: "draft",
      async execute(ctx) {
        return { proposal: ctx.input.proposal };
      },
    }),
    defineStep<{ proposal: string }, { proposal: string; approved: boolean }>({
      id: "wait-for-human",
      async execute(ctx) {
        await ctx.suspend("needs human approval");
        return { proposal: ctx.input.proposal, approved: true };
      },
    }),
  ],
});
