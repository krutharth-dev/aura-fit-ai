#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${AURA_FIT_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/runtime-env.sh" -- "$0" "$@"
fi

command -v timeout >/dev/null || {
  echo "build-verified.sh requires GNU timeout." >&2
  exit 69
}

vinext="${AURA_FIT_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

echo "Running bounded vinext build..."
timeout \
  --signal=TERM \
  --kill-after="${AURA_FIT_BUILD_KILL_AFTER:-10s}" \
  "${AURA_FIT_BUILD_TIMEOUT:-3m}" \
  "${vinext}" build

"${script_dir}/validate-artifact.sh"
