/**
 * Build the commander Program from the registered verb set. Splitting verb
 * registration from program construction lets us unit-test each verb's
 * runner in isolation and lets plugins extend the surface.
 */

import { Command } from "commander";
import {
  allVerbs,
  registerVerb,
  type AhamieCliVerb,
} from "./verbs/registry";
import { dbVerb } from "./verbs/db";
import { devVerb } from "./verbs/dev";
import { uiVerb } from "./verbs/ui";
import { evalVerb } from "./verbs/eval";
import { factoryVerb } from "./verbs/factory";
import { triggersVerb } from "./verbs/triggers";
import { secretsVerb } from "./verbs/secrets";
import { doctorVerb } from "./verbs/doctor";
import { runVerb } from "./verbs/run";
import { loginVerb, logoutVerb } from "./verbs/auth";
import {
  buildVerb,
  createVerb,
  deployVerb,
  installVerb,
  publishVerb,
} from "./verbs/install-publish";

let bootstrapped = false;
const bootstrap = (): void => {
  if (bootstrapped) return;
  bootstrapped = true;
  for (const v of [
    createVerb,
    devVerb,
    buildVerb,
    deployVerb,
    uiVerb,
    publishVerb,
    installVerb,
    loginVerb,
    logoutVerb,
    runVerb,
    evalVerb,
    factoryVerb,
    triggersVerb,
    dbVerb,
    secretsVerb,
    doctorVerb,
  ]) {
    registerVerb(v);
  }
};

const mountVerb = (program: Command, v: AhamieCliVerb): void => {
  const cmd = program.command(v.name).description(v.description);
  for (const opt of v.options ?? []) {
    cmd.option(opt.flags, opt.description, opt.defaultValue as string | undefined);
  }
  if (v.subverbs?.length) {
    for (const sub of v.subverbs) mountVerb(cmd, sub);
  }
  if (v.run) {
    cmd.action(async (...rest: unknown[]) => {
      const optsAndCmd = rest[rest.length - 2] as Record<string, unknown> | undefined;
      const args = optsAndCmd ?? {};
      const code = await v.run!(args);
      if (code !== 0) process.exitCode = code;
    });
  }
};

export const buildProgram = (): Command => {
  bootstrap();
  const program = new Command();
  program
    .name("ahamie")
    .description("Ahamie — the company brain you own.")
    .version("0.1.0");
  for (const v of allVerbs()) {
    mountVerb(program, v);
  }
  return program;
};
