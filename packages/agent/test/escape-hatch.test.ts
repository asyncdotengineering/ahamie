import { describe, expect, it } from "vitest";

describe("escape hatch — direct @mastra/core import keeps working", () => {
  it("Agent class is also reachable as `import { Agent } from \"@ahamie/agent\"`", async () => {
    const { Agent } = await import("../src");
    expect(typeof Agent).toBe("function");
    // Mastra constructor; in compiled bundles it may be exported as `_Agent`.
    expect(Agent.name).toMatch(/Agent$/);
  });

  it("upstream @mastra/core/agent still importable", async () => {
    const m = await import("@mastra/core/agent");
    expect(typeof m.Agent).toBe("function");
  });
});
