import { defineSuite } from "@ahamie/eval";
import { engineeringSummarizer } from "../agents/engineering-summarizer";

/**
 * The reference suite — 1 happy scenario; the production suite would have 10.
 * Hidden-golden path is intentionally separate-prefix; the loader resolves
 * it through the host's CAS.
 */

const fakeOutput = {
  output: {
    bullets: [
      { summary: "Migration shipped", permalink: "https://example.com/m1" },
    ],
  },
  costUsd: 0.04,
  latencyMs: 1200,
  tokensTotal: 800,
  toolCalls: [{ name: "slack.search", input: {}, output: [] }],
};

export default defineSuite({
  id: "summarizer.suite",
  controller: {
    name: "engineering-summarizer",
    async run() {
      return fakeOutput;
    },
  },
  threshold: 0.8,
  hiddenGolden: { refs: ["s3://my-brain-eval-private/golden/summarizer/*"], threshold: 0.85 },
  loadGoldenScenarios: async () => [],
  scenarios: [
    {
      id: "happy.5-messages",
      input: { since: new Date() },
      assertions: [
        { kind: "jsonSchemaValid" },
        { kind: "toolCallContains", tool: "slack.search" },
        { kind: "costUnder", usd: 0.1 },
        { kind: "latencyUnder", ms: 8000 },
        { kind: "tokensUnder", tokens: 4000 },
      ],
    },
  ],
});
