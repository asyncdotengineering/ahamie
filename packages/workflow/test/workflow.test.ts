import { describe, expect, it } from "vitest";
import { defineStep, defineWorkflow, runWorkflow } from "../src";

describe("workflow runner", () => {
  it("runs steps sequentially and returns final value", async () => {
    const wf = defineWorkflow<{ n: number }, number>({
      id: "double-then-add",
      steps: [
        defineStep<{ n: number }, number>({
          id: "double",
          async execute(ctx) {
            return ctx.input.n * 2;
          },
        }),
        defineStep<number, number>({
          id: "add-three",
          async execute(ctx) {
            return ctx.input + 3;
          },
        }),
      ],
    });
    const r = await runWorkflow(wf, { n: 5 });
    expect(r.status).toBe("succeeded");
    expect(r.output).toBe(13);
    expect(r.steps.map((s) => s.status)).toEqual(["succeeded", "succeeded"]);
  });

  it("suspends mid-flow when a step calls ctx.suspend()", async () => {
    const wf = defineWorkflow<{ x: number }, number>({
      id: "needs-approval",
      steps: [
        defineStep<{ x: number }, number>({
          id: "first",
          async execute(ctx) {
            return ctx.input.x;
          },
        }),
        defineStep<number, number>({
          id: "wait-for-human",
          async execute(ctx) {
            await ctx.suspend("needs human approval");
            return ctx.input;
          },
        }),
      ],
    });
    const r = await runWorkflow(wf, { x: 1 });
    expect(r.status).toBe("suspended");
    expect(r.steps.at(-1)?.status).toBe("suspended");
  });

  it("propagates failure", async () => {
    const wf = defineWorkflow<unknown, unknown>({
      id: "boom",
      steps: [
        defineStep<unknown, unknown>({
          id: "thrower",
          async execute() {
            throw new Error("boom");
          },
        }),
      ],
    });
    const r = await runWorkflow(wf, {});
    expect(r.status).toBe("failed");
    expect(r.error?.message).toBe("boom");
  });
});
