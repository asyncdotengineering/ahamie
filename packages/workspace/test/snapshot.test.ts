import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalBlobstore } from "@ahamie/blobstore";
import { createCas } from "@ahamie/cas";
import { mintOrgId } from "@ahamie/schema";
import { createTmpWorkspace } from "../src";

describe("workspace snapshot", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ahamie-ws-test-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("snapshots files into CAS and restores the manifest", async () => {
    const orgId = mintOrgId();
    const cas = createCas(createLocalBlobstore(dir));
    const ws = await createTmpWorkspace();

    const { manifestId, manifest } = await ws.snapshot(orgId, cas, [
      { path: "a.txt", content: Buffer.from("hello") },
      { path: "b.txt", content: Buffer.from("world") },
    ]);
    expect(Object.keys(manifest.files).sort()).toEqual(["a.txt", "b.txt"]);

    const restored = await ws.restore(orgId, cas, manifestId);
    expect(restored.workspaceId).toBe(ws.id);
    expect(restored.files).toEqual(manifest.files);
  });
});
