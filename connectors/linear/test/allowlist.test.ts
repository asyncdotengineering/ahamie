import { describe, expect, it } from "vitest";
import { compileAllowlist, requireAllowlist } from "@ahamie/connector-proxy";
import { linearAdapter } from "../src";

describe("linear adapter allowlist", () => {
  const al = compileAllowlist(linearAdapter.allowlist);
  it("allows POST /graphql", () => {
    expect(() => requireAllowlist(al, "POST", "/graphql")).not.toThrow();
  });
  it("denies anything else", () => {
    expect(() => requireAllowlist(al, "GET", "/graphql")).toThrow();
    expect(() => requireAllowlist(al, "POST", "/admin")).toThrow();
  });
});
