import { describe, expect, it } from "vitest";
import { z } from "@ahamie/schema";
import { evaluate, type MetricContext } from "../src/metrics";

const ctx: MetricContext = { costUsd: 0, latencyMs: 100, tokensTotal: 0, toolCalls: [] };

describe("eval metrics", () => {
  it("exactMatch", async () => {
    expect((await evaluate({ kind: "exactMatch", expected: { x: 1 } }, { x: 1 }, ctx)).passed).toBe(true);
    expect((await evaluate({ kind: "exactMatch", expected: { x: 1 } }, { x: 2 }, ctx)).passed).toBe(false);
  });

  it("regex on stringified output", async () => {
    expect((await evaluate({ kind: "regex", pattern: "^hi" }, "hi mom", ctx)).passed).toBe(true);
    expect((await evaluate({ kind: "regex", pattern: "^hi" }, "bye", ctx)).passed).toBe(false);
  });

  it("jsonSchemaValid against a Zod schema", async () => {
    const schema = z.object({ name: z.string() });
    expect((await evaluate({ kind: "jsonSchemaValid", schema }, { name: "x" }, ctx)).passed).toBe(true);
    expect((await evaluate({ kind: "jsonSchemaValid", schema }, { name: 1 }, ctx)).passed).toBe(false);
  });

  it("toolCallContains", async () => {
    const c2 = { ...ctx, toolCalls: [{ name: "slack.search", input: {}, output: {} }] };
    expect((await evaluate({ kind: "toolCallContains", tool: "slack.search" }, null, c2)).passed).toBe(true);
    expect((await evaluate({ kind: "toolCallContains", tool: "missing" }, null, c2)).passed).toBe(false);
  });

  it("costUnder / latencyUnder / tokensUnder", async () => {
    const c2 = { ...ctx, costUsd: 0.05, latencyMs: 800, tokensTotal: 200 };
    expect((await evaluate({ kind: "costUnder", usd: 0.1 }, null, c2)).passed).toBe(true);
    expect((await evaluate({ kind: "costUnder", usd: 0.01 }, null, c2)).passed).toBe(false);
    expect((await evaluate({ kind: "latencyUnder", ms: 1000 }, null, c2)).passed).toBe(true);
    expect((await evaluate({ kind: "tokensUnder", tokens: 100 }, null, c2)).passed).toBe(false);
  });

  it("customJudge invokes the rubric", async () => {
    const r = await evaluate(
      {
        kind: "customJudge",
        rubric: (out) => ({ passed: out === "yes", score: out === "yes" ? 1 : 0 }),
      },
      "yes",
      ctx,
    );
    expect(r.passed).toBe(true);
  });
});
