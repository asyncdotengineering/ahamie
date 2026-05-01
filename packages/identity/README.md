# @ahamie/identity

Better-Auth wrapper + ACL + Hono tenant middleware.

```ts
import { createAuth, requireOrg, createAcl } from "@ahamie/identity";

const auth = createAuth({
  db,
  baseUrl: "http://localhost:3000",
  secret: process.env.AUTH_SECRET!,
});

app.use(requireOrg(auth));
const acl = createAcl(db);
const decision = await acl.check(
  { kind: "user", id: u, org_id: o },
  "write",
  { kind: "automation", id: "atm_x", org_id: o },
);
```

The escape-hatch interface (`AhamieAuth`) lets v1 swap to Authentik / Keycloak adapters without touching app code.
