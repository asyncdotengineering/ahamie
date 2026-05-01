import { describe, expect, it } from "vitest";
import { z } from "@ahamie/schema";
import { defineSuite, runSuite, type Controller } from "../src";

const greeter: Controller<{ name: string }, { greeting: string }> = {
  name: "greeter",
  async run({ input }) {
    return {
      output: { greeting: `hello ${input.name}` },
      costUsd: 0.001,
      latencyMs: 50,
      tokensTotal: 10,
      toolCalls: [],
    };
  },
};

describe("eval suite + hidden-golden partition", () => {
  it("scores observable scenarios and reports pass/fail", async () => {
    const suite = defineSuite({
      id: "greeter.suite",
      controller: greeter,
      threshold: 0.8,
      scenarios: [
        {
          id: "happy",
          input: { name: "world" },
          assertions: [
            { kind: "regex", pattern: "hello world" },
            { kind: "jsonSchemaValid", schema: z.object({ greeting: z.string() }) },
          ],
        },
      ],
    });
    const r = await runSuite(suite);
    expect(r.observable.passed).toBe(true);
    expect(r.observable.score).toBe(1);
    expect(r.passed).toBe(true);
  });

  it("loads hidden-golden scenarios via host loader and gates on its threshold", async () => {
    const suite = defineSuite({
      id: "greeter.with-golden",
      controller: greeter,
      threshold: 0.8,
      hiddenGolden: { refs: ["s3://golden/*"], threshold: 0.9 },
      loadGoldenScenarios: async () => [
        {
          id: "g1",
          input: { name: "Alice" },
          assertions: [{ kind: "exactMatch" as const, expected: { greeting: "hello Alice" } }],
        },
      ],
      scenarios: [
        {
          id: "h1",
          input: { name: "Bob" },
          assertions: [{ kind: "exactMatch", expected: { greeting: "hello Bob" } }],
        },
      ],
    });
    const r = await runSuite(suite);
    expect(r.observable.passed).toBe(true);
    expect(r.hiddenGolden?.passed).toBe(true);
    expect(r.passed).toBe(true);
  });
});
