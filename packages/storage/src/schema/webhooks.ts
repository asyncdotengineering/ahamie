/**
 * `webhooks_inbound` — delivered + pending HMAC-verified inbound deliveries.
 *
 * Two purposes:
 *   1. Dedupe — each provider's `delivery_id` is `UNIQUE(org_id, provider, delivery_id)`.
 *   2. Audit — every inbound webhook is recorded with its HMAC verification
 *      result, so a failed delivery has a forensic record (I5).
 */

import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { WebhookInboundId } from "@ahamie/schema";
import { id, orgIdCol, sql, timestamps } from "./columns";

export const webhooks_inbound = pgTable(
  "webhooks_inbound",
  {
    id: id().$type<WebhookInboundId>(),
    org_id: orgIdCol(),
    provider: text("provider").notNull(),
    delivery_id: text("delivery_id").notNull(),
    hmac_verified: boolean("hmac_verified").notNull(),
    /** Result: `accepted`, `rejected_hmac`, `rejected_replay`, `rejected_unknown`. */
    result: text("result").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    received_at: timestamp("received_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("webhooks_inbound_dedupe_idx").on(t.org_id, t.provider, t.delivery_id),
    index("webhooks_inbound_received_idx").on(t.org_id, t.received_at),
  ],
);

export type WebhookInbound = typeof webhooks_inbound.$inferSelect;
