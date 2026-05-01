import { describe, expect, it } from "vitest";
import { runWorkflow } from "@ahamie/workflow";
import { approvalWorkflow } from "../src";

describe("approval-gate example", () => {
  it("suspends at the human-approval step", async () => {
    const r = await runWorkflow(approvalWorkflow, { proposal: "ship it" });
    expect(r.status).toBe("suspended");
  });
});
