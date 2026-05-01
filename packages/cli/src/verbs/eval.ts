/**
 * `ahamie eval <suite-id>` — load and run an eval suite.
 * v0 expects a `.ts`/`.js` file under `src/evals/<suite-id>.suite.ts`
 * exporting a default `defineSuite` value.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runSuite } from "@ahamie/eval";
import pico from "picocolors";
import type { AhamieCliVerb } from "./registry";

export const evalVerb: AhamieCliVerb = {
  name: "eval",
  description: "Run an eval suite.",
  options: [
    { flags: "--suite <id>", description: "Suite id (e.g. summarizer.suite)" },
    { flags: "--file <path>", description: "Override path to suite file" },
  ],
  async run(args) {
    const suiteId = args.suite as string | undefined;
    const file =
      (args.file as string | undefined) ??
      (suiteId ? `src/evals/${suiteId}.ts` : null);
    if (!file) {
      console.error(pico.red("--suite or --file required"));
      return 1;
    }
    const mod = await import(pathToFileURL(resolve(process.cwd(), file)).href);
    const suite = mod.default;
    if (!suite) {
      console.error(pico.red(`No default export from ${file}`));
      return 1;
    }
    const r = await runSuite(suite);
    const obs = r.observable;
    console.log(
      `observable: ${obs.passed ? pico.green("PASS") : pico.red("FAIL")} (${obs.score.toFixed(2)})`,
    );
    if (r.hiddenGolden) {
      const g = r.hiddenGolden;
      console.log(`hidden-golden: ${g.passed ? pico.green("PASS") : pico.red("FAIL")} (${g.score.toFixed(2)})`);
    }
    return r.passed ? 0 : 1;
  },
};
