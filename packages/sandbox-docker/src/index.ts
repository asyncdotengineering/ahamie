/**
 * `@ahamie/sandbox-docker` — Docker fallback for macOS/Windows.
 *
 * The interface returns commands an adapter would invoke (`docker run …`)
 * without actually shelling out — that lets test code verify shape without
 * needing Docker on CI.
 */

export interface DockerSandboxConfig {
  image?: string;
  /** Mount points: host → container */
  mounts?: Record<string, string>;
  /** Network mode. Default `none` (deny egress). */
  network?: "none" | "bridge" | "host";
  /** Read-only root by default. */
  readOnly?: boolean;
}

export const buildDockerArgs = (cfg: DockerSandboxConfig, command: string[]): string[] => {
  const args: string[] = ["run", "--rm"];
  if (cfg.readOnly !== false) args.push("--read-only");
  args.push("--network", cfg.network ?? "none");
  for (const [host, container] of Object.entries(cfg.mounts ?? {})) {
    args.push("-v", `${host}:${container}`);
  }
  args.push(cfg.image ?? "alpine:3.20", ...command);
  return args;
};
