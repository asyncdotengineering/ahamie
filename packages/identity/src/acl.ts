/**
 * ACL — `check(subject, action, resource)` returning `{ allowed, reason }`.
 *
 * v0 enforces eight resource kinds (per W2 deliverable):
 *   project, automation, app, connector, credential, manifest, run, snapshot
 *
 * Resolution order:
 *   1. Explicit ACL row (`acls`) for (subject, resource_kind, resource_id, perm)
 *   2. Membership-role default (owner / admin / member / viewer)
 *   3. Deny.
 *
 * Why not just RBAC? Because the closed-loop world has plenty of cases
 * where Bob can read run X but not run Y, and we don't want to model that
 * as 50 micro-roles. We keep RBAC as the *default* and ACL rows as the
 * targeted exception.
 */

import { and, eq } from "drizzle-orm";
import type { OrgId, UserId } from "@ahamie/schema";
import { acls, memberships, type AhamieDb } from "@ahamie/storage";

export type SubjectKind = "user" | "agent" | "membership";
export type ResourceKind =
  | "project"
  | "automation"
  | "app"
  | "connector"
  | "credential"
  | "manifest"
  | "run"
  | "snapshot";
export type Permission = "read" | "write" | "invoke" | "admin";
export type Role = "owner" | "admin" | "member" | "viewer";

export interface AclSubject {
  kind: SubjectKind;
  id: string;
  /** For users, the orgs they belong to + role; resolved at request time. */
  org_id: OrgId;
}

export interface AclResource {
  kind: ResourceKind;
  id: string;
  org_id: OrgId;
}

export interface AclDecision {
  allowed: boolean;
  reason: string;
}

const ROLE_GRANTS: Record<Role, Set<Permission>> = {
  owner: new Set(["read", "write", "invoke", "admin"]),
  admin: new Set(["read", "write", "invoke", "admin"]),
  member: new Set(["read", "write", "invoke"]),
  viewer: new Set(["read"]),
};

const ALLOWED_RESOURCE_KINDS: Set<ResourceKind> = new Set([
  "project",
  "automation",
  "app",
  "connector",
  "credential",
  "manifest",
  "run",
  "snapshot",
]);

export interface AclChecker {
  check(subject: AclSubject, permission: Permission, resource: AclResource): Promise<AclDecision>;
}

export const createAcl = (db: AhamieDb): AclChecker => ({
  async check(subject, permission, resource): Promise<AclDecision> {
    if (subject.org_id !== resource.org_id) {
      return { allowed: false, reason: "cross-tenant" };
    }
    if (!ALLOWED_RESOURCE_KINDS.has(resource.kind)) {
      return { allowed: false, reason: `unknown resource kind: ${resource.kind}` };
    }

    const aclRows = await db
      .select()
      .from(acls)
      .where(
        and(
          eq(acls.org_id, subject.org_id),
          eq(acls.subject_kind, subject.kind),
          eq(acls.subject_id, subject.id),
          eq(acls.resource_kind, resource.kind),
          eq(acls.resource_id, resource.id),
          eq(acls.permission, permission),
        ),
      )
      .limit(1);
    if (aclRows.length > 0) {
      return { allowed: true, reason: "explicit-acl" };
    }

    if (subject.kind === "user") {
      const memRows = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.org_id, subject.org_id),
            eq(memberships.user_id, subject.id as UserId),
          ),
        )
        .limit(1);
      const role = memRows[0]?.role as Role | undefined;
      if (role && ROLE_GRANTS[role].has(permission)) {
        return { allowed: true, reason: `role:${role}` };
      }
    }

    return { allowed: false, reason: "no-grant" };
  },
});
