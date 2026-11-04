import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Legacy URL kept for old links; the card is now served by `/api/student-card/attendance`. */
export function GET(request: Request) {
  const { search } = new URL(request.url);
  return NextResponse.redirect(new URL(`/api/student-card/attendance${search}`, request.url), 308);
}
