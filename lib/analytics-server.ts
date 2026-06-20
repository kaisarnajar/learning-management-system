import { prisma } from "@/lib/prisma";

export async function getAnalyticsSummary() {
  const [
    totalViews,
    totalClicks,
    totalEvents,
    eventsToday,
    eventsWeek,
    eventsMonth
  ] = await Promise.all([
    prisma.analyticsEvent.count({ where: { type: "PAGE_VIEW" } }),
    prisma.analyticsEvent.count({ where: { type: "BUTTON_CLICK" } }),
    prisma.analyticsEvent.count(),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
  ]);

  const topPages = await prisma.analyticsEvent.groupBy({
    by: ['page'],
    where: { type: "PAGE_VIEW" },
    _count: { page: true },
    orderBy: { _count: { page: 'desc' } },
    take: 1,
  });

  const topButtons = await prisma.analyticsEvent.groupBy({
    by: ['eventName'],
    where: { type: "BUTTON_CLICK", eventName: { not: null } },
    _count: { eventName: true },
    orderBy: { _count: { eventName: 'desc' } },
    take: 1,
  });

  return {
    totalViews,
    totalClicks,
    totalEvents,
    mostVisitedPage: topPages[0]?.page || "—",
    mostClickedButton: topButtons[0]?.eventName || "—",
    eventsToday,
    eventsWeek,
    eventsMonth,
  };
}

export async function getPageAnalytics(page = 1, pageSize = 20, query = "") {
  const pages = await prisma.analyticsEvent.groupBy({
    by: ['page'],
    where: {
      type: "PAGE_VIEW",
      ...(query ? { page: { contains: query, mode: "insensitive" } } : {}),
    },
    _count: { page: true },
    _max: { createdAt: true },
    orderBy: { _count: { page: 'desc' } },
    take: pageSize,
    skip: (page - 1) * pageSize,
  });
  
  const distinctPages = await prisma.analyticsEvent.findMany({
    where: {
      type: "PAGE_VIEW",
      ...(query ? { page: { contains: query, mode: "insensitive" } } : {}),
    },
    select: { page: true },
    distinct: ['page'],
  });

  return {
    items: pages.map((p) => ({
      page: p.page,
      views: p._count.page,
      lastViewed: p._max.createdAt,
    })),
    totalCount: distinctPages.length,
  };
}

export async function getButtonAnalytics(page = 1, pageSize = 20, query = "") {
  const buttons = await prisma.analyticsEvent.groupBy({
    by: ['eventName', 'page'],
    where: {
      type: "BUTTON_CLICK",
      eventName: { not: null },
      ...(query ? { eventName: { contains: query, mode: "insensitive" } } : {}),
    },
    _count: { eventName: true },
    _max: { createdAt: true },
    orderBy: { _count: { eventName: 'desc' } },
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  const distinctButtons = await prisma.analyticsEvent.findMany({
    where: {
      type: "BUTTON_CLICK",
      eventName: { not: null },
      ...(query ? { eventName: { contains: query, mode: "insensitive" } } : {}),
    },
    select: { eventName: true, page: true },
    distinct: ['eventName', 'page'],
  });

  return {
    items: buttons.map((b) => ({
      eventName: b.eventName!,
      page: b.page,
      clicks: b._count.eventName,
      lastClicked: b._max.createdAt,
    })),
    totalCount: distinctButtons.length,
  };
}
