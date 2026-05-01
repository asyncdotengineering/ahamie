/**
 * `@ahamie/cli` — programmatic entry point. The binary lives in `bin/ahamie`.
 *
 * Exposing the registry function lets external scripts compose verbs into
 * their own pipelines.
 */

export { buildProgram } from "./program";
export { type AhamieCliVerb, registerVerb } from "./verbs/registry";
