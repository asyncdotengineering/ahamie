/**
 * AgentRunTree — render the step tree for a single AgentRun.
 * Headless logic in `useAgentRunTree`; presentation in JSX with CSS-vars.
 */

import * as React from "react";
import type { AgentRunView } from "./types";

export interface AgentRunTreeProps {
  run: AgentRunView;
  /** Click handler for individual steps. */
  onSelectStep?: (stepId: string) => void;
}

export const useAgentRunTree = (run: AgentRunView) => {
  const sorted = React.useMemo(
    () => [...run.steps].sort((a, b) => a.sequence - b.sequence),
    [run.steps],
  );
  return { sorted, totalCost: run.costUsd ?? 0, totalTokens: run.tokensTotal ?? 0 };
};

export const AgentRunTree: React.FC<AgentRunTreeProps> = ({ run, onSelectStep }) => {
  const { sorted, totalCost, totalTokens } = useAgentRunTree(run);
  return (
    <div
      role="tree"
      aria-label={`agent run ${run.id}`}
      className="ahamie-agent-run-tree"
      style={{
        fontFamily: "var(--ahamie-font-mono, ui-monospace, monospace)",
        color: "var(--ahamie-fg, #111)",
      }}
    >
      <header style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <strong>{run.id}</strong>
        <span aria-label="status">[{run.status}]</span>
        <span>· ${totalCost.toFixed(4)}</span>
        <span>· {totalTokens} tokens</span>
      </header>
      <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {sorted.map((step) => (
          <li key={step.id} role="treeitem">
            <button
              type="button"
              onClick={() => onSelectStep?.(step.id)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "4px 8px" }}
            >
              <code>{step.sequence.toString().padStart(2, "0")}</code> · {step.kind} ·{" "}
              <small>{step.occurredAt}</small>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};
