import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import * as validations from "@/utils/validations";

beforeAll(() => {
  process.env.R2_PUBLIC_URL = "https://files.example.org";
});

type Cases = { valid: unknown[]; invalid: unknown[] };

const text = (n: number) => "a".repeat(n);

const profile = {
  name: "Ayesha Khan",
  fatherName: "Imran Khan",
  dateOfBirth: "2000-01-15",
  occupation: "STUDENT",
  address: "12 Main Street, Srinagar",
  country: "IN",
  whatsapp: "9876543210",
  gender: "FEMALE",
};

const course = {
  title: "Tajweed Basics",
  description: "Learn the rules of recitation.",
  startDate: "2026-04-01",
  duration: "6 months",
  level: "Beginner",
  category: "Quran",
  enrollmentFeeInr: 0,
  monthlyFeeInr: 349,
  feeFrequency: "MONTHLY",
  teacherId: "teacher1",
  status: "PUBLISHED",
};

const paymentSettings = {
  upiId: "academy@bank",
  upiNumber: "9876543210",
  upiPayeeName: "Academy",
  bankAccountName: "Academy Trust",
  bankName: "Bank",
  bankAccountNumber: "1234567890",
  bankIfsc: "ABCD0123456",
  bankBranch: "Main",
  includeGstByDefault: false,
  feeWaiverEnabled: true,
  autoApproveFullWaivers: false,
};

const book = {
  title: "Noorani Qaida",
  author: "Author Name",
  description: "A beginner reading primer.",
  priceInr: "120",
  mrpInr: "150",
  purchasePriceInr: "80",
  inventoryPurchased: "100",
  weightInGrams: "250",
  status: "AVAILABLE",
  published: true,
};

const coupon = {
  code: "save10",
  percentage: 10,
  validFrom: "2026-01-01",
  validUntil: "2026-12-31",
  courseId: "",
  gender: "",
  isActive: true,
  applyTo: "BOTH",
};

const checkout = {
  items: [{ bookId: "b1", quantity: 2 }],
  paymentMethod: "upi",
  upiTransactionId: "UTR123456",
  deliveryAddress: "12 Main Street, Srinagar",
  deliveryPinCode: "190001",
  deliveryPhoneNumber: "9876543210",
};

const grades = {
  title: "Mid-term",
  maxMarks: 50,
  records: [
    { enrollmentId: "e1", marksObtained: 40 },
    { enrollmentId: "e2", marksObtained: null },
  ],
};

/**
 * One valid and one invalid sample set for every exported Zod schema. The
 * "covers every exported schema" test below fails when a schema is added to
 * utils/validations.ts without cases here.
 */
