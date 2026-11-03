#!/usr/bin/env bash
# Compiles the Tailwind stylesheet the PDF templates need (generated/pdf.css).
# Runs before `next build` and `next dev`; the generated folder is git-ignored.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p generated
node node_modules/tailwindcss-v3/lib/cli.js -c tailwind.pdf.config.js -i styles/pdf.css -o generated/pdf.css --minify >/dev/null
echo "generated/pdf.css: $(wc -c < generated/pdf.css) bytes"
