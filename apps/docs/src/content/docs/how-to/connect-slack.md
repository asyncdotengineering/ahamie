---
title: Connect Slack via the proxy
description: Wire up @ahamie/connector-slack so the agent can read a channel without ever touching the Slack token.
---

## Goal

Let an agent read messages from `#engineering` via Slack's API. The token never leaves the proxy process.

## Steps

### 1. Add the adapter

```bash
pnpm add @ahamie/connector-slack
```

### 2. Register it on the proxy

```ts
// proxy.config.ts
import { slackAdapter } from "@ahamie/connector-slack";
export default { adapters: [slackAdapter] };
```

### 3. OAuth dance

```bash
ahamie connect slack
```

Opens the OAuth consent in the browser. The resulting token is encrypted with `AHAMIE_KMS_KEY_B64` and written to `credentials`. Only the proxy decrypts.

### 4. Reference the channel from your agent

```ts
import { defineAgent } from "@ahamie/agent";
import { slackConnector } from "@ahamie/connector-slack";

export const summarizer = defineAgent({
  /* … */
  scope: { org: "$ORG_ID", connectors: [slackConnector.read("#engineering")] },
});
```

### 5. Verify

```bash
psql -d ahamie -c "SELECT id, provider, slug, created_at FROM connectors;"
psql -d ahamie -c "SELECT action, outcome, redaction_safe FROM audit_log ORDER BY occurred_at DESC LIMIT 5;"
```

You should see `proxy.forward` rows with no token in `redaction_safe` (I1).

## Pitfalls

- **`SLACK_SIGNING_SECRET` not set.** Inbound webhooks fail with `401 hmac_mismatch`. Set the env var before booting `ahamie dev`.
- **Token leaks into stack traces.** Impossible by construction — the agent process never receives the token, only the proxy does.
