import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";
import { isUserProfileComplete } from "@/services/profile";
import { getStudentUserById } from "@/services/students";
import { generateIdCardPdf } from "@/utils/id-card-html";
import { apiError } from "@/utils/api-response";

type Params = { params: Promise<{ id: string }> };

/** The student's ID card as a PDF (needs a complete profile). */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/students/[id]/id-card", async () => {
    const student = await getStudentUserById(id);
    if (!student) notFound();
    if (!(await isUserProfileComplete(id))) return apiError("The student must complete their profile first.", 409);
    const pdf = await generateIdCardPdf(student);
    const name = `ID_Card_${student.name?.replace(/\s+/g, "_") || "Student"}.pdf`;
    return new NextResponse(Buffer.from(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, no-store" },
    });
  });
}
