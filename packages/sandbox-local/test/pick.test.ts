import { describe, expect, it } from "vitest";
import { pickSandbox } from "../src";

describe("sandbox-local pickSandbox", () => {
  it("returns one of the known kinds", () => {
    const k = pickSandbox();
    expect(["local-bwrap", "docker", "no-op", "compute-sdk"]).toContain(k);
  });
});
