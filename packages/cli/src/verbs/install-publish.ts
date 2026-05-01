/**
 * `ahamie publish` and `ahamie install` — interact with `@ahamie/registry`.
 */

import pico from "picocolors";
import type { AhamieCliVerb } from "./registry";

export const publishVerb: AhamieCliVerb = {
  name: "publish",
  description: "Publish an app manifest to the registry.",
  options: [{ flags: "--manifest <path>", description: "Path to manifest.ts" }],
  async run() {
    console.log(pico.dim("(v0: implement against `@ahamie/registry` createLocalRegistry)"));
    return 0;
  },
};

export const installVerb: AhamieCliVerb = {
  name: "install",
  description: "Install an app by manifest hash.",
  options: [{ flags: "--hash <sha>", description: "Manifest content hash" }],
  async run() {
    console.log(pico.dim("(v0: implement against `@ahamie/registry`)"));
    return 0;
  },
};

export const buildVerb: AhamieCliVerb = {
  name: "build",
  description: "Bundle the project (delegates to tsup).",
  async run() {
    console.log(pico.cyan("Run: pnpm exec tsup"));
    return 0;
  },
};

export const deployVerb: AhamieCliVerb = {
  name: "deploy",
  description: "Deploy to a target environment (v1: Helm chart, v2: Terraform).",
  async run() {
    console.log(pico.yellow("Deploy targets ship at v1 (Helm) and v2 (Terraform)."));
    return 0;
  },
};

export const createVerb: AhamieCliVerb = {
  name: "create",
  description: "Scaffold a new project (delegates to `pnpm create ahamie`).",
  async run() {
    console.log(pico.cyan("Run: pnpm create ahamie my-brain"));
    return 0;
  },
};
