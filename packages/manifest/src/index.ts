/**
 * `@ahamie/manifest` — declarative description of an app's actions,
 * views, data resources, connectors, schedules, and bills.
 *
 * v0 keeps types open and ships a `bundleHash()` helper so the registry
 * can content-address manifests for distribution. v1 ships the full
 * `defineView` (React + ai-elements) surface.
 */

import { createHash } from "node:crypto";
import { z, type StandardSchemaV1 } from "@ahamie/schema";

export interface AppManifest {
  id: string;
  version: string;
  name: string;
  description?: string;
  actions: Record<string, ActionDefinition<unknown, unknown>>;
  views?: Record<string, ViewDefinition>;
  resources?: Record<string, ResourceDefinition>;
  connectors?: Record<string, ConnectorDefinition>;
  schedules?: Record<string, ScheduleDefinition>;
  bills?: Record<string, BillDefinition>;
}

export interface ActionDefinition<TIn, TOut> {
  id: string;
  description?: string;
  input: StandardSchemaV1<unknown, TIn>;
  output: StandardSchemaV1<unknown, TOut>;
  handler: (input: TIn, ctx: ActionContext) => Promise<TOut>;
}

export interface ActionContext {
  orgId: string;
  /** Runtime-injected helpers. */
  ahamie: Record<string, unknown>;
}

export interface ViewDefinition {
  id: string;
  /** Path-style id; the host mounts it under `/apps/<app-id>/<view>`. */
  route: string;
  component: () => unknown;
}

export interface ResourceDefinition {
  id: string;
  /** Drizzle-table-like description; v1 generates Postgres tables. */
  schema: StandardSchemaV1<unknown, unknown>;
}

export interface ConnectorDefinition {
  id: string;
  kind: "oauth" | "api_key" | "mcp" | "webhook";
  scopes: string[];
  exposureMode: "proxy" | "direct";
}

export interface ScheduleDefinition {
  id: string;
  cron: string;
  timezone?: string;
  action: string;
}

export interface BillDefinition {
  id: string;
  dimension: string;
  unit_cost_usd: number;
}

export const defineApp = (m: AppManifest): AppManifest => m;
export const defineAction = <TIn, TOut>(
  a: ActionDefinition<TIn, TOut>,
): ActionDefinition<TIn, TOut> => a;
export const defineView = (v: ViewDefinition): ViewDefinition => v;
export const defineResource = (r: ResourceDefinition): ResourceDefinition => r;

/** Content hash of the manifest. Stable across reorderings: keys are sorted. */
export const bundleHash = (m: AppManifest): string => {
  const canonical = JSON.stringify(m, Object.keys(m).sort());
  return createHash("sha256").update(canonical).digest("hex");
};

export { z };
