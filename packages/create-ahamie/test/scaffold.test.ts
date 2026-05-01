import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scaffold } from "../src";

describe("scaffold", () => {
  let dir: string;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "ahamie-scaffold-")); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  it("creates package.json + ahamie.config.ts + skeleton dirs", async () => {
    await scaffold({
      targetDir: dir,
      appName: "my-brain",
      postgres: "docker",
    });
    expect(existsSync(join(dir, "package.json"))).toBe(true);
    expect(existsSync(join(dir, "ahamie.config.ts"))).toBe(true);
    expect(existsSync(join(dir, ".env.example"))).toBe(true);
    expect(existsSync(join(dir, "src/agents"))).toBe(true);
    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
    expect(pkg.name).toBe("my-brain");
    expect(pkg.dependencies["@ahamie/sdk"]).toBeDefined();
  });
});
