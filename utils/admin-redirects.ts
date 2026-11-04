import { revalidatePath } from "next/cache";

/**
 * Where to send an admin after an action: back to the page they came from (`returnTo`, only if it
 * is an /admin path) or to `fallbackPath`, with `?<event>=1` set so the list can show a toast.
 */
export function adminReturnUrl(returnTo: string | undefined, fallbackPath: string, event?: string): string {
  if (!returnTo?.startsWith("/admin")) {
    return event ? `${fallbackPath}?${event}=1` : fallbackPath;
  }
  const [pathname, query = ""] = returnTo.split("?");
  const params = new URLSearchParams(query);
  if (event) {
    params.set(event, "1");
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Revalidates each path as both a page and a layout. */
export function revalidateAdminPaths(paths: readonly string[]) {
  for (const path of paths) {
    revalidatePath(path, "layout");
    revalidatePath(path, "page");
  }
}
