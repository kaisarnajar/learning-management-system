"use client";

import { useState } from "react";

/** What the server answers for an e-mail (previewStudentAccountForEnrollment). */
export type StudentLookupResult = { ok: true; name: string } | { ok: false; error: string };

export type StudentLookupState = {
  /** The account's name once the e-mail matched a student, else "". */
  linkedName: string;
  /** Why the e-mail cannot be used, else "". */
  error: string;
  loading: boolean;
};

export const IDLE_STUDENT_LOOKUP: StudentLookupState = { linkedName: "", error: "", loading: false };

const LOOKUP_FAILED = "Could not verify this email. Try again.";

/**
 * Looks up the account behind an e-mail. Every call gets a request id and
 * only the latest call may update the state, so a slow answer for an e-mail
 * the admin has since changed never overwrites the answer for the new one.
 */
export function createStudentLookup(
  lookup: (email: string) => Promise<StudentLookupResult>,
  setState: (state: StudentLookupState) => void,
): (email: string) => Promise<void> {
  let latestRequestId = 0;
  return async function runLookup(email: string) {
    const requestId = ++latestRequestId;
    const trimmed = email.trim();
    if (!trimmed) {
      setState(IDLE_STUDENT_LOOKUP);
      return;
    }
    setState({ linkedName: "", error: "", loading: true });
    let next: StudentLookupState;
    try {
      const result = await lookup(trimmed);
      next = result.ok
        ? { linkedName: result.name, error: "", loading: false }
        : { linkedName: "", error: result.error, loading: false };
    } catch {
      next = { linkedName: "", error: LOOKUP_FAILED, loading: false };
    }
    if (requestId === latestRequestId) setState(next);
  };
}

/** The student lookup shared by the admin enrol and record-payment forms. */
export function useStudentLookup(lookup: (email: string) => Promise<StudentLookupResult>) {
  const [state, setState] = useState<StudentLookupState>(IDLE_STUDENT_LOOKUP);
  // Created once: the request counter must survive re-renders.
  const [runLookup] = useState(() => createStudentLookup(lookup, setState));
  return { ...state, runLookup };
}
