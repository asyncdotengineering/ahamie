/**
 * `ahamie dev` — boots the connector-proxy as a child process and
 * tells the user where the app should listen.
 *
 * Future iterations spawn the app binary and the workflow runner under
 * the same supervisor; v0 prints the start-up plan for clarity.
 */

import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pico from "picocolors";
import type { AhamieCliVerb } from "./registry";

export const devVerb: AhamieCliVerb = {
  name: "dev",
  description: "Boot proxy + app + runner for local development.",
  options: [
    { flags: "--port <number>", description: "App port", defaultValue: "3000" },
    { flags: "--proxy-port <number>", description: "Proxy port", defaultValue: "7787" },
  ],
  async run(args) {
    const port = Number(args.port ?? 3000);
    const proxyPort = Number(args.proxyPort ?? 7787);
    const bearer = process.env.AHAMIE_PROXY_TOKEN ?? randomBytes(24).toString("hex");
    process.env.AHAMIE_PROXY_TOKEN = bearer;

    console.log(`${pico.bold("▸ ahamie-proxy")}   listening on http://127.0.0.1:${proxyPort}`);
    console.log(`               bearer: ${pico.dim(bearer.slice(0, 8))}…`);
    console.log(`${pico.bold("▸ ahamie-app")}     listening on http://127.0.0.1:${port}`);
    console.log(`${pico.bold("▸ ahamie-runner")}  in-proc (Mastra workflow)`);

    // v0: simply tail proxy stdout. The user app is started by the consumer
    // (e.g. `pnpm dev` in their app dir).
    const child = spawn("ahamie-proxy", [], {
      env: {
        ...process.env,
        AHAMIE_PROXY_PORT: String(proxyPort),
        AHAMIE_PROXY_TOKEN: bearer,
      },
      stdio: "inherit",
    });
    return new Promise<number>((resolve) => {
      child.on("exit", (code) => resolve(code ?? 0));
    });
  },
};
