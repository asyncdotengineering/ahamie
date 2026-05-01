import { describe, expect, it } from "vitest";

describe("@ahamie/ui registry contents", () => {
  it("registry.json lists all five v0 primitives", async () => {
    const reg = await import("../registry.json", { with: { type: "json" } }).then((m) => m.default);
    const names = (reg.items as Array<{ name: string }>).map((i) => i.name).sort();
    expect(names).toEqual([
      "agent-run-tree",
      "approval-inbox",
      "connector-setup",
      "manifest-editor",
      "run-console",
    ]);
  });
});
