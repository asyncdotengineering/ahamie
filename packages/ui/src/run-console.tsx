import * as React from "react";

export interface RunConsoleProps {
  /** SSE/WS stream of step events. v0 accepts an EventTarget; production wires to /api/runs/:id/stream. */
  source?: EventTarget;
  /** Initial buffer (when reconnecting). */
  initial?: string[];
}

export const useRunConsole = (props: RunConsoleProps) => {
  const [lines, setLines] = React.useState<string[]>(props.initial ?? []);
  React.useEffect(() => {
    if (!props.source) return;
    const handler = (e: Event) => {
      const data = (e as MessageEvent).data as string;
      setLines((p) => [...p, data].slice(-5000));
    };
    props.source.addEventListener("message", handler);
    return () => props.source?.removeEventListener("message", handler);
  }, [props.source]);
  return { lines };
};

export const RunConsole: React.FC<RunConsoleProps> = (props) => {
  const { lines } = useRunConsole(props);
  return (
    <pre
      role="log"
      aria-live="polite"
      className="ahamie-run-console"
      style={{
        background: "var(--ahamie-bg-elevated, #0b0b0c)",
        color: "var(--ahamie-fg-inverse, #d8d8d9)",
        padding: 12,
        fontFamily: "var(--ahamie-font-mono, ui-monospace, monospace)",
        whiteSpace: "pre-wrap",
        overflow: "auto",
      }}
    >
      {lines.join("\n")}
    </pre>
  );
};
