import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { runSeedDemo } from "@/prisma/seed-demo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  // Safety check: require ALLOW_DEMO_SEED=true OR secret=seed123 OR dev branch on Vercel
  const isDevBranch = process.env.VERCEL_GIT_COMMIT_REF === "dev";
  const isAllowed = process.env.ALLOW_DEMO_SEED === "true" || secret === "seed123" || isDevBranch;

  if (process.env.NODE_ENV === "production" && !isAllowed) {
    return NextResponse.json(
      { error: "Seeding is disabled on production unless secret=seed123 or ALLOW_DEMO_SEED=true" },
      { status: 403 }
    );
  }

  try {
    const tableCounts = await runSeedDemo(prisma);
    return NextResponse.json({
      success: true,
      message: "Staging database successfully populated with demo data!",
      tableCounts,
    });
  } catch (error: any) {
    console.error("Seed API error:", error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
