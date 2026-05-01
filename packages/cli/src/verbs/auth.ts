/**
 * `ahamie login | logout` — placeholder verbs that wire to Better-Auth's
 * machine-token flow. v0 prints instructions; v1 implements PKCE-style
 * device flow.
 */

import pico from "picocolors";
import type { AhamieCliVerb } from "./registry";

export const loginVerb: AhamieCliVerb = {
  name: "login",
  description: "Authenticate with the local Ahamie instance (machine token).",
  async run() {
    console.log(pico.cyan("Visit http://localhost:3000/api/auth/sign-in/magic-link"));
    return 0;
  },
};
export const logoutVerb: AhamieCliVerb = {
  name: "logout",
  description: "Clear local credentials.",
  async run() {
    console.log(pico.dim("(no local credentials in v0)"));
    return 0;
  },
};
