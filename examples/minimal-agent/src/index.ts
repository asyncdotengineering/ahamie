/**
 * The smallest possible Ahamie agent. No automation, no proxy, no UI.
 * Useful for verifying the SDK is composable in isolation.
 */

import { defineAgent } from "@ahamie/agent";
import { z } from "@ahamie/schema";

export const echoAgent = defineAgent({
  name: "echo",
  model: "test/echo",
  instructions: "Echo input verbatim.",
  scope: { org: "$ORG_ID" },
  output: z.object({ message: z.string() }),
});
