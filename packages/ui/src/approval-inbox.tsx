import * as React from "react";
import type { ApprovalItem } from "./types";

export interface ApprovalInboxProps {
  items: ApprovalItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const useApprovalInbox = (items: ApprovalItem[]) => {
  const sorted = React.useMemo(
    () => [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [items],
  );
  return { sorted };
};

export const ApprovalInbox: React.FC<ApprovalInboxProps> = ({ items, onApprove, onReject }) => {
  const { sorted } = useApprovalInbox(items);
  if (sorted.length === 0) {
    return <p>Nothing waiting on you. Good.</p>;
  }
  return (
    <ul className="ahamie-approval-inbox" style={{ listStyle: "none", padding: 0 }}>
      {sorted.map((item) => (
        <li key={item.id} style={{ borderBottom: "1px solid var(--ahamie-border, #ddd)" }}>
          <div>
            <strong>{item.automationId}</strong>
            <p>{item.reason}</p>
            <button type="button" onClick={() => onApprove(item.id)}>Approve</button>
            <button type="button" onClick={() => onReject(item.id)}>Reject</button>
          </div>
        </li>
      ))}
    </ul>
  );
};
