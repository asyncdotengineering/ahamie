# @ahamie/sdk

The public surface. Re-exports the right subset of `@ahamie/agent`, `@ahamie/automation`, `@ahamie/eval`, `@ahamie/outcomes`, and exposes `defineAhamieConfig`.

```ts
import { defineAhamieConfig } from "@ahamie/sdk";
export default defineAhamieConfig({ identity: { provider: "better-auth", organization: { enabled: true } }, storage: { url: process.env.AHAMIE_DB_URL! }});
```
