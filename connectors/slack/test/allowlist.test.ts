import { describe, expect, it } from "vitest";
import { compileAllowlist, requireAllowlist } from "@ahamie/connector-proxy";
import { slackAdapter, slackChannel } from "../src";

describe("@ahamie/connector-slack adapter", () => {
  const al = compileAllowlist(slackAdapter.allowlist);

  it("allows the documented Slack endpoints", () => {
    expect(() => requireAllowlist(al, "POST", "/api/chat.postMessage")).not.toThrow();
    expect(() => requireAllowlist(al, "GET", "/api/conversations.history")).not.toThrow();
    expect(() => requireAllowlist(al, "GET", "/api/users.list")).not.toThrow();
  });

  it("denies arbitrary Slack endpoints not on the list", () => {
    expect(() => requireAllowlist(al, "POST", "/api/admin.users.invite")).toThrow();
    expect(() => requireAllowlist(al, "DELETE", "/api/chat.postMessage")).toThrow();
  });

  it("slackChannel requires a leading #", () => {
    expect(slackChannel("#eng")).toBe("slack:#eng");
    expect(() => slackChannel("eng")).toThrow();
  });

  it("declares Slack signing scheme (HMAC sha256, prefix v0=)", () => {
    expect(slackAdapter.inbound?.algo).toBe("sha256");
    expect(slackAdapter.inbound?.prefix).toBe("v0=");
    expect(slackAdapter.inbound?.signatureHeader).toBe("x-slack-signature");
  });
});
