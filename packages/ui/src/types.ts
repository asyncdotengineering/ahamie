/** Shared types — every primitive is fed an instance of one of these. */

export interface AgentStepView {
  id: string;
  sequence: number;
  kind: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  costUsd?: number;
  tokens?: { in: number; out: number };
}

export interface AgentRunView {
  id: string;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled" | "paused";
  startedAt?: string;
  finishedAt?: string;
  costUsd?: number;
  tokensTotal?: number;
  steps: AgentStepView[];
}

export interface ApprovalItem {
  id: string;
  automationId: string;
  reason: string;
  createdAt: string;
}

export interface ConnectorSetupValue {
  provider: string;
  scopes: string[];
}
