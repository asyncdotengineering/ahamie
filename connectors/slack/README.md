# @ahamie/connector-slack

Slack adapter for the Ahamie connector proxy. ~50-LOC body — all trust-boundary mechanics (I1-I5) live in `@ahamie/connector-proxy`.

```ts
import { slackAdapter, slackConnector } from "@ahamie/connector-slack";
const cfg = { ..., adapters: [slackAdapter] };
```
