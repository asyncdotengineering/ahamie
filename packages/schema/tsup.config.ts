import { defineConfig } from "tsup";
import { baseConfig } from "../../tsup.config.base";

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts", "src/brand.ts", "src/refine.ts"],
});
