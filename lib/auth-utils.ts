import { auth } from "@/lib/auth";

export async function ensureAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required" };
  }
  return { session };
}
