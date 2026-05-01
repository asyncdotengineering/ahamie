/**
 * `ahamie triggers list` — list registered triggers in the current project.
 */

import { resolve } from "node:path";
import pico from "picocolors";
import type { AhamieCliVerb } from "./registry";

export const triggersVerb: AhamieCliVerb = {
  name: "triggers",
  description: "Trigger registry.",
  subverbs: [
    {
      name: "list",
      description: "List all triggers known to the current process.",
      async run() {
        const { on } = (await import("@ahamie/automation")) as unknown as {
          on: Record<string, unknown>;
        };
        const keys = Object.keys(on as object);
        for (const k of keys) console.log(pico.cyan(`on.${k}`));
        return 0;
      },
    },
  ],
};
