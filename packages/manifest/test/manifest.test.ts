import { describe, expect, it } from "vitest";
import { bundleHash, defineAction, defineApp, z } from "../src";

describe("manifest", () => {
  const m = defineApp({
    id: "summarizer",
    version: "0.1.0",
    name: "Summarizer",
    actions: {
      summarize: defineAction({
        id: "summarize",
        input: z.object({ text: z.string() }),
        output: z.object({ summary: z.string() }),
        async handler(input) {
          return { summary: input.text.slice(0, 80) };
        },
      }),
    },
  });

  it("bundleHash is stable", () => {
    const h1 = bundleHash(m);
    const h2 = bundleHash(m);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("bundleHash changes when content changes", () => {
    const m2 = defineApp({ ...m, name: "Different" });
    expect(bundleHash(m2)).not.toBe(bundleHash(m));
  });
});
