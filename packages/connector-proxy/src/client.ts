/**
 * Lightweight HTTP client agents use to call the proxy. Lives in a
 * separate entry point so importing this in the agent process does NOT
 * pull in the Hono server code.
 */

import type { OrgId } from "@ahamie/schema";

export interface ProxyClientConfig {
  baseUrl: string;
  bearer: string;
  fetchImpl?: typeof fetch;
}

export interface ProxyForwardArgs {
  orgId: OrgId;
  connectorId: string;
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export const createProxyClient = (cfg: ProxyClientConfig) => {
  const f = cfg.fetchImpl ?? fetch;
  const auth = `Bearer ${cfg.bearer}`;
  return {
    async forward(args: ProxyForwardArgs): Promise<Response> {
      return f(`${cfg.baseUrl}/v1/forward`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: auth },
        body: JSON.stringify(args),
      });
    },
    async listMcpTools(connectorId: string): Promise<Response> {
      return f(`${cfg.baseUrl}/v1/mcp/${connectorId}/tools`, {
        headers: { authorization: auth },
      });
    },
  };
};

export type ProxyClient = ReturnType<typeof createProxyClient>;
