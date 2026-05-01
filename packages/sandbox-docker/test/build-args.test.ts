import { describe, expect, it } from "vitest";
import { buildDockerArgs } from "../src";

describe("buildDockerArgs", () => {
  it("defaults to read-only + no network", () => {
    const args = buildDockerArgs({}, ["echo", "hi"]);
    expect(args).toContain("--read-only");
    expect(args).toContain("--network");
    expect(args.indexOf("--network") + 1 < args.length).toBe(true);
    expect(args[args.indexOf("--network") + 1]).toBe("none");
  });
  it("adds mounts in host:container form", () => {
    const args = buildDockerArgs({ mounts: { "/tmp/a": "/work" } }, []);
    expect(args).toContain("/tmp/a:/work");
  });
});
