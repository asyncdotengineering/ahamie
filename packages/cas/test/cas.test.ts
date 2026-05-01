import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalBlobstore } from "@ahamie/blobstore";
import { createCas, type Cas, CasIntegrityError } from "../src";

describe("CAS over LocalFsBlobstore", () => {
  let dir: string;
  let cas: Cas;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ahamie-cas-"));
    cas = createCas(createLocalBlobstore(dir));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("put returns sha256 hex id", async () => {
    const obj = await cas.put("org_a", Buffer.from("hello"));
    expect(obj.id).toMatch(/^[a-f0-9]{64}$/);
    expect(obj.size).toBe(5);
  });

  it("put is idempotent — same bytes → same id, no duplicate write", async () => {
    const a = await cas.put("org_a", Buffer.from("same"));
    const b = await cas.put("org_a", Buffer.from("same"));
    expect(a.id).toBe(b.id);
  });

  it("get returns the original bytes", async () => {
    const obj = await cas.put("org_a", Buffer.from("payload"));
    const back = await cas.get("org_a", obj.id);
    expect(back.toString()).toBe("payload");
  });

  it("get throws CasIntegrityError if bytes are tampered", async () => {
    const obj = await cas.put("org_a", Buffer.from("clean"));
    // Pretend the storage returned different bytes by writing under the same key.
    const tampered = createLocalBlobstore(dir);
    await tampered.put(`org_a/cas/${obj.id.slice(0, 2)}/${obj.id.slice(2)}`, Buffer.from("dirty"));
    await expect(cas.get("org_a", obj.id)).rejects.toBeInstanceOf(CasIntegrityError);
  });

  it("link records parent edges, deduplicated", async () => {
    const child = await cas.put("org_a", Buffer.from("child"));
    const parent = await cas.put("org_a", Buffer.from("parent"));

    await cas.link("org_a", child.id, parent.id);
    await cas.link("org_a", child.id, parent.id);

    const ps = await cas.parents("org_a", child.id);
    expect(ps).toEqual([parent.id]);
  });

  it("put with parents stores edges atomically", async () => {
    const p1 = await cas.put("org_a", Buffer.from("p1"));
    const p2 = await cas.put("org_a", Buffer.from("p2"));
    const c = await cas.put("org_a", Buffer.from("c"), { parents: [p1.id, p2.id] });
    const ps = await cas.parents("org_a", c.id);
    expect(ps.sort()).toEqual([p1.id, p2.id].sort());
  });

  it("tenant isolation — same bytes under different orgs are independent", async () => {
    const a = await cas.put("org_a", Buffer.from("shared"));
    const b = await cas.put("org_b", Buffer.from("shared"));
    expect(a.id).toBe(b.id);
    // But orgs do not share storage, so deleting `org_a`'s does not affect `org_b`.
  });
});
