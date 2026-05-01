import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "../src/credentials";

describe("AES-256-GCM credential encryption", () => {
  it("encrypts and decrypts roundtrip", () => {
    const key = randomBytes(32);
    const { ciphertext_b64, encryption_meta } = encryptToken("xoxb-deadbeef", key);
    const back = decryptToken(ciphertext_b64, encryption_meta, key);
    expect(back).toBe("xoxb-deadbeef");
  });

  it("rejects wrong-length key", () => {
    expect(() => encryptToken("x", Buffer.alloc(16))).toThrow(/32 bytes/);
  });

  it("decryption fails on tampered ciphertext", () => {
    const key = randomBytes(32);
    const { ciphertext_b64, encryption_meta } = encryptToken("token", key);
    const tampered = Buffer.from(ciphertext_b64, "base64");
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;
    expect(() =>
      decryptToken(tampered.toString("base64"), encryption_meta, key),
    ).toThrow();
  });
});
