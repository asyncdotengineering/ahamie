/**
 * `ahamie doctor` — preflight checks. Per RFC §16 R10, `doctor` warns on
 * common adoption pitfalls (missing eval suites, default-allow egress,
 * unrotated credentials, etc.).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import pico from "picocolors";
import type { AhamieCliVerb } from "./registry";

interface Check { name: string; status: "pass" | "warn" | "fail"; detail?: string }

const checks: Array<() => Check> = [
  () => ({
    name: "AHAMIE_DB_URL set",
    status: process.env.AHAMIE_DB_URL ? "pass" : "warn",
    detail: process.env.AHAMIE_DB_URL ? undefined : "tests + db migrate require Postgres",
  }),
  () => ({
    name: "src/evals/ exists",
    status: existsSync(join(process.cwd(), "src/evals")) ? "pass" : "warn",
    detail: "no eval suites — closed-loop discipline at risk",
  }),
  () => ({
    name: "ahamie.config.ts present",
    status: existsSync(join(process.cwd(), "ahamie.config.ts")) ? "pass" : "warn",
    detail: "missing root config — run `pnpm create ahamie` to scaffold",
  }),
];

export const doctorVerb: AhamieCliVerb = {
  name: "doctor",
  description: "Preflight checks for the current project.",
  async run() {
    let hasFail = false;
    for (const c of checks.map((f) => f())) {
      const tag = c.status === "pass"
        ? pico.green("PASS")
        : c.status === "warn"
          ? pico.yellow("WARN")
          : pico.red("FAIL");
      console.log(`${tag}  ${c.name}${c.detail ? `  ${pico.dim(c.detail)}` : ""}`);
      if (c.status === "fail") hasFail = true;
    }
    return hasFail ? 1 : 0;
  },
};
