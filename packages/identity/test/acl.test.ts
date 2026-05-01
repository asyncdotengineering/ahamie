import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  mintMembershipId,
  mintOrgId,
  mintUserId,
  type OrgId,
  type UserId,
} from "@ahamie/schema";
import { memberships, organizations, users } from "@ahamie/storage";
import { startTestDb, type TestDbContext } from "@ahamie/storage/test-helpers";
import { createAcl, type AclChecker } from "../src/acl";

describe("@ahamie/identity ACL — RBAC defaults + cross-tenant denies", () => {
  let ctx: TestDbContext;
  let acl: AclChecker;
  let orgA: OrgId;
  let orgB: OrgId;
  let userA: UserId;

  beforeAll(async () => {
    ctx = await startTestDb();
    acl = createAcl(ctx.db);

    orgA = mintOrgId();
    orgB = mintOrgId();
    userA = mintUserId();

    await ctx.db.insert(organizations).values([
      { id: orgA, slug: "a", name: "A" },
      { id: orgB, slug: "b", name: "B" },
    ]);
    await ctx.db.insert(users).values({ id: userA, email: "u@a.dev" });
    await ctx.db.insert(memberships).values({
      id: mintMembershipId(),
      org_id: orgA,
      user_id: userA,
      role: "member",
    });
  });

  afterAll(async () => {
    await ctx?.stop();
  });

  it("member can read their own org's automation", async () => {
    const d = await acl.check(
      { kind: "user", id: userA, org_id: orgA },
      "read",
      { kind: "automation", id: "atm_x", org_id: orgA },
    );
    expect(d.allowed).toBe(true);
    expect(d.reason).toContain("role:member");
  });

  it("member cannot admin", async () => {
    const d = await acl.check(
      { kind: "user", id: userA, org_id: orgA },
      "admin",
      { kind: "automation", id: "atm_x", org_id: orgA },
    );
    expect(d.allowed).toBe(false);
  });

  it("denies cross-tenant access", async () => {
    const d = await acl.check(
      { kind: "user", id: userA, org_id: orgA },
      "read",
      { kind: "automation", id: "atm_x", org_id: orgB },
    );
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("cross-tenant");
  });

  it("rejects unknown resource kinds", async () => {
    const d = await acl.check(
      { kind: "user", id: userA, org_id: orgA },
      "read",
      { kind: "made-up" as never, id: "x", org_id: orgA },
    );
    expect(d.allowed).toBe(false);
  });
});
