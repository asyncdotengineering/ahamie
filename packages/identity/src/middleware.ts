/**
 * Hono middleware for L2 tenant enforcement (T19): every protected route
 * MUST carry an `org_id` claim resolvable from the session. If absent → 401.
 *
 * Used by `@ahamie/connector-proxy` and the app's ORPC router. The `auth`
 * argument is the `AhamieAuth` instance returned from `createAuth()`.
 */

import type { Context, MiddlewareHandler } from "hono";
import type { OrgId } from "@ahamie/schema";
import type { AhamieAuth } from "./index";

export interface AhamieAuthContext {
  user_id: string;
  org_id: OrgId;
  role: string;
  session_id: string;
}

declare module "hono" {
  interface ContextVariableMap {
    ahamie_auth: AhamieAuthContext;
  }
}

export const requireOrg =
  (auth: AhamieAuth): MiddlewareHandler =>
  async (c: Context, next) => {
    const session = await auth.getSession(c.req.raw.headers);
    if (!session?.user) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const orgId = session.session.activeOrganizationId as OrgId | null | undefined;
    if (!orgId) {
      return c.json({ error: "no_active_org" }, 401);
    }
    const role = (session.session.activeOrganizationRole as string | undefined) ?? "member";
    c.set("ahamie_auth", {
      user_id: session.user.id,
      org_id: orgId,
      role,
      session_id: session.session.id,
    });
    await next();
  };

/** Mounts Better-Auth's own routes (`/api/auth/*`) on the Hono app. */
export const mountAuth =
  (auth: AhamieAuth, basePath = "/api/auth"): MiddlewareHandler =>
  async (c, next) => {
    if (!c.req.path.startsWith(basePath)) return next();
    const res = await auth.handler(c.req.raw);
    return new Response(res.body, {
      status: res.status,
      headers: res.headers,
    });
  };
