import { describe, expect, it } from "vitest";
import {
  appEventTrigger,
  channelMessageTrigger,
  cronTrigger,
  manualApiTrigger,
  manualButtonTrigger,
  on,
  registerTrigger,
  webhookTrigger,
} from "../src/triggers";
import { defineAutomation } from "../src";

describe("trigger constructors", () => {
  it("cronTrigger emits a config with timezone", () => {
    const t = cronTrigger("0 8 * * 1-5", { timezone: "America/New_York" });
    expect(t.kind).toBe("cron");
    expect(t.config?.expr).toBe("0 8 * * 1-5");
    expect(t.config?.timezone).toBe("America/New_York");
  });
  it("webhookTrigger captures path", () => {
    expect(webhookTrigger("/inbound").kind).toBe("webhook");
  });
  it("manual triggers expose button/api kinds", () => {
    expect(manualButtonTrigger("review").kind).toBe("manual.button");
    expect(manualApiTrigger("invoke").kind).toBe("manual.api");
  });
  it("appEvent + channel.message triggers register their kinds", () => {
    expect(appEventTrigger("issue.created").kind).toBe("appEvent");
    expect(channelMessageTrigger("#eng").kind).toBe("channel.message");
  });
});

describe("`on.*` typed proxy", () => {
  it("exposes built-ins by name", () => {
    expect(typeof on.cron).toBe("function");
    expect(typeof on.webhook).toBe("function");
    expect(typeof on.manual.button).toBe("function");
    expect(typeof on.channel.message).toBe("function");
  });

  it("third-party `registerTrigger` widens the registry at runtime", () => {
    registerTrigger("slack", {
      message: (channel: string) => ({ kind: "slack.message", config: { channel } }),
    });
    // `as any` here only because the test does NOT use module augmentation;
    // production callers do `declare module "@ahamie/automation" { interface AhamieTriggerNamespace { slack: ... } }`.
    const t = (on as unknown as { slack: { message: (c: string) => unknown } }).slack.message(
      "#engineering",
    );
    expect((t as { kind: string }).kind).toBe("slack.message");
  });

  it("throws on unknown trigger", () => {
    expect(() => (on as unknown as { nope: unknown }).nope).toThrow(/Unknown trigger/);
  });
});

describe("defineAutomation snapshot", () => {
  it("preserves shape", () => {
    const auto = defineAutomation({
      id: "atm_test",
      trigger: cronTrigger("* * * * *"),
      actions: [],
    });
    expect(auto.trigger.kind).toBe("cron");
  });
});
