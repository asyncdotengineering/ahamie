---
title: Ahamie
description: the company brain you own.
template: splash
hero:
  tagline: A TypeScript-first, source-available framework for building closed-loop AI systems inside your company. Self-host-first. Wraps Mastra. Owns the trust boundary.
  image:
    file: ../../../public/logo.png
    alt: Ahamie chibi mascot
  actions:
    - text: Quickstart
      link: /start/quickstart/
      icon: right-arrow
      variant: primary
    - text: GitHub
      link: https://github.com/asyncdotengineering/ahamie
      icon: external
      variant: minimal
---

import { Card, CardGrid } from "@astrojs/starlight/components";

## What you get

<CardGrid stagger>
  <Card title="The closed loop, primitives-first">
    `RunOutcome`, hidden-golden eval, software-factory mode, connector-proxy trust boundary — the four things Mastra deliberately omits, native and typed.
  </Card>
  <Card title="Wrap-and-hide Mastra">
    `@ahamie/agent`, `@ahamie/workflow`, `@ahamie/memory`, `@ahamie/rag`, `@ahamie/workspace` mirror Mastra and enforce Ahamie's invariants. The escape hatch — `import { Agent } from "@mastra/core"` — is forever open.
  </Card>
  <Card title="Self-host-first">
    `pnpm create ahamie` boots Postgres, the proxy, the runner, the app, and the UI primitives in under 90 seconds. No phone-home.
  </Card>
  <Card title="Five trust invariants">
    The connector proxy is a separate process. I1–I5 are unit-testable. Tokens never enter the agent process.
  </Card>
</CardGrid>

## Get started in 90 seconds

```bash
pnpm create ahamie my-brain
cd my-brain
pnpm dev
```

The reference app `examples/company-brain-in-a-box` walks you from Slack ingest → automation → eval → outcome attribution in under one hour.
