#!/usr/bin/env bash
# The Vercel build (vercel.json -> npm run vercel-build).
#
# `prisma migrate deploy` runs only for production deployments
# (VERCEL_ENV=production), or when RUN_MIGRATIONS=true is set on a staging
# project that has its own database. Preview builds never migrate: a Preview
# environment that shares production's DATABASE_URL/DIRECT_URL would otherwise
# apply a branch's unreviewed migration to the live database.
#
#   --dry-run   print each step instead of running it
set -euo pipefail
cd "$(dirname "$0")/.."

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

step() {
  echo "==> $*"
  if [[ "$DRY_RUN" == "false" ]]; then "$@"; fi
}

step npm run build:pdf-css
step npx prisma generate

if [[ "${VERCEL_ENV:-}" == "production" || "${RUN_MIGRATIONS:-}" == "true" ]]; then
  echo "Applying migrations (VERCEL_ENV=${VERCEL_ENV:-unset}, RUN_MIGRATIONS=${RUN_MIGRATIONS:-unset})."
  step npx prisma migrate deploy
else
  echo "Skipping migrations: VERCEL_ENV=${VERCEL_ENV:-unset} is not production and RUN_MIGRATIONS is not true."
fi

step npx next build
