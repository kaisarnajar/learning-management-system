import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { isDeveloperSession } from "@/lib/developer";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (isAdminSession(session) || isDeveloperSession(session)) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const body = await req.json();
    const { type, page, eventName } = body;

    if (!type || !page) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await prisma.analyticsEvent.create({
      data: {
        type,
        page,
        eventName: eventName || null,
        userId: session?.user?.id || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
