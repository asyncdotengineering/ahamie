import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assertRedactionSafe,
  compileAllowlist,
  InvariantViolationError,
  requireAllowlist,
  stripCallerAuth,
  stripResponseAuth,
  verifyHmac,
} from "../src/invariants";

const verifyHmacReference = (secret: string, body: string): string =>
  createHmac("sha256", secret).update(body).digest("hex");

describe("five invariants — pure-function audit suite", () => {
  describe("I1 — assertRedactionSafe", () => {
    it("rejects keys that look like credentials", () => {
      expect(() => assertRedactionSafe({ token: "abc" })).toThrow(InvariantViolationError);
      expect(() => assertRedactionSafe({ nested: { secret: 1 } })).toThrow(InvariantViolationError);
      expect(() => assertRedactionSafe({ Authorization: "Bearer x" })).toThrow(
        InvariantViolationError,
      );
      expect(() => assertRedactionSafe({ api_key: "x" })).toThrow(InvariantViolationError);
    });
    it("passes safe payloads", () => {
      expect(() => assertRedactionSafe({ provider: "slack", method: "POST" })).not.toThrow();
      expect(() => assertRedactionSafe({ items: [{ ok: true }] })).not.toThrow();
    });
  });

  describe("I2 — allowlist", () => {
    const al = compileAllowlist([
      { method: "GET", pathPattern: "/api/users/:id" },
      { method: "POST", pathPattern: "/repos/*" },
    ]);
    it("allows matching method+path", () => {
      expect(() => requireAllowlist(al, "GET", "/api/users/42")).not.toThrow();
      expect(() => requireAllowlist(al, "POST", "/repos/owner/name")).not.toThrow();
    });
    it("denies non-matches", () => {
      expect(() => requireAllowlist(al, "DELETE", "/api/users/42")).toThrow(
        InvariantViolationError,
      );
      expect(() => requireAllowlist(al, "GET", "/api/admin")).toThrow(InvariantViolationError);
    });
  });

  describe("I3 — strip caller auth", () => {
    it("removes Authorization, Cookie, Proxy-Authorization", () => {
      const headers = new Headers({
        authorization: "Bearer USER",
        cookie: "session=x",
        "proxy-authorization": "secret",
        "content-type": "application/json",
      });
      const stripped = stripCallerAuth(headers);
      expect(stripped.get("authorization")).toBeNull();
      expect(stripped.get("cookie")).toBeNull();
      expect(stripped.get("proxy-authorization")).toBeNull();
      expect(stripped.get("content-type")).toBe("application/json");
    });
  });

  describe("I4 — strip response auth", () => {
    it("removes Set-Cookie / WWW-Authenticate / etc.", () => {
      const headers = new Headers({
        "set-cookie": "x=y",
        "www-authenticate": "Bearer realm=x",
        "content-type": "text/plain",
      });
      const stripped = stripResponseAuth(headers);
      expect(stripped.get("set-cookie")).toBeNull();
      expect(stripped.get("www-authenticate")).toBeNull();
      expect(stripped.get("content-type")).toBe("text/plain");
    });
  });

  describe("I5 — HMAC verification", () => {
    const secret = "shhh";
    it("verifies a correct sha256 signature", () => {
      const body = "hello";
      const real = verifyHmacReference(secret, body);
      expect(verifyHmac({ secret, body, signature: real })).toBe(true);
    });
    it("rejects a wrong signature", () => {
      expect(verifyHmac({ secret, body: "hello", signature: "deadbeef" })).toBe(false);
    });
    it("strips a prefix like sha256=", () => {
      const sig = verifyHmacReference(secret, "x");
      expect(verifyHmac({ secret, body: "x", signature: `sha256=${sig}`, prefix: "sha256=" })).toBe(
        true,
      );
    });
  });
});

