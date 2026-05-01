/**
 * `ahamie factory run <spec>` — run the software-factory outer loop.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runSoftwareFactory } from "@ahamie/eval";
import pico from "picocolors";
import type { AhamieCliVerb } from "./registry";

export const factoryVerb: AhamieCliVerb = {
  name: "factory",
  description: "Software factory loops.",
  subverbs: [
    {
      name: "run",
      description: "Run a factory definition.",
      options: [
        { flags: "--file <path>", description: "Path to a defineSoftwareFactory module (default export)" },
      ],
      async run(args) {
        const file = args.file as string | undefined;
        if (!file) { console.error(pico.red("--file required")); return 1; }
        const mod = await import(pathToFileURL(resolve(process.cwd(), file)).href);
        const factory = mod.default;
        const r = await runSoftwareFactory(factory);
        console.log(`${r.outcome.toUpperCase()} (best ${r.bestScore.toFixed(2)} after ${r.iterations.length} iter)`);
        return r.outcome === "succeeded" ? 0 : 1;
      },
    },
  ],
};
