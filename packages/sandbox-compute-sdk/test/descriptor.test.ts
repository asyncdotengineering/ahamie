import { describe, expect, it } from "vitest";
import { provisionDescriptor } from "../src";

describe("compute-sdk descriptor", () => {
  it("preserves config", () => {
    const d = provisionDescriptor({ provider: "e2b", apiKey: "x", region: "us" });
    expect(d.provider).toBe("e2b");
    expect((d.descriptor as { region: string }).region).toBe("us");
  });
});
