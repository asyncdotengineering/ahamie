/**
 * The reference app's landing page mounts the Ahamie UI primitives.
 * In a real deployment this is a Next.js / Astro / Remix `page.tsx`.
 */

import { AgentRunTree, ApprovalInbox } from "@ahamie/ui";
import type { AgentRunView, ApprovalItem } from "@ahamie/ui";
import * as React from "react";

const sampleRun: AgentRunView = {
  id: "arn_demo",
  status: "succeeded",
  costUsd: 0.04,
  tokensTotal: 800,
  steps: [
    { id: "ast_1", sequence: 0, kind: "tool.call", payload: { tool: "slack.search" }, occurredAt: new Date().toISOString() },
    { id: "ast_2", sequence: 1, kind: "assistant.message", payload: { text: "draft" }, occurredAt: new Date().toISOString() },
  ],
};

const sampleApprovals: ApprovalItem[] = [];

export default function Page(): React.ReactElement {
  return (
    <main>
      <h1>my-brain</h1>
      <AgentRunTree run={sampleRun} />
      <ApprovalInbox items={sampleApprovals} onApprove={() => {}} onReject={() => {}} />
    </main>
  );
}
