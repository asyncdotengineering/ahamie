/**
 * `ahamie secrets set | list` — minimal secrets management.
 * v0 stores in the `secrets` table; v1 plugs into Vault.
 */

import { closeDb, createDb, secrets } from "@ahamie/storage";
import { mintSecretId, type OrgId, asBrand } from "@ahamie/schema";
import pico from "picocolors";
import { eq } from "drizzle-orm";
import type { AhamieCliVerb } from "./registry";

const orgFromArgs = (args: Record<string, unknown>): OrgId => {
  const id = (args.org as string | undefined) ?? process.env.AHAMIE_ORG_ID;
  if (!id) throw new Error("--org or AHAMIE_ORG_ID required");
  return asBrand<"OrgId">(id);
};

export const secretsVerb: AhamieCliVerb = {
  name: "secrets",
  description: "Secrets management.",
  subverbs: [
    {
      name: "set",
      description: "Insert / update a secret pointer.",
      options: [
        { flags: "--name <name>", description: "Logical secret name" },
        { flags: "--purpose <purpose>", description: "connector | webhook | signing | byok" },
        { flags: "--org <id>", description: "Org id" },
      ],
      async run(args) {
        const url = process.env.AHAMIE_DB_URL;
        if (!url) { console.error(pico.red("AHAMIE_DB_URL required")); return 1; }
        const db = createDb({ url, max: 1 });
        try {
          await db.insert(secrets).values({
            id: mintSecretId(),
            org_id: orgFromArgs(args),
            name: String(args.name),
            purpose: String(args.purpose ?? "connector"),
          });
          return 0;
        } finally {
          await closeDb(db);
        }
      },
    },
    {
      name: "list",
      description: "List secrets in the org.",
      options: [{ flags: "--org <id>", description: "Org id" }],
      async run(args) {
        const url = process.env.AHAMIE_DB_URL;
        if (!url) { console.error(pico.red("AHAMIE_DB_URL required")); return 1; }
        const db = createDb({ url, max: 1 });
        try {
          const rows = await db
            .select()
            .from(secrets)
            .where(eq(secrets.org_id, orgFromArgs(args)));
          for (const r of rows) {
            console.log(`${pico.cyan(r.name.padEnd(32))} ${r.purpose}`);
          }
          return 0;
        } finally {
          await closeDb(db);
        }
      },
    },
  ],
};
