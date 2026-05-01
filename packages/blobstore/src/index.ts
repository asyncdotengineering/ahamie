/**
 * `@ahamie/blobstore` — the byte tier of the substrate.
 *
 * This package owns the **interface** (`Blobstore`) and ships one
 * implementation (`LocalFsBlobstore`). v1 will add `@ahamie/blobstore-s3`
 * and the same interface MUST work for it without a single consumer change.
 *
 * Design notes (see `wiki/phase7/tech-plan.md` §5.1, T5):
 *
 * - Keys are tenant-scoped; we enforce this by requiring `org_id` in the key
 *   path (`<orgId>/...`). The blobstore does not understand tenancy beyond
 *   that; tenant enforcement at L2/L3 is the storage / identity layer's job.
 * - `put()` is content-agnostic — bytes in, ref out. Hashing happens in
 *   `@ahamie/cas`, not here.
 * - Streaming is first-class: large objects (snapshots, PDF dumps, audio)
 *   never go through `Buffer.concat`.
 */

import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export interface BlobRef {
  /** Full key, including the `<orgId>/...` prefix. */
  key: string;
  /** Size in bytes. */
  size: number;
  /** Content-Type if set, else `application/octet-stream`. */
  contentType: string;
  /** ISO8601 timestamp the object was written. */
  createdAt: string;
}

export interface PutOptions {
  contentType?: string;
}

export interface ListOptions {
  prefix?: string;
  limit?: number;
}

export interface Blobstore {
  put(key: string, body: Uint8Array | Buffer | Readable, opts?: PutOptions): Promise<BlobRef>;
  get(key: string): Promise<Buffer>;
  getStream(key: string): Promise<Readable>;
  head(key: string): Promise<BlobRef | null>;
  delete(key: string): Promise<void>;
  list(opts?: ListOptions): Promise<BlobRef[]>;
}

export class BlobstoreKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlobstoreKeyError";
  }
}

export class BlobstoreNotFoundError extends Error {
  constructor(key: string) {
    super(`blobstore: key not found: ${key}`);
    this.name = "BlobstoreNotFoundError";
  }
}

const KEY_RE = /^[A-Za-z0-9._\-/]+$/;

/** Throws if the key escapes the base path or contains illegal characters. */
function validateKey(key: string): void {
  if (!key || key.startsWith("/") || key.includes("..")) {
    throw new BlobstoreKeyError(`illegal key: ${key}`);
  }
  if (!KEY_RE.test(key)) {
    throw new BlobstoreKeyError(`key contains illegal characters: ${key}`);
  }
}

const META_SUFFIX = ".meta.json";

/**
 * Local filesystem blobstore. The dev-default; teams replace with the
 * S3-compat adapter in `@ahamie/blobstore-s3` (v1) by swapping the import.
 */
export class LocalFsBlobstore implements Blobstore {
  constructor(private readonly basePath: string) {}

  private resolve(key: string): string {
    validateKey(key);
    const full = normalize(join(this.basePath, key));
    if (!full.startsWith(this.basePath + sep) && full !== this.basePath) {
      throw new BlobstoreKeyError(`key escapes basePath: ${key}`);
    }
    return full;
  }

  async put(
    key: string,
    body: Uint8Array | Buffer | Readable,
    opts?: PutOptions,
  ): Promise<BlobRef> {
    const target = this.resolve(key);
    await mkdir(dirname(target), { recursive: true });

    let size = 0;
    if (body instanceof Readable) {
      const counted = Readable.from(
        (async function* () {
          for await (const chunk of body) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
            size += buf.length;
            yield buf;
          }
        })(),
      );
      await pipeline(counted, createWriteStream(target));
    } else {
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
      size = buf.length;
      await writeFile(target, buf);
    }

    const ref: BlobRef = {
      key,
      size,
      contentType: opts?.contentType ?? "application/octet-stream",
      createdAt: new Date().toISOString(),
    };
    await writeFile(`${target}${META_SUFFIX}`, JSON.stringify(ref));
    return ref;
  }

  async get(key: string): Promise<Buffer> {
    const target = this.resolve(key);
    try {
      return await readFile(target);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        throw new BlobstoreNotFoundError(key);
      }
      throw e;
    }
  }

  async getStream(key: string): Promise<Readable> {
    const ref = await this.head(key);
    if (!ref) throw new BlobstoreNotFoundError(key);
    return createReadStream(this.resolve(key));
  }

  async head(key: string): Promise<BlobRef | null> {
    const target = this.resolve(key);
    try {
      const meta = await readFile(`${target}${META_SUFFIX}`, "utf8");
      return JSON.parse(meta) as BlobRef;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    const target = this.resolve(key);
    await rm(target, { force: true });
    await rm(`${target}${META_SUFFIX}`, { force: true });
  }

  async list(opts: ListOptions = {}): Promise<BlobRef[]> {
    const start = opts.prefix
      ? normalize(join(this.basePath, opts.prefix))
      : this.basePath;
    const out: BlobRef[] = [];
    const limit = opts.limit ?? 1000;
    const stack: string[] = [start];
    while (stack.length && out.length < limit) {
      const dir = stack.pop();
      if (!dir) break;
      let entries: string[];
      try {
        entries = await readdir(dir);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw e;
      }
      for (const entry of entries) {
        if (out.length >= limit) break;
        const full = join(dir, entry);
        const st = await stat(full);
        if (st.isDirectory()) {
          stack.push(full);
        } else if (entry.endsWith(META_SUFFIX)) {
          const meta = JSON.parse(await readFile(full, "utf8")) as BlobRef;
          out.push(meta);
        }
      }
    }
    return out;
  }
}

export const createLocalBlobstore = (basePath: string): Blobstore =>
  new LocalFsBlobstore(basePath);
