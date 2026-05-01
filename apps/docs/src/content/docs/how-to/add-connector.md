---
title: Add a new connector adapter
description: Ship a new third-party connector in ~50 LOC.
---

The trust-boundary mechanics live in `@ahamie/connector-proxy`. A new adapter only declares **what the connector is** — its allowlist, its OAuth scopes, its webhook signature scheme.

## Skeleton

```ts
import type { ProxyAdapterRegistration } from "@ahamie/connector-proxy";

export const myAdapter: ProxyAdapterRegistration = {
  provider: "myprovider",
  baseUrl: "https://api.myprovider.com",
  authMode: "bearer", // or { header: "X-Token" }
  allowlist: [
    { method: "GET",  pathPattern: "/v1/things/:id" },
    { method: "POST", pathPattern: "/v1/things" },
  ],
  inbound: {
    signatureHeader: "x-myprovider-signature",
    secretEnvVar: "MYPROVIDER_WEBHOOK_SECRET",
    algo: "sha256",
    deliveryIdHeader: "x-myprovider-delivery",
  },
};
```

## Module-augment the trigger DSL

```ts
declare module "@ahamie/automation" {
  interface AhamieTriggerNamespace {
    myprovider: {
      thingCreated: () => Trigger<{ id: string; createdAt: string }>;
    };
  }
}
```

Then editor inference works for `on.myprovider.thingCreated()`.

## Verify the allowlist

```ts
import { compileAllowlist, requireAllowlist } from "@ahamie/connector-proxy";
import { myAdapter } from "./adapter";

const al = compileAllowlist(myAdapter.allowlist);
expect(() => requireAllowlist(al, "GET", "/v1/things/42")).not.toThrow();
expect(() => requireAllowlist(al, "DELETE", "/v1/things/42")).toThrow();
```

## Don't do

- Do **not** import upstream SDKs that handle auth — the proxy holds the token. Use plain `fetch` shapes the proxy can forward.
- Do **not** widen the allowlist with `*` patterns more than necessary. Each entry is a security surface.
