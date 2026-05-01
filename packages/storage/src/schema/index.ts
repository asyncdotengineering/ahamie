/**
 * Re-export every table; this is the surface `drizzle()` reads to wire up
 * relations. New table files MUST be re-exported here.
 *
 * One file per concept group (T5):
 *   - identity   → orgs, users, memberships, delegations, acls, identities
 *   - automation → automations, events, runs, steps
 *   - agent      → agents, runs, steps
 *   - manifest   → manifests, connectors, credentials, grants
 *   - audit      → audit_log
 *   - outcomes   → outcomes
 *   - eval       → suites, results, factory_runs
 *   - cas        → cas_objects, blobstore_refs
 *   - secrets    → secrets
 *   - webhooks   → webhooks_inbound
 */

export * from "./identity";
export * from "./automation";
export * from "./agent";
export * from "./manifest";
export * from "./audit";
export * from "./outcomes";
export * from "./eval";
export * from "./cas";
export * from "./secrets";
export * from "./webhooks";
export * from "./columns";
