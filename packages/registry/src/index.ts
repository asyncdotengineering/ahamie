/**
 * `@ahamie/registry` — local app registry. v0 stores manifests under their
 * `bundleHash()` in the local CAS; v2 ships a federated registry server
 * (`@ahamie/marketplace`).
 */

import type { Cas } from "@ahamie/cas";
import { type AppManifest, bundleHash } from "@ahamie/manifest";
import type { OrgId } from "@ahamie/schema";

export interface RegistryClient {
  publish(orgId: OrgId, manifest: AppManifest): Promise<{ id: string; manifestHash: string }>;
  fetch(orgId: OrgId, manifestHash: string): Promise<AppManifest | null>;
}

export const createLocalRegistry = (cas: Cas): RegistryClient => ({
  async publish(orgId, manifest) {
    const hash = bundleHash(manifest);
    const bytes = Buffer.from(JSON.stringify(manifest));
    const obj = await cas.put(orgId, bytes);
    return { id: obj.id, manifestHash: hash };
  },
  async fetch(orgId, manifestHash) {
    try {
      const bytes = await cas.get(orgId, manifestHash);
      return JSON.parse(bytes.toString("utf8")) as AppManifest;
    } catch {
      return null;
    }
  },
});
