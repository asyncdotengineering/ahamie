import { afterEach, describe, expect, it } from "vitest";
import { initTelemetry, withSpan, type Telemetry } from "../src";

describe("@ahamie/telemetry", () => {
  let t: Telemetry;
  afterEach(async () => {
    await t?.shutdown();
  });

  it("records a successful span with attributes", async () => {
    t = initTelemetry({ serviceName: "test" });
    const tracer = t.tracer("unit");
    const result = await withSpan(tracer, "compute", { thing: "yes", n: 42 }, async () => 7);
    expect(result).toBe(7);
    const spans = t.__spans?.() ?? [];
    const span = spans.find((s) => s.name === "compute");
    expect(span).toBeDefined();
    expect(span?.attributes.thing).toBe("yes");
    expect(span?.attributes.n).toBe(42);
    expect(span?.status.code).toBe(1); // OK
  });

  it("records errors and re-throws", async () => {
    t = initTelemetry({ serviceName: "test" });
    const tracer = t.tracer("unit");
    await expect(
      withSpan(tracer, "boom", {}, async () => {
        throw new Error("kaboom");
      }),
    ).rejects.toThrow("kaboom");

    const spans = t.__spans?.() ?? [];
    const span = spans.find((s) => s.name === "boom");
    expect(span?.status.code).toBe(2); // ERROR
    expect(span?.events.find((e) => e.name === "exception")).toBeDefined();
  });

  it("strips undefined attributes", async () => {
    t = initTelemetry({ serviceName: "test" });
    const tracer = t.tracer("unit");
    await withSpan(tracer, "skipUndef", { keep: "yes", drop: undefined }, () => 1);
    const spans = t.__spans?.() ?? [];
    const span = spans.find((s) => s.name === "skipUndef");
    expect(span?.attributes.keep).toBe("yes");
    expect(span?.attributes.drop).toBeUndefined();
  });
});
