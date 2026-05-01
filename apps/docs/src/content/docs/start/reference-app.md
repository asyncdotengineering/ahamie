---
title: Reference app — company brain in a box
description: The canonical end-to-end Ahamie app, walked from minute 0 to minute 60.
---

`examples/company-brain-in-a-box` is the single load-bearing tutorial. If a senior platform engineer cannot reach minute 60 with this app + this README alone, v0 doesn't ship.

## The first hour

```
0:00  $ pnpm create ahamie my-brain                   # < 90 s
0:02  $ ahamie connect slack                           # OAuth dance through proxy
0:05  $ ahamie ingest slack --channel '#engineering' --since '7d'
0:08  $ ahamie run daily-eng-leadership-summary --shadow
       ✓ Shadow run completed in 12s, $0.04
0:12  $ ahamie eval summarizer.suite
       ✓ 10/10 scenarios pass; hidden golden 5/5
0:16  $ ahamie factory run summarizer.spec --models claude-sonnet-4.6,gpt-5
       ...iter 0 fail; iter 1 fail; iter 2 pass; PR #142 opened
0:30  open http://localhost:3000/runs                  # @ahamie/ui mounted
0:45  $ ahamie connect linear && ahamie deploy outcome linear-issue-closed
0:55  # close a Linear issue; observe RunOutcome row land in `outcomes` table
1:00  ✓ Closed loop. Setpoint, plant, sensor, controller, actuator, eval all wired.
```

## What's in the box

```
src/
├─ agents/engineering-summarizer.ts          # defineAgent
├─ automations/daily-eng-leadership-summary.ts # defineAutomation + on.cron
├─ connectors/{slack,linear}.ts              # adapter re-exports
├─ evals/summarizer.suite.ts                 # defineSuite + hidden-golden
├─ outcomes/linear-issue-closed.ts           # defineProvider + recordOutcome
└─ app/page.tsx                              # @ahamie/ui mounted
```

## Why this shape

- **`agents/`** holds typed agent definitions. The `output` schema is the contract.
- **`automations/`** holds `Trigger → Event → Run → Action → Delivery` shapes — the wire format. The trigger uses the typed `on.*` proxy from `@ahamie/automation`.
- **`outcomes/`** holds the providers that *attribute* outcomes back to runs. The Linear `issue.closed` provider rejects self-closes (sensor isolation, T13).
- **`evals/`** holds suites — every controller has one.

[Source on GitHub →](https://github.com/ahamie/ahamie/tree/main/examples/company-brain-in-a-box)
