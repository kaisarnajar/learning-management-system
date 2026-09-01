import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { generateApiToken } from "@/services/api-auth";
import { resolveUserRole } from "@/services/teacher-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        image: true,
        registrationNumber: true,
        emailVerified: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const validPassword = await compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
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
    console.error("[api/v1/auth/login] Error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
