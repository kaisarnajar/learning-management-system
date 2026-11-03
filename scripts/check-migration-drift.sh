#!/usr/bin/env bash
# Verifies that prisma/migrations and prisma/schema.prisma describe the same database.
#
# Authoritative mode (CI, needs a throwaway Postgres in SHADOW_DATABASE_URL):
#   prisma migrate diff --from-migrations --to-schema-datamodel --exit-code
# Offline mode (no database available): static comparison via scripts/migration-drift-static.ts.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n "${SHADOW_DATABASE_URL:-}" ]]; then
  echo "== prisma migrate diff (authoritative, shadow database)"
  npx prisma migrate diff \
    --from-migrations prisma/migrations \
    --shadow-database-url "$SHADOW_DATABASE_URL" \
    --to-schema-datamodel prisma/schema.prisma \
    --exit-code
  echo "No drift."
else
  echo "== static drift check (set SHADOW_DATABASE_URL for the authoritative check)"
  tmp="$(mktemp)"
  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "$tmp"
  npx tsx scripts/migration-drift-static.ts "$tmp"
  rm -f "$tmp"
fi
