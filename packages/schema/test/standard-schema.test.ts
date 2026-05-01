import { describe, expect, it } from "vitest";
import { z, type StandardSchemaV1 } from "../src";

describe("@ahamie/schema Standard-Schema conformance", () => {
  it("Zod schemas implement StandardSchemaV1", async () => {
    const userSchema = z.object({ id: z.string(), email: z.email() });

    // The presence of `~standard` is the conformance marker.
    const ss: StandardSchemaV1<unknown, { id: string; email: string }> = userSchema;
    expect(ss["~standard"].vendor).toBe("zod");
    expect(typeof ss["~standard"].validate).toBe("function");

    const result = await ss["~standard"].validate({ id: "u1", email: "a@b.dev" });
    expect("value" in result && result.value.id).toBe("u1");
  });

  it("Standard-Schema validate surfaces issues for bad input", async () => {
    const schema: StandardSchemaV1<unknown, { x: number }> = z.object({ x: z.number() });
    const r = await schema["~standard"].validate({ x: "nope" });
    expect("issues" in r && Array.isArray(r.issues)).toBe(true);
  });
});
