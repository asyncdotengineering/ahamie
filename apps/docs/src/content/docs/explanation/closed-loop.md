---
title: The closed loop
description: Why the closed loop is the unit of value, and what each primitive does inside it.
---

A *closed loop* in the AI-native world is the same shape as a control loop in industrial systems: setpoint, plant, sensor, controller, actuator, eval.

| Loop term     | Ahamie equivalent                                    |
|---------------|------------------------------------------------------|
| Setpoint      | The spec — what success looks like                   |
| Plant         | The connector + tools layer (the world the agent acts on) |
| Sensor        | `RunOutcome` — populated by systems the agent does not write to |
| Controller    | The agent loop                                       |
| Actuator      | The action set — `agent.run`, `app.invoke`, `gateway.send` |
| Eval          | `defineSuite` + hidden-golden                        |

## Why closed-loop discipline matters

Without a sensor that the agent cannot influence, you can't separate **good agent behavior** from **agent-self-confirmation**. The agent will tell you it succeeded; the question is whether anyone else agrees.

The hidden-golden partition + sensor isolation are the two primitives that keep the loop honest.

## Where Ahamie sits

Mastra owns the **controller** (Agent), the **actuator wiring** (tool call), and the **plant adapters** (model gateway, sandbox, FS). Ahamie owns the **sensor**, the **eval**, the **trust boundary on the plant**, and the **outer loop that revises the spec when the eval fails**. That's the whole bet.
