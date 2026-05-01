/**
 * `@ahamie/sandbox-local` — wraps `@mastra/local-sandbox` (bubblewrap on
 * Linux). The `auto` rule selects this on Linux when bwrap is present.
 *
 * v0 keeps the surface tiny — `pickSandbox()` returns the appropriate
 * adapter id based on platform + binary availability. The framework
 * config (`ahamie.config.ts` `sandbox.rule: "auto"`) calls this at boot.
 */

import { execSync } from "node:child_process";
import { platform } from "node:os";

export type SandboxKind = "local-bwrap" | "docker" | "compute-sdk" | "no-op";

const hasBwrap = (): boolean => {
  try {
    execSync("which bwrap", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const hasDocker = (): boolean => {
  try {
    execSync("docker --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

export const pickSandbox = (): SandboxKind => {
  if (platform() === "linux" && hasBwrap()) return "local-bwrap";
  if (hasDocker()) return "docker";
  return "no-op";
};
