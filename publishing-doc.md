# Publishing — internal runbook

> **Audience:** Ahamie maintainers with publish rights to `@ahamie/*` on npm.
> **Status:** v0 process. Will be replaced by GitHub Actions release flow at v1.
> **Last verified:** v0.1.1 release on 2026-05-02.

---

## TL;DR

```bash
# 1. Make changes; add a changeset for every PR that touches a publishable package
pnpm changeset

# 2. When ready to release: run the version step (consumes changesets, bumps versions, generates CHANGELOG.md)
pnpm version-packages   # = pnpm exec changeset version
git commit -am "chore: version packages"

# 3. Publish in topological order with workspace:* substitution
VERSION=<x.y.z> bash scripts/publish.sh

# 4. Push the version commit + tags
git push --follow-tags
```

---

## The five things that will bite you

### 1. `npm publish` does not substitute `workspace:*`

**This is the single most expensive footgun in the repo.** When you run `npm publish` on a package whose `dependencies` contain `workspace:*`, npm publishes the literal string `workspace:*` into the registry tarball. Consumers then `npm install @ahamie/sdk` and get **`ENOTFOUND workspace`**.

`pnpm publish` does substitute correctly. We don't use it because our `publishConfig.provenance: true` requires CI OIDC — pnpm publish errors locally, npm publish has `--no-provenance` to bypass.

**The fix lives in `scripts/publish.sh`:** before each `npm publish`, the script rewrites every `workspace:*` to the exact target version. After all publishes complete, it restores `workspace:*` so local pnpm-workspace links keep working.

If you ever need to publish manually:

```bash
# In each package dir, BEFORE npm publish:
sed -i '' 's/"workspace:\*"/"<TARGET-VERSION>"/g' package.json
npm publish --access public --no-provenance
# Then restore workspace:* before pnpm install
```

### 2. Topological order matters

`@ahamie/sdk` depends on `@ahamie/agent`. If you publish `sdk` before `agent`, the npm registry rejects `sdk@x.y.z` because its `agent@x.y.z` dep doesn't exist yet (sometimes — npm is permissive in some cases, strict in others; never assume).

`scripts/publish.sh` hard-codes the topo order. The order is:

```
schema → telemetry → blobstore → cas → storage
       → identity → agent → workflow → memory → rag
       → connector-proxy → outcomes → eval
       → manifest → workspace → registry → automation
       → connector-{slack,github,linear}
       → sandbox-{local,docker,compute-sdk}
       → ui → sdk → cli → create-ahamie
```

If you add a new package, **insert it into the order based on its deps**, not alphabetically.

### 3. The `provenance: true` field

Every `@ahamie/*` package's `publishConfig` has:

```json
{ "publishConfig": { "access": "public", "provenance": true } }
```

This works in CI (GitHub Actions with OIDC). It **fails locally** with:

```
npm error 422 Unprocessable Entity - PUT https://registry.npmjs.org/@ahamie%2fsdk - Unable to publish from workflow context
```

For local publishes use `--no-provenance`. Once we have a release workflow, drop the flag.

### 4. Changesets vs. version bumping

Changesets are great for managing CHANGELOG.md and coordinating multi-package version bumps. They are **not** great for first-time publishing of pre-existing 0.x packages — `pnpm changeset version` bumps minor/patch from the **current** version, so packages already at 0.1.0 with a "minor" changeset will go to **0.2.0**, not 0.1.0.

**For the very first publish:** use changesets to write the CHANGELOG, then manually reset versions back to 0.1.0 in package.json files before publishing. (We did this for v0.1.0; v0.1.1 was a same-version re-publish to fix the workspace:* leak.)

**For subsequent publishes:** the normal changesets flow works fine.

### 5. The `private` flag

Examples and docs are `"private": true` and MUST NOT be published. The `scripts/publish.sh` skips them by name (it only enumerates `packages/*` and `connectors/*`). If you add a new top-level workspace dir, update the script.

---

## Detailed flow

### Step 1 — Add changesets for the diff

For every PR that touches a publishable package, the contributor runs:

```bash
pnpm changeset
```

The interactive prompt asks:
- Which packages changed
- Patch / minor / major for each
- A short description (markdown supported)

This writes a markdown file under `.changeset/<random-name>.md`. **Commit this file** in the same PR.

### Step 2 — Cut a release

