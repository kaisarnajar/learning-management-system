import Link from "next/link";
import { AdminListPage } from "@/components/shared/AdminListPage";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { TabPills } from "@/components/shared/TabPills";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteFatwaQuestion as deleteFatwa } from "@/app/admin/fatwa/actions";
import { getAllFatwaQuestionsPaginated, type FatwaAdminFilter } from "@/services/fatwa";
import { parseSearchQuery } from "@/utils/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";


function filterHref(filter: FatwaAdminFilter | undefined, q?: string) {
  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/admin/fatwa?${qs}` : "/admin/fatwa";
}

function statusLabel(q: { answer: string | null; approvalStatus: string }) {
  if (q.approvalStatus === "PENDING") return "Pending Review";
  if (q.approvalStatus === "REJECTED") return "Rejected";
  if (q.approvalStatus === "APPROVED" && q.answer) return "Answered";
  return "Unanswered";
}

function statusClass(q: { answer: string | null; approvalStatus: string }) {
  if (q.approvalStatus === "PENDING") return "bg-warning-bg text-warning-text";
  if (q.approvalStatus === "REJECTED") return "bg-destructive-bg text-destructive-text";
  if (q.approvalStatus === "APPROVED" && q.answer) return "bg-success-bg text-success-text";
  return "bg-surface-alt text-muted";
}


type PageParams = {

  filter?: string;
  saved?: string;
  deleted?: string;
  page?: string;
  q?: string;
  [key: string]: string | undefined;
};

import { adminActionButtonClassName } from "@/utils/form";
import { BRAND_CONFIG } from "@/config/brand";
import { requireAdmin } from "@/services/auth-actions";

function FatwaSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Fatwa Q&A</h1>
          <div className="mt-1 h-4 w-24 rounded bg-border/40 animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-20 rounded-full bg-border/40 animate-pulse" />
          ))}
        </div>
      </div>
      <TableSkeleton />
    </>
  );
}

export default async function AdminFatwaPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const filter = (params.filter as FatwaAdminFilter) || undefined;

  return (
    <div>
      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Answer saved and notification sent (or logged if SMTP is not configured)." variant="info" />
      <ActionToast trigger={params.deleted === "1"} paramName="deleted" message="Question deleted." variant="info" />

      <AdminListPage
        basePath="/admin/fatwa"
        params={params}
        q={q}
        searchPlaceholder="Search by subject, asker, email, or category"
        emptyText="No questions yet."
        noMatchText="No questions match your search."
        preserveParams={{ filter: params.filter }}
        skeleton={<FatwaSkeleton />}
        load={(page, pageSize) => getAllFatwaQuestionsPaginated(page, pageSize, filter, q)}
        header={({ totalCount }) => (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-serif text-2xl font-bold text-primary">Fatwa Q&A</h1>
                <p className="mt-1 text-sm text-muted">{totalCount} questions</p>
              </div>
              <TabPills
                ariaLabel="Filter questions"
                items={(
                  [
                    { label: "All", value: undefined },
                    { label: "Unanswered", value: "unanswered" as const },
                    { label: "Pending Review", value: "pending" as const },
                    { label: "Answered", value: "answered" as const },
                    { label: "Rejected", value: "rejected" as const },
                  ] as const
                ).map((item) => ({
                  key: item.label,
                  label: item.label,
                  href: filterHref(item.value, q),
                  active: filter === item.value,
                }))}
              />
            </div>
          </>
        )}
      >
        {({ items: questions }) => (
          <table className="w-full min-w-ui-840 text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Asker</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Homepage</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {questions.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{q.title}</td>
                  <td className="px-4 py-3 text-muted">{q.category}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{q.askerName}</td>
                  <td className="px-4 py-3 text-muted">{q.askerEmail === `anonymous@${new URL(BRAND_CONFIG.websiteUrl).hostname}` ? "N/A" : q.askerEmail}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(q)}`}
                    >
                      {statusLabel(q)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {q.featuredOnHomepage && q.answer ? "Featured" : "Not featured"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {q.createdAt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {q.approvalStatus === "PENDING" ? (
                        <Link href={`/admin/fatwa/${q.id}`} className={adminActionButtonClassName}>
                          Review
                        </Link>
                      ) : q.answer ? (
                        <>
                          {q.approvalStatus === "APPROVED" && (
                            <Link href={`/fatwa/${q.id}`} className={adminActionButtonClassName} target="_blank">
                              View
                            </Link>
                          )}
                          <Link href={`/admin/fatwa/${q.id}`} className={adminActionButtonClassName}>
                            Edit
                          </Link>
                        </>
                      ) : (
                        <Link href={`/admin/fatwa/${q.id}`} className={adminActionButtonClassName}>
                          Answer
                        </Link>
                      )}
                      <DeleteActionButton action={deleteFatwa.bind(null, q.id)} itemName={q.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminListPage>
    </div>
  );
}

