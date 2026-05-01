/**
 * `secrets` — indirection rows pointing into `credentials`. Rotation
 * timestamps live here so we can dashboard "credentials older than X days"
 * without scanning the encrypted payload.
 */

import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { CredentialId, SecretId } from "@ahamie/schema";
import { brandedId, id, orgIdCol, timestamps } from "./columns";

export const secrets = pgTable(
  "secrets",
  {
    id: id().$type<SecretId>(),
    org_id: orgIdCol(),
    /** Logical name — e.g. `slack-prod-webhook-secret`. */
    name: text("name").notNull(),
    /** What this secret is for: `connector`, `webhook`, `signing`, `byok`. */
    purpose: text("purpose").notNull(),
    /** The credential row this secret points at. Null for non-credential secrets. */
    credential_id: text("credential_id").$type<CredentialId>(),
    rotated_at: timestamp("rotated_at", { withTimezone: true, mode: "date" }),
    next_rotation_at: timestamp("next_rotation_at", { withTimezone: true, mode: "date" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("secrets_org_name_idx").on(t.org_id, t.name),
    index("secrets_rotation_idx").on(t.org_id, t.next_rotation_at),
  ],
);

export type Secret = typeof secrets.$inferSelect;
