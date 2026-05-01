---
title: Quickstart
description: From zero to a running closed-loop agent in 90 seconds.
---

## Prerequisites

- Node.js ≥ 22
- pnpm ≥ 10
- Either Docker (for auto-spun Postgres) or a reachable Postgres URL with the `vector` extension installed

## 1. Scaffold

```bash
pnpm create ahamie my-brain
```

The wizard prompts for:

- Postgres source (auto-spin Docker / paste a URL)
- AI provider (Anthropic / OpenAI / local Ollama)
- Connectors to scaffold (Slack / GitHub / Linear)
- Whether to add the shadcn UI primitives
- Whether to install Better-Auth

## 2. Migrate the database

```bash
cd my-brain
pnpm exec ahamie db migrate
```

The migration installs `pgvector` + `pgcrypto` and creates 25 tables (see [Database schema](/reference/schema/)).

## 3. Boot the dev environment

```bash
pnpm dev
```

This launches:

```
▸ ahamie-proxy   listening on http://127.0.0.1:7787  (bearer: $AHAMIE_PROXY_TOKEN)
▸ ahamie-app     listening on http://127.0.0.1:3000
▸ ahamie-runner  in-proc (Mastra workflow)
✓ first-app health check: green
```

The proxy runs as a **separate process**. Your app calls it over HTTP with a per-launch bearer token.

## 4. Run the reference automation

```bash
pnpm exec ahamie run daily-eng-leadership-summary --shadow
```

Shadow mode records the run but does not dispatch deliveries.

## 5. Run the eval suite

```bash
pnpm exec ahamie eval --suite summarizer.suite
```

You should see both an `observable` partition and a `hidden_golden` partition in the report. The hidden-golden bytes live in a separate object-store prefix that the agent has no IAM access to.

## 6. Health check

```bash
pnpm exec ahamie doctor
```

Warns on missing eval suites, default-allow egress, unrotated credentials, and other adoption pitfalls.

## Next

- [Build your first agent](/tutorials/first-agent/)
- [Wire a closed loop](/tutorials/closed-loop/)
- [Reference app walkthrough](/start/reference-app/)
