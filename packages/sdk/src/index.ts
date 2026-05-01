/**
 * `@ahamie/sdk` — public surface for the headless company-brain framework.
 *
 * Re-exports the right subset of L2 (agent, automation, eval, outcomes)
 * plus the root config function `defineAhamieConfig` (replaces Phase-5's
 * `defineBrainConfig`).
 */

export type AhamieConfig = {
  identity: {
    provider: "better-auth" | "authentik" | "keycloak" | "custom";
    organization?: { enabled: boolean };
    plugins?: string[];
    sessionTtl?: string;
  };
  storage: {
    url: string;
    pgvector?: boolean;
    blobstore?: { kind: "local-fs" | "s3"; path?: string; bucket?: string };
    cas?: { kind: "local-fs" | "s3"; path?: string; bucket?: string };
  };
  connectorProxy?: {
    listen: string;
    bearer?: string;
    invariants?: {
      stripAuthOnRequest?: boolean;
      stripAuthOnResponse?: boolean;
      hmacOnIngress?: boolean;
    };
    mcp?: { mode: "inside-proxy" | "out-of-proxy" };
  };
  sandbox?: {
    rule: "auto" | "local" | "docker" | "compute-sdk";
    egress?: { policy: "unrestricted" | "localhost+allowlist" | "deny" };
  };
  automation?: {
    engine: "in-process" | "inngest";
    triggers?: { allow?: string[] };
  };
  telemetry?: {
    mastra?: { enabled: boolean };
    otel?: { exporter: "console" | "memory" | "otlp" | "langfuse" | "sentry" };
  };
  eval?: { hiddenGoldenPrefix?: string };
  outcomes?: { instrument?: Array<"automation" | "approval" | "factory" | "proxy"> };
  ui?: {
    registry: "@ahamie/ui";
    components?: string[];
  };
};

export const defineAhamieConfig = (cfg: AhamieConfig): AhamieConfig => cfg;

export * from "@ahamie/schema";
