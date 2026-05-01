import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalBlobstore } from "@ahamie/blobstore";
import { createCas } from "@ahamie/cas";
import { defineApp, z, defineAction } from "@ahamie/manifest";
import { mintOrgId } from "@ahamie/schema";
import { createLocalRegistry } from "../src";

describe("local registry", () => {
  let dir: string;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "ahamie-reg-")); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  it("publish then fetch by CAS id", async () => {
    const reg = createLocalRegistry(createCas(createLocalBlobstore(dir)));
    const orgId = mintOrgId();
    const manifest = defineApp({
      id: "x",
      version: "0.1.0",
      name: "X",
      actions: {
        a: defineAction({
          id: "a",
          input: z.object({}),
          output: z.object({ ok: z.boolean() }),
          async handler() { return { ok: true }; },
        }),
      },
    });
    const { id } = await reg.publish(orgId, manifest);
    const back = await reg.fetch(orgId, id);
    expect(back?.id).toBe("x");
  });
});
