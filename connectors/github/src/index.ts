/**
 * `@ahamie/connector-github` — GitHub adapter (REST + webhooks).
 * 150-LOC body; trust-boundary mechanics live in `@ahamie/connector-proxy`.
 */

import type { ProxyAdapterRegistration } from "@ahamie/connector-proxy";

export const githubAdapter: ProxyAdapterRegistration = {
  provider: "github",
  baseUrl: "https://api.github.com",
  authMode: { header: "authorization" }, // GH wants `token <pat>` or `Bearer <jwt>`
  allowlist: [
    { method: "GET", pathPattern: "/repos/:owner/:repo" },
    { method: "GET", pathPattern: "/repos/:owner/:repo/issues" },
    { method: "GET", pathPattern: "/repos/:owner/:repo/issues/:n" },
    { method: "POST", pathPattern: "/repos/:owner/:repo/issues" },
    { method: "PATCH", pathPattern: "/repos/:owner/:repo/issues/:n" },
    { method: "GET", pathPattern: "/repos/:owner/:repo/pulls" },
    { method: "POST", pathPattern: "/repos/:owner/:repo/pulls" },
    { method: "POST", pathPattern: "/repos/:owner/:repo/issues/:n/comments" },
    { method: "GET", pathPattern: "/users/:user" },
    { method: "GET", pathPattern: "/orgs/:org/members" },
  ],
  inbound: {
    signatureHeader: "x-hub-signature-256",
    secretEnvVar: "GITHUB_WEBHOOK_SECRET",
    algo: "sha256",
    prefix: "sha256=",
    deliveryIdHeader: "x-github-delivery",
  },
};

export const githubRepo = (owner: string, repo: string): string =>
  `github:${owner}/${repo}`;
