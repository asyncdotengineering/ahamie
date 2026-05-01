#!/usr/bin/env node
/**
 * The wizard from tech-plan §6.1.
 */

import { resolve } from "node:path";
import { confirm, intro, multiselect, outro, select, text } from "@clack/prompts";
import pico from "picocolors";
import { scaffold } from "../index";

const main = async (): Promise<number> => {
  intro(`${pico.cyan("ahamie")} — the company brain you own`);

  const cwdName = process.argv[2] ?? "my-brain";
  const targetDir = resolve(process.cwd(), cwdName);

  const postgres = await select({
    message: "Use existing Postgres or auto-spin Docker?",
    options: [
      { label: "auto-spin Docker", value: "docker" as const },
      { label: "use existing Postgres URL", value: "url" as const },
    ],
  });

  let pgConfig: "docker" | { url: string } = "docker";
  if (postgres === "url") {
    const url = (await text({
      message: "Postgres URL?",
      placeholder: "postgres://user:pass@host:5432/db",
    })) as string;
    pgConfig = { url };
  }

  const aiProvider = (await select({
    message: "AI provider?",
    options: [
      { label: "Anthropic (paste key, or skip → Ollama)", value: "anthropic" as const },
      { label: "OpenAI", value: "openai" as const },
      { label: "Ollama (local)", value: "ollama" as const },
    ],
  })) as "anthropic" | "openai" | "ollama";

  const connectors = (await multiselect({
    message: "Connectors to scaffold?",
    options: [
      { label: "slack", value: "slack" as const },
      { label: "github", value: "github" as const },
      { label: "linear", value: "linear" as const },
    ],
    required: false,
  })) as Array<"slack" | "github" | "linear">;

  const installUi = (await confirm({ message: "Add UI primitives (shadcn)?" })) as boolean;
  const installBetterAuth = (await confirm({ message: "Install Better-Auth?" })) as boolean;

  await scaffold({
    targetDir,
    appName: cwdName,
    postgres: pgConfig,
    aiProvider,
    connectors,
    installUi,
    installBetterAuth,
  });

  outro(`${pico.green("✓")} done — cd ${cwdName} && pnpm install && pnpm dev`);
  return 0;
};

main().then((code) => process.exit(code)).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
