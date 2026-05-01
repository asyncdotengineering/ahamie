import { describe, expect, it } from "vitest";
import { compileAllowlist, requireAllowlist } from "@ahamie/connector-proxy";
import { githubAdapter } from "../src";

describe("github adapter allowlist", () => {
  const al = compileAllowlist(githubAdapter.allowlist);
  it("allows REST endpoints we care about", () => {
    expect(() => requireAllowlist(al, "GET", "/repos/owner/name/issues/42")).not.toThrow();
    expect(() => requireAllowlist(al, "POST", "/repos/owner/name/pulls")).not.toThrow();
  });
  it("denies endpoints not on the list", () => {
    expect(() => requireAllowlist(al, "DELETE", "/repos/owner/name")).toThrow();
    expect(() => requireAllowlist(al, "GET", "/admin/settings")).toThrow();
  });
});
