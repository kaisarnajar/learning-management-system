import { NextResponse } from "next/server";
import { contentDisposition } from "@/utils/filename";

/**
 * A PDF download. `displayName` is what the reader sees (any script, quotes
 * allowed; a trailing ".pdf" is ignored): the header carries an ASCII fallback
 * and the full UTF-8 name, so a non-Latin name never breaks the response.
 * Documents carry personal data, so nothing on the way may keep a copy.
 */
export function pdfResponse(
  pdf: Uint8Array,
  displayName: string,
  options: { inline?: boolean } = {},
): NextResponse {
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(options.inline ? "inline" : "attachment", displayName.replace(/\.pdf$/i, ""), "pdf"),
      "Cache-Control": "private, no-store",
    },
  });
}
