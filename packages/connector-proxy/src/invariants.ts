/**
 * The five non-negotiable invariants (RFC §8.5, T8). Each is implemented
 * as a pure function so the test matrix can audit them by reading test
 * cases — the W4 exit criterion.
 *
 *   I1 — credentials resolved server-side; agent process never sees the raw token.
 *   I2 — per-connector (method, path) allowlist; 403 on miss.
 *   I3 — caller `Authorization` header stripped *before* upstream forward.
 *   I4 — response auth headers stripped *before* return to caller.
 *   I5 — HMAC-verified inbound webhooks; mismatch → 401 + audit row.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export class InvariantViolationError extends Error {
  constructor(public readonly invariant: string, message: string) {
    super(`[${invariant}] ${message}`);
    this.name = "InvariantViolationError";
  }
}

/* ─────────────────────────── I2 — allowlist ─────────────────────────── */

export interface AllowlistEntry {
  method: string;
  /** Pattern: `/api/users/:id`, `/repos/*`, etc. Compiled to RegExp. */
  pathPattern: string;
}

const compilePattern = (p: string): RegExp => {
  const r = p
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/:[a-zA-Z_]\w*/g, "[^/]+");
  return new RegExp(`^${r}$`);
};

export interface CompiledAllowlist {
  match(method: string, path: string): boolean;
}

export const compileAllowlist = (entries: AllowlistEntry[]): CompiledAllowlist => {
  const compiled = entries.map((e) => ({
    method: e.method.toUpperCase(),
    re: compilePattern(e.pathPattern),
  }));
  return {
    match(method: string, path: string) {
      const m = method.toUpperCase();
      return compiled.some((c) => c.method === m && c.re.test(path));
    },
  };
};

/** I2 — pre-flight check. Throws on miss. */
export const requireAllowlist = (
  allowlist: CompiledAllowlist,
  method: string,
  path: string,
): void => {
  if (!allowlist.match(method, path)) {
    throw new InvariantViolationError(
      "I2",
      `(${method.toUpperCase()} ${path}) not in connector allowlist`,
    );
  }
};

/* ─────────────────────────── I3 — strip caller auth ─────────────────────────── */

const SENSITIVE_REQUEST_HEADERS = ["authorization", "cookie", "proxy-authorization"];

/** I3 — strip the caller's `Authorization` (and friends) before upstream call. */
export const stripCallerAuth = (headers: Headers): Headers => {
  const out = new Headers(headers);
  for (const h of SENSITIVE_REQUEST_HEADERS) out.delete(h);
  return out;
};

/* ─────────────────────────── I4 — strip response auth ─────────────────────────── */

const SENSITIVE_RESPONSE_HEADERS = [
  "set-cookie",
  "www-authenticate",
  "proxy-authenticate",
  "authorization",
];

/** I4 — strip auth-bearing response headers before returning to the agent. */
export const stripResponseAuth = (headers: Headers): Headers => {
  const out = new Headers(headers);
  for (const h of SENSITIVE_RESPONSE_HEADERS) out.delete(h);
  return out;
};

/* ─────────────────────────── I5 — HMAC verification ─────────────────────────── */

export type HmacAlgo = "sha256" | "sha1";

export interface HmacVerifyArgs {
  secret: string;
  algo?: HmacAlgo;
  /** Bytes the provider signed (usually the raw request body). */
  body: string;
  /** The signature header value from the provider. */
  signature: string;
  /** Optional prefix the provider prepends, e.g. "sha256=" for GitHub. */
  prefix?: string;
}

/** Constant-time HMAC compare. Returns true iff signatures match. */
export const verifyHmac = ({ secret, algo = "sha256", body, signature, prefix = "" }: HmacVerifyArgs): boolean => {
  const expected = createHmac(algo, secret).update(body).digest("hex");
  const incoming = signature.startsWith(prefix) ? signature.slice(prefix.length) : signature;
  if (incoming.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(incoming));
  } catch {
    return false;
  }
};

/* ─────────────────────────── I1 — token redaction (audit guard) ─────────────────────────── */

/**
 * I1 — assert that an audit row's `redaction_safe` payload contains no
 * verbatim secret. We keep this conservative: any field whose key includes
 * `token`, `secret`, `key`, or `password` is rejected.
 */
export const assertRedactionSafe = (payload: unknown): void => {
  const stack: unknown[] = [payload];
  while (stack.length) {
    const v = stack.pop();
    if (!v || typeof v !== "object") continue;
    if (Array.isArray(v)) {
      for (const item of v) stack.push(item);
      continue;
    }
    for (const [k, val] of Object.entries(v)) {
      if (/(token|secret|api[_-]?key|password|bearer|authorization)/i.test(k)) {
        throw new InvariantViolationError(
          "I1",
          `audit payload contains a sensitive key: '${k}'`,
        );
      }
      if (typeof val === "object" && val !== null) stack.push(val);
    }
  }
};
