import { requireTeacher } from "@/services/auth-actions";

/** Calls the guard, but the page never calls this. */
export async function loadTeacher() {
  return requireTeacher();
}

export default async function UnusedHelperPage() {
  return <p>Teacher data</p>;
}
