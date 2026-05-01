/**
 * Shared column factories. Every tenant-scoped row carries `org_id` (T19);
 * we centralize the column factory here so we cannot forget it.
 *
 * Branded types from `@ahamie/schema/brand` are applied via `.$type<T>()`
 * casts so a Drizzle row's `org_id` is statically `OrgId`, not raw `string`.
 * That's the L1 enforcement the plan calls out in W2.
 */

import type {
  AgentId,
  AgentRunId,
  AutomationId,
  AutomationRunId,
  CredentialId,
  ManifestId,
  OrgId,
  UserId,
} from "@ahamie/schema";
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  type PgTableExtraConfigValue,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Primary key column shaped for branded IDs. */
export const id = (name = "id") => text(name).primaryKey().notNull();

/** Tenant-scoped FK column (T19 L1). */
export const orgIdCol = () =>
  text("org_id")
    .$type<OrgId>()
    .notNull();

/** Standard created_at / updated_at columns with default `now()`. */
export const timestamps = () => ({
  created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
});

/** Branded text column for any of the framework's ID kinds. */
export const brandedId = <B extends string>(name: string) => text(name).$type<B>().notNull();

/** Re-export the kit so schema files only import from this module. */
export { jsonb, pgTable, text, timestamp, uuid, index, sql };
export type { PgTableExtraConfigValue };

// Type aliases re-exported for convenience in schema files.
export type {
  AgentId,
  AgentRunId,
  AutomationId,
  AutomationRunId,
  CredentialId,
  ManifestId,
  OrgId,
  UserId,
};
