/**
 * `@ahamie/identity` — Better-Auth wrapper.
 *
 * Default identity provider for Ahamie. Plugins enabled by default
 * (per W2 deliverable + T10):
 *   - organization (T19 — tenant from day 1)
 *   - magicLink
 *   - passkey
 *   - twoFactor
 *   - bearer (machine + service tokens)
 *   - multiSession (per-tab orgs)
 *
 * **The escape hatch.** Teams that already run Authentik / Keycloak / Cognito
 * implement the `@ahamie/identity` adapter contract (`AhamieAuth` interface
 * below) and swap the import. Better-Auth then becomes optional.
 */

import { betterAuth } from "better-auth";
import {
  bearer,
  magicLink,
  multiSession,
  organization,
  twoFactor,
} from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { AhamieDb } from "@ahamie/storage";

export interface CreateAuthOptions {
  db: AhamieDb;
  /** Public-facing base URL of the auth API; e.g. `http://localhost:3000`. */
  baseUrl: string;
  /** Server secret. Used for cookie signing + JWT signing. */
  secret: string;
  /** Send-magic-link side-effect; defaults to console.log for dev. */
  sendMagicLink?: (input: { email: string; url: string; token: string }) => Promise<void> | void;
  /** Enable passkey plugin. Default true. */
  enablePasskey?: boolean;
}

export interface SessionShape {
  user: { id: string; email: string };
  session: {
    id: string;
    activeOrganizationId: string | null;
    activeOrganizationRole?: string | null;
  };
}

/**
 * The minimal contract Ahamie needs from any identity provider. Better-Auth
 * is the v0 default; v1 ships `@ahamie/identity-authentik` and
 * `@ahamie/identity-keycloak`, both of which return this same shape.
 */
export interface AhamieAuth {
  handler(request: Request): Promise<Response>;
  getSession(headers: Headers): Promise<SessionShape | null>;
  /** Lower-level: the underlying provider object, for power users. */
  raw: unknown;
}

export const createAuth = (opts: CreateAuthOptions): AhamieAuth => {
  const sendMagic =
    opts.sendMagicLink ??
    (({ email, url }) => {
      // eslint-disable-next-line no-console
      console.log(`[ahamie/identity] magic link for ${email}: ${url}`);
    });

  const ba = betterAuth({
    baseURL: opts.baseUrl,
    secret: opts.secret,
    database: drizzleAdapter(opts.db, { provider: "pg" }),
    emailAndPassword: { enabled: false },
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
        membershipLimit: 1000,
      }),
      magicLink({
        sendMagicLink: async (params) => {
          await sendMagic(params);
        },
      }),
      twoFactor(),
      bearer(),
      multiSession({ maximumSessions: 5 }),
    ],
  });

  return {
    handler: (request: Request) => ba.handler(request),
    async getSession(headers: Headers): Promise<SessionShape | null> {
      const session = await ba.api.getSession({ headers });
      if (!session?.user || !session.session) return null;
      return {
        user: { id: session.user.id, email: session.user.email },
        session: {
          id: session.session.id,
          activeOrganizationId:
            (session.session as { activeOrganizationId?: string | null }).activeOrganizationId ??
            null,
          activeOrganizationRole:
            (session.session as { activeOrganizationRole?: string | null })
              .activeOrganizationRole ?? null,
        },
      };
    },
    raw: ba,
  };
};

export { createAcl } from "./acl";
export type {
  AclChecker,
  AclDecision,
  AclResource,
  AclSubject,
  Permission,
  ResourceKind,
  Role,
  SubjectKind,
} from "./acl";
export { requireOrg, mountAuth, type AhamieAuthContext } from "./middleware";
