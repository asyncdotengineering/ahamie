/**
 * `@ahamie/sandbox-compute-sdk` — opt-in cloud sandboxes (e2b / Modal /
 * Daytona) wired through `@mastra/workspace-sandbox-computesdk`.
 *
 * v0 ships only the contract — adopters install one of the underlying
 * vendors and pass the credentials through `provider.config`.
 */

export type ComputeProvider = "e2b" | "modal" | "daytona";

export interface ComputeSandboxConfig {
  provider: ComputeProvider;
  apiKey?: string;
  region?: string;
  template?: string;
}

export const provisionDescriptor = (cfg: ComputeSandboxConfig): { provider: ComputeProvider; descriptor: Record<string, unknown> } => ({
  provider: cfg.provider,
  descriptor: { ...cfg },
});
