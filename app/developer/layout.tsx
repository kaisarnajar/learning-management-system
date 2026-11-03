import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requireDeveloper } from "@/services/auth-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Developer Panel",
  robots: { index: false, follow: false },
};

export default async function DeveloperLayout({ children }: { children: React.ReactNode }) {
  await requireDeveloper();

  return (
    <div className="min-h-[calc(100vh-4rem)] md:flex">
      <AdminSidebar title="Developer Panel" showDeveloperItems />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
