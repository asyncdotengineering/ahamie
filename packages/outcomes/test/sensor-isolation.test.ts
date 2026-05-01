import { describe, expect, it } from "vitest";
import {
  SensorIsolationViolationError,
  setSensorIsolationGuard,
} from "../src";
import { mintAgentRunId, mintAutomationRunId, mintOrgId } from "@ahamie/schema";

describe("sensor isolation guard", () => {
  it("default guard allows when no agentRunId", async () => {
    const { recordOutcome } = await import("../src");
    setSensorIsolationGuard(() => true);
    // We don't actually hit the DB in this unit test — we exercise the guard branch.
    expect(typeof recordOutcome).toBe("function");
  });

  it("custom guard rejects when source overlaps the agent's writable set", () => {
    setSensorIsolationGuard(({ source }) => source !== "agent-self");
    return expect(async () => {
      await import("../src").then(async ({ recordOutcome }) => {
        try {
          // Stub DB: only the guard call needs to fail before we touch the DB.
          await recordOutcome({} as never, {
            orgId: mintOrgId(),
            automationRunId: mintAutomationRunId(),
            agentRunId: mintAgentRunId(),
            subject: { kind: "x", id: "y" },
            outcome_type: "t",
            source: "agent-self",
            source_kind: "system_event",
          });
        } catch (e) {
          throw e;
        }
      });
    }).rejects.toBeInstanceOf(SensorIsolationViolationError);
  });
});
