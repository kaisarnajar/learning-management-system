import { NextRequest, NextResponse } from "next/server";

const CORS_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const CORS_HEADERS = "Content-Type, Authorization, X-Requested-With";
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Origins allowed to call /api/v1 from a browser. Empty by default (native apps send no Origin). */
function getAllowedApiOrigins(): Set<string> {
  return new Set(
    (process.env.API_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim().toLowerCase().replace(/\/$/, ""))
      .filter(Boolean),
  );
}

function applyCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", CORS_METHODS);
  response.headers.set("Access-Control-Allow-Headers", CORS_HEADERS);
  response.headers.set("Vary", "Origin");
}

function handleApiV1(request: NextRequest): NextResponse {
  const allowedOrigins = getAllowedApiOrigins();
  const origin = request.headers.get("origin")?.toLowerCase().replace(/\/$/, "") ?? null;
  const originAllowed = origin !== null && allowedOrigins.has(origin);

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: originAllowed ? 204 : 403 });
    if (originAllowed && origin) {
      applyCorsHeaders(response, origin);
      response.headers.set("Access-Control-Max-Age", "86400");
    }
    return response;
  }

  // CSRF guard: a browser-initiated cross-site request carries Origin and/or
  // Sec-Fetch-Site. Native mobile clients send neither, so they pass through.
  if (STATE_CHANGING_METHODS.has(request.method)) {
    const fetchSite = request.headers.get("sec-fetch-site");
    const crossSite = fetchSite === "cross-site" || (origin !== null && !originAllowed);
    if (crossSite) {
      return NextResponse.json(
        { success: false, error: "Cross-site requests are not allowed." },
        { status: 403 },
      );
    }
  }

  const response = NextResponse.next();
  if (originAllowed && origin) {
    applyCorsHeaders(response, origin);
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/v1")) {
    return handleApiV1(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
