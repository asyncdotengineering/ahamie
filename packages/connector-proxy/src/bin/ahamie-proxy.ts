#!/usr/bin/env node
/**
 * `ahamie-proxy` CLI binary. Boots the Hono server on
 * `127.0.0.1:${AHAMIE_PROXY_PORT ?? 7787}` with the bearer set to
 * `AHAMIE_PROXY_TOKEN`. Reads adapter registrations from
 * `AHAMIE_PROXY_ADAPTERS` (a JSON file path).
 */

import { readFile } from "node:fs/promises";
import { serve } from "@hono/node-server";
import { createDb } from "@ahamie/storage";
import { createCredentialResolver } from "../credentials";
import { createProxyApp, type ProxyAdapterRegistration } from "../server";

const main = async (): Promise<void> => {
  const dbUrl = process.env.AHAMIE_DB_URL;
  const bearer = process.env.AHAMIE_PROXY_TOKEN;
  const kmsKeyB64 = process.env.AHAMIE_KMS_KEY_B64;
  const adaptersPath = process.env.AHAMIE_PROXY_ADAPTERS;
  const port = Number(process.env.AHAMIE_PROXY_PORT ?? 7787);

  if (!dbUrl) throw new Error("AHAMIE_DB_URL required");
  if (!bearer) throw new Error("AHAMIE_PROXY_TOKEN required");
  if (!kmsKeyB64) throw new Error("AHAMIE_KMS_KEY_B64 required");

  const adapters: ProxyAdapterRegistration[] = adaptersPath
    ? (JSON.parse(await readFile(adaptersPath, "utf8")) as ProxyAdapterRegistration[])
    : [];

  const db = createDb({ url: dbUrl, max: 4, appName: "ahamie-proxy" });
  const credentialResolver = createCredentialResolver(db, Buffer.from(kmsKeyB64, "base64"));

  const app = createProxyApp({ db, bearer, credentialResolver, adapters });
  serve({ fetch: app.fetch, port, hostname: "127.0.0.1" });
  // eslint-disable-next-line no-console
  console.log(`ahamie-proxy listening on http://127.0.0.1:${port}`);
};

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("ahamie-proxy fatal:", err);
  process.exit(1);
});
