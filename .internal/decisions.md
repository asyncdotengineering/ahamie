# Decisions log (post-SPEC)

> All 19 SPEC decisions T1–T19 live in [`../SPEC.md`](../SPEC.md) §3. They are immutable for v0.
> This file logs decisions made **during implementation** that are not in the SPEC. New entries top of file.

---

## D-010 — Plain-markdown index, no MDX (2026-05-02)

**Decision.** The Starlight landing page (`apps/docs/src/content/docs/index.md`) uses plain markdown — no `<CardGrid>` / `<Card>` JSX components.

**Why.** MDX integration with Astro 6 + Starlight 0.38 + the existing content config didn't process `import` statements (the line rendered as text with curly quotes, indicating Markdown not MDX parsing). Two attempts to wire `@astrojs/mdx` failed in non-obvious ways. Cards are visual polish, not load-bearing — bullets + bold headings carry the same information at zero risk.

**Tradeoff.** If a future contributor wants the card UI, they'll need to debug the MDX integration or import Card components via a Starlight plugin path. The dependency was removed for cleanliness — re-add `@astrojs/mdx` if you need it.

---

## D-009 — Docs moved from Vercel to GitHub Pages (2026-05-02)

**Decision.** `https://asyncdotengineering.github.io/ahamie/` is the canonical docs URL. The Vercel project (`octalpixels-projects/ahamie-docs`) is deprecated. Build pipeline is `.github/workflows/docs.yml` — same shape as `asyncdotengineering/thodare`.

**Why.** Org-uniform deployment story. Both `thodare` and `ahamie` (and any future `asyncdotengineering/*` repo) ship docs through the same GitHub Pages workflow. One paths-filter file, no Vercel coupling, free hosting, one less account to log into.

**Tradeoff.** GitHub Pages serves under `/<repo>/` so we set `base: "/ahamie"` in `astro.config.mjs`. All internal links must use the base prefix (Starlight handles this automatically; manual `<a href>` tags must use `/ahamie/...`).

**Followup.** The marketing redirect `asyncdot.com/ahamie-docs` was updated to point at the new URL. The repo homepage on GitHub points at `https://asyncdotengineering.github.io/ahamie/`. The Vercel project is harmless if left in place but can be deleted.

---

## D-008 — Local-Postgres test mode added alongside testcontainers (2026-05-02)

**Decision.** `packages/storage/src/test-helpers.ts` now supports two modes: schema-isolated tests against a host-provided Postgres (`AHAMIE_TEST_PG_URL`), and the original testcontainers fallback. macOS/laptop development uses Postgres.app + a single `ahamie_test` database with isolated schemas per test run.

**Why.** Docker isn't always available on dev machines. Testcontainers spin-up cost is ~10s per test file × 38 files = ~6 min. Schema-isolation drops total test time to ~2 min on local Postgres.

**Tradeoff.** Storage tests can't run with `fileParallelism: true` because `CREATE EXTENSION IF NOT EXISTS` races. Worth it for the speed.

---

## D-007 — Vercel `redirects` over Astro `redirects` for marketing → ahamie redirects (2026-05-02)

**Decision.** The marketing site's `/ahamie` and `/ahamie-docs` routes redirect via `vercel.json` (HTTP 308 at the edge), not via Astro's `redirects` config (HTML meta refresh).

**Why.** SEO + speed. 308s preserve method + are cached at Vercel's edge. Meta refresh causes a visible white flash and search engines treat them as soft redirects.

---

## D-006 — Repo moved from `octalpixel/ahamie` to `asyncdotengineering/ahamie` (2026-05-02)

**Decision.** The framework lives under the `asyncdotengineering` GitHub org, not the personal account. GitHub auto-redirects from the old URL.

**Why.** Org-level ownership matches the long-term governance plan (`GOVERNANCE.md`'s council model). Personal-account ownership creates a single point of failure.

**Followups required.** None — every reference in code/docs has been swept.

---

## D-005 — `scripts/publish.sh` over `pnpm -r publish` for first publish (2026-05-02)

**Decision.** v0 releases go through `scripts/publish.sh` which manually rewrites `workspace:*` → exact version, runs `npm publish` per package in topological order, then restores `workspace:*`.

**Why.** `pnpm publish` would handle workspace:* substitution correctly, but our `publishConfig.provenance: true` blocks pnpm publish locally (requires CI OIDC). At v1 we'll move to a GitHub Actions release flow with proper provenance and drop the script.

See `publishing-doc.md` for the full reasoning.

---

## D-004 — All 27 packages published at exact-pin (no caret) cross-deps (2026-05-02)

**Decision.** When `scripts/publish.sh` substitutes `workspace:*`, it writes the **exact** target version (e.g. `"@ahamie/agent": "0.1.1"`), not a caret range.

**Why.** Lockstep release discipline at alpha. Every `@ahamie/*` package is published together at the same version. Mismatched versions across the surface break the wrap-and-hide invariants. We can relax to `^` at v1 once the public contract stabilizes.

---

## D-003 — Chibi mascot generated via fal.ai Flux Schnell (2026-05-02)

**Decision.** The Ahamie logo is the round-orange-creature-with-flame-and-glowing-aham-core chibi at `.assets/logo.png`, generated programmatically. SVG fallbacks at `.assets/logo.svg` and `.assets/wordmark.svg` are kept for review.

**Why.** Chibi Hono-style matches the warm/intimate brand voice ("the company brain you own"). The flame on top is a wink at Hono framework (Honō = flame). The glowing core represents the Tamil *aham* (self / inner core) per SPEC §2.

**Followup.** Org avatar + GitHub social preview need manual upload via web UI (GitHub doesn't expose these via API). The `octalpixel` user opted to skip the org-avatar change.

---

## D-002 — Apps under `apps/docs` (not `examples/docs`) (2026-05-02)

**Decision.** The Astro+Starlight docs site lives at `apps/docs/`, separate from `examples/`. SPEC §5.7 reserves `apps/` for runnable apps (vs. `examples/` for snippets/templates).

**Why.** `examples/*` are "copy this and use it as a starting point." `apps/docs` is the *deployed* app for ahamie.dev (or the asyncdot.com redirect target). Different intent, different folder.

---

## D-001 — Live docs at ahamie-docs.vercel.app + redirect from asyncdot.com (2026-05-02)

**Decision.** Docs are deployed to Vercel under the `octalpixels-projects` team as `ahamie-docs`. The marketing site's `/ahamie-docs` path 308-redirects to it. Repo homepage points at `https://asyncdot.com/ahamie-docs`.

**Why.** The `ahamie.dev` domain wasn't registered at the time of the v0 publish. Using the asyncdot.com redirect path keeps the public surface stable until ahamie.dev is registered + aliased. When that happens, only the marketing redirect destination needs to change.

**Followup.** Register `ahamie.dev` and add it as an alias to the `ahamie-docs` Vercel project. Then update the marketing redirect to point ahamie.dev/ahamie-docs at it directly (or have ahamie.dev resolve to the docs project root).
