/**
 * Core contract: Trigger → Event → Run → Action → Delivery.
 *
 * Per RFC §8.5 (the only contract this package owns); the workflow engine
 * is pluggable (`@ahamie/workflow` default; `@ahamie/automation-inngest`
 * at v1).
 */

import type {
  AutomationId,
  AutomationRunId,
  EventId,
  OrgId,
  StandardSchemaV1,
  UserId,
} from "@ahamie/schema";

export interface AutomationEventMeta {
  /** Provider-supplied dedupe key. MUST be stable across retries. */
  eventId: EventId;
  /** When the source observed the event. */
  firedAt: Date;
}

/**
 * Public handler context. Exposed to user-defined `handler` callbacks.
 * **Typed surface only** — no OTel side-channel; we want the user's editor
 * to autocomplete this, not magic globals.
 */
export interface HandlerContext {
  event: { firedAt: Date; eventId: EventId; payload: unknown };
  run: { id: AutomationRunId; idempotencyKey: string };
  actor: { kind: "user" | "system" | "agent"; id: string; orgId: OrgId };
  /** Helper namespace, populated by the runtime. */
  ahamie: {
    orgId: OrgId;
    /** Resolved at runtime by `@ahamie/outcomes`. */
    outcomes?: {
      attribute: (subject: { kind: string; id: string }) => Promise<AutomationRunId | null>;
    };
    /** Identity of the agent on whose behalf the handler runs. Optional. */
    agentIdentity?: string;
  };
}

export interface Trigger<TPayload = unknown> {
  kind: string;
  /** When set, the runtime validates `event.payload` against this. */
  payloadSchema?: StandardSchemaV1<unknown, TPayload>;
  /** Optional config blob (passed by the trigger constructor). */
  config?: Record<string, unknown>;
}

export interface ActionAgentRun {
  kind: "agent.run";
  agent: { name: string; run: (args: { input: unknown; orgId: OrgId; signal?: AbortSignal }) => Promise<unknown> };
  input: (ctx: HandlerContext) => unknown | Promise<unknown>;
}

export interface ActionAppInvoke {
  kind: "app.invoke";
  app: string;
  action: string;
  input: (ctx: HandlerContext) => unknown | Promise<unknown>;
}

export interface ActionGatewaySend {
  kind: "gateway.send";
  target: string;
  template: string;
  from: (ctx: HandlerContext & { steps: unknown[] }) => unknown;
}

export type ActionDefinition = ActionAgentRun | ActionAppInvoke | ActionGatewaySend;

export interface AutomationDefinition<TPayload = unknown> {
  id: AutomationId | string;
  trigger: Trigger<TPayload>;
  actions: ActionDefinition[];
  budget?: { dimension: string; cap_usd: number; on_cap: "pause" | "degrade" | "fail" };
  approval?: { mode: "post-only" | "pre-execution" | "none" };
  /** Optional handler for triggers without a fixed action list (custom logic). */
  handler?: (ctx: HandlerContext) => Promise<void> | void;
}

export interface ProviderDefinition {
  id: string;
  triggers: Record<string, {
    schema: StandardSchemaV1<unknown, unknown>;
    handler: (ctx: HandlerContext) => Promise<void> | void;
  }>;
}
