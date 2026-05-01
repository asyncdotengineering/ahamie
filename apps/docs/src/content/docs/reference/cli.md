---
title: CLI verbs
description: Every ahamie CLI verb at a glance.
---

```bash
ahamie create | dev | build | deploy
        | ui add
        | publish | install
        | login | logout
        | run | eval | factory run | triggers list
        | db migrate | db studio
        | secrets set | secrets list
        | doctor
```

## `create`

```bash
ahamie create my-brain
```

Delegates to `pnpm create ahamie`.

## `dev`

```bash
ahamie dev [--port 3000] [--proxy-port 7787]
```

Boots the proxy as a child process, prints the listen URL, generates a per-launch bearer token in `AHAMIE_PROXY_TOKEN` if unset.

## `build`

```bash
ahamie build
```

Delegates to `tsup`.

## `deploy`

```bash
ahamie deploy
```

v1: Helm chart. v2: Terraform.

## `ui add`

```bash
ahamie ui add agent-run-tree run-console approval-inbox
```

Calls `pnpm exec shadcn add` with the registered Ahamie primitive.

## `publish` / `install`

```bash
ahamie publish --manifest ./src/manifests/my-app.ts
ahamie install --hash <sha256>
```

Local registry today; `@ahamie/marketplace` at v2.

## `login` / `logout`

Better-Auth machine-token flow (v1 implements PKCE device flow).

## `run`

```bash
ahamie run --id daily-summary [--shadow]
```

Manually invoke an automation. `--shadow` records but does not dispatch deliveries.

## `eval`

```bash
ahamie eval --suite summarizer.suite
ahamie eval --file ./src/evals/custom.suite.ts
```

Loads the suite, runs both partitions, exits non-zero on failure.

## `factory run`

```bash
ahamie factory run --file ./src/factories/summarizer.factory.ts
```

Runs the software-factory outer loop with a tabu list across iterations.

## `triggers list`

```bash
ahamie triggers list
```

Lists every registered trigger family in the current process (built-ins + connector augmentations).

## `db migrate` / `db studio`

```bash
ahamie db migrate [--url postgres://…]
ahamie db studio
```

## `secrets`

```bash
ahamie secrets set --name slack-prod-webhook --purpose connector --org $ORG_ID
ahamie secrets list --org $ORG_ID
```

## `doctor`

```bash
ahamie doctor
```

Preflight checks: missing eval suites, default-allow egress, unrotated credentials, missing `ahamie.config.ts`, etc.
