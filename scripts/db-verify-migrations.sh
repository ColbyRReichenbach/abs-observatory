#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pushd "$ROOT_DIR" >/dev/null
bash scripts/run-db-schema.sh
bash scripts/run-db-schema.sh
bash scripts/db-smoke.sh
popd >/dev/null

echo "Migration verification passed on clean/live-like schema application."
