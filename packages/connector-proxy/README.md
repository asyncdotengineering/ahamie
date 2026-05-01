# @ahamie/connector-proxy

The trust boundary. Standalone Hono process; **the only** code that decrypts credentials. Five non-negotiable invariants:

| | |
|---|---|
| **I1** | credentials resolved server-side; agent process never sees the raw token |
| **I2** | per-connector (method, path) allowlist; 403 on miss |
| **I3** | caller `Authorization` stripped before upstream forward |
| **I4** | response auth headers stripped before return |
| **I5** | HMAC-verified inbound webhooks; mismatch → 401 + audit row |

The CLI binary `ahamie-proxy` is spawned by `ahamie dev` as a child process so the agent runtime and the credential layer have separate process spaces.

```ts
import { createProxyApp } from "@ahamie/connector-proxy";
const app = createProxyApp({ db, bearer, credentialResolver, adapters });
```
