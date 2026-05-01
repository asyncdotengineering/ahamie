---
title: Connector proxy invariants (I1–I5)
description: The five non-negotiables that make the proxy a real trust boundary.
---

The connector proxy is a **separate process**. The agent runtime and the credential layer have separate process spaces. The five invariants below are unit-testable as pure functions; reading the test file is a complete security audit.

## I1 — credentials resolved server-side

**The agent process never sees the raw token.**

- Implementation: `@ahamie/connector-proxy/src/credentials.ts` is the only code that calls `decryptToken()`.
- Audit guard: `assertRedactionSafe()` rejects any audit-log payload whose key matches `/(token|secret|api[_-]?key|password|bearer|authorization)/i`.

## I2 — per-connector (method, path) allowlist

**403 on miss. Allowlist is linted in CI.**

- Implementation: `compileAllowlist()` turns `[{ method, pathPattern }]` into compiled regexes; `requireAllowlist()` is a pre-flight on every forward.

## I3 — caller `Authorization` stripped

**Before upstream forward.**

- Implementation: `stripCallerAuth()` removes `authorization`, `cookie`, `proxy-authorization` from the incoming `Headers` object. Then the proxy adds the upstream auth.

## I4 — response auth headers stripped

**Before return to caller.**

- Implementation: `stripResponseAuth()` removes `set-cookie`, `www-authenticate`, `proxy-authenticate`, `authorization`.

## I5 — HMAC-verified inbound

**Mismatch → 401 + audit row.**

- Implementation: `verifyHmac()` is constant-time; the proxy looks up the secret in `process.env[adapter.inbound.secretEnvVar]`. Failed verifies write a `proxy.webhook.rejected_hmac` row to `audit_log`.

## Test surface

```bash
pnpm --filter @ahamie/connector-proxy test
```

12 tests, 9 of them in `invariants.test.ts`. Reading them is the audit.

## Encryption

- AES-256-GCM via `node:crypto`
- Key from `AHAMIE_KMS_KEY_B64` (32 raw bytes, base64-encoded)
- Per-row IV (12 bytes) and authentication tag (16 bytes) live in `credentials.encryption_meta`
- v1 plugs in HashiCorp Vault adapter; v3 swaps to hardware-backed keys
