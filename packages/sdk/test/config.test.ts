import { describe, expect, it } from "vitest";
import { defineAhamieConfig } from "../src";

describe("defineAhamieConfig", () => {
  it("preserves shape", () => {
    const cfg = defineAhamieConfig({
      identity: { provider: "better-auth", organization: { enabled: true } },
      storage: { url: "postgres://x", pgvector: true },
    });
    expect(cfg.identity.provider).toBe("better-auth");
    expect(cfg.storage.pgvector).toBe(true);
  });
});
