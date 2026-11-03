import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderReceiptToHtml } from "@/utils/receipt-html";
import { renderCertificateToHtml } from "@/utils/certificate-html";
import { renderIdCardToHtml } from "@/utils/id-card-html";
import { renderGradeCardToHtml, type GradeCardData } from "@/utils/grade-card-html";
import { renderAttendanceCardToHtml, type AttendanceCardData } from "@/utils/attendance-card-html";
import type { ReceiptData } from "@/types/receipt";
import { escapeHtml } from "@/utils/html-escape";
import * as academic from "@/services/email/templates/academic";
import * as auth from "@/services/email/templates/auth";
import * as bookstore from "@/services/email/templates/bookstore";
import * as communication from "@/services/email/templates/communication";
import * as enrollment from "@/services/email/templates/enrollment";
import * as finance from "@/services/email/templates/finance";
import { findActiveContent, isServerBuiltField, poison, XSS_PAYLOADS } from "../helpers/xss";

const sent = vi.hoisted(() => ({ messages: [] as Array<{ html: string; subject: string }> }));

vi.mock("@/services/email/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/email/core")>();
  return {
    ...actual,
    deliverMail: vi.fn(async (params: { html: string; subject: string }) => {
      sent.messages.push({ html: params.html, subject: params.subject });
      return { sent: false, skipped: true };
    }),
  };
});

/** Strings that carry user text. URLs and data URLs are built by the server and stay as they are. */
const isUserText = (key: string) => !isServerBuiltField(key) && !["certificateType", "role", "status"].includes(key);

/** A payload only counts as neutralised if the raw string is gone and the parsed markup has nothing executable. */
function expectNeutralised(html: string, payload: string) {
  expect(html).not.toContain(payload);
  expect(findActiveContent(html)).toEqual([]);
}

const receipt: ReceiptData = {
  academy: { name: "Academy", address: "1 Road", phone: "123", email: "a@b.c", website: "https://example.org", logoUrl: "data:image/png;base64,AAAA" },
  student: { name: "Student", address: "2 Street", phone: "456" },
  payment: {
    receiptId: "DQA-INV/2026-27/00001",
    date: "01 Mar 2026",
    method: "UPI",
    courseName: "Tajweed",
    academicTerm: "Term 1",
    amount: 50000,
    baseAmount: 42373,
    gstAmount: 7627,
    gstRatePercent: 18,
    currency: "₹",
    typeLabel: "Enrollment fee",
  },
  authority: { name: "Director", designation: "Principal", signatureUrl: "data:image/png;base64,AAAA", stampUrl: "data:image/png;base64,AAAA" },
  termsAndConditions: ["Fees are non-refundable.", "Keep this receipt."],
};

const certificate = {
  studentName: "Student",
  address: "2 Street",
  courseName: "Tajweed",
  issueDate: "01 Mar 2026",
  signatureUrl: "data:image/png;base64,AAAA",
  sealUrl: "data:image/png;base64,AAAA",
  stampUrl: "data:image/png;base64,AAAA",
  academyName: "Academy",
  academyEmail: "a@b.c",
  academyPhone: "123",
  certificateNumber: "DQA-CERT/2026-27/00001",
  certificateType: "COMPLETION",
  certificateGrade: 9,
};

const idCard = {
  studentName: "Student",
  fathersName: "Father",
  residence: "2 Street",
  email: "s@example.test",
  phone: "+91 9876543210",
  dob: "15 Jan 2000",
  registrationNo: "REG-1",
  profilePicUrl: "data:image/png;base64,AAAA",
  logoUrl: "data:image/png;base64,AAAA",
  signatureUrl: "data:image/png;base64,AAAA",
  stampUrl: "data:image/png;base64,AAAA",
  role: "USER",
};

const gradeCard: GradeCardData = {
  academyName: "Academy",
  academyAddress: "1 Road",
  academyPhone: "123",
  academyEmail: "a@b.c",
  academyWebsite: "https://example.org",
  logoUrl: "data:image/png;base64,AAAA",
  studentName: "Student",
  rollNumber: "01",
  studentEmail: "s@example.test",
  courseTitle: "Tajweed",
  issueDate: "01 Mar 2026",
  exams: [{ title: "Mid-term", date: "05 Mar 2026", marksObtained: 40, maxMarks: 50 }],
  totalExams: 1,
  totalMarksObtained: 40,
  totalMaxMarks: 50,
  percentage: 80,
  overallGrade: "A",
  signatureUrl: "data:image/png;base64,AAAA",
  stampUrl: "data:image/png;base64,AAAA",
  authorityName: "Director",
  authorityDesignation: "Principal",
};

