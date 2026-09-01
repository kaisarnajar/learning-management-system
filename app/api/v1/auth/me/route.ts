import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        fatherName: true,
        dateOfBirth: true,
        occupation: true,
        address: true,
        whatsapp: true,
        gender: true,
        registrationNumber: true,
        emailVerified: true,
        image: true,
        createdAt: true,
      },
    });

    if (!fullUser) {
      return NextResponse.json(
        { success: false, error: "User profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        ...fullUser,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[api/v1/auth/me] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user profile." },
      { status: 500 }
    );
  }
}
