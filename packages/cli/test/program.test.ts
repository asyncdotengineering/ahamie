import { describe, expect, it } from "vitest";
import { buildProgram } from "../src/program";

describe("ahamie CLI program", () => {
  it("registers every documented verb", () => {
    const p = buildProgram();
    const names = p.commands.map((c) => c.name());
    for (const n of [
      "create",
      "dev",
      "build",
      "deploy",
      "ui",
      "publish",
      "install",
      "login",
      "logout",
      "run",
      "eval",
      "triggers",
      "db",
      "secrets",
      "doctor",
      "factory",
    ]) {
      expect(names).toContain(n);
    }
  });

  it("`db` exposes migrate and studio subverbs", () => {
    const p = buildProgram();
    const db = p.commands.find((c) => c.name() === "db");
    expect(db?.commands.map((c) => c.name()).sort()).toEqual(["migrate", "studio"]);
  });
});
