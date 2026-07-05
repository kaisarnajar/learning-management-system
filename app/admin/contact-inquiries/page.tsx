import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteContactInquiryById as deleteContactInquiry } from "@/app/admin/contact-inquiries/actions";
import { adminActionButtonClassName } from "@/lib/form";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getAllContactInquiriesPaginated } from "@/lib/contact-inquiries";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";


function filterHref(filter: "pending" | "replied" | undefined, q?: string) {
  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/admin/contact-inquiries?${qs}` : "/admin/contact-inquiries";
}

function statusLabel(reply: string | null) {
  return reply ? "Replied" : "Pending";
}

function statusClass(reply: string | null) {
  return reply ? "bg-success-bg text-success-text" : "bg-warning-bg text-warning-text";
}

export default async function AdminContactInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; saved?: string; deleted?: string; error?: string; email?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const filter =
    params.filter === "pending" || params.filter === "replied" ? params.filter : undefined;
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const { items: inquiries, totalCount } = await getAllContactInquiriesPaginated(
    requestedPage,
    pageSize,
    filter,
    q,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Contact inquiries</h1>
          <p className="mt-1 text-sm text-muted">{totalCount} messages</p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Filter inquiries">
          {(
            [
              { label: "All", value: undefined },
              { label: "Pending", value: "pending" as const },
              { label: "Replied", value: "replied" as const },
            ] as const
          ).map((item) => {
            const active = filter === item.value;
            const href = filterHref(item.value, q);
            return (
              <Link
                key={item.label}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  active ? "bg-primary text-white" : "border border-border text-foreground hover:bg-accent-muted/50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <ActionToast trigger={params.saved === "1"} paramName="saved" message={`Reply saved.${params.email === "failed" ? " The notification email could not be sent — check SMTP settings in your environment." : params.email === "skipped" ? " SMTP is not configured, so no email was sent." : " The visitor has been notified by email. If they don't see it, ask them to check their Spam/Junk folder."}`} variant="info" />

      <ActionToast trigger={params.deleted === "1"} paramName="deleted" message="Inquiry deleted." variant="info" />

      {params.error === "notfound" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">Inquiry not found.</p>
      )}

      <div className="mt-6">
        <ListSearchForm
          action="/admin/contact-inquiries"
          query={q}
          placeholder="Search by name, email, phone, or message"
          preserveParams={{ filter: params.filter }}
          totalCount={q ? totalCount : undefined}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        {totalCount === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {q ? "No contact messages match your search." : "No contact messages yet."}
          </p>
        ) : (
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{inquiry.name}</td>
                  <td className="px-4 py-3 text-muted">{inquiry.email}</td>
                  <td className="px-4 py-3 text-muted">{inquiry.phone}</td>
                  <td className="max-w-xs px-4 py-3 text-muted">
                    <p className="line-clamp-2">{inquiry.message}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(inquiry.reply)}`}
                    >
                      {statusLabel(inquiry.reply)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {inquiry.createdAt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/admin/contact-inquiries/${inquiry.id}`}
                        className={adminActionButtonClassName}
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/contact-inquiries/${inquiry.id}/reply`}
                        className={adminActionButtonClassName}
                      >
                        {inquiry.reply ? "Edit" : "Reply"}
                      </Link>
                      <DeleteActionButton action={deleteContactInquiry.bind(null, inquiry.id)} itemName={`${inquiry.name} (${inquiry.email})`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        basePath="/admin/contact-inquiries"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
