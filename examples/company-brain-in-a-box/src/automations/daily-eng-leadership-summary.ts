import { defineAutomation, on } from "@ahamie/automation";
import { engineeringSummarizer } from "../agents/engineering-summarizer";

/**
 * Daily 8am cron summary, posted to #leadership. The canonical reference
 * automation (§8.3).
 */
export default defineAutomation({
  id: "daily-eng-leadership-summary",
  trigger: on.cron("0 8 * * 1-5", { timezone: "America/New_York" }),
  actions: [
    {
      kind: "agent.run",
      agent: engineeringSummarizer,
      input: ({ event }) => ({ since: new Date(event.firedAt.getTime() - 24 * 3600 * 1000) }),
    },
    {
      kind: "gateway.send",
      target: "slack:#leadership",
      template: "review_card_v1",
      from: ({ steps }) => steps[0],
    },
  ],
  budget: { dimension: "ai_compute", cap_usd: 0.5, on_cap: "pause" },
  approval: { mode: "post-only" },
});
