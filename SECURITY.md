# Security policy

## Supported versions

The latest **minor** of every `@ahamie/*` package gets security fixes. The previous minor gets fixes for **30 days** after a new minor ships.

## Reporting

Email **security@ahamie.dev** (PGP key at `https://ahamie.dev/.well-known/pgp.asc`).

We will:

1. Acknowledge within **24 hours**.
2. Triage and confirm within **72 hours**.
3. Ship a fix within **90 days** for high/critical, **180 days** for medium/low.
4. Publish a coordinated disclosure with credit (or anonymity, your choice).

## Out of scope

- Self-host misconfiguration (we ship `ahamie doctor` to catch the common ones).
- Third-party connectors that we do not maintain.
- Findings against the Cloud offering (separate program at `ahamie.dev/security/cloud`).