When the maintainer is ready to ship:

```bash
# Consumes every .changeset/*.md, bumps versions, generates CHANGELOG.md
pnpm version-packages

# Inspect the diff carefully — every `workspace:*` will be retained, but
# package.json `version` fields will have moved.
git diff

git add .
git commit -m "chore: version packages"
```

### Step 3 — Build + test

```bash
pnpm install         # relink workspaces with new versions
pnpm build           # 27 packages
AHAMIE_TEST_PG_URL=postgres://localhost:5432/ahamie_test pnpm test
```

If anything fails, **stop**. Fix it, commit, repeat step 3. Do not publish a broken release.

### Step 4 — Publish

```bash
# VERSION must match what changesets bumped to in package.json files.
# If package.jsons say "0.1.2", publish 0.1.2.
VERSION=0.1.2 bash scripts/publish.sh
```

The script will:
1. Rewrite `workspace:*` → `0.1.2` in every publishable `package.json`
2. Run `npm publish --access public --no-provenance` for each in topo order
3. Restore `workspace:*` after all publishes succeed
4. Re-run `pnpm install` so local workspace links work

If a publish fails partway through:
- The script does not rollback automatically
- Already-published versions are immutable on npm (you cannot republish the same `<name>@<version>`)
- Bump to the next patch and retry: `VERSION=0.1.3 bash scripts/publish.sh`

### Step 5 — Push + tag

```bash
git push --follow-tags origin main
```

Then on GitHub:
- Open Releases → Draft a new release
- Title: `v0.1.2`
- Pick the auto-generated tag
- Body: paste the `## v0.1.2` section from `apps/docs/src/content/docs/project/changelog.md`
- Publish

---

## Verifying a release

```bash
# Confirm the workspace:* substitution didn't leak
npm view @ahamie/sdk@<version> dependencies

# Should show concrete versions like { '@ahamie/agent': '0.1.2' }, NEVER 'workspace:*'
```

```bash
# Smoke-test a fresh install
mkdir /tmp/ahamie-smoke && cd /tmp/ahamie-smoke
pnpm init
pnpm add @ahamie/sdk @ahamie/cli
pnpm exec ahamie --version    # should print the new version
```

---

## Rolling back a bad release

npm allows unpublish within **72 hours**, but you cannot republish the same `<name>@<version>` even after unpublishing.

The fastest sane recovery:

```bash
# 1. Deprecate the bad version with a warning consumers will see at install
npm deprecate @ahamie/sdk@0.1.2 "Broken: workspace:* leaked into deps. Upgrade to 0.1.3."

# 2. Bump and republish
VERSION=0.1.3 bash scripts/publish.sh
```

For framework-wide breakage (e.g. all 27 packages have leaked workspace:*), deprecate every package and republish:

```bash
for p in agent automation blobstore cas cli connector-proxy connector-slack \
         connector-github connector-linear eval identity manifest memory \
         outcomes rag registry sandbox-local sandbox-docker sandbox-compute-sdk \
         schema sdk storage telemetry ui workflow workspace; do
  npm deprecate "@ahamie/${p}@0.1.2" "Broken release. Upgrade to 0.1.3."
done
npm deprecate "create-ahamie@0.1.2" "Broken release. Upgrade to 0.1.3."

VERSION=0.1.3 bash scripts/publish.sh
```

---

## Future (v1+)

The manual `scripts/publish.sh` will be replaced by a GitHub Actions release workflow:

- PR opened → changeset bot comments if missing
- PR merged to `main` → "Version Packages" PR is auto-opened by changesets-action
- Version Packages PR merged → publish job fires with provenance enabled (OIDC)
- Topological order is preserved by `pnpm publish -r` (which substitutes workspace:* correctly)

The `--no-provenance` flag and the manual rewrite step both go away.

---

## Reference

- `scripts/publish.sh` — the runbook in shell form
- `.changeset/config.json` — changeset config
- `package.json` `publishConfig` per package
- npm registry: `https://registry.npmjs.org/-/org/ahamie/package`
- Read access: `npm access list packages ahamie`

When in doubt — **before publishing** — run a dry-run from the package dir:

```bash
cd packages/<name>
npm publish --dry-run --access public
```

Inspect the tarball contents listed. Confirm:
- No `workspace:*` in any dependency
- `dist/` is present and current
- `package.json` `version` matches the target
