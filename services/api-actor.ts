import { AsyncLocalStorage } from "node:async_hooks";
import type { Session } from "next-auth";

/**
 * The signed-in app user while an /api/v1 route runs one of the website's
 * server actions on their behalf.
 *
 * Server actions read the session through `auth()` (directly or through
 * requireAdmin / requireTeacher). The app authenticates with a Bearer token
 * instead of the session cookie, so the route resolves the token to a user,
 * then runs the action inside `runAsApiActor`; `auth()` returns this session
 * for that call only. Nothing else can set it: it exists only inside the
 * callback, and only API routes that have verified the token call this.
 */
const actor = new AsyncLocalStorage<Session>();

export function getApiActorSession(): Session | undefined {
  return actor.getStore();
}

export function runAsApiActor<T>(session: Session, fn: () => Promise<T>): Promise<T> {
  return actor.run(session, fn);
}
