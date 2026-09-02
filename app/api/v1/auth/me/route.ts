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

export async function PUT(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { name, fatherName, dateOfBirth, occupation, address, whatsapp, gender, image } = body;

    let finalImageUrl: string | undefined = image;
    if (gender === "FEMALE") {
      finalImageUrl = "/assets/female_icon.png";
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(fatherName !== undefined && { fatherName }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(occupation !== undefined && { occupation }),
        ...(address !== undefined && { address }),
        ...(whatsapp !== undefined && { whatsapp }),
        ...(gender !== undefined && { gender }),
        ...(finalImageUrl !== undefined && { image: finalImageUrl }),
      },
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

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[api/v1/auth/me PUT] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
