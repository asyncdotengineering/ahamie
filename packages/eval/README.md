# @ahamie/eval

Active eval suites + the software-factory outer loop.

```ts
import { defineSuite, runSuite } from "@ahamie/eval";

const suite = defineSuite({
  id: "summarizer.suite",
  controller: summarizer,
  threshold: 0.8,
  hiddenGolden: { refs: ["s3://my-brain-eval-private/golden/*"], threshold: 0.85 },
  loadGoldenScenarios: async (refs) => fetchGolden(refs),
  scenarios: [/* … */],
});
const r = await runSuite(suite);
```

8 built-in metrics: `exactMatch`, `regex`, `jsonSchemaValid`, `toolCallContains`, `costUnder`, `latencyUnder`, `tokensUnder`, `customJudge`.

`defineSoftwareFactory({spec, agent, suite, threshold})` runs the outer loop with a tabu list across iterations.
