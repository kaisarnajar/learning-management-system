import { describe, expect, it } from "vitest";
import { createStudentLookup, IDLE_STUDENT_LOOKUP, type StudentLookupResult, type StudentLookupState } from "@/components/admin/useStudentLookup";

/** A lookup whose answers the test releases by hand, in any order. */
function controllableLookup() {
  const pending = new Map<string, (result: StudentLookupResult) => void>();
  const lookup = (email: string) => new Promise<StudentLookupResult>((resolve) => pending.set(email, resolve));
  return { lookup, answer: (email: string, result: StudentLookupResult) => pending.get(email)!(result) };
}

describe("the admin student lookup", () => {
  it("keeps the latest e-mail's answer when an older one arrives last", async () => {
    const { lookup, answer } = controllableLookup();
    const states: StudentLookupState[] = [];
    const runLookup = createStudentLookup(lookup, (state) => states.push(state));

    const first = runLookup("old@example.test");
    const second = runLookup("new@example.test");
    answer("new@example.test", { ok: true, name: "New Student" });
    await second;
    answer("old@example.test", { ok: false, error: "No student account uses this email." });
    await first;

    expect(states.at(-1)).toEqual({ linkedName: "New Student", error: "", loading: false });
  });

  it("an emptied field cancels the answer still on its way", async () => {
    const { lookup, answer } = controllableLookup();
    const states: StudentLookupState[] = [];
    const runLookup = createStudentLookup(lookup, (state) => states.push(state));

    const pending = runLookup("someone@example.test");
    await runLookup("   ");
    answer("someone@example.test", { ok: true, name: "Someone" });
    await pending;

    expect(states.at(-1)).toEqual(IDLE_STUDENT_LOOKUP);
  });

  it("reports a failed request without keeping a stale name", async () => {
    const states: StudentLookupState[] = [];
    const runLookup = createStudentLookup(() => Promise.reject(new Error("offline")), (state) => states.push(state));
    await runLookup("x@example.test");
    expect(states).toEqual([
      { linkedName: "", error: "", loading: true },
      { linkedName: "", error: "Could not verify this email. Try again.", loading: false },
    ]);
  });
});
