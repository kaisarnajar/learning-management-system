import { redirect } from "next/navigation";
import { requireDeveloper } from "@/services/auth-actions";

export default async function DeveloperDashboardPage() {
  await requireDeveloper();
  redirect("/admin");
}
