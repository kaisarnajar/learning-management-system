import { requireAdmin } from "@/services/auth-actions";

async function loadPage() {
  await requireAdmin();
  return "Admin data";
}

export default async function ThroughHelperPage() {
  return <p>{await loadPage()}</p>;
}
