import * as React from "react";
import type { ConnectorSetupValue } from "./types";

export interface ConnectorSetupProps {
  provider: string;
  /** Scopes the manifest is asking for. */
  requestedScopes: string[];
  onConfirm: (value: ConnectorSetupValue) => void;
  onCancel: () => void;
}

export const ConnectorSetup: React.FC<ConnectorSetupProps> = ({
  provider,
  requestedScopes,
  onConfirm,
  onCancel,
}) => {
  return (
    <form
      className="ahamie-connector-setup"
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm({ provider, scopes: requestedScopes });
      }}
    >
      <h2>Connect {provider}</h2>
      <p>The following scopes will be granted:</p>
      <ul>
        {requestedScopes.map((s) => (
          <li key={s}>
            <code>{s}</code>
          </li>
        ))}
      </ul>
      <button type="submit">Authorize</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
};
