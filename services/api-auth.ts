import { NextRequest, NextResponse } from "next/server";
import { decode, encode, getToken } from "next-auth/jwt";
import { prisma } from "@/utils/prisma";
import { resolveUserRole } from "@/services/teacher-auth";

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "default_development_secret_key_darse_quran";
const TOKEN_SALT = process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token";
const FALLBACK_SALT = process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token";

export interface ApiUserPayload {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  registrationNumber?: string | null;
}

/**
 * Generate a JWT token for mobile client authentication.
 */
export async function generateApiToken(user: { id: string; email: string; name?: string | null; role?: string }): Promise<string> {
  const token = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "USER",
    },
    secret: AUTH_SECRET,
    salt: TOKEN_SALT,
  });
  return token;
}

/**
 * Verify and decode an API request token (from Bearer Authorization header or session cookie).
 */
export async function authenticateApiRequest(req: NextRequest): Promise<{ user: ApiUserPayload | null; error?: string }> {
  try {
    // 1. Try extracting Bearer token manually or via getToken
    const authHeader = req.headers.get("authorization");
    let tokenPayload: any = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const tokenString = authHeader.substring(7).trim();
      if (tokenString) {
        try {
          tokenPayload = await decode({
            token: tokenString,
            secret: AUTH_SECRET,
            salt: TOKEN_SALT,
          });
        } catch {
          // Try fallback salt
          try {
            tokenPayload = await decode({
              token: tokenString,
              secret: AUTH_SECRET,
              salt: FALLBACK_SALT,
            });
          } catch {
            // Ignore decode error and fallback to getToken
          }
        }
      }
    }

    if (!tokenPayload) {
      // Fallback to NextAuth default cookie or header extraction
      tokenPayload = await getToken({ req, secret: AUTH_SECRET, salt: TOKEN_SALT });
      if (!tokenPayload) {
        tokenPayload = await getToken({ req, secret: AUTH_SECRET, salt: FALLBACK_SALT });
      }
    }

    if (!tokenPayload || (!tokenPayload.email && !tokenPayload.id)) {
      return { user: null, error: "Unauthorized: Invalid or missing token" };
    }

    // 2. Fetch user from DB to verify active account
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          tokenPayload.id ? { id: tokenPayload.id as string } : undefined,
          tokenPayload.email ? { email: (tokenPayload.email as string).toLowerCase().trim() } : undefined,
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        email: true,
        name: true,
        registrationNumber: true,
      },
    });

    if (!dbUser) {
      return { user: null, error: "User account not found" };
    }

    const role = await resolveUserRole(dbUser.email);

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        registrationNumber: dbUser.registrationNumber,
        role,
      },
    };
  } catch (err: any) {
    console.error("[api-auth] Authentication error:", err);
    return { user: null, error: "Internal authentication error" };
  }
}

/**
 * Helper to require student authentication for Phase 1 API endpoints.
 */
export async function requireStudentApiAuth(req: NextRequest): Promise<
  | { user: ApiUserPayload; errorResponse: null }
  | { user: null; errorResponse: NextResponse }
> {
  const { user, error } = await authenticateApiRequest(req);

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: error || "Unauthorized access" },
        { status: 401 }
      ),
    };
  }

  return { user, errorResponse: null };
}
