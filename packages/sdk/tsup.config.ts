import { defineConfig } from "tsup";
import { baseConfig } from "../../tsup.config.base";

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts", "src/agent.ts", "src/automation.ts", "src/eval.ts", "src/outcomes.ts"],
});
