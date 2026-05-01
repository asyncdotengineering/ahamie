# @ahamie/schema

Standard-Schema-conformant Zod re-export with branded ID types (T19 L1 tenant enforcement) and common refinements (`Email`, `Url`, `Slug`, `ConnectorRef`, `CronExpr`, `UsdAmount`, `Iso8601`, `Sha256Hex`).

Every other `@ahamie/*` package depends on this one.

```ts
import { z, mintOrgId, type OrgId, Email, Slug } from "@ahamie/schema";

const orgId: OrgId = mintOrgId();          // "org_<32-hex>"
const userInput = z.object({ email: Email, slug: Slug });
```
