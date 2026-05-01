/**
 * `@ahamie/connector-linear` — Linear adapter (GraphQL + webhooks).
 * Linear's API is GraphQL-only; the proxy still allowlists by (method, path).
 */

import type { ProxyAdapterRegistration } from "@ahamie/connector-proxy";

export const linearAdapter: ProxyAdapterRegistration = {
  provider: "linear",
  baseUrl: "https://api.linear.app",
  authMode: { header: "authorization" },
  allowlist: [
    // Linear is single-endpoint GraphQL. The proxy's allowlist still applies.
    { method: "POST", pathPattern: "/graphql" },
  ],
  inbound: {
    signatureHeader: "linear-signature",
    secretEnvVar: "LINEAR_WEBHOOK_SECRET",
    algo: "sha256",
    deliveryIdHeader: "linear-delivery",
  },
};

export const linearTeam = (key: string): string => `linear:${key}`;
