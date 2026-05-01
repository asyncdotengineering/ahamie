/**
 * Credential resolver. The proxy is the *only* process that reads
 * `credentials.ciphertext_b64` and turns it into a plaintext token. Agents
 * never call this code path — they only see the proxy's bearer interface.
 *
 * v0 uses a symmetric AES-256-GCM key supplied via env (`AHAMIE_KMS_KEY`).
 * v1 plugs in a HashiCorp Vault adapter; v3 swaps to hardware-backed keys.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { asBrand, type ConnectorId } from "@ahamie/schema";
import { credentials, type AhamieDb } from "@ahamie/storage";
import { eq } from "drizzle-orm";

const ALGO = "aes-256-gcm";

export interface EncryptionMeta {
  algo: string;
  iv_b64: string;
  tag_b64: string;
}

export const encryptToken = (
  plaintext: string,
  key: Buffer,
): { ciphertext_b64: string; encryption_meta: EncryptionMeta } => {
  if (key.length !== 32) throw new Error("AHAMIE_KMS_KEY must be 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext_b64: enc.toString("base64"),
    encryption_meta: { algo: ALGO, iv_b64: iv.toString("base64"), tag_b64: tag.toString("base64") },
  };
};

export const decryptToken = (
  ciphertext_b64: string,
  meta: EncryptionMeta,
  key: Buffer,
): string => {
  if (key.length !== 32) throw new Error("AHAMIE_KMS_KEY must be 32 bytes");
  const iv = Buffer.from(meta.iv_b64, "base64");
  const tag = Buffer.from(meta.tag_b64, "base64");
  const dec = createDecipheriv(ALGO, key, iv);
  dec.setAuthTag(tag);
  const out = Buffer.concat([dec.update(Buffer.from(ciphertext_b64, "base64")), dec.final()]);
  return out.toString("utf8");
};

export interface CredentialResolver {
  /** Resolve the latest credential for a connector. Returns `null` if none. */
  resolve(connectorId: string): Promise<string | null>;
}

export const createCredentialResolver = (db: AhamieDb, key: Buffer): CredentialResolver => ({
  async resolve(connectorId: string) {
    const rows = await db
      .select()
      .from(credentials)
      .where(eq(credentials.connector_id, asBrand<"ConnectorId">(connectorId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return decryptToken(row.ciphertext_b64, row.encryption_meta as unknown as EncryptionMeta, key);
  },
});