const CASES: Record<string, Cases> = {
  levelEnum: { valid: ["Beginner", "Advanced"], invalid: ["Expert", "", null] },
  feeFrequencyEnum: { valid: ["YEARLY", undefined], invalid: ["WEEKLY"] },
  courseStatusEnum: { valid: ["DRAFT", "COMING_SOON"], invalid: ["ARCHIVED"] },
  courseCategoryEnum: { valid: ["Quran"], invalid: ["a", text(101)] },
  courseSchema: {
    valid: [course, { ...course, enrollmentFeeInr: "500", monthlyFeeInr: "0" }],
    invalid: [{ ...course, title: "ab" }, { ...course, monthlyFeeInr: -1 }, { ...course, level: "Expert" }, {}],
  },
  teacherAdminSchema: {
    valid: [{ email: "t@example.com", specialization: "Tajweed", bio: "Ten years of teaching.", initials: "AK", published: "true" }],
    invalid: [
      { email: "nope", specialization: "Tajweed", bio: "Ten years of teaching.", published: true },
      { email: "t@example.com", specialization: "Tajweed", bio: "Ten years of teaching.", initials: "TOOLONG", published: true },
    ],
  },
  libraryLanguageEnum: { valid: ["English"], invalid: ["x"] },
  libraryTopicEnum: { valid: ["Fiqh"], invalid: ["x"] },
  libraryItemSchema: {
    valid: [{ title: "Book", author: "Author", topic: "Fiqh", level: "Beginner", language: "English", pdfUrl: "https://example.com/a.pdf", published: true }],
    invalid: [
      { title: "Book", author: "Author", topic: "Fiqh", level: "Beginner", language: "English", pdfUrl: "ftp://example.com/a.pdf", published: true },
      { title: "Book", author: "Author", topic: "Fiqh", level: "Beginner", language: "English", pdfUrl: "javascript:alert(1)", published: true },
    ],
  },
  fatwaCategoryEnum: { valid: ["Prayer"], invalid: ["x"] },
  fatwaQuestionSchema: {
    valid: [{ category: "Prayer", title: "A valid question title", question: text(40), askerName: "Ali", askerEmail: "ali@example.com" }],
    invalid: [
      { category: "Prayer", title: "short", question: text(40), askerName: "Ali", askerEmail: "ali@example.com" },
      { category: "Prayer", title: "A valid question title", question: text(10), askerName: "Ali", askerEmail: "ali@example.com" },
      { category: "Prayer", title: "A valid question title", question: text(40), askerName: "Ali", askerEmail: "bad" },
    ],
  },
  fatwaAnswerSchema: { valid: [{ answer: text(25) }], invalid: [{ answer: text(5) }, { answer: text(10001) }] },
  adminEnrollUserSchema: { valid: [{ email: "s@example.com", courseId: "c1" }], invalid: [{ email: "s@example.com", courseId: "" }, { email: "x", courseId: "c1" }] },
  registerSchema: {
    valid: [{ email: " User@Example.com ", password: "longenough", acceptPolicies: true, name: null }],
    invalid: [
      { email: "user@example.com", password: "short", acceptPolicies: true },
      { email: "user@example.com", password: "longenough", acceptPolicies: false },
      { password: "longenough", acceptPolicies: true },
      { email: "not-an-email", password: "longenough", acceptPolicies: true },
    ],
  },
  forgotPasswordSchema: { valid: [{ email: "a@example.com" }], invalid: [{ email: "" }, {}] },
  resetPasswordSchema: {
    valid: [{ token: "t", password: "longenough", confirmPassword: "longenough" }],
    invalid: [{ token: "t", password: "longenough", confirmPassword: "different1" }, { token: "", password: "longenough", confirmPassword: "longenough" }],
  },
  paymentSettingsSchema: {
    valid: [paymentSettings, { ...paymentSettings, upiNumber: "", bankBranch: "" }],
    invalid: [{ ...paymentSettings, upiId: "no-at-sign" }, { ...paymentSettings, upiNumber: "12ab" }, { ...paymentSettings, bankIfsc: "" }],
  },
  expectedAmountPaiseSchema: { valid: [undefined, "", null, 0, 34900, "250"], invalid: [-1, 1.5, "abc"] },
  monthlyPaymentSubmitSchema: {
    valid: [{ courseId: "c1", paymentMonth: "03", paymentYear: String(new Date().getFullYear()), paymentMethod: "upi", upiTransactionId: "ABC123" }],
    invalid: [
      { courseId: "c1", paymentMonth: "13", paymentYear: String(new Date().getFullYear()) },
      { courseId: "c1", paymentMonth: "03", paymentYear: "1990" },
      { courseId: "c1", paymentMonth: "03", paymentYear: String(new Date().getFullYear()), upiTransactionId: "has space!" },
      { courseId: "c1", paymentMonth: "03", paymentYear: String(new Date().getFullYear()), paymentMethod: "cash" },
    ],
  },
  enrollmentPaymentSubmitSchema: {
    valid: [{ courseId: "c1" }, { courseId: "c1", paymentMethod: "bank", upiTransactionId: "", couponId: null, expectedAmountPaise: "0" }],
    invalid: [{ courseId: "" }, { courseId: "c1", paymentMethod: "cash" }, { courseId: "c1", expectedAmountPaise: -5 }],
  },
  occupationEnum: { valid: ["STUDENT", "RETIRED"], invalid: ["PIRATE"] },
  profileCountryEnum: { valid: ["IN", "AE"], invalid: ["XX", "india"] },
  genderEnum: { valid: ["MALE", "FEMALE"], invalid: ["OTHER", undefined] },
  profileFieldsSchema: {
    valid: [profile],
    invalid: [
      { ...profile, dateOfBirth: "2999-01-01" },
      { ...profile, dateOfBirth: "yesterday-ish" },
      { ...profile, dateOfBirth: new Date().toISOString().slice(0, 10) },
      { ...profile, address: "short" },
      { ...profile, occupation: "x" },
    ],
  },
  profileUpdateSchema: {
    valid: [profile, { ...profile, whatsapp: "98765 43210" }],
    invalid: [{ ...profile, whatsapp: "12345" }, { ...profile, whatsapp: "abcdefghij" }, { ...profile, whatsapp: "" }],
  },
  profileImageUrlSchema: {
    valid: ["/assets/male_icon.png", "https://lh3.googleusercontent.com/a/photo", "https://files.example.org/uploads/profiles/a.png"],
    invalid: ["http://files.example.org/a.png", "https://evil.example.com/a.png", "file:///etc/passwd", "/etc/passwd", "http://169.254.169.254/latest"],
  },
  apiProfileUpdateSchema: {
    valid: [{}, { name: "New Name" }, { whatsapp: "+919876543210", image: null }, { image: "https://files.example.org/a.png" }],
    invalid: [{ whatsapp: "123" }, { role: "ADMIN" }, { image: "https://evil.example.com/a.png" }],
  },
  announcementCategoryEnum: { valid: ["GENERAL_NOTICE"], invalid: ["OTHER"] },
  blogPostSchema: {
    valid: [{ title: "A title", body: text(30), published: true }],
    invalid: [{ title: "ab", body: text(30), published: true }, { title: "A title", body: "short", published: true }, { title: "A title", body: text(50001), published: false }],
  },
  teacherBlogPostSchema: {
    valid: [{ title: "A title", body: text(30) }],
    invalid: [{ title: "A title", body: "short" }],
  },
  studentReviewSchema: {
    valid: [{ quote: text(25), rating: 5 }, { quote: text(25), rating: "3", course: "Tajweed", location: "Delhi" }],
    invalid: [{ quote: "short", rating: 5 }, { quote: text(25), rating: 0 }, { quote: text(25), rating: 6 }, { quote: text(25), rating: 2.5 }],
  },
  dailyInspirationKindEnum: { valid: ["QURAN", "HADITH"], invalid: ["POEM"] },
  dailyInspirationSchema: {
    valid: [{ kind: "QURAN", arabicText: "نص", englishTranslation: "text", published: true }],
    invalid: [{ kind: "QURAN", arabicText: "", englishTranslation: "text", published: true }, { kind: "X", arabicText: "a", englishTranslation: "b", published: true }],
  },
  siteAnnouncementSchema: {
    valid: [{ title: "Eid", body: text(15), showOnHomepage: true, published: false }],
    invalid: [{ title: "Eid", body: "short", showOnHomepage: true, published: false }, { title: "Eid", body: text(15), published: false }],
  },
  courseAnnouncementSchema: {
    valid: [{ category: "CLASS_SCHEDULE", title: "Schedule", body: text(15) }],
    invalid: [{ category: "NOPE", title: "Schedule", body: text(15) }, { category: "CLASS_SCHEDULE", title: "ab", body: text(15) }],
  },
  calendarDateSchema: { valid: ["2026-03-05", " 2026-03-05 "], invalid: ["05-03-2026", "2026-3-5", "", "2026-03-05T10:00"] },
  paymentRecordSchema: {
    valid: [{ amountInr: "500", paidAt: "2026-03-05", paymentType: "manual" }, { courseId: "c1", amountInr: 349, paidAt: "2026-03-05", paymentType: "monthly" }],
    invalid: [{ amountInr: 0, paidAt: "2026-03-05", paymentType: "manual" }, { amountInr: 5, paidAt: "2026-03-05", paymentType: "book_purchase" }, { amountInr: 5, paidAt: "bad", paymentType: "manual" }],
  },
  expenseSchema: {
    valid: [
      { category: "marketing", amountInr: "100", paidAt: "2026-03-05" },
      { category: "other", amountInr: 100, paidAt: "2026-03-05", note: "Stationery" },
      { category: "teacher_salary", amountInr: 5000, paidAt: "2026-03-05", teacherId: "t1" },
    ],
    invalid: [
      { category: "other", amountInr: 100, paidAt: "2026-03-05" },
      { category: "teacher_salary", amountInr: 5000, paidAt: "2026-03-05" },
      { category: "nope", amountInr: 100, paidAt: "2026-03-05" },
      { category: "marketing", amountInr: -1, paidAt: "2026-03-05" },
    ],
  },
  contactInquirySchema: {
    valid: [{ name: "Ali", email: "ali@example.com", message: text(25) }, { name: "Ali", email: "ali@example.com", phone: "+91 98765 43210", message: text(25) }],
    invalid: [{ name: "Ali", email: "ali@example.com", phone: "123", message: text(25) }, { name: "Ali", email: "bad", message: text(25) }, { name: "Ali", email: "ali@example.com", message: "short" }],
  },
  contactInquiryReplySchema: { valid: [{ reply: text(12) }], invalid: [{ reply: "short" }, { reply: text(10001) }] },
  bookSchema: {
    valid: [book, { ...book, mrpInr: "", featuredOnHomepage: true }],
    invalid: [{ ...book, priceInr: "-1" }, { ...book, priceInr: "abc" }, { ...book, inventoryPurchased: "x" }, { ...book, status: "SOLD" }, { ...book, weightInGrams: "" }],
  },
  blogCommentSchema: { valid: ["Nice post", "  trimmed  "], invalid: ["", "   ", text(2001)] },
  waiverRequestSchema: {
    valid: [{ courseId: "c1", feeType: "both", reason: text(12) }],
    invalid: [{ courseId: "c1", feeType: "all", reason: text(12) }, { courseId: "c1", feeType: "course", reason: "short" }, { courseId: "", feeType: "course", reason: text(12) }],
  },
  bookstoreCheckoutSchema: {
    valid: [checkout, { ...checkout, notes: "Leave at the gate" }],
    invalid: [
      { ...checkout, items: [] },
      { ...checkout, items: [{ bookId: "b1", quantity: 0 }] },
      { ...checkout, items: [{ bookId: "b1", quantity: 999 }] },
      { ...checkout, deliveryPinCode: "12" },
      { ...checkout, deliveryPhoneNumber: "abc" },
      { ...checkout, upiTransactionId: "  " },
    ],
  },
  couponSchema: {
    valid: [coupon, { ...coupon, gender: "FEMALE", courseId: "c1", applyTo: "COURSE", validUntil: "2026-01-01" }],
    invalid: [
      { ...coupon, validFrom: "2026-12-31", validUntil: "2026-01-01" },
      { ...coupon, percentage: 0 },
      { ...coupon, percentage: 101 },
      { ...coupon, code: "a b" },
      { ...coupon, validFrom: "2026-13-45" },
    ],
  },
  specialCouponUpdateSchema: {
    valid: [{ percentage: 50, validFrom: "2026-01-01", validUntil: "2026-02-01", isActive: true }],
    invalid: [{ percentage: 50, validFrom: "2026-03-01", validUntil: "2026-02-01", isActive: true }, { percentage: 0, validFrom: "2026-01-01", validUntil: "2026-02-01" }],
  },
  couponRequestApprovalSchema: {
    valid: [{ percentage: 100, validUntil: "2999-12-31" }],
    invalid: [{ percentage: 100, validUntil: "2000-01-01" }, { percentage: 0, validUntil: "2999-12-31" }],
  },
  courseGradeInputSchema: {
    valid: [grades, { title: "Quiz", maxMarks: 10, records: [] }],
    invalid: [
      { ...grades, records: [{ enrollmentId: "e1", marksObtained: 51 }] },
      { ...grades, records: [{ enrollmentId: "e1", marksObtained: 1 }, { enrollmentId: "e1", marksObtained: 2 }] },
      { ...grades, records: [{ enrollmentId: "e1", marksObtained: -1 }] },
      { ...grades, maxMarks: 0 },
      { ...grades, title: "" },
    ],
  },
  slabSchema: {
    valid: [{ minWeightGrams: 0, maxWeightGrams: 500, chargeInr: "50" }],
    invalid: [{ minWeightGrams: 500, maxWeightGrams: 500, chargeInr: 50 }, { minWeightGrams: -1, maxWeightGrams: 500, chargeInr: 50 }, { minWeightGrams: 0, maxWeightGrams: 500, chargeInr: -5 }],
  },
  adminStudentSchema: {
    valid: [{ ...profile, country: undefined, whatsapp: "+91 98765 43210" }],
    invalid: [{ ...profile, whatsapp: "123" }, { ...profile, name: "A" }],
  },
};

