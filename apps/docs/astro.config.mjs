import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// Astro + Starlight + Diataxis-discipline: tutorial / how-to / reference / explanation.
export default defineConfig({
  site: "https://ahamie.dev",
  integrations: [
    starlight({
      title: "Ahamie",
      description: "the company brain you own.",
      logo: { src: "./public/logo.png", alt: "Ahamie" },
      favicon: "/logo.png",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/octalpixel/ahamie" },
        { icon: "npm", label: "npm", href: "https://www.npmjs.com/org/ahamie" },
      ],
      editLink: {
        baseUrl: "https://github.com/octalpixel/ahamie/edit/main/apps/docs/",
      },
      customCss: ["./src/styles/ahamie.css"],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "What is Ahamie?", slug: "start/what-is-ahamie" },
            { label: "Quickstart", slug: "start/quickstart" },
            { label: "Reference app", slug: "start/reference-app" },
          ],
        },
        {
          label: "Tutorials",
          items: [
            { label: "Build your first agent", slug: "tutorials/first-agent" },
            { label: "Wire a closed loop", slug: "tutorials/closed-loop" },
            { label: "Run the software factory", slug: "tutorials/software-factory" },
          ],
        },
        {
          label: "How-to guides",
          items: [
            { label: "Connect Slack via the proxy", slug: "how-to/connect-slack" },
            { label: "Add a new connector adapter", slug: "how-to/add-connector" },
            { label: "Define hidden-golden eval", slug: "how-to/hidden-golden" },
            { label: "Migrate the database", slug: "how-to/migrate-db" },
            { label: "Multi-tenant deployment", slug: "how-to/multi-tenant" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Package map", slug: "reference/packages" },
            { label: "ahamie.config.ts", slug: "reference/config" },
            { label: "CLI verbs", slug: "reference/cli" },
            { label: "Database schema", slug: "reference/schema" },
            { label: "Trigger DSL (`on.*`)", slug: "reference/trigger-dsl" },
            { label: "Connector proxy invariants (I1–I5)", slug: "reference/proxy-invariants" },
            { label: "Eval metrics", slug: "reference/eval-metrics" },
          ],
        },
        {
          label: "Explanation",
          items: [
            { label: "The closed loop", slug: "explanation/closed-loop" },
            { label: "Why we wrap Mastra", slug: "explanation/wrap-mastra" },
            { label: "Sensor isolation", slug: "explanation/sensor-isolation" },
            { label: "Multi-tenancy ladder (L1–L5)", slug: "explanation/tenancy-ladder" },
            { label: "Naming — Ahamie", slug: "explanation/naming" },
          ],
        },
        {
          label: "Project",
          items: [
            { label: "Roadmap (v0 → v3)", slug: "project/roadmap" },
            { label: "Governance", slug: "project/governance" },
            { label: "Contributing", slug: "project/contributing" },
            { label: "Changelog", slug: "project/changelog" },
          ],
        },
      ],
    }),
  ],
});
