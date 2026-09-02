import { NextResponse } from "next/server";
import { OCCUPATION_OPTIONS } from "@/services/occupations";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: OCCUPATION_OPTIONS,
  });
}
