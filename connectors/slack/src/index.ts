/**
 * `@ahamie/connector-slack` — first-party Slack adapter.
 *
 * The adapter body is intentionally tiny (≤150 LOC). All trust-boundary
 * mechanics (token holding, allowlist, response stripping, HMAC) live in
 * `@ahamie/connector-proxy`. This file only declares **what Slack is** —
 * its allowlist, its OAuth scopes, its webhook signature scheme — and a
 * convenience helper for app code to reference channels by name.
 */

import type { ProxyAdapterRegistration } from "@ahamie/connector-proxy";
import type { ConnectorRef } from "@ahamie/schema";

export const slackAdapter: ProxyAdapterRegistration = {
  provider: "slack",
  baseUrl: "https://slack.com",
  authMode: "bearer",
  allowlist: [
    { method: "GET", pathPattern: "/api/conversations.history" },
    { method: "GET", pathPattern: "/api/conversations.info" },
    { method: "GET", pathPattern: "/api/conversations.list" },
    { method: "POST", pathPattern: "/api/chat.postMessage" },
    { method: "POST", pathPattern: "/api/chat.update" },
    { method: "GET", pathPattern: "/api/users.info" },
    { method: "GET", pathPattern: "/api/users.list" },
    { method: "GET", pathPattern: "/api/team.info" },
  ],
  inbound: {
    signatureHeader: "x-slack-signature",
    secretEnvVar: "SLACK_SIGNING_SECRET",
    algo: "sha256",
    prefix: "v0=",
    deliveryIdHeader: "x-slack-request-timestamp",
  },
};

/** Helper to build a `ConnectorRef` like `slack:#engineering`. */
export const slackChannel = (channel: string): string => {
  if (!channel.startsWith("#")) throw new Error(`Slack channel must start with '#': ${channel}`);
  return `slack:${channel}`;
};

/** Convenience: declares an agent's intent to read messages from a channel. */
export const slackConnector = {
  read(channel: string): string {
    return slackChannel(channel);
  },
  /** Bot-write scope helper. */
  write(channel: string): string {
    return slackChannel(channel);
  },
};

export const slackOAuthScopes = {
  read: ["channels:history", "channels:read", "users:read", "team:read"],
  write: ["chat:write", "chat:write.public"],
} as const;
