/**
 * `@ahamie/automation` — public surface.
 *
 *   defineAutomation, defineProvider, defineTrigger
 *   on.*  (typed proxy via `AhamieTriggerNamespace` module augmentation)
 *
 * Runtime helpers (`enqueueEvent`, `runOnce`, `startScheduler`) live under
 * `@ahamie/automation/runtime` so apps that only declare automations don't
 * pull the runtime into their bundle.
 */

import type {
  AutomationDefinition,
  ProviderDefinition,
  Trigger,
} from "./types";

export const defineAutomation = <T>(d: AutomationDefinition<T>): AutomationDefinition<T> => d;

export const defineProvider = (p: ProviderDefinition): ProviderDefinition => p;

export const defineTrigger = <T>(t: Trigger<T>): Trigger<T> => t;

export {
  type AutomationDefinition,
  type ActionDefinition,
  type ActionAgentRun,
  type ActionAppInvoke,
  type ActionGatewaySend,
  type HandlerContext,
  type ProviderDefinition,
  type Trigger,
} from "./types";

export {
  on,
  cronTrigger,
  webhookTrigger,
  manualButtonTrigger,
  manualApiTrigger,
  appEventTrigger,
  channelMessageTrigger,
  registerTrigger,
  type AhamieTriggerNamespace,
  type CronTriggerConfig,
} from "./triggers";
