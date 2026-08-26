import vinext from "vinext";
import { defineConfig } from "vite";
import { workerArtifact } from "./build/worker-artifact-vite-plugin.ts";

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      watch: { ignored: ["**/.venv/**", "**/.aura-fit-runtime/**", "**/.chroma/**"] },
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true, ignored: ["**/.venv/**", "**/.aura-fit-runtime/**", "**/.chroma/**"] } }
        : {}),
    },
    plugins: [
      vinext(),
      workerArtifact(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
      }),
    ],
  };
});
