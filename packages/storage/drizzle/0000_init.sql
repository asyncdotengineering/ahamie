-- Ahamie v0 initial migration.
-- Idempotent: safe to replay. Every CREATE uses IF NOT EXISTS or DO $$ guards.

CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────── identity / tenancy ───────────────────────────

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" ("slug");

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "image" text,
  "email_verified" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");

CREATE TABLE IF NOT EXISTS "memberships" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL DEFAULT 'member',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "memberships_org_user_idx" ON "memberships" ("org_id", "user_id");
CREATE INDEX IF NOT EXISTS "memberships_org_idx" ON "memberships" ("org_id", "created_at");

CREATE TABLE IF NOT EXISTS "delegations" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "user_id" text NOT NULL,
  "agent_id" text NOT NULL,
  "scope" jsonb NOT NULL DEFAULT '[]',
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "delegations_org_user_idx" ON "delegations" ("org_id", "user_id");

CREATE TABLE IF NOT EXISTS "acls" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "subject_kind" text NOT NULL,
  "subject_id" text NOT NULL,
  "resource_kind" text NOT NULL,
  "resource_id" text NOT NULL,
  "permission" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "acls_unique_idx" ON "acls"
  ("org_id", "subject_kind", "subject_id", "resource_kind", "resource_id", "permission");
CREATE INDEX IF NOT EXISTS "acls_lookup_idx" ON "acls" ("org_id", "resource_kind", "resource_id");

CREATE TABLE IF NOT EXISTS "platform_identities" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "user_id" text NOT NULL,
  "provider" text NOT NULL,
  "external_id" text NOT NULL,
  "display" text,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "platform_identities_provider_external_idx"
  ON "platform_identities" ("org_id", "provider", "external_id");
CREATE INDEX IF NOT EXISTS "platform_identities_user_idx"
  ON "platform_identities" ("org_id", "user_id");

-- ─────────────────────────── automation ───────────────────────────

CREATE TABLE IF NOT EXISTS "automations" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "definition" jsonb NOT NULL,
  "enabled" text NOT NULL DEFAULT 'enabled',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "automations_org_slug_idx" ON "automations" ("org_id", "slug");

CREATE TABLE IF NOT EXISTS "automation_events" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "automation_id" text NOT NULL,
  "event_id" text NOT NULL,
  "trigger_kind" text NOT NULL,
  "payload" jsonb NOT NULL,
  "fired_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "automation_events_dedup_idx"
  ON "automation_events" ("automation_id", "event_id");
CREATE INDEX IF NOT EXISTS "automation_events_org_fired_idx"
  ON "automation_events" ("org_id", "fired_at");

CREATE TABLE IF NOT EXISTS "automation_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "automation_id" text NOT NULL,
  "event_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "started_at" timestamptz,
  "finished_at" timestamptz,
  "heartbeat_at" timestamptz,
  "cancel_requested" text NOT NULL DEFAULT 'no',
  "error" jsonb,
  "output" jsonb,
  "cost_usd_cents" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "automation_runs_dedup_idx"
  ON "automation_runs" ("automation_id", "event_id");
CREATE INDEX IF NOT EXISTS "automation_runs_org_created_idx"
  ON "automation_runs" ("org_id", "created_at");
CREATE INDEX IF NOT EXISTS "automation_runs_pending_heartbeat_idx"
  ON "automation_runs" ("status", "heartbeat_at");

CREATE TABLE IF NOT EXISTS "automation_steps" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "run_id" text NOT NULL,
  "sequence" integer NOT NULL,
  "kind" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "input" jsonb,
  "output" jsonb,
  "error" jsonb,
  "started_at" timestamptz,
  "finished_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "automation_steps_run_seq_idx"
  ON "automation_steps" ("run_id", "sequence");
CREATE INDEX IF NOT EXISTS "automation_steps_org_run_idx"
  ON "automation_steps" ("org_id", "run_id");

-- ─────────────────────────── agent ───────────────────────────

CREATE TABLE IF NOT EXISTS "agents" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "model" text NOT NULL,
  "instructions" text NOT NULL,
  "definition" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "agents_org_slug_idx" ON "agents" ("org_id", "slug");

