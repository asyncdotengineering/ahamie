/**
 * Audit writer for the proxy. Every forward / grant / revoke / webhook
 * lands in `audit_log`. Writes go through `assertRedactionSafe()` so we
 * cannot accidentally leak a secret into an indexed jsonb field.
 */

import type { OrgId } from "@ahamie/schema";
import { mintAuditLogId } from "@ahamie/schema";
import { audit_log, type AhamieDb } from "@ahamie/storage";
import { assertRedactionSafe } from "./invariants";

export interface AuditRow {
  orgId: OrgId;
  source: string;
  action: string;
  outcome: "success" | "denied" | "error";
  resource_kind?: string;
  resource_id?: string;
  subject_kind?: string;
  subject_id?: string;
  redaction_safe: Record<string, unknown>;
}

export const writeAudit = async (db: AhamieDb, row: AuditRow): Promise<void> => {
  assertRedactionSafe(row.redaction_safe);
  await db.insert(audit_log).values({
    id: mintAuditLogId(),
    org_id: row.orgId,
    source: row.source,
    action: row.action,
    outcome: row.outcome,
    resource_kind: row.resource_kind ?? null,
    resource_id: row.resource_id ?? null,
    subject_kind: row.subject_kind ?? null,
    subject_id: row.subject_id ?? null,
    redaction_safe: row.redaction_safe,
  });
};
