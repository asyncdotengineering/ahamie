/**
 * `@ahamie/connector-proxy` — the trust boundary.
 *
 * Re-exports the surface for: server (Hono app + bin), credentials helper,
 * audit, the five invariants. The CLI binary lives at `./bin/ahamie-proxy`.
 */

export {
  createProxyApp,
  type ProxyConfig,
  type ProxyAdapterRegistration,
  type ForwardBody,
} from "./server";
export {
  encryptToken,
  decryptToken,
  createCredentialResolver,
  type CredentialResolver,
  type EncryptionMeta,
} from "./credentials";
export { writeAudit, type AuditRow } from "./audit";
export {
  type AllowlistEntry,
  type CompiledAllowlist,
  type HmacAlgo,
  InvariantViolationError,
  assertRedactionSafe,
  compileAllowlist,
  requireAllowlist,
  stripCallerAuth,
  stripResponseAuth,
  verifyHmac,
} from "./invariants";
