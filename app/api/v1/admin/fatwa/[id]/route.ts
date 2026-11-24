import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteFatwaQuestion } from "@/app/admin/fatwa/actions";
import { ADMIN_ROLES, staffAction, staffRead } from "@/services/api-staff";
import { fatwaDetail } from "@/services/api-content";
import { getFatwaQuestionById, getFeaturedHomepageFatwaCount, HOMEPAGE_FEATURED_FATWA_MAX } from "@/services/fatwa";

type Params = { params: Promise<{ id: string }> };

/** One question as /admin/fatwa/[id] shows it: the question, the current answer and the homepage slots. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/fatwa/[id]", async () => {
    const [question, featuredCount] = await Promise.all([getFatwaQuestionById(id), getFeaturedHomepageFatwaCount()]);
    if (!question) notFound();
    return {
      question: { ...fatwaDetail(question, { withAsker: true }), featuredOnHomepage: question.featuredOnHomepage },
      featuredCount,
      featuredMax: HOMEPAGE_FEATURED_FATWA_MAX,
    };
  });
}

/** Deletes the question. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/fatwa/[id] DELETE", () => deleteFatwaQuestion(id));
}
