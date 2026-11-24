#!/usr/bin/env bash
# Fails when a protected page does not call its auth helper as an explicit check.
#
# Layouts already guard /admin, /teacher and /developer, but a page that is
# moved or rendered outside its layout must not silently become public.
#   app/admin/**/page.tsx      -> requireAdmin()
#   app/developer/**/page.tsx  -> requireDeveloper()
#   app/teacher/**/page.tsx    -> requireTeacher() (or a requireTeacher* helper)
#   app/profile/**/page.tsx    -> requireUser() (or a requireStudent* helper)
#
# Mentioning the guard is not enough: the file is parsed (so comments and
# imports never count) and the call must be made by the default-exported page
# component or by generateMetadata, directly or through a function of the same
# file that they call. A page that renders one of the shared pages in
# components/teaching passes too, since each of those opens with
# requireTeachingAccess() (verified by check_teaching_components below).
# Pages whose protection is deliberately different are listed in ALLOWLIST.
#
# Usage: scripts/check-page-auth.sh [root]   (root defaults to the repository;
# scripts/__fixtures__/page-auth holds pages the check must reject)
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
root="$(cd "${1:-$repo}" && pwd)"

# Pages that legitimately use a different guard (e.g. a stricter helper that
# itself calls the base require* function). Paths relative to the root.
ALLOWLIST=()

status=0
(cd "$root" && node "$repo/scripts/lib/page-auth-guard.mjs" "$repo" "${ALLOWLIST[@]:-}") || status=1

# Every page component exported from components/teaching must open with the gate.
check_teaching_components() {
  local file exports gates result=0
  for file in components/teaching/AttendancePages.tsx components/teaching/GradePages.tsx components/teaching/StudentCardPage.tsx; do
    [[ -f "$file" ]] || continue
    exports="$(grep -c '^export async function' "$file" || true)"
    gates="$(grep -c 'await requireTeachingAccess(' "$file" || true)"
    if [[ "$exports" -ne "$gates" ]]; then
      echo "Shared page without requireTeachingAccess(): $file ($exports exported pages, $gates gates)"
      result=1
    fi
  done
  return "$result"
}
(cd "$root" && check_teaching_components) || status=1

if [[ "$status" -eq 0 ]]; then
  echo "All protected pages call an explicit auth check."
fi
exit "$status"
