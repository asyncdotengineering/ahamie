/**
 * Manifest, connector, credential, grant tables.
 *
 * - `manifests`: app manifests, content-addressed (the hash is global; the
 *   `org_id` records who installed it).
 * - `connectors`: adapter registrations (per-org; e.g. "Slack workspace `T01`").
 * - `credentials`: encrypted OAuth/API key blobs. Only the **proxy**
 *   process reads these. The agent process never sees a raw token (I1).
 * - `connector_grants`: (app_instance, connector, scopes, grant_id) — the
 *   join that makes "this app may invoke `slack.chat.postMessage` with
 *   scope `chat:write` on connector `con_…`" auditable.
 */

import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type {
  ConnectorId,
  CredentialId,
  GrantId,
  ManifestId,
} from "@ahamie/schema";
import { brandedId, id, orgIdCol, timestamps } from "./columns";

export const manifests = pgTable(
  "manifests",
  {
    id: id().$type<ManifestId>(),
    org_id: orgIdCol(),
    /** sha256 hex of the canonical manifest bytes. */
    content_hash: text("content_hash").notNull(),
    slug: text("slug").notNull(),
    version: text("version").notNull(),
    /** The manifest itself (typed at v1; jsonb at v0). */
    document: jsonb("document").$type<Record<string, unknown>>().notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("manifests_content_hash_idx").on(t.content_hash),
    uniqueIndex("manifests_org_slug_version_idx").on(t.org_id, t.slug, t.version),
  ],
);

export const connectors = pgTable(
  "connectors",
  {
    id: id().$type<ConnectorId>(),
    org_id: orgIdCol(),
    /** e.g. "slack", "github", "linear". */
    provider: text("provider").notNull(),
    /** Per-tenant slug ("slack-prod" vs "slack-dev"). */
    slug: text("slug").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    /** Currently held credential — opaque ID, points to `credentials`. */
    credential_id: text("credential_id").$type<CredentialId>(),
    ...timestamps(),
  },
  (t) => [uniqueIndex("connectors_org_slug_idx").on(t.org_id, t.slug)],
);

export const credentials = pgTable(
  "credentials",
  {
    id: id().$type<CredentialId>(),
    org_id: orgIdCol(),
    connector_id: brandedId<ConnectorId>("connector_id"),
    kind: text("kind", { enum: ["oauth", "api_key", "mcp", "webhook"] }).notNull(),
    /**
     * Encrypted blob. The proxy decrypts on demand using a key from a KMS
     * (v0: `.env`-injected; v1: HashiCorp Vault adapter). `bytea` in
     * Postgres; we model it as text storing base64 for simplicity at v0.
     */
    ciphertext_b64: text("ciphertext_b64").notNull(),
    /** Per-row salt / IV / nonce fields (jsonb so encryption schemes can vary). */
    encryption_meta: jsonb("encryption_meta").$type<Record<string, unknown>>().notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    rotated_at: timestamp("rotated_at", { withTimezone: true, mode: "date" }),
    ...timestamps(),
  },
  (t) => [index("credentials_connector_idx").on(t.connector_id, t.created_at)],
);

export const connector_grants = pgTable(
  "connector_grants",
  {
    id: id().$type<GrantId>(),
    org_id: orgIdCol(),
    /** Which manifest install received the grant. */
    manifest_id: brandedId<ManifestId>("manifest_id"),
    connector_id: brandedId<ConnectorId>("connector_id"),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    revoked_at: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("connector_grants_unique_idx").on(t.org_id, t.manifest_id, t.connector_id),
  ],
);

export type Manifest = typeof manifests.$inferSelect;
export type Connector = typeof connectors.$inferSelect;
export type Credential = typeof credentials.$inferSelect;
export type ConnectorGrant = typeof connector_grants.$inferSelect;
