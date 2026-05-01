/**
 * `@ahamie/workspace` — the unit of compute.
 *
 * One persistent volume + one isolation boundary + one config graph. v0
 * exposes the contract; the implementation wraps Mastra's
 * `@mastra/workspace-fs-agentfs` and `@mastra/workspace-sandbox-computesdk`.
 *
 * Snapshots are CAS-backed (T5): a snapshot is the sha256 of a manifest
 * file that lists every relative path + that file's CAS object id.
 */

import { createHash } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { OrgId, WorkspaceId } from "@ahamie/schema";
import { mintWorkspaceId } from "@ahamie/schema";
import type { Cas } from "@ahamie/cas";

export interface WorkspaceFile {
  path: string;
  /** Bytes for snapshot; for live workspaces the path is on disk. */
  content?: Uint8Array;
}

export interface SnapshotManifest {
  workspaceId: WorkspaceId;
  orgId: OrgId;
  createdAt: string;
  /** Each entry: path → CAS id. */
  files: Record<string, string>;
}

export interface Workspace {
  id: WorkspaceId;
  rootPath: string;
  /** Take a CAS-backed snapshot of `files`. */
  snapshot(orgId: OrgId, cas: Cas, files: WorkspaceFile[]): Promise<{ manifestId: string; manifest: SnapshotManifest }>;
  /** Restore a workspace's logical state from a previously stored manifest. */
  restore(orgId: OrgId, cas: Cas, manifestId: string): Promise<SnapshotManifest>;
}

export const createTmpWorkspace = async (): Promise<Workspace> => {
  const id = mintWorkspaceId();
  const root = await mkdtemp(join(tmpdir(), `ahamie-ws-${id.slice(0, 8)}-`));

  return {
    id,
    rootPath: root,
    async snapshot(orgId, cas, files) {
      const manifest: SnapshotManifest = {
        workspaceId: id,
        orgId,
        createdAt: new Date().toISOString(),
        files: {},
      };
      for (const f of files) {
        if (!f.content) continue;
        const obj = await cas.put(orgId, f.content);
        manifest.files[f.path] = obj.id;
      }
      const bytes = Buffer.from(JSON.stringify(manifest));
      const manifestObj = await cas.put(orgId, bytes);
      return { manifestId: manifestObj.id, manifest };
    },
    async restore(orgId, cas, manifestId) {
      const bytes = await cas.get(orgId, manifestId);
      return JSON.parse(bytes.toString("utf8")) as SnapshotManifest;
    },
  };
};

export const hashContent = (bytes: Uint8Array | Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");
