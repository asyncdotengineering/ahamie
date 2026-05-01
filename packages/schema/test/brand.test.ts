import { describe, expect, it } from "vitest";
import {
  asBrand,
  mintAgentRunId,
  mintAutomationId,
  mintOrgId,
  type AgentRunId,
  type AutomationId,
  type OrgId,
} from "../src/brand";

describe("@ahamie/schema brand", () => {
  it("mints prefixed UUIDs", () => {
    const orgId = mintOrgId();
    const runId = mintAgentRunId();
    const autoId = mintAutomationId();

    expect(orgId).toMatch(/^org_[a-f0-9]{32}$/);
    expect(runId).toMatch(/^arn_[a-f0-9]{32}$/);
    expect(autoId).toMatch(/^atm_[a-f0-9]{32}$/);
  });

  it("provides distinct nominal types — verified at compile time", () => {
    const a: OrgId = mintOrgId();
    const b: AgentRunId = mintAgentRunId();
    // @ts-expect-error — OrgId is not assignable to AgentRunId
    const c: AgentRunId = a;
    // @ts-expect-error — AgentRunId is not assignable to OrgId
    const d: OrgId = b;
    expect(c).toBe(a);
    expect(d).toBe(b);
  });

  it("asBrand widens at trust boundaries", () => {
    const fromDb = "atm_deadbeefdeadbeefdeadbeefdeadbeef";
    const tagged: AutomationId = asBrand(fromDb);
    expect(tagged).toBe(fromDb);
  });
});
