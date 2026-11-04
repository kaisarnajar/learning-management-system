#!/usr/bin/env bash
# Keeps .env.example and the code in step.
#   1. every variable read with process.env.NAME must be listed in .env.example
#      (active, or commented out as `# NAME=...`);
#   2. every variable listed in .env.example must be read somewhere.
# NODE_ENV and CI are set by the tooling and are not listed.
set -euo pipefail
cd "$(dirname "$0")/.."

SOURCES=(app services utils config components prisma scripts middleware.ts next.config.ts)

# Read by Prisma (schema.prisma), shell scripts and the test tooling rather than by process.env in the application code.
TOOLING_ONLY=(DIRECT_URL DATABASE_URL_TEST SHADOW_DATABASE_URL)

in_code="$(grep -rhoE 'process\.env\.[A-Z][A-Z0-9_]*' "${SOURCES[@]}" --include='*.ts' --include='*.tsx' --include='*.mjs' --include='*.js' \
  | sed 's/^process\.env\.//' | grep -vxE 'NODE_ENV|CI' | sort -u)"
in_example="$(grep -hoE '^#? ?[A-Z][A-Z0-9_]*=' .env.example | sed -E 's/^#? ?//; s/=$//' | sort -u)"

status=0

missing="$(comm -23 <(printf '%s\n' "$in_code") <(printf '%s\n' "$in_example"))"
if [[ -n "$missing" ]]; then
  echo "Read by the code but missing from .env.example:"
  printf '  %s\n' $missing
  status=1
fi

unused="$(comm -13 <(printf '%s\n' "$in_code") <(printf '%s\n' "$in_example"))"
for name in "${TOOLING_ONLY[@]}"; do
  unused="$(printf '%s\n' "$unused" | grep -vx "$name" || true)"
done
if [[ -n "${unused//[$'\n ']/}" ]]; then
  echo "Listed in .env.example but never read by the code:"
  printf '  %s\n' $unused
  status=1
fi

if [[ "$status" -eq 0 ]]; then
  echo ".env.example matches the variables the code reads."
fi
exit "$status"
