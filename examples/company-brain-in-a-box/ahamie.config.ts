// ahamie.config.ts — root config for the reference app.

import { defineAhamieConfig } from "@ahamie/sdk";

export default defineAhamieConfig({
  identity: {
    provider: "better-auth",
    organization: { enabled: true },
    plugins: ["magic-link", "passkey", "2fa", "bearer", "multi-session"],
    sessionTtl: "7d",
  },
  storage: {
    url: process.env.AHAMIE_DB_URL ?? "auto-spin-docker",
    pgvector: true,
    blobstore: { kind: "local-fs", path: "./.ahamie/blobs" },
    cas: { kind: "local-fs", path: "./.ahamie/cas" },
  },
  connectorProxy: {
    listen: "127.0.0.1:7787",
    bearer: process.env.AHAMIE_PROXY_TOKEN,
    invariants: { stripAuthOnRequest: true, stripAuthOnResponse: true, hmacOnIngress: true },
    mcp: { mode: "inside-proxy" },
  },
  sandbox: { rule: "auto", egress: { policy: "unrestricted" } },
  automation: { engine: "in-process", triggers: { allow: ["cron", "webhook", "manual", "appEvent", "channel"] } },
  telemetry: { mastra: { enabled: true }, otel: { exporter: "console" } },
  eval: { hiddenGoldenPrefix: "ahamie://golden" },
  outcomes: { instrument: ["automation", "approval", "factory", "proxy"] },
  ui: {
    registry: "@ahamie/ui",
    components: ["AgentRunTree", "RunConsole", "ApprovalInbox", "ConnectorSetup", "ManifestEditor"],
  },
});
