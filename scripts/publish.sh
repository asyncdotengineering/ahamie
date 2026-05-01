#!/usr/bin/env bash
# Re-publish all @ahamie/* + create-ahamie at $VERSION.
#
# Usage:
#   VERSION=0.1.2 bash scripts/publish.sh
#
# Why this script and not `pnpm -r publish`:
#   - `pnpm publish` requires `provenance: false` for non-CI runs OR ambient
#     OIDC. We default to npm publish + --no-provenance for local-machine
#     publishes.
#   - We rewrite `workspace:*` to the exact target version before each
#     `npm publish`, then restore the workspace refs after. This avoids
#     leaking workspace:* into registry tarballs (which would break
#     installs).
#   - We publish in topological order so each package's deps are already
#     resolvable when it lands.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${VERSION:-}"
if [ -z "$VERSION" ]; then
  echo "Usage: VERSION=<x.y.z> bash scripts/publish.sh" >&2
  exit 1
fi

echo "▸ rewriting package.json files for $VERSION (workspace:* → $VERSION)"
node - <<EOF
const fs = require('node:fs');
const path = require('node:path');
const ROOT = '$ROOT';
const NEW_VERSION = '$VERSION';
const dirs = [
  ...fs.readdirSync(path.join(ROOT, 'packages')).map((d) => path.join('packages', d)),
  ...fs.readdirSync(path.join(ROOT, 'connectors')).map((d) => path.join('connectors', d)),
];
for (const d of dirs) {
  const pj = path.join(ROOT, d, 'package.json');
  if (!fs.existsSync(pj)) continue;
  const p = JSON.parse(fs.readFileSync(pj, 'utf8'));
  if (p.private) continue;
  p.version = NEW_VERSION;
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!p[key]) continue;
    for (const dep of Object.keys(p[key])) {
      if (p[key][dep] === 'workspace:*' || p[key][dep] === 'workspace:^*') {
        p[key][dep] = NEW_VERSION;
      }
    }
  }
  fs.writeFileSync(pj, JSON.stringify(p, null, 2) + '\n');
}
EOF

publish() {
  local dir="$1"
  echo "▸ publishing $dir"
  ( cd "$ROOT/$dir" && npm publish --access public --no-provenance 2>&1 | tail -3 ) || echo "  ✗ failed (continuing)"
}

# Topological order — deps published before consumers.
publish packages/schema
publish packages/telemetry
publish packages/blobstore
publish packages/cas
publish packages/storage
publish packages/identity
publish packages/agent
publish packages/workflow
publish packages/memory
publish packages/rag
publish packages/connector-proxy
publish packages/outcomes
publish packages/eval
publish packages/manifest
publish packages/workspace
publish packages/registry
publish packages/automation
publish connectors/slack
publish connectors/github
publish connectors/linear
publish packages/sandbox-local
publish packages/sandbox-docker
publish packages/sandbox-compute-sdk
publish packages/ui
publish packages/sdk
publish packages/cli
publish packages/create-ahamie

echo "▸ restoring workspace:* refs in source"
node - <<EOF
const fs = require('node:fs');
const path = require('node:path');
const ROOT = '$ROOT';
const PUBLISHED_VERSION = '$VERSION';
const dirs = [
  ...fs.readdirSync(path.join(ROOT, 'packages')).map((d) => path.join('packages', d)),
  ...fs.readdirSync(path.join(ROOT, 'connectors')).map((d) => path.join('connectors', d)),
];
for (const d of dirs) {
  const pj = path.join(ROOT, d, 'package.json');
  if (!fs.existsSync(pj)) continue;
  const p = JSON.parse(fs.readFileSync(pj, 'utf8'));
  let changed = false;
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!p[key]) continue;
    for (const dep of Object.keys(p[key])) {
      if (dep.startsWith('@ahamie/') && p[key][dep] === PUBLISHED_VERSION) {
        p[key][dep] = 'workspace:*';
        changed = true;
      }
    }
  }
  if (changed) fs.writeFileSync(pj, JSON.stringify(p, null, 2) + '\n');
}
EOF

( cd "$ROOT" && pnpm install 2>&1 | tail -3 )
echo "✓ publish complete at $VERSION"
