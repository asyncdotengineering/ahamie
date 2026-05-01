/**
 * `ahamie db migrate` and `ahamie db studio` (v1: full studio, v0: print URL).
 */

import { closeDb, createDb, migrate } from "@ahamie/storage";
import pico from "picocolors";
import type { AhamieCliVerb } from "./registry";

const dbUrl = (override?: string): string => {
  const url = override || process.env.AHAMIE_DB_URL;
  if (!url) {
    throw new Error("AHAMIE_DB_URL not set; pass --url <postgres://…>");
  }
  return url;
};

export const dbVerb: AhamieCliVerb = {
  name: "db",
  description: "Database commands.",
  subverbs: [
    {
      name: "migrate",
      description: "Apply outstanding Drizzle migrations.",
      options: [{ flags: "--url <url>", description: "Postgres URL (overrides $AHAMIE_DB_URL)" }],
      async run(args) {
        const url = dbUrl((args.url as string | undefined) ?? undefined);
        const db = createDb({ url, max: 2, appName: "ahamie-cli" });
        try {
          const applied = await migrate(db, { log: (m) => console.log(pico.dim(m)) });
          const newOnes = applied.filter((a) => a.appliedNow);
          console.log(pico.green(`✓ ${newOnes.length} migration(s) applied`));
          return 0;
        } finally {
          await closeDb(db);
        }
      },
    },
    {
      name: "studio",
      description: "Print the Drizzle Studio URL (run `pnpm exec drizzle-kit studio` separately at v0).",
      options: [{ flags: "--url <url>", description: "Postgres URL" }],
      async run(args) {
        const url = dbUrl((args.url as string | undefined) ?? undefined);
        console.log(`Run: pnpm exec drizzle-kit studio --url=${pico.cyan(url)}`);
        return 0;
      },
    },
  ],
};
