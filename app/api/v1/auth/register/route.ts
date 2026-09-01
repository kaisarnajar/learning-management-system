import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { generateApiToken } from "@/services/api-auth";
import { generateVerificationToken } from "@/services/tokens";
import { sendVerificationEmail } from "@/services/email";
import { CURRENT_POLICIES_VERSION } from "@/config/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const acceptPolicies = body.acceptPolicies;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (acceptPolicies !== true) {
      return NextResponse.json(
        { success: false, error: "You must accept the Terms & Conditions and Privacy Policy." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
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

    // Verification Email
    try {
      const verificationToken = await generateVerificationToken(email);
      const origin = new URL(request.url).origin;
      const verificationUrl = `${origin}/verify-email?token=${verificationToken.token}`;
      await sendVerificationEmail({ to: email, verificationUrl });
    } catch (emailErr) {
      console.error("[api/v1/auth/register] Failed to send verification email:", emailErr);
    }

    const token = await generateApiToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: "USER",
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
        emailVerified: null,
        role: "USER",
      },
    });
  } catch (error) {
    console.error("[api/v1/auth/register] Error:", error);
    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
