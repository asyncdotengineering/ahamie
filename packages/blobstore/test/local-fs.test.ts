import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BlobstoreKeyError,
  BlobstoreNotFoundError,
  createLocalBlobstore,
  type Blobstore,
} from "../src";

describe("LocalFsBlobstore", () => {
  let dir: string;
  let store: Blobstore;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ahamie-blob-"));
    store = createLocalBlobstore(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("put/get roundtrips bytes", async () => {
    const ref = await store.put("org_abc/hello.txt", Buffer.from("hello world"), {
      contentType: "text/plain",
    });
    expect(ref.size).toBe(11);
    expect(ref.contentType).toBe("text/plain");
    const back = await store.get("org_abc/hello.txt");
    expect(back.toString()).toBe("hello world");
  });

  it("put accepts a Readable stream", async () => {
    const stream = Readable.from([Buffer.from("abc"), Buffer.from("def")]);
    const ref = await store.put("org_x/stream.bin", stream);
    expect(ref.size).toBe(6);
    const back = await store.get("org_x/stream.bin");
    expect(back.toString()).toBe("abcdef");
  });

  it("rejects path traversal", async () => {
    await expect(store.put("../escape", Buffer.from("nope"))).rejects.toBeInstanceOf(
      BlobstoreKeyError,
    );
    await expect(store.put("/abs", Buffer.from("nope"))).rejects.toBeInstanceOf(
      BlobstoreKeyError,
    );
  });

  it("get throws BlobstoreNotFoundError when key missing", async () => {
    await expect(store.get("org_a/missing")).rejects.toBeInstanceOf(BlobstoreNotFoundError);
  });

  it("head returns null when key missing", async () => {
    expect(await store.head("org_a/no")).toBeNull();
  });

  it("list returns refs under prefix", async () => {
    await store.put("org_a/one.txt", Buffer.from("1"));
    await store.put("org_a/two.txt", Buffer.from("22"));
    await store.put("org_b/three.txt", Buffer.from("333"));

    const a = await store.list({ prefix: "org_a" });
    expect(a.map((r) => r.key).sort()).toEqual(["org_a/one.txt", "org_a/two.txt"]);
  });

  it("delete is idempotent", async () => {
    await store.put("org_a/x", Buffer.from("x"));
    await store.delete("org_a/x");
    await store.delete("org_a/x");
    expect(await store.head("org_a/x")).toBeNull();
  });
});
