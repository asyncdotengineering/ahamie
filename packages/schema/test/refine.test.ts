import { describe, expect, it } from "vitest";
import {
  ConnectorRef,
  CronExpr,
  Email,
  Iso8601,
  Sha256Hex,
  Slug,
  Url,
  UsdAmount,
} from "../src/refine";

describe("@ahamie/schema refinements", () => {
  it("Email accepts canonical forms and rejects garbage", () => {
    expect(Email.safeParse("dev@ahamie.dev").success).toBe(true);
    expect(Email.safeParse("not-email").success).toBe(false);
  });

  it("Url accepts http(s) only", () => {
    expect(Url.safeParse("https://ahamie.dev").success).toBe(true);
    expect(Url.safeParse("http://localhost:3000").success).toBe(true);
    expect(Url.safeParse("file:///etc/passwd").success).toBe(false);
    expect(Url.safeParse("mailto:a@b.c").success).toBe(false);
  });

  it("Slug is kebab-case", () => {
    expect(Slug.safeParse("daily-eng-summary").success).toBe(true);
    expect(Slug.safeParse("a").success).toBe(true);
    expect(Slug.safeParse("UPPER").success).toBe(false);
    expect(Slug.safeParse("1leading-digit").success).toBe(false);
    expect(Slug.safeParse("trailing-").success).toBe(false);
  });

  it("ConnectorRef matches `provider:scope`", () => {
    expect(ConnectorRef.safeParse("slack:#engineering").success).toBe(true);
    expect(ConnectorRef.safeParse("github:org/repo").success).toBe(true);
    expect(ConnectorRef.safeParse("noscope").success).toBe(false);
  });

  it("CronExpr requires 5 fields", () => {
    expect(CronExpr.safeParse("0 8 * * 1-5").success).toBe(true);
    expect(CronExpr.safeParse("8 * * 1-5").success).toBe(false);
  });

  it("UsdAmount is non-negative with 4-decimal precision", () => {
    expect(UsdAmount.safeParse(0.5).success).toBe(true);
    expect(UsdAmount.safeParse(0.1234).success).toBe(true);
    expect(UsdAmount.safeParse(-1).success).toBe(false);
  });

  it("Iso8601 requires offset", () => {
    expect(Iso8601.safeParse("2026-05-01T08:00:00Z").success).toBe(true);
    expect(Iso8601.safeParse("2026-05-01T08:00:00+02:00").success).toBe(true);
    expect(Iso8601.safeParse("2026-05-01").success).toBe(false);
  });

  it("Sha256Hex is 64 lowercase hex chars", () => {
    const ok = "0".repeat(64);
    expect(Sha256Hex.safeParse(ok).success).toBe(true);
    expect(Sha256Hex.safeParse("0".repeat(63)).success).toBe(false);
    expect(Sha256Hex.safeParse("F".repeat(64)).success).toBe(false);
  });
});
