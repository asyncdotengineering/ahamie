import { describe, expect, it } from "vitest";
import { z } from "@ahamie/schema";
import { mintOrgId } from "@ahamie/schema";
import { defineAgent, registerOutcomeHook, type RunCompletedEnvelope } from "../src";

describe("defineAgent", () => {
  it("constructs an agent with the expected surface", () => {
    const a = defineAgent({
      name: "summarizer",
      model: "anthropic/claude-sonnet-4.6",
      instructions: "Summarize.",
      scope: { org: "$ORG_ID" },
      budget: { cap_usd: 0.5, on_cap: "pause" },
      output: z.object({ summary: z.string() }),
    });
    expect(a.name).toBe("summarizer");
    expect(a.model).toBe("anthropic/claude-sonnet-4.6");
    expect(a.budget?.cap_usd).toBe(0.5);
  });

  it("fires the outcome hook on success", async () => {
    const captured: RunCompletedEnvelope[] = [];
    const off = registerOutcomeHook((env) => {
      captured.push(env);
    });

    const a = defineAgent({
      name: "echo",
      model: "test/echo",
      instructions: "Echo input verbatim.",
      scope: { org: "$ORG_ID" },
      output: z.object({ text: z.string() }),
    });

    const orgId = mintOrgId();
    const result = await a.run({ orgId, input: { text: "hi" } });
    expect(result.status).toBe("succeeded");
    expect(result.output).toEqual({ text: "hi" });
    expect(captured.length).toBe(1);
    expect(captured[0]?.status).toBe("succeeded");
    expect(captured[0]?.orgId).toBe(orgId);
    off();
  });

  it("fires the outcome hook on cancellation via AbortSignal", async () => {
    const captured: RunCompletedEnvelope[] = [];
    const off = registerOutcomeHook((env) => captured.push(env));

    const a = defineAgent({
      name: "abortable",
      model: "test/echo",
      instructions: "x",
      scope: { org: "$ORG_ID" },
      output: z.object({ text: z.string() }),
    });
    const ac = new AbortController();
    ac.abort();
    const r = await a.run({ orgId: mintOrgId(), input: { text: "x" }, signal: ac.signal });
    expect(r.status).toBe("cancelled");
    expect(captured[0]?.status).toBe("cancelled");
    off();
  });
});
