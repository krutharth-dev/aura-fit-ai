#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${AURA_FIT_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/runtime-env.sh" -- "$0" "$@"
fi

worker="${AURA_FIT_PROJECT_ROOT}/dist/server/index.js"
migrations="${AURA_FIT_PROJECT_ROOT}/dist/.openai/drizzle"

[[ -f "${worker}" ]] || {
  echo "Missing Cloudflare Worker entry: dist/server/index.js" >&2
  exit 66
}
[[ -d "${migrations}" ]] || {
  echo "Missing packaged D1 migrations." >&2
  exit 66
}

node --input-type=module - "${worker}" "${migrations}" <<'NODE'
import { readdir } from "node:fs/promises";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const [workerPath, migrationsPath] = process.argv.slice(2);
const migrations = await readdir(migrationsPath);
if (!migrations.some((file) => file.endsWith(".sql"))) {
  throw new Error("The deployable build must package at least one D1 migration.");
}

const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set("worker-validation", `${process.pid}-${Date.now()}`);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "data:text/javascript,export const env = {};", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const worker = await import(workerUrl.href);
if (!worker.default || typeof worker.default.fetch !== "function") {
  throw new Error("dist/server/index.js must have an ESM default export with fetch(request, env, ctx)");
}
NODE

echo "Validated AURA FIT Cloudflare Worker artifact and D1 migrations."
