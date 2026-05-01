import { describe, expect, it } from "vitest";
import { defineSuite, defineSoftwareFactory, runSoftwareFactory, type Controller } from "../src";

describe("software factory outer loop", () => {
  it("succeeds when the controller passes the suite", async () => {
    const c: Controller<unknown, string> = {
      name: "always-yes",
      async run() {
        return { output: "yes", costUsd: 0, latencyMs: 1, tokensTotal: 0, toolCalls: [] };
      },
    };
    const suite = defineSuite({
      id: "x",
      controller: c,
      threshold: 1,
      scenarios: [
        {
          id: "s1",
          input: null,
          assertions: [{ kind: "exactMatch" as const, expected: "yes" }],
        },
      ],
    });
    const r = await runSoftwareFactory(
      defineSoftwareFactory({
        spec: { id: "x", description: "say yes" },
        agent: c,
        suite,
        threshold: 1,
      }),
    );
    expect(r.outcome).toBe("succeeded");
  });

  it("abandons after seeing the same spec twice without `reviseSpec`", async () => {
    const c: Controller<unknown, string> = {
      name: "no",
      async run() {
        return { output: "no", costUsd: 0, latencyMs: 1, tokensTotal: 0, toolCalls: [] };
      },
    };
    const suite = defineSuite({
      id: "x",
      controller: c,
      threshold: 1,
      scenarios: [
        {
          id: "s1",
          input: null,
          assertions: [{ kind: "exactMatch" as const, expected: "yes" }],
        },
      ],
    });
    const r = await runSoftwareFactory(
      defineSoftwareFactory({
        spec: { id: "x", description: "fail" },
        agent: c,
        suite,
        threshold: 1,
        maxIterations: 3,
      }),
    );
    expect(["failed", "abandoned"]).toContain(r.outcome);
  });
});
