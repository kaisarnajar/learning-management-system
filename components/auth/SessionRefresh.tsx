"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Asks Auth.js to re-run the jwt callback once, so a change made outside the
 * session (an email just verified, a role granted) shows up without a new
 * sign-in. Renders nothing.
 */
export function SessionRefresh() {
  const { update, status } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || done.current) return;
    done.current = true;
    void update();
  }, [status, update]);

  return null;
}
