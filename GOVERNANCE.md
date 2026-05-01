# Ahamie Governance

> *the company brain you own.*

## 1. Pledge — anti-rug-pull

Ahamie is a self-host-first, source-available framework. The framework code lives in this repository under **Apache License 2.0** (irrevocable).

We commit to the following, in writing:

1. **No license erosion.** The framework will not move to BSL, SSPL, Commons Clause, or any other source-available-but-not-OSS license. Any future license change requires unanimous consent of the maintainer council and a 12-month sunset window for affected users.
2. **No CLA.** We use **DCO sign-offs** (`Signed-off-by`) instead of a Contributor License Agreement. You retain copyright on your contributions.
3. **Schemas are CC0.** Wire formats and contracts (the `ahamie/specs` repo) are released under **CC0 / public domain**, semver'd with a 12-month sunset.
4. **No private forks.** Commercial code lives in a separate repository (`ahamie/cloud-private`) and consumes the framework as a library. The framework gets every feature first.
5. **No telemetry by default.** No phone-home, no anonymous analytics, no usage beacons.
6. **Foundation evaluation gate.** When the framework reaches v2.0 *or* 5,000 GitHub stars (whichever comes first), the maintainer council will evaluate moving the project to a vendor-neutral foundation (LF AI, CNCF, Apache, or new).

## 2. Maintainer council

- The council is the set of people with publish rights to `@ahamie/*` on npm.
- Decisions reach quorum at 3 of 5 members.
- Adding or removing a council member requires 4 of 5 consent.
- Founding council: *TBD (announced at v0.1.0)*.

## 3. Decision making

- **RFCs** for any change to a public contract (Layer 2 SDK, `defineAhamieConfig` shape, wire formats).
- **PRs** for everything else.
- An RFC reaches consensus when no council member has an unresolved objection after 7 calendar days of public comment.

## 4. Code of conduct

We adopt the [Contributor Covenant 2.1](./CODE_OF_CONDUCT.md). Violations are handled by the council; appeals are public.

## 5. Security

See [`SECURITY.md`](./SECURITY.md). 90-day coordinated disclosure window. Critical CVEs get a same-day patch release.

## 6. Trademark

"Ahamie" and the Ahamie logomark are trademarks of the Ahamie Authors. Unmodified redistribution under Apache-2.0 is permitted to use the marks; modified forks must rebrand. See [`TRADEMARK.md`](./TRADEMARK.md) for the full policy (added at v1).
