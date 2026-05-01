/**
 * `pnpm create ahamie my-brain` — the load-bearing first impression
 * (tech-plan §6.1). Scaffolds a project with:
 *
 *   - `ahamie.config.ts` — root config from §14.
 *   - `src/agents/` `src/automations/` `src/connectors/` `src/evals/`
 *     `src/outcomes/` `src/app/` skeletons.
 *   - `package.json` with the right deps.
 *   - `.env.local` with placeholders.
 *   - `drizzle.config.ts`.
 *
 * Each step is independently reproducible — running `pnpm exec shadcn init`
 * separately, or `pnpm exec ai-elements add` separately, MUST give the
 * same result the wizard produces.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pico from "picocolors";

export interface ScaffoldOptions {
  targetDir: string;
  appName: string;
  /** "auto-spin Docker" | "use existing Postgres URL" */
  postgres: "docker" | { url: string };
  aiProvider?: "anthropic" | "openai" | "ollama" | null;
  connectors?: Array<"slack" | "github" | "linear">;
  installUi?: boolean;
  installBetterAuth?: boolean;
}

const TEMPLATES = {
  "package.json": (name: string) =>
    JSON.stringify(
      {
        name,
        version: "0.1.0",
        type: "module",
        private: true,
        scripts: {
          dev: "ahamie dev",
          build: "tsup",
          test: "vitest run",
          "db:migrate": "ahamie db migrate",
        },
        dependencies: {
          "@ahamie/sdk": "^0.1.0",
          "@ahamie/cli": "^0.1.0",
          "@ahamie/identity": "^0.1.0",
          "@ahamie/storage": "^0.1.0",
          "@ahamie/connector-slack": "^0.1.0",
          "@mastra/core": "^1.31.0",
          zod: "^4.1.5",
        },
        devDependencies: {
          tsup: "^8.5.1",
          typescript: "^5.6.3",
          vitest: "^2.1.5",
        },
      },
      null,
      2,
    ),

  "ahamie.config.ts": () => `
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
`.trimStart(),

  ".env.example": () => `
AHAMIE_DB_URL=postgres://ahamie:ahamie@localhost:5432/ahamie
AHAMIE_PROXY_TOKEN=
AHAMIE_KMS_KEY_B64=
AUTH_SECRET=
ANTHROPIC_API_KEY=
SLACK_SIGNING_SECRET=
`.trimStart(),

  "src/agents/.gitkeep": () => "",
  "src/automations/.gitkeep": () => "",
  "src/connectors/.gitkeep": () => "",
  "src/evals/.gitkeep": () => "",
  "src/outcomes/.gitkeep": () => "",
  "src/app/.gitkeep": () => "",

  "README.md": (name: string) => `
# ${name}

Built with [Ahamie](https://github.com/ahamie/ahamie). The company brain you own.

\`\`\`bash
pnpm install
pnpm exec ahamie db migrate
pnpm dev
\`\`\`
`.trimStart(),
};

const writeFileEnsuring = async (path: string, contents: string): Promise<void> => {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, contents, "utf8");
};

export const scaffold = async (opts: ScaffoldOptions): Promise<void> => {
  await mkdir(opts.targetDir, { recursive: true });
  for (const [name, render] of Object.entries(TEMPLATES)) {
    const content = (render as (n: string) => string)(opts.appName);
    await writeFileEnsuring(join(opts.targetDir, name), content);
  }
  // eslint-disable-next-line no-console
  console.log(pico.green(`✓ scaffolded ${opts.appName}`));
};