CREATE TABLE IF NOT EXISTS "agent_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "agent_id" text NOT NULL,
  "automation_run_id" text,
  "status" text NOT NULL DEFAULT 'pending',
  "started_at" timestamptz,
  "finished_at" timestamptz,
  "cancel_requested" text NOT NULL DEFAULT 'no',
  "cap_usd_cents" integer,
  "cost_usd_cents" integer NOT NULL DEFAULT 0,
  "tokens_total" integer NOT NULL DEFAULT 0,
  "on_cap" text NOT NULL DEFAULT 'pause',
  "input" jsonb,
  "output" jsonb,
  "error" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "agent_runs_org_created_idx"
  ON "agent_runs" ("org_id", "created_at");
CREATE INDEX IF NOT EXISTS "agent_runs_automation_run_idx"
  ON "agent_runs" ("automation_run_id");

CREATE TABLE IF NOT EXISTS "agent_steps" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "agent_run_id" text NOT NULL,
  "sequence" integer NOT NULL,
  "kind" text NOT NULL,
  "payload" jsonb NOT NULL,
  "embedding" vector(1536),
  "cost_usd_cents" integer NOT NULL DEFAULT 0,
  "tokens_in" integer NOT NULL DEFAULT 0,
  "tokens_out" integer NOT NULL DEFAULT 0,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "agent_steps_run_seq_idx"
  ON "agent_steps" ("agent_run_id", "sequence");
CREATE INDEX IF NOT EXISTS "agent_steps_org_occurred_idx"
  ON "agent_steps" ("org_id", "occurred_at");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'agent_steps_embedding_hnsw') THEN
    CREATE INDEX "agent_steps_embedding_hnsw"
      ON "agent_steps"
      USING hnsw ("embedding" vector_cosine_ops);
  END IF;
END $$;

-- ─────────────────────────── manifest / connector / credential ───────────────────────────

