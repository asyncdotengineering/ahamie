---
title: Contributing
description: How to send a PR. DCO sign-offs, no CLA.
---

We use **DCO** (`Signed-off-by:`), not a CLA. You retain copyright on every contribution.

## Workflow

1. Fork [`ahamie/ahamie`](https://github.com/asyncdotengineering/ahamie)
2. Branch from `main`
3. Write code + tests; ensure `pnpm test` passes (Postgres required for storage/identity)
4. Commit with `git commit -s -m "…"` (the `-s` adds the DCO line)
5. Open a PR

## Checklist

- [ ] Tests added or updated
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes (Biome v2)
- [ ] Changeset added: `pnpm changeset` and pick the right semver bump
- [ ] Docs updated if a public contract changed

## Local dev

```bash
git clone https://github.com/asyncdotengineering/ahamie
cd ahamie
pnpm install
pnpm build
AHAMIE_TEST_PG_URL=postgres://localhost:5432/ahamie_test pnpm test
```

The `ahamie_test` database needs the `vector` extension installed.

## Code of conduct

[Contributor Covenant 2.1](https://github.com/asyncdotengineering/ahamie/blob/main/CODE_OF_CONDUCT.md). Report violations to `conduct@ahamie.dev`.
