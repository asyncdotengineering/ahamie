/**
 * CAS + blobstore-ref tables. The actual bytes live in `@ahamie/blobstore`
 * (or its S3-compat sibling at v1); these tables are the relational index.
 */

import { bigint, index, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import type { BlobstoreRefId } from "@ahamie/schema";
import { id, orgIdCol, timestamps } from "./columns";

export const cas_objects = pgTable(
  "cas_objects",
  {
    /** sha256 hex; global content + per-org `source_org_id` row in metadata. */
    sha256: text("sha256").primaryKey().notNull(),
    /** Recorded for the row; bytes are deduped. */
    source_org_id: orgIdCol(),
    size: bigint("size", { mode: "number" }).notNull(),
    parents: jsonb("parents").$type<string[]>().notNull().default([]),
    ...timestamps(),
  },
  (t) => [index("cas_objects_org_idx").on(t.source_org_id, t.created_at)],
);

export const blobstore_refs = pgTable(
  "blobstore_refs",
  {
    id: id().$type<BlobstoreRefId>(),
    org_id: orgIdCol(),
    /** The full blobstore key. */
    key: text("key").notNull(),
    /** What this ref *means*: `snapshot`, `eval-fixture`, `manifest-bundle`, … */
    blob_kind: text("blob_kind").notNull(),
    /** Optional opaque ref the consumer wants to track (e.g. snapshot id). */
    ref: text("ref"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("blobstore_refs_unique_idx").on(t.org_id, t.key),
    index("blobstore_refs_kind_idx").on(t.org_id, t.blob_kind, t.created_at),
  ],
);

export type CasObject = typeof cas_objects.$inferSelect;
export type BlobstoreRef = typeof blobstore_refs.$inferSelect;
