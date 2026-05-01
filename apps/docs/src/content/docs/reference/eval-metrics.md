---
title: Eval metrics
description: The 8 built-in metrics. Adapters for promptfoo / inspect-ai / braintrust / langsmith ship at v1.
---

## Built-ins

| Kind | Args | Notes |
|---|---|---|
| `exactMatch`        | `{ expected }`               | JSON-deep equality |
| `regex`             | `{ pattern }`                | Stringified output is matched against the pattern |
| `jsonSchemaValid`   | `{ schema? }`                | Standard-Schema validation; without schema, asserts JSON-serializable |
| `toolCallContains`  | `{ tool }`                   | Asserts the named tool was called at least once |
| `costUnder`         | `{ usd }`                    | `ctx.costUsd <= usd` |
| `latencyUnder`      | `{ ms }`                     | `ctx.latencyMs <= ms` |
| `tokensUnder`       | `{ tokens }`                 | `ctx.tokensTotal <= tokens` |
| `customJudge`       | `{ rubric }`                 | Function-based; rubric returns `MetricResult` |

## Result shape

```ts
interface MetricResult { passed: boolean; score: number; reason?: string }
```

Score is in `[0, 1]`. Binary metrics report `0` or `1`. Custom rubrics MAY interpolate.

## Suite shape

```ts
defineSuite({
  id: "summarizer.suite",
  controller: agent,
  threshold: 0.8,
  hiddenGolden: { refs: ["s3://…/golden/*"], threshold: 0.85 },
  loadGoldenScenarios: async (refs) => fetchGolden(refs),
  scenarios: [
    {
      id: "happy.5-messages",
      input: { since: new Date() },
      assertions: [
        { kind: "jsonSchemaValid" },
        { kind: "toolCallContains", tool: "slack.search" },
        { kind: "costUnder", usd: 0.10 },
        { kind: "latencyUnder", ms: 8000 },
      ],
    },
  ],
});
```

## Custom judge example

```ts
{
  kind: "customJudge",
  rubric: async (output, ctx) => {
    const score = await llmJudgeScore(output);
    return { passed: score >= 0.8, score, reason: `LLM judge: ${score}` };
  },
}
```

## Adapter ecosystem (v1+)

- `@ahamie/eval-promptfoo`
- `@ahamie/eval-inspect-ai`
- `@ahamie/eval-braintrust`
- `@ahamie/eval-langsmith`