const attendanceCard: AttendanceCardData = {
  academyName: "Academy",
  academyAddress: "1 Road",
  academyPhone: "123",
  academyEmail: "a@b.c",
  academyWebsite: "https://example.org",
  logoUrl: "data:image/png;base64,AAAA",
  studentName: "Student",
  rollNumber: "01",
  studentEmail: "s@example.test",
  courseTitle: "Tajweed",
  issueDate: "01 Mar 2026",
  records: [{ date: "01 Mar 2026", status: "Present" }, { date: "02 Mar 2026", status: "Absent" }],
  totalClasses: 2,
  totalPresent: 1,
  totalAbsent: 1,
  attendancePercentage: 50,
  signatureUrl: "data:image/png;base64,AAAA",
  stampUrl: "data:image/png;base64,AAAA",
  authorityName: "Director",
  authorityDesignation: "Principal",
};

const DOCUMENTS: Array<[string, (payload: string) => string]> = [
  ["receipt", (p) => renderReceiptToHtml(poison(receipt, p, isUserText))],
  ["certificate", (p) => renderCertificateToHtml(poison(certificate, p, isUserText))],
  ["ID card", (p) => renderIdCardToHtml(poison(idCard, p, isUserText))],
  ["grade card", (p) => renderGradeCardToHtml(poison(gradeCard, p, isUserText))],
  ["attendance card", (p) => renderAttendanceCardToHtml(poison(attendanceCard, p, isUserText))],
];

describe("active-content detector", () => {
  it("flags what a browser would execute and ignores inert text", () => {
    expect(findActiveContent(`<img src=x onerror=alert(1)>`)).toEqual(["img onerror="]);
    expect(findActiveContent(`<a href="java&#x09;script:alert(1)">x</a>`)).toEqual(["a href=javascript:"]);
    expect(findActiveContent(`<p>x</p><script>alert(1)</script>`)).toEqual(["<script>"]);
    expect(findActiveContent(`<p title="&lt;img onerror=x&gt;">&lt;script&gt;alert(1)&lt;/script&gt;</p>`)).toEqual([]);
  });
});

describe("PDF document templates escape user-controlled text", () => {
  it.each(DOCUMENTS)("%s renders benign data without the payloads", (_name, render) => {
    const html = render("Plain & simple");
    expect(html).toContain("Plain &amp; simple");
  });

  describe.each(DOCUMENTS)("%s", (_name, render) => {
    it.each(XSS_PAYLOADS)("neutralises %s", (payload) => {
      const html = render(payload);

      expectNeutralised(html, payload);
      // The text is still shown, just inert.
      expect(html).toContain(escapeHtml(payload));
    });
  });
});

const EMAIL_MODULES: Array<[string, Record<string, unknown>]> = [
  ["academic", academic],
  ["auth", auth],
  ["bookstore", bookstore],
  ["communication", communication],
  ["enrollment", enrollment],
  ["finance", finance],
];

const SENDERS = EMAIL_MODULES.flatMap(([moduleName, exports]) =>
  Object.entries(exports)
    .filter(([name, value]) => name.startsWith("send") && typeof value === "function")
    .map(([name, fn]) => [`${moduleName}/${name}`, fn as (params: unknown) => Promise<unknown>] as const),
);

/** Params where every user-text field is the payload and every `*Url` field is a safe link. */
function emailParams(payload: string) {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (typeof prop !== "string") return undefined;
        if (/url$/i.test(prop)) return "https://example.org/profile";
        if (prop === "pdfBuffer") return Buffer.from("%PDF-");
        if (prop === "status") return "approved";
        return payload;
      },
    },
  );
}

describe("e-mail templates escape user-controlled text", () => {
  beforeEach(() => {
    sent.messages.length = 0;
  });

  it("covers every sender in the template modules", () => {
    expect(SENDERS.length).toBeGreaterThanOrEqual(20);
  });

  describe.each(SENDERS)("%s", (_name, send) => {
    it.each(XSS_PAYLOADS)("neutralises %s", async (payload) => {
      sent.messages.length = 0;

      await send(emailParams(payload));

      expect(sent.messages.length).toBeGreaterThan(0);
      for (const message of sent.messages) expectNeutralised(message.html, payload);
    });
  });

  it("actually renders the escaped text (the harness is not vacuous)", async () => {
    const payload = XSS_PAYLOADS[2];
    let rendered = 0;
    for (const [, send] of SENDERS) {
      sent.messages.length = 0;
      await send(emailParams(payload));
      if (sent.messages.some((m) => m.html.includes(escapeHtml(payload)))) rendered += 1;
    }
    expect(rendered).toBeGreaterThan(SENDERS.length / 2);
  });
});