CREATE TABLE IF NOT EXISTS "manifests" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "content_hash" text NOT NULL,
  "slug" text NOT NULL,
  "version" text NOT NULL,
  "document" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "manifests_content_hash_idx" ON "manifests" ("content_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "manifests_org_slug_version_idx"
  ON "manifests" ("org_id", "slug", "version");

CREATE TABLE IF NOT EXISTS "connectors" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "provider" text NOT NULL,
  "slug" text NOT NULL,
  "config" jsonb NOT NULL DEFAULT '{}',
  "credential_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "connectors_org_slug_idx" ON "connectors" ("org_id", "slug");

CREATE TABLE IF NOT EXISTS "credentials" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "connector_id" text NOT NULL,
  "kind" text NOT NULL,
  "ciphertext_b64" text NOT NULL,
  "encryption_meta" jsonb NOT NULL,
  "expires_at" timestamptz,
  "rotated_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "credentials_connector_idx"
  ON "credentials" ("connector_id", "created_at");

CREATE TABLE IF NOT EXISTS "connector_grants" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "manifest_id" text NOT NULL,
  "connector_id" text NOT NULL,
  "scopes" jsonb NOT NULL DEFAULT '[]',
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "connector_grants_unique_idx"
  ON "connector_grants" ("org_id", "manifest_id", "connector_id");

-- ─────────────────────────── audit ───────────────────────────

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "source" text NOT NULL,
  "action" text NOT NULL,
  "resource_kind" text,
  "resource_id" text,
  "subject_kind" text,
  "subject_id" text,
  "outcome" text NOT NULL,
  "redaction_safe" jsonb NOT NULL,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audit_log_org_occurred_idx" ON "audit_log" ("org_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log" ("org_id", "action", "occurred_at");

-- ─────────────────────────── outcomes ───────────────────────────

CREATE TABLE IF NOT EXISTS "outcomes" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "automation_run_id" text NOT NULL,
  "agent_run_id" text,
  "subject_kind" text NOT NULL,
  "subject_id" text NOT NULL,
  "outcome_type" text NOT NULL,
  "value" jsonb,
  "source" text NOT NULL,
  "source_kind" text NOT NULL,
  "observed_at" timestamptz NOT NULL DEFAULT now(),
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "outcomes_unique_idx"
  ON "outcomes" ("org_id", "automation_run_id", "outcome_type", "subject_id");
CREATE INDEX IF NOT EXISTS "outcomes_subject_idx"
  ON "outcomes" ("org_id", "subject_kind", "subject_id");
CREATE INDEX IF NOT EXISTS "outcomes_observed_idx"
  ON "outcomes" ("org_id", "observed_at");

-- ─────────────────────────── eval / factory ───────────────────────────

CREATE TABLE IF NOT EXISTS "eval_suites" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "slug" text NOT NULL,
  "definition" jsonb NOT NULL,
  "hidden_golden" jsonb,
  "threshold" real NOT NULL DEFAULT 0.8,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "eval_suites_org_slug_idx"
  ON "eval_suites" ("org_id", "slug");

CREATE TABLE IF NOT EXISTS "eval_results" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "suite_id" text NOT NULL,
  "controller_hash" text NOT NULL,
  "partition" text NOT NULL,
  "score" real NOT NULL,
  "passed" text NOT NULL,
  "scenarios" jsonb NOT NULL DEFAULT '[]',
  "ran_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "eval_results_suite_partition_idx"
  ON "eval_results" ("suite_id", "partition", "ran_at");
CREATE INDEX IF NOT EXISTS "eval_results_org_ran_idx"
  ON "eval_results" ("org_id", "ran_at");

CREATE TABLE IF NOT EXISTS "factory_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "spec_hash" text NOT NULL,
  "suite_id" text NOT NULL,
  "iteration" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'pending',
  "target_score" real NOT NULL DEFAULT 0.85,
  "best_score" real,
  "tabu_list" jsonb NOT NULL DEFAULT '[]',
  "output" jsonb,
  "error" jsonb,
  "started_at" timestamptz,
  "finished_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "factory_runs_org_status_idx"
  ON "factory_runs" ("org_id", "status", "created_at");

-- ─────────────────────────── cas / blobstore_refs ───────────────────────────

CREATE TABLE IF NOT EXISTS "cas_objects" (
  "sha256" text PRIMARY KEY NOT NULL,
  "source_org_id" text NOT NULL,
  "size" bigint NOT NULL,
  "parents" jsonb NOT NULL DEFAULT '[]',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "cas_objects_org_idx" ON "cas_objects" ("source_org_id", "created_at");

CREATE TABLE IF NOT EXISTS "blobstore_refs" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "key" text NOT NULL,
  "blob_kind" text NOT NULL,
  "ref" text,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "blobstore_refs_unique_idx"
  ON "blobstore_refs" ("org_id", "key");
CREATE INDEX IF NOT EXISTS "blobstore_refs_kind_idx"
  ON "blobstore_refs" ("org_id", "blob_kind", "created_at");

-- ─────────────────────────── secrets ───────────────────────────

CREATE TABLE IF NOT EXISTS "secrets" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "name" text NOT NULL,
  "purpose" text NOT NULL,
  "credential_id" text,
  "rotated_at" timestamptz,
  "next_rotation_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "secrets_org_name_idx" ON "secrets" ("org_id", "name");
CREATE INDEX IF NOT EXISTS "secrets_rotation_idx" ON "secrets" ("org_id", "next_rotation_at");

-- ─────────────────────────── webhooks_inbound ───────────────────────────

CREATE TABLE IF NOT EXISTS "webhooks_inbound" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "provider" text NOT NULL,
  "delivery_id" text NOT NULL,
  "hmac_verified" boolean NOT NULL,
  "result" text NOT NULL,
  "payload" jsonb NOT NULL,
  "received_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "webhooks_inbound_dedupe_idx"
  ON "webhooks_inbound" ("org_id", "provider", "delivery_id");
CREATE INDEX IF NOT EXISTS "webhooks_inbound_received_idx"
  ON "webhooks_inbound" ("org_id", "received_at");

-- ─────────────────────────── migration journal ───────────────────────────

CREATE TABLE IF NOT EXISTS "__ahamie_migrations" (
  "id" text PRIMARY KEY NOT NULL,
  "applied_at" timestamptz NOT NULL DEFAULT now()
);
