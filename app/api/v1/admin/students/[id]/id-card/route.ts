import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";
import { isUserProfileComplete } from "@/services/profile";
import { getStudentUserById } from "@/services/students";
import { generateIdCardPdf } from "@/utils/id-card-html";
import { apiError } from "@/utils/api-response";
import { pdfResponse } from "@/utils/pdf-response";

type Params = { params: Promise<{ id: string }> };

/** The student's ID card as a PDF (needs a complete profile). */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/students/[id]/id-card", async () => {
    const student = await getStudentUserById(id);
    if (!student) notFound();
    if (!(await isUserProfileComplete(id))) return apiError("The student must complete their profile first.", 409);
    const pdf = await generateIdCardPdf(student);
    return pdfResponse(pdf, `ID Card ${student.name?.trim() || "Student"}`, { inline: true });
  });
}
