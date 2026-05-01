/**
 * Built-in trigger constructors plus the `on.*` typed proxy.
 *
 * The proxy works like this: `on` is a `Proxy` whose `get` returns a value
 * from a runtime-mutable registry. Connector packages register triggers at
 * load time. Module augmentation surfaces those triggers in TypeScript.
 *
 * Example consumer code:
 *
 *   declare module "@ahamie/automation" {
 *     interface AhamieTriggerNamespace {
 *       slack: { message: (channel: string) => Trigger<SlackMessageEvent> };
 *     }
 *   }
 *
 *   const t = on.slack.message("#engineering"); // editor-inferred
 */

import type { Trigger } from "./types";
import { z } from "@ahamie/schema";

/* ─────────────────────────── built-ins ─────────────────────────── */

export interface CronTriggerConfig {
  expr: string;
  timezone?: string;
}

export const cronTrigger = (expr: string, opts: { timezone?: string } = {}): Trigger<{ firedAt: Date }> => ({
  kind: "cron",
  payloadSchema: z.object({ firedAt: z.date() }),
  config: { expr, timezone: opts.timezone ?? "UTC" } satisfies CronTriggerConfig,
});

export const webhookTrigger = (path: string): Trigger<unknown> => ({
  kind: "webhook",
  config: { path },
});

export const manualButtonTrigger = (id: string): Trigger<{ pressedBy: string }> => ({
  kind: "manual.button",
  payloadSchema: z.object({ pressedBy: z.string() }),
  config: { id },
});

export const manualApiTrigger = (id: string): Trigger<unknown> => ({
  kind: "manual.api",
  config: { id },
});

export const appEventTrigger = (event: string): Trigger<unknown> => ({
  kind: "appEvent",
  config: { event },
});

export const channelMessageTrigger = (channel: string): Trigger<{ text: string; sender: string }> => ({
  kind: "channel.message",
  payloadSchema: z.object({ text: z.string(), sender: z.string() }),
  config: { channel },
});

/* ─────────────────────────── typed `on.*` namespace ─────────────────────────── */

/**
 * Module-augmentation namespace. Connector packages widen this so that
 * `on.<provider>` is editor-typed.
 */
export interface AhamieTriggerNamespace {
  cron: typeof cronTrigger;
  webhook: typeof webhookTrigger;
  manual: { button: typeof manualButtonTrigger; api: typeof manualApiTrigger };
  appEvent: typeof appEventTrigger;
  channel: { message: typeof channelMessageTrigger };
}

const registry: Record<string, unknown> = {
  cron: cronTrigger,
  webhook: webhookTrigger,
  manual: { button: manualButtonTrigger, api: manualApiTrigger },
  appEvent: appEventTrigger,
  channel: { message: channelMessageTrigger },
};

/** Register a trigger family (called by connector packages at module load). */
export const registerTrigger = (key: string, value: unknown): void => {
  registry[key] = value;
};

/** Read-only typed proxy. */
export const on: AhamieTriggerNamespace = new Proxy(registry, {
  get(_t, prop: string) {
    const v = registry[prop];
    if (v === undefined) {
      throw new Error(`Unknown trigger '${prop}' — did you forget to install a connector?`);
    }
    return v;
  },
}) as unknown as AhamieTriggerNamespace;
