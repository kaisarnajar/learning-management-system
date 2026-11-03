#!/usr/bin/env bash
# Fails when a protected page does not call its auth helper as an explicit check.
#
# Layouts already guard /admin, /teacher and /developer, but a page that is
# moved or rendered outside its layout must not silently become public.
#   app/admin/**/page.tsx      -> requireAdmin()
#   app/developer/**/page.tsx  -> requireDeveloper()
#   app/teacher/**/page.tsx    -> requireTeacher() (or a requireTeacher* helper)
#   app/profile/**/page.tsx    -> requireUser()
# Pages whose protection is deliberately different are listed in ALLOWLIST.
set -euo pipefail
cd "$(dirname "$0")/.."

# Pages that legitimately use a different guard (e.g. a stricter helper that
# itself calls the base require* function). Paths relative to the repo root.
ALLOWLIST=()

check() {
  local root="$1" pattern="$2" status=0 file
  [[ -d "$root" ]] || return 0
  while IFS= read -r -d '' file; do
    for allowed in "${ALLOWLIST[@]:-}"; do
      [[ "$file" == "$allowed" ]] && continue 2
    done
    if ! grep -Eq "$pattern" "$file"; then
      echo "Unprotected page: $file (expected $pattern)"
      status=1
    fi
  done < <(find "$root" -name page.tsx -print0 | sort -z)
  return "$status"
}

status=0
check app/admin 'requireAdmin\(' || status=1
check app/developer 'requireDeveloper\(' || status=1
check app/teacher 'requireTeacher[A-Za-z]*\(' || status=1
check app/profile 'requireUser\(|requireStudent[A-Za-z]*\(' || status=1

if [[ "$status" -eq 0 ]]; then
  echo "All protected pages call an explicit auth check."
fi
exit "$status"
