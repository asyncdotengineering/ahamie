/**
 * Verb registry. Each verb is a `(args, ctx) => Promise<number>` returning
 * its exit code. `buildProgram()` mounts every registered verb on commander.
 *
 * Plugin extensibility (v1) walks `package.json` for an `ahamie.plugin`
 * entry — those plugins call `registerVerb()` at module-load time.
 */

export interface AhamieCliVerb {
  name: string;
  description: string;
  /** Comma-separated commander option flags, e.g. `--db <url>`. */
  options?: Array<{ flags: string; description: string; defaultValue?: unknown }>;
  /** Subverbs — used by `db`, `ui`, `factory`, `secrets`. */
  subverbs?: AhamieCliVerb[];
  run?: (args: Record<string, unknown>) => Promise<number> | number;
}

const verbs: AhamieCliVerb[] = [];
export const registerVerb = (v: AhamieCliVerb): void => {
  verbs.push(v);
};
export const allVerbs = (): AhamieCliVerb[] => verbs.slice();
