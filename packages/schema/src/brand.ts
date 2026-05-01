/**
 * Branded ID types for L1 tenant enforcement (T19).
 *
 * Compile-time safety: an `OrgId` cannot be silently passed where a `RunId` is
 * expected. The Drizzle schema in `@ahamie/storage` widens column types with
 * these brands so accidental cross-tenant queries fail to typecheck.
 *
 * Runtime: `mintXId()` is a thin wrapper around `crypto.randomUUID()` that
 * tags the string with the brand. We intentionally do **not** validate UUID
 * shape at the brand layer — Zod refinements in `./refine` cover that.
 */

import { randomUUID } from "node:crypto";

declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type OrgId = Brand<string, "OrgId">;
export type UserId = Brand<string, "UserId">;
export type MembershipId = Brand<string, "MembershipId">;
export type DelegationId = Brand<string, "DelegationId">;
export type AgentId = Brand<string, "AgentId">;
export type AgentRunId = Brand<string, "AgentRunId">;
export type AgentStepId = Brand<string, "AgentStepId">;
export type AutomationId = Brand<string, "AutomationId">;
export type AutomationRunId = Brand<string, "AutomationRunId">;
export type AutomationEventId = Brand<string, "AutomationEventId">;
export type AutomationStepId = Brand<string, "AutomationStepId">;
export type EventId = Brand<string, "EventId">;
export type ManifestId = Brand<string, "ManifestId">;
export type ConnectorId = Brand<string, "ConnectorId">;
export type CredentialId = Brand<string, "CredentialId">;
export type SecretId = Brand<string, "SecretId">;
export type GrantId = Brand<string, "GrantId">;
export type AuditLogId = Brand<string, "AuditLogId">;
export type OutcomeId = Brand<string, "OutcomeId">;
export type EvalSuiteId = Brand<string, "EvalSuiteId">;
export type EvalResultId = Brand<string, "EvalResultId">;
export type FactoryRunId = Brand<string, "FactoryRunId">;
export type CasObjectId = Brand<string, "CasObjectId">;
export type BlobstoreRefId = Brand<string, "BlobstoreRefId">;
export type WebhookInboundId = Brand<string, "WebhookInboundId">;
export type WorkspaceId = Brand<string, "WorkspaceId">;

const PREFIX: Record<string, string> = {
  OrgId: "org",
  UserId: "usr",
  MembershipId: "mem",
  DelegationId: "del",
  AgentId: "agn",
  AgentRunId: "arn",
  AgentStepId: "ast",
  AutomationId: "atm",
  AutomationRunId: "atr",
  AutomationEventId: "ate",
  AutomationStepId: "ats",
  EventId: "evt",
  ManifestId: "man",
  ConnectorId: "con",
  CredentialId: "crd",
  SecretId: "sec",
  GrantId: "grn",
  AuditLogId: "aud",
  OutcomeId: "out",
  EvalSuiteId: "esu",
  EvalResultId: "ere",
  FactoryRunId: "fac",
  CasObjectId: "cas",
  BlobstoreRefId: "bls",
  WebhookInboundId: "whi",
  WorkspaceId: "wsp",
};

const mint = <B extends keyof typeof PREFIX>(brand: B): Brand<string, B> => {
  const prefix = PREFIX[brand];
  return `${prefix}_${randomUUID().replace(/-/g, "")}` as Brand<string, B>;
};

export const mintOrgId = (): OrgId => mint("OrgId") as OrgId;
export const mintUserId = (): UserId => mint("UserId") as UserId;
export const mintMembershipId = (): MembershipId => mint("MembershipId") as MembershipId;
export const mintDelegationId = (): DelegationId => mint("DelegationId") as DelegationId;
export const mintAgentId = (): AgentId => mint("AgentId") as AgentId;
export const mintAgentRunId = (): AgentRunId => mint("AgentRunId") as AgentRunId;
export const mintAgentStepId = (): AgentStepId => mint("AgentStepId") as AgentStepId;
export const mintAutomationId = (): AutomationId => mint("AutomationId") as AutomationId;
export const mintAutomationRunId = (): AutomationRunId => mint("AutomationRunId") as AutomationRunId;
export const mintAutomationEventId = (): AutomationEventId =>
  mint("AutomationEventId") as AutomationEventId;
export const mintAutomationStepId = (): AutomationStepId =>
  mint("AutomationStepId") as AutomationStepId;
export const mintEventId = (): EventId => mint("EventId") as EventId;
export const mintManifestId = (): ManifestId => mint("ManifestId") as ManifestId;
export const mintConnectorId = (): ConnectorId => mint("ConnectorId") as ConnectorId;
export const mintCredentialId = (): CredentialId => mint("CredentialId") as CredentialId;
export const mintSecretId = (): SecretId => mint("SecretId") as SecretId;
export const mintGrantId = (): GrantId => mint("GrantId") as GrantId;
export const mintAuditLogId = (): AuditLogId => mint("AuditLogId") as AuditLogId;
export const mintOutcomeId = (): OutcomeId => mint("OutcomeId") as OutcomeId;
export const mintEvalSuiteId = (): EvalSuiteId => mint("EvalSuiteId") as EvalSuiteId;
export const mintEvalResultId = (): EvalResultId => mint("EvalResultId") as EvalResultId;
export const mintFactoryRunId = (): FactoryRunId => mint("FactoryRunId") as FactoryRunId;
export const mintBlobstoreRefId = (): BlobstoreRefId => mint("BlobstoreRefId") as BlobstoreRefId;
export const mintWebhookInboundId = (): WebhookInboundId =>
  mint("WebhookInboundId") as WebhookInboundId;
export const mintWorkspaceId = (): WorkspaceId => mint("WorkspaceId") as WorkspaceId;

/** Cast an unbranded string to a brand. Use only at trust boundaries (DB read, API in). */
export const asBrand = <B extends string>(value: string): Brand<string, B> =>
  value as Brand<string, B>;
