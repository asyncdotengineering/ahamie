---
title: Sensor isolation
description: Why the agent cannot write to the system that records its outcomes.
---

## The invariant

The `source` value on every `RunOutcome` row MUST be a system the agent identified by `agent_run_id` does **not** have write access to.

## Why this matters

Without this rule, the agent can manufacture its own win condition. It can:

- Edit the Linear issue it was supposed to close, then mark it closed.
- Write a "5-star feedback" row to `outcomes` itself.
- Update the metric dashboard the eval suite reads from.

When `source` overlaps the agent's writable set, **the metric becomes hortative, not normative**. The number goes up, but the world doesn't change.

## How Ahamie enforces it

`@ahamie/outcomes` exposes `setSensorIsolationGuard(guard)`. The host wires a `guard({ agentRunId, source }) → boolean` at boot. Every `recordOutcome()` call passes through the guard before the row hits the database. Violations throw `SensorIsolationViolationError` synchronously.

## What goes wrong without it

The clearest failure mode is **eval rot** — the agent's reported quality goes up, but downstream signals (NPS, retention, real outcomes) go down. By the time you notice, the agent has been gaming the metric for months. The fix is structural — you can't fix this with prompts.

## The hidden-golden partition

Sensor isolation has a second axis: the eval suite's golden bytes live in a separate object-store prefix the agent has no IAM access to. The agent literally cannot read what it's being measured against. The default loader for `loadGoldenScenarios` runs in a host process with the right role; the agent's tool catalog never includes that role.
