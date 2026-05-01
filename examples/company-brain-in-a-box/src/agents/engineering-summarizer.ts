import { defineAgent } from "@ahamie/agent";
import { z } from "@ahamie/schema";
import { slackConnector } from "../connectors/slack";

/**
 * Daily engineering summarizer — the canonical reference agent (§8.2).
 * Reads the previous day of #engineering, returns ≤ 5 bullets each
 * citing a permalink.
 */
export const engineeringSummarizer = defineAgent({
  name: "engineering-summarizer",
  model: "anthropic/claude-sonnet-4.6",
  instructions: `
    Summarize yesterday's #engineering Slack channel.
    Output: <= 5 bullet points, each citing a message permalink.
  `,
  scope: {
    org: "$ORG_ID",
    connectors: [slackConnector.read("#engineering")],
  },
  budget: { cap_usd: 0.5, on_cap: "pause" },
  output: z.object({
    bullets: z
      .array(z.object({ summary: z.string(), permalink: z.string().url() }))
      .max(5),
  }),
});
