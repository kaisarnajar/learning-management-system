import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply CORS headers to all /api/v1/* mobile API routes
  if (pathname.startsWith("/api/v1")) {
    // Handle preflight OPTIONS requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
