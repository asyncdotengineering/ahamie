---
title: Governance
description: Anti-rug-pull pledge, maintainer council, decision making, security policy.
---

The full text lives in [`GOVERNANCE.md`](https://github.com/asyncdotengineering/ahamie/blob/main/GOVERNANCE.md). Highlights:

## Anti-rug-pull pledge

1. **No license erosion.** Apache-2.0 is irrevocable. No future move to BSL / SSPL / Commons Clause.
2. **No CLA.** DCO sign-offs only. You retain copyright.
3. **Schemas are CC0** (public domain) in a separate `ahamie/specs` repo.
4. **No private forks.** Cloud code lives in a separate repo and consumes the framework as a library.
5. **No telemetry by default.** No phone-home.
6. **Foundation evaluation gate.** At v2.0 or 5k GitHub stars (whichever first), the council evaluates moving to a vendor-neutral foundation.

## Maintainer council

3 of 5 quorum for decisions. 4 of 5 to add/remove a council member. Founding council: TBD (announced at v0.1.0).

## RFCs

Public contract changes (Layer 2 SDK, `defineAhamieConfig` shape, wire formats) require an RFC with 7-day public comment.

## Security

90-day coordinated disclosure. Critical CVEs get same-day patches. Report at `security@ahamie.dev` (PGP key forthcoming).
