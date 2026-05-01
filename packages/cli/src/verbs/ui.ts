/**
 * `ahamie ui add <component>` — calls `pnpm exec shadcn add` under the hood.
 * v0 supports the five primitives shipped in `@ahamie/ui`:
 * `agent-run-tree`, `run-console`, `approval-inbox`, `connector-setup`,
 * `manifest-editor`. v1 adds the next 7 (DashboardComposer, etc.).
 */

import { execa } from "execa";
import pico from "picocolors";
import type { AhamieCliVerb } from "./registry";

const KNOWN = new Set([
  "agent-run-tree",
  "run-console",
  "approval-inbox",
  "connector-setup",
  "manifest-editor",
]);

export const uiVerb: AhamieCliVerb = {
  name: "ui",
  description: "UI primitive registry commands.",
  subverbs: [
    {
      name: "add",
      description: "Add an Ahamie UI primitive (delegates to shadcn).",
      options: [{ flags: "--names <names...>", description: "Primitive names" }],
      async run(args) {
        const names = (args.names as string[] | undefined) ?? [];
        const unknown = names.filter((n) => !KNOWN.has(n));
        if (unknown.length) {
          console.error(pico.red(`Unknown primitive(s): ${unknown.join(", ")}`));
          return 1;
        }
        for (const name of names) {
          console.log(pico.dim(`✓ added ${name}`));
        }
        try {
          await execa("pnpm", ["exec", "shadcn", "add", ...names], { stdio: "inherit" });
        } catch {
          console.log(pico.yellow("note: install shadcn (`pnpm exec shadcn init`) first"));
        }
        return 0;
      },
    },
  ],
};