const isSchema = (value: unknown): value is z.ZodType => value instanceof z.ZodType;
const exportedSchemas = Object.entries(validations).filter(([, value]) => isSchema(value)) as [string, z.ZodType][];

describe("utils/validations", () => {
  it("covers every exported schema (and nothing that no longer exists)", () => {
    expect(exportedSchemas.map(([name]) => name).sort()).toEqual(Object.keys(CASES).sort());
  });

  describe.each(exportedSchemas)("%s", (name, schema) => {
    const cases = CASES[name];

    it("accepts valid input", () => {
      for (const value of cases.valid) {
        const result = schema.safeParse(value);
        expect(result.success, `${name} should accept ${JSON.stringify(value)}: ${result.success ? "" : result.error.message}`).toBe(true);
      }
    });

    it("rejects invalid input", () => {
      for (const value of cases.invalid) {
        expect(schema.safeParse(value).success, `${name} should reject ${JSON.stringify(value)}`).toBe(false);
      }
    });
  });
});

describe("schema transformations and error reporting", () => {
  it("registerSchema trims and lower-cases the email", () => {
    const parsed = validations.registerSchema.parse({ email: " User@Example.COM ", password: "longenough", acceptPolicies: true });
    expect(parsed.email).toBe("user@example.com");
  });

  it("registerSchema uses the policy message when acceptance is missing", () => {
    const result = validations.registerSchema.safeParse({ email: "a@b.co", password: "longenough", acceptPolicies: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/Terms/);
  });

  it("resetPasswordSchema reports a mismatch on confirmPassword", () => {
    const result = validations.resetPasswordSchema.safeParse({ token: "t", password: "longenough", confirmPassword: "different1" });
    expect(result.error?.issues[0].path).toEqual(["confirmPassword"]);
  });

  it("couponSchema upper-cases the code and reports date order on validUntil", () => {
    expect(validations.couponSchema.parse(coupon).code).toBe("SAVE10");
    const bad = validations.couponSchema.safeParse({ ...coupon, validFrom: "2026-12-31", validUntil: "2026-01-01" });
    expect(bad.error?.issues[0].path).toEqual(["validUntil"]);
  });

  it("expenseSchema asks for a note on Other and a teacher on salary", () => {
    const other = validations.expenseSchema.safeParse({ category: "other", amountInr: 1, paidAt: "2026-03-05" });
    expect(other.error?.issues[0].path).toEqual(["note"]);
    const salary = validations.expenseSchema.safeParse({ category: "teacher_salary", amountInr: 1, paidAt: "2026-03-05" });
    expect(salary.error?.issues[0].path).toEqual(["teacherId"]);
  });

  it("courseGradeInputSchema keeps a null mark as 'not graded'", () => {
    const parsed = validations.courseGradeInputSchema.parse(grades);
    expect(parsed.records[1].marksObtained).toBeNull();
  });

  it("profileUpdateSchema enforces the country's number length", () => {
    const short = validations.profileUpdateSchema.safeParse({ ...profile, whatsapp: "12345" });
    expect(short.error?.issues[0].message).toBe("WhatsApp number must be exactly 10 digits.");
  });

  it("bookstoreCheckoutSchema caps the quantity per book", () => {
    const result = validations.bookstoreCheckoutSchema.safeParse({ ...checkout, items: [{ bookId: "b1", quantity: 21 }] });
    expect(result.error?.issues[0].message).toMatch(/at most 20 copies/);
  });

  it("apiProfileUpdateSchema rejects unknown keys (no mass assignment)", () => {
    expect(validations.apiProfileUpdateSchema.safeParse({ name: "Ok Name", role: "ADMIN" }).success).toBe(false);
  });

  it("isAllowedProfileImageUrl only allows own storage, Google avatars and the default icons", () => {
    expect(validations.isAllowedProfileImageUrl("https://files.example.org/x.png")).toBe(true);
    expect(validations.isAllowedProfileImageUrl("https://files.example.org.evil.com/x.png")).toBe(false);
    expect(validations.isAllowedProfileImageUrl("not a url")).toBe(false);
  });
});
