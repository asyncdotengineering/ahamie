# Company brain in a box

The canonical Ahamie reference app — `cron → agent → Slack → outcome` end-to-end.

## The first hour (per tech-plan §8.6)

```
0:00  $ pnpm create ahamie my-brain
0:02  $ ahamie connect slack
0:05  $ ahamie ingest slack --channel '#engineering' --since '7d'
0:08  $ ahamie run daily-eng-leadership-summary --shadow
0:12  $ ahamie eval summarizer.suite
0:16  $ ahamie factory run summarizer.spec --models claude-sonnet-4.6,gpt-5
0:30  open http://localhost:3000/runs
0:45  $ ahamie connect linear && ahamie deploy outcome linear-issue-closed
0:55  # close a Linear issue; observe RunOutcome row land
1:00  ✓ Closed loop. Setpoint, plant, sensor, controller, actuator, eval all wired.
```

If a senior platform engineer cannot reach minute 60 with this app + the README alone, v0 doesn't ship.

## Layout

```
src/
├─ agents/engineering-summarizer.ts          # defineAgent
├─ automations/daily-eng-leadership-summary.ts # defineAutomation + on.cron
├─ connectors/{slack,linear}.ts              # adapter re-exports
├─ evals/summarizer.suite.ts                 # defineSuite + hidden-golden
├─ outcomes/linear-issue-closed.ts           # defineProvider + recordOutcome
└─ app/page.tsx                              # @ahamie/ui mounted
```
