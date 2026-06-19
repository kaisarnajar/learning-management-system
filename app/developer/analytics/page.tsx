import { Metadata } from "next";
import { getAnalyticsSummary, getPageAnalytics, getButtonAnalytics } from "@/lib/analytics-server";
import { parsePaginationParams, clampPage } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { requireDeveloper } from "@/lib/auth-actions";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";

export const metadata: Metadata = {
  title: "Analytics | Developer",
};

export default async function DeveloperAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; tab?: string }>;
}) {
  await requireDeveloper();
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const activeTab = params.tab === "buttons" ? "buttons" : "pages";
  const { page: requestedPage, pageSize } = parsePaginationParams(params);

  const [summary, pagesData, buttonsData] = await Promise.all([
    getAnalyticsSummary(),
    activeTab === "pages" ? getPageAnalytics(requestedPage, pageSize, q) : null,
    activeTab === "buttons" ? getButtonAnalytics(requestedPage, pageSize, q) : null,
  ]);

  const activeData = activeTab === "pages" ? pagesData! : buttonsData!;
  const page = clampPage(requestedPage, activeData.totalCount, pageSize);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-primary">Event Tracking & Analytics</h1>
        <p className="mt-1 text-sm text-muted">View user engagement and activity metrics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Page Views" value={summary.totalViews} />
        <SummaryCard title="Total Button Clicks" value={summary.totalClicks} />
        <SummaryCard title="Total Events" value={summary.totalEvents} />
        <SummaryCard title="Events Today" value={summary.eventsToday} />
        <SummaryCard title="Events This Week" value={summary.eventsWeek} />
        <SummaryCard title="Events This Month" value={summary.eventsMonth} />
        <SummaryCard title="Most Visited Page" value={summary.mostVisitedPage} />
        <SummaryCard title="Most Clicked Button" value={summary.mostClickedButton} />
      </div>

      <div className="mt-8 border-b border-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <a
            href="?tab=pages"
            className={`${
              activeTab === "pages"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:border-border hover:text-foreground"
            } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
          >
            Page Analytics
          </a>
          <a
            href="?tab=buttons"
            className={`${
              activeTab === "buttons"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:border-border hover:text-foreground"
            } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
          >
            Button Analytics
          </a>
        </nav>
      </div>

      <div className="mt-6">
        <ListSearchForm
          action="/developer/analytics"
          query={q}
          placeholder={`Search by ${activeTab === "pages" ? "page URL" : "event name"}...`}
          totalCount={q ? activeData.totalCount : undefined}
          preserveParams={{ tab: activeTab }}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        {activeData.totalCount === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {q ? "No analytics data match your search." : "No analytics data yet."}
          </p>
        ) : (
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                {activeTab === "pages" ? (
                  <>
                    <th className="px-4 py-3 font-medium">Page Name</th>
                    <th className="px-4 py-3 font-medium">Total Views</th>
                    <th className="px-4 py-3 font-medium">Last Viewed</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 font-medium">Event Name</th>
                    <th className="px-4 py-3 font-medium">Page Name</th>
                    <th className="px-4 py-3 font-medium">Total Clicks</th>
                    <th className="px-4 py-3 font-medium">Last Clicked</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeTab === "pages" &&
                (activeData.items as any[]).map((item) => (
                  <tr key={item.page}>
                    <td className="px-4 py-3 font-medium text-foreground">{item.page}</td>
                    <td className="px-4 py-3 text-muted">{item.views}</td>
                    <td className="px-4 py-3 text-muted">
                      {item.lastViewed ? item.lastViewed.toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              {activeTab === "buttons" &&
                (activeData.items as any[]).map((item) => (
                  <tr key={`${item.eventName}-${item.page}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{item.eventName}</td>
                    <td className="px-4 py-3 text-muted">{item.page}</td>
                    <td className="px-4 py-3 text-muted">{item.clicks}</td>
                    <td className="px-4 py-3 text-muted">
                      {item.lastClicked ? item.lastClicked.toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        basePath="/developer/analytics"
        params={{ ...params, tab: activeTab }}
        page={page}
        totalCount={activeData.totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm transition-all hover:border-primary/30">
      <h3 className="text-sm font-medium text-muted">{title}</h3>
      <p className="mt-2 truncate text-2xl font-bold text-foreground" title={String(value)}>
        {value}
      </p>
    </div>
  );
}
