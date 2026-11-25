import { NextRequest } from "next/server";
import { OCCUPATION_OPTIONS } from "@/services/occupations";
import { publicJson } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  return publicJson(request, {
    success: true,
    data: OCCUPATION_OPTIONS,
  });
}
