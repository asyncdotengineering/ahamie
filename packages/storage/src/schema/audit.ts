/**
 * Audit log — per-call rows from the proxy + auth + automation.
 *
 * Append-only. The `redaction_safe` field is the **only** field that may be
 * indexed for SIEM exports; raw payloads stay encrypted at rest in v1.
 *
 * Invariants enforced by writers (not by the table):
 *   - Proxy writes never include the bearer token (I1, I3, I4).
 *   - HMAC verification rows include `verified: bool`, never the secret (I5).
 */

import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { AuditLogId } from "@ahamie/schema";
import { id, orgIdCol, sql, timestamps } from "./columns";

export const audit_log = pgTable(
  "audit_log",
  {
    id: id().$type<AuditLogId>(),
    org_id: orgIdCol(),
    /** Source: `proxy`, `auth`, `automation`, `factory`, `cli`, `api`. */
    source: text("source").notNull(),
    /** Verb: e.g. `proxy.forward`, `auth.session.create`, `automation.run.start`. */
    action: text("action").notNull(),
    /** Optional resource the action touched. */
    resource_kind: text("resource_kind"),
    resource_id: text("resource_id"),
    /** Subject who acted (user, agent, service). */
    subject_kind: text("subject_kind"),
    subject_id: text("subject_id"),
    /** `success`, `denied`, `error`. */
    outcome: text("outcome").notNull(),
    /**
     * Only fields that have been confirmed safe to log. Tokens, raw request
     * bodies, etc. MUST NOT land here.
     */
    redaction_safe: jsonb("redaction_safe").$type<Record<string, unknown>>().notNull(),
    occurred_at: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...timestamps(),
  },
  (t) => [
    index("audit_log_org_occurred_idx").on(t.org_id, t.occurred_at),
    index("audit_log_action_idx").on(t.org_id, t.action, t.occurred_at),
  ],
);

export type AuditLog = typeof audit_log.$inferSelect;
