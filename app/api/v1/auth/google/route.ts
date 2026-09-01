import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { generateApiToken } from "@/services/api-auth";
import { resolveUserRole } from "@/services/teacher-auth";
import { CURRENT_POLICIES_VERSION } from "@/config/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = typeof body.idToken === "string" ? body.idToken : (typeof body.token === "string" ? body.token : "");

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "Google ID token is required." },
        { status: 400 }
      );
    }

    // Verify token with Google's public tokeninfo endpoint
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!googleRes.ok) {
      return NextResponse.json(
        { success: false, error: "Invalid Google ID token." },
        { status: 401 }
      );
    }

    const payload = await googleRes.json();
    const email = payload.email ? payload.email.toLowerCase().trim() : "";
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Google token did not contain a valid email address." },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        registrationNumber: true,
        emailVerified: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: payload.name || email.split("@")[0],
          image: payload.picture || null,
          emailVerified: new Date(),
          policiesAcceptedAt: new Date(),
          policiesAcceptedVersion: CURRENT_POLICIES_VERSION,
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          registrationNumber: true,
          emailVerified: true,
        },
      });
    } else if (!user.emailVerified) {
      // Auto-verify email upon Google sign-in
      user = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          registrationNumber: true,
          emailVerified: true,
        },
      });
    }

    const role = await resolveUserRole(user.email);
    const token = await generateApiToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        registrationNumber: user.registrationNumber,
        emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
        role,
      },
    });
  } catch (error) {
    console.error("[api/v1/auth/google] Error:", error);
    return NextResponse.json(
      { success: false, error: "Google authentication failed." },
      { status: 500 }
    );
  }
}
