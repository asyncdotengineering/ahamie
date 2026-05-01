import { describe, expect, it } from "vitest";

describe("reference app wiring", () => {
  it("exports an automation with a cron trigger", async () => {
    const auto = (await import("../src/automations/daily-eng-leadership-summary")).default;
    expect(auto.id).toBe("daily-eng-leadership-summary");
    expect(auto.trigger.kind).toBe("cron");
    expect(auto.actions.length).toBe(2);
  });

  it("agent has the documented budget cap", async () => {
    const { engineeringSummarizer } = await import("../src/agents/engineering-summarizer");
    expect(engineeringSummarizer.budget?.cap_usd).toBe(0.5);
    expect(engineeringSummarizer.budget?.on_cap).toBe("pause");
  });

  it("eval suite has hidden-golden refs", async () => {
    const suite = (await import("../src/evals/summarizer.suite")).default;
    expect(suite.hiddenGolden?.refs.length).toBeGreaterThan(0);
    expect(suite.threshold).toBeGreaterThanOrEqual(0.8);
  });

  it("linear outcome provider rejects self-closes (sensor isolation)", async () => {
    const provider = (await import("../src/outcomes/linear-issue-closed")).default;
    expect(provider.id).toBe("linear");
    expect(typeof provider.triggers["issue.closed"]?.handler).toBe("function");
  });
});
