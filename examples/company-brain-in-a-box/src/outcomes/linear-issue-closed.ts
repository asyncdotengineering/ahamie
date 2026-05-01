import { defineProvider } from "@ahamie/automation";
import { recordOutcome } from "@ahamie/outcomes";
import { z } from "@ahamie/schema";

/**
 * Linear webhook → outcome attribution. Sensor isolation enforced: if the
 * closer is the agent itself, we do not attribute (T13).
 */

const linearIssueClosedSchema = z.object({
  id: z.string(),
  closedBy: z.string(),
  closedAt: z.string(),
});

export default defineProvider({
  id: "linear",
  triggers: {
    "issue.closed": {
      schema: linearIssueClosedSchema,
      async handler({ event, ahamie }) {
        const payload = event.payload as { id: string; closedBy: string; closedAt: string };
        if (payload.closedBy === ahamie.agentIdentity) return;
        const runId = await ahamie.outcomes?.attribute({
          kind: "linear.issue",
          id: payload.id,
        });
        if (!runId) return;
        // The DB is normally injected by the host; in the example we call
        // recordOutcome inside the handler shape so the test can stub it.
        await recordOutcome((ahamie as Record<string, unknown>).db as never, {
          orgId: ahamie.orgId,
          automationRunId: runId,
          subject: { kind: "linear.issue", id: payload.id },
          outcome_type: "linear_issue_closed",
          value: payload.id,
          source: "linear",
          source_kind: "human_decision",
          observed_at: new Date(payload.closedAt),
        });
      },
    },
  },
});
