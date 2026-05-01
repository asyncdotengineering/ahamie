import { describe, expect, it } from "vitest";
import { chunkText } from "../src";

describe("chunkText", () => {
  it("splits long text by paragraph boundaries", () => {
    const text = "p1\n\np2\n\n" + "x".repeat(2000);
    const chunks = chunkText(text, 200);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain("p1");
  });

  it("keeps short text in one chunk", () => {
    const chunks = chunkText("only one paragraph here", 1500);
    expect(chunks.length).toBe(1);
  });

  it("trims and skips empty paragraphs", () => {
    const chunks = chunkText("a\n\n\n\n\nb", 1500);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toMatch(/a\s+b/);
  });
});
