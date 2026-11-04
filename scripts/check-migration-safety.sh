#!/usr/bin/env bash
# Rejects destructive SQL in migrations added after the production baseline.
#
# Production safety rules (see LMS_CODE_REVIEW_AND_IMPLEMENTATION_PLAN.md §7.0):
#   - no DROP TABLE / DROP COLUMN / TRUNCATE
#   - no ALTER COLUMN ... TYPE on populated tables (use expand/contract)
#   - no DELETE without a WHERE clause
# Historical migrations (before 20261103) are exempt; they are already applied.
set -euo pipefail
cd "$(dirname "$0")/.."

BASELINE="20261103000000"
status=0
for dir in prisma/migrations/*/; do
  name="$(basename "$dir")"
  stamp="${name%%_*}"
  [[ "$stamp" < "$BASELINE" ]] && continue
  file="$dir/migration.sql"
  [[ -f "$file" ]] || continue
  # Strip SQL comments before matching.
  body="$(sed -e 's/--.*$//' "$file")"
  if grep -Eiq '\bDROP[[:space:]]+TABLE\b|\bDROP[[:space:]]+COLUMN\b|\bTRUNCATE\b|ALTER[[:space:]]+COLUMN[[:space:]]+"[^"]+"[[:space:]]+(SET[[:space:]]+DATA[[:space:]]+)?TYPE\b' <<<"$body"; then
    echo "DESTRUCTIVE statement found in $name:"
    grep -Ein '\bDROP[[:space:]]+TABLE\b|\bDROP[[:space:]]+COLUMN\b|\bTRUNCATE\b|ALTER[[:space:]]+COLUMN[[:space:]]+"[^"]+"[[:space:]]+(SET[[:space:]]+DATA[[:space:]]+)?TYPE\b' <<<"$body" || true
    status=1
  fi
  if grep -Eiq '\bDELETE[[:space:]]+FROM[[:space:]]+"[^"]+"[[:space:]]*;' <<<"$body"; then
    echo "Unqualified DELETE found in $name"
    status=1
  fi
done

if [[ $status -eq 0 ]]; then
  echo "Migration safety check passed (no destructive statements since baseline $BASELINE)."
fi
exit $status
