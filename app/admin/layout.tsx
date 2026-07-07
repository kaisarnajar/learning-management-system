import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { DeveloperSidebar } from "@/components/developer/DeveloperSidebar";
import { requireAdmin } from "@/services/auth-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const isDeveloper = session.user.role === "DEVELOPER";

  return (
    <div className="min-h-[calc(100vh-4rem)] md:flex">
      {isDeveloper ? <DeveloperSidebar /> : <AdminSidebar />}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
