/**
 * `@ahamie/cas` — content-addressed object store.
 *
 * v0 surface: `put`, `get`, `link`. The full DAG primitives (`walk`, `fork`,
 * `refs`) ship in v1 alongside snapshot+marketplace work — see RFC §13.4 and
 * tech-plan §5.1.
 *
 * Object IDs are sha256 hex strings. Each object is stored at
 * `<orgId>/cas/<sha[0..2]>/<sha[2..]>` in the blobstore, with a sibling
 * `.links.json` file holding outbound parent edges.
 */

import { createHash } from "node:crypto";
import type { Blobstore } from "@ahamie/blobstore";
import { Sha256Hex } from "@ahamie/schema";

export interface CasObject {
  /** sha256 hex of the bytes. */
  id: string;
  /** size in bytes. */
  size: number;
  /** parent object IDs (DAG edges). v0 stores them; walk() ships v1. */
  parents: string[];
}

export interface PutCasOptions {
  parents?: string[];
}

export class CasIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CasIntegrityError";
  }
}

export interface Cas {
  put(orgId: string, body: Uint8Array | Buffer, opts?: PutCasOptions): Promise<CasObject>;
  get(orgId: string, id: string): Promise<Buffer>;
  link(orgId: string, child: string, parent: string): Promise<void>;
  parents(orgId: string, id: string): Promise<string[]>;
}

const sha256 = (bytes: Uint8Array | Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");

const objectKey = (orgId: string, id: string): string =>
  `${orgId}/cas/${id.slice(0, 2)}/${id.slice(2)}`;

const linksKey = (orgId: string, id: string): string => `${objectKey(orgId, id)}.links.json`;

export class BlobstoreCas implements Cas {
  constructor(private readonly blobstore: Blobstore) {}

  async put(
    orgId: string,
    body: Uint8Array | Buffer,
    opts: PutCasOptions = {},
  ): Promise<CasObject> {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const id = sha256(buf);
    Sha256Hex.parse(id);

    const existing = await this.blobstore.head(objectKey(orgId, id));
    if (!existing) {
      await this.blobstore.put(objectKey(orgId, id), buf, {
        contentType: "application/octet-stream",
      });
    }

    const parents = opts.parents ?? [];
    const stored = await this.readParents(orgId, id);
    const merged = Array.from(new Set([...stored, ...parents]));
    if (merged.length > 0) {
      await this.blobstore.put(linksKey(orgId, id), Buffer.from(JSON.stringify(merged)), {
        contentType: "application/json",
      });
    }

    return { id, size: buf.length, parents: merged };
  }

  async get(orgId: string, id: string): Promise<Buffer> {
    Sha256Hex.parse(id);
    const buf = await this.blobstore.get(objectKey(orgId, id));
    const actual = sha256(buf);
    if (actual !== id) {
      throw new CasIntegrityError(`integrity mismatch: expected ${id}, got ${actual}`);
    }
    return buf;
  }

  async link(orgId: string, child: string, parent: string): Promise<void> {
    Sha256Hex.parse(child);
    Sha256Hex.parse(parent);
    const stored = await this.readParents(orgId, child);
    if (stored.includes(parent)) return;
    stored.push(parent);
    await this.blobstore.put(linksKey(orgId, child), Buffer.from(JSON.stringify(stored)), {
      contentType: "application/json",
    });
  }

  async parents(orgId: string, id: string): Promise<string[]> {
    return this.readParents(orgId, id);
  }

  private async readParents(orgId: string, id: string): Promise<string[]> {
    const head = await this.blobstore.head(linksKey(orgId, id));
    if (!head) return [];
    const buf = await this.blobstore.get(linksKey(orgId, id));
    return JSON.parse(buf.toString("utf8")) as string[];
  }
}

export const createCas = (blobstore: Blobstore): Cas => new BlobstoreCas(blobstore);
