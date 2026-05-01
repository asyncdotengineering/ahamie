/**
 * Identity + tenancy tables.
 *
 * - `organizations` is the tenant boundary (Better-Auth `organization`).
 * - `users` is global (a user can belong to many orgs).
 * - `memberships` is the (user, org, role) join.
 * - `delegations` is the agent-on-behalf-of(user) edge — clearer audit than
 *   tagging the agent as the actor.
 * - `acls` is the optional per-resource ACL beyond role-based defaults.
 * - `platform_identities` is the identity-graph edge set
 *   (e.g. `slack:U07…` ≡ `github:author@example.com`).
 */

import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { brandedId, id, orgIdCol, sql, timestamps } from "./columns";
import type {
  DelegationId,
  MembershipId,
  OrgId,
  UserId,
} from "@ahamie/schema";

export const organizations = pgTable(
  "organizations",
  {
    id: id().$type<OrgId>(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps(),
  },
  (t) => [uniqueIndex("organizations_slug_idx").on(t.slug)],
);

export const users = pgTable(
  "users",
  {
    id: id().$type<UserId>(),
    email: text("email").notNull(),
    name: text("name"),
    image: text("image"),
    email_verified: boolean("email_verified").notNull().default(false),
    ...timestamps(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: id().$type<MembershipId>(),
    org_id: orgIdCol(),
    user_id: brandedId<UserId>("user_id"),
    role: text("role", { enum: ["owner", "admin", "member", "viewer"] })
      .notNull()
      .default("member"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("memberships_org_user_idx").on(t.org_id, t.user_id),
    index("memberships_org_idx").on(t.org_id, t.created_at),
  ],
);

export const delegations = pgTable(
  "delegations",
  {
    id: id().$type<DelegationId>(),
    org_id: orgIdCol(),
    /** The human the agent is acting on behalf of. */
    user_id: brandedId<UserId>("user_id"),
    /** The agent definition acting. */
    agent_id: text("agent_id").notNull(),
    /** Free-form scope for now (e.g. `["slack.read"]`); typed at v1. */
    scope: jsonb("scope").$type<string[]>().notNull().default([]),
    expires_at: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    ...timestamps(),
  },
  (t) => [index("delegations_org_user_idx").on(t.org_id, t.user_id)],
);

export const acls = pgTable(
  "acls",
  {
    id: id(),
    org_id: orgIdCol(),
    subject_kind: text("subject_kind", { enum: ["user", "agent", "membership"] }).notNull(),
    subject_id: text("subject_id").notNull(),
    resource_kind: text("resource_kind", {
      enum: [
        "project",
        "automation",
        "app",
        "connector",
        "credential",
        "manifest",
        "run",
        "snapshot",
      ],
    }).notNull(),
    resource_id: text("resource_id").notNull(),
    permission: text("permission", { enum: ["read", "write", "invoke", "admin"] }).notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("acls_unique_idx").on(
      t.org_id,
      t.subject_kind,
      t.subject_id,
      t.resource_kind,
      t.resource_id,
      t.permission,
    ),
    index("acls_lookup_idx").on(t.org_id, t.resource_kind, t.resource_id),
  ],
);

export const platform_identities = pgTable(
  "platform_identities",
  {
    id: id(),
    org_id: orgIdCol(),
    user_id: brandedId<UserId>("user_id"),
    /** e.g. "slack", "github", "linear", "gmail". */
    provider: text("provider").notNull(),
    /** Provider-side ID (e.g. Slack `U07…`). */
    external_id: text("external_id").notNull(),
    /** Optional display name on that platform. */
    display: text("display"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("platform_identities_provider_external_idx").on(
      t.org_id,
      t.provider,
      t.external_id,
    ),
    index("platform_identities_user_idx").on(t.org_id, t.user_id),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Delegation = typeof delegations.$inferSelect;
export type Acl = typeof acls.$inferSelect;
export type PlatformIdentity = typeof platform_identities.$inferSelect;
