#!/usr/bin/env bash
# Rejects destructive SQL in migrations added after the production baseline.
#
# Production safety rules (docs/OPERATIONS.md; review M24). Flagged, per statement:
#   - DROP TABLE / COLUMN / CONSTRAINT / TYPE / SCHEMA, TRUNCATE
#   - DROP INDEX, unless the same migration recreates an index of that name
#   - ALTER [COLUMN] x [SET DATA] TYPE (quoted or not); use expand/contract
#   - RENAME of anything, SET NOT NULL
#   - UPDATE / DELETE without a WHERE clause, or with WHERE true / 1 = 1
# Comments are ignored when matching, and SQL inside EXECUTE strings and DO
# blocks is checked statement by statement (scripts/lib/migration-safety.mjs).
#
# A statement that is safe in context carries a marker comment inside it or on
# the line before it:   -- safety: allow <reason>
#
# Historical migrations (before 20261103) are exempt; they are already applied.
# Migrations already applied to production before this check was tightened
# are listed in EXEMPT as "<migration>:<rule>" rather than edited, because
# editing an applied migration changes its checksum.
#
# Usage: scripts/check-migration-safety.sh [migrations dir]
#   (scripts/__fixtures__/migrations/fail holds migrations the check must reject)
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
dir="${1:-$repo/prisma/migrations}"

BASELINE="20261103000000"
EXEMPT=(
  # Guarded FK swap CASCADE -> RESTRICT; each constraint is re-added at once.
  "20261103000700_soft_delete_and_restrict:DROP CONSTRAINT"
  # Drops two indexes that duplicated unique constraints; no data involved.
  "20261103001400_indexes_marks_decimal_teacher_user:DROP INDEX"
)
if [[ -n "${1:-}" ]]; then BASELINE="0"; EXEMPT=(); fi

if node "$repo/scripts/lib/migration-safety.mjs" "$dir" "$BASELINE" "${EXEMPT[@]:-}"; then
  echo "Migration safety check passed (no destructive statements since baseline $BASELINE)."
else
  exit 1
fi
