#!/usr/bin/env bash
set -euo pipefail
bun run typecheck
bun run check
bun run test:web
bun run build
