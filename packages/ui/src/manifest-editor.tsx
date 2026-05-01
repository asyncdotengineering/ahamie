import * as React from "react";

export interface ManifestEditorProps {
  initial?: string;
  onSave: (canonicalJson: string) => void;
}

export const ManifestEditor: React.FC<ManifestEditorProps> = ({ initial, onSave }) => {
  const [text, setText] = React.useState(initial ?? "{}");
  const [err, setErr] = React.useState<string | null>(null);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(text);
      const canonical = JSON.stringify(parsed, Object.keys(parsed).sort(), 2);
      setErr(null);
      onSave(canonical);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="ahamie-manifest-editor">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={20}
        cols={80}
        style={{ fontFamily: "var(--ahamie-font-mono, monospace)", width: "100%" }}
      />
      {err && <p role="alert" style={{ color: "var(--ahamie-error, crimson)" }}>{err}</p>}
      <button type="button" onClick={handleSave}>Save</button>
    </div>
  );
};
