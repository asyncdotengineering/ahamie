import { describe, expect, it } from "vitest";
import { mintOrgId } from "@ahamie/schema";
import { echoAgent } from "../src";

describe("minimal echo agent", () => {
  it("returns the input verbatim", async () => {
    const r = await echoAgent.run({ orgId: mintOrgId(), input: { message: "hi" } });
    expect(r.status).toBe("succeeded");
    expect(r.output).toEqual({ message: "hi" });
  });
});
