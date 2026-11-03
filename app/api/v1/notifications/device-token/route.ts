import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";
import { devicePlatformData, devicePlatformFromText } from "@/services/status-compat";

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const rawPlatform = typeof body.platform === "string" && body.platform.trim() ? body.platform : "android";
    const platform = devicePlatformFromText(rawPlatform);

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Device FCM token is required." },
        { status: 400 }
      );
    }

    if (!platform) {
      return NextResponse.json(
        { success: false, error: "platform must be one of android, ios or web." },
        { status: 400 }
      );
    }

    const deviceToken = await prisma.deviceToken.upsert({
      where: { token },
      create: {
        userId: user.id,
        token,
        ...devicePlatformData(platform),
      },
      update: {
        userId: user.id,
        ...devicePlatformData(platform),
      },
    });

    return NextResponse.json({
      success: true,
      deviceToken,
    });
  } catch (error) {
    console.error("[api/v1/notifications/device-token] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to register FCM device token." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Device FCM token is required." },
        { status: 400 }
      );
    }

    await prisma.deviceToken.deleteMany({
      where: {
        userId: user.id,
        token,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Device token unregistered.",
    });
  } catch (error) {
    console.error("[api/v1/notifications/device-token] DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to unregister device token." },
      { status: 500 }
    );
  }
}
