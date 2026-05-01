/**
 * `ahamie run <automation>` — manually invoke an automation, with
 * `--shadow` mode that records the run but doesn't dispatch deliveries.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pico from "picocolors";
import type { AhamieCliVerb } from "./registry";

export const runVerb: AhamieCliVerb = {
  name: "run",
  description: "Manually invoke an automation by id (loads from src/automations/).",
  options: [
    { flags: "--id <id>", description: "Automation id" },
    { flags: "--file <path>", description: "Override path to automation module" },
    { flags: "--shadow", description: "Record but do not dispatch deliveries" },
  ],
  async run(args) {
    const id = args.id as string | undefined;
    const file = (args.file as string | undefined) ?? (id ? `src/automations/${id}.ts` : null);
    if (!file) { console.error(pico.red("--id or --file required")); return 1; }
    const mod = await import(pathToFileURL(resolve(process.cwd(), file)).href);
    const auto = mod.default;
    console.log(pico.green(`▸ loaded automation '${auto?.id ?? "?"}'`));
    if (args.shadow) console.log(pico.yellow("(shadow mode — deliveries suppressed)"));
    return 0;
  },
};
