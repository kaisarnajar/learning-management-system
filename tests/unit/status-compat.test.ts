import { describe, expect, it } from "vitest";
import {
  certificateTypeData,
  certificateTypeFromText,
  certificateTypeOf,
  devicePlatformData,
  devicePlatformFromText,
  ENROLLMENT_STATUS_TEXT,
  enrollmentStatusData,
  enrollmentStatusFromText,
  enrollmentStatusOf,
  genderFromText,
  genderWrite,
  isApprovedEnrollment,
  PAYMENT_METHOD_TEXT,
  paymentMethodFromText,
  paymentMethodOf,
  paymentMethodWrite,
  paymentTypeData,
  paymentTypeFromText,
  paymentTypeOf,
  paymentTypeWrite,
  submissionStatusData,
  submissionStatusFromText,
  submissionStatusOf,
  SUBMISSION_STATUS_TEXT,
} from "@/services/status-compat";
import { buildMonthlyFeeLabel } from "@/services/monthly-payments";
import { incomePaymentTypeLabel, monthlyPaymentStatusLabel } from "@/services/monthly-payment-status";

describe("enrollment status mapping", () => {
  it("maps every enum value to text and back", () => {
    for (const [status, text] of Object.entries(ENROLLMENT_STATUS_TEXT)) {
      expect(enrollmentStatusFromText(text)).toBe(status);
      expect(enrollmentStatusData(status as keyof typeof ENROLLMENT_STATUS_TEXT)).toEqual({ status: text, statusEnum: status });
    }
  });

  it("is case-insensitive and null-safe", () => {
    expect(enrollmentStatusFromText("ACTIVE")).toBe("ACTIVE");
    expect(enrollmentStatusFromText("nonsense")).toBeNull();
    expect(enrollmentStatusFromText(null)).toBeNull();
    expect(enrollmentStatusFromText("")).toBeNull();
  });

  it("prefers the enum column and falls back to legacy text", () => {
    expect(enrollmentStatusOf({ status: "pending_approval", statusEnum: "ACTIVE" })).toBe("ACTIVE");
    expect(enrollmentStatusOf({ status: "completed", statusEnum: null })).toBe("COMPLETED");
    expect(enrollmentStatusOf({ status: "weird" })).toBeNull();
  });

  it("treats only active and completed enrollments as approved", () => {
    expect(isApprovedEnrollment({ status: "active" })).toBe(true);
    expect(isApprovedEnrollment({ status: "x", statusEnum: "COMPLETED" })).toBe(true);
    expect(isApprovedEnrollment({ status: "pending_approval" })).toBe(false);
    expect(isApprovedEnrollment({ status: "rejected" })).toBe(false);
    expect(isApprovedEnrollment({ status: "awaiting_enrollment_fee" })).toBe(false);
  });
});

describe("submission status mapping", () => {
  it("maps the legacy 'rejected' text to DECLINED", () => {
    expect(submissionStatusFromText("rejected")).toBe("DECLINED");
    expect(SUBMISSION_STATUS_TEXT.DECLINED).toBe("rejected");
  });

  it("writes both columns and reads with fallback", () => {
    expect(submissionStatusData("APPROVED")).toEqual({ status: "approved", statusEnum: "APPROVED" });
    expect(submissionStatusOf({ status: "pending_verification" })).toBe("PENDING_VERIFICATION");
    expect(submissionStatusOf({ status: "approved", statusEnum: "DECLINED" })).toBe("DECLINED");
    expect(submissionStatusFromText(undefined)).toBeNull();
  });
});

describe("payment type mapping", () => {
  it("maps legacy text values to enums and back", () => {
    expect(paymentTypeFromText("half_yearly")).toBe("HALF_YEARLY");
    expect(paymentTypeFromText("monthly")).toBe("MONTHLY");
    expect(paymentTypeFromText("bogus")).toBeNull();
    expect(paymentTypeData("YEARLY")).toEqual({ paymentType: "yearly", paymentTypeEnum: "YEARLY" });
  });

  it("keeps unmapped legacy text verbatim with a null enum", () => {
    expect(paymentTypeWrite("monthly")).toEqual({ paymentType: "monthly", paymentTypeEnum: "MONTHLY" });
    expect(paymentTypeWrite("custom")).toEqual({ paymentType: "custom", paymentTypeEnum: null });
  });

  it("reads the enum first, then the text", () => {
    expect(paymentTypeOf({ paymentType: "monthly", paymentTypeEnum: "YEARLY" })).toBe("YEARLY");
    expect(paymentTypeOf({ paymentType: "quarterly" })).toBe("QUARTERLY");
    expect(paymentTypeOf({ paymentType: null })).toBeNull();
  });
});

describe("payment method mapping", () => {
  it("round-trips every method", () => {
    for (const [method, text] of Object.entries(PAYMENT_METHOD_TEXT)) {
      expect(paymentMethodFromText(text)).toBe(method);
    }
    expect(paymentMethodWrite("upi")).toEqual({ paymentMethod: "upi", paymentMethodEnum: "UPI" });
    expect(paymentMethodWrite(null)).toEqual({ paymentMethod: null, paymentMethodEnum: null });
    expect(paymentMethodOf({ paymentMethod: "waiver" })).toBe("WAIVER");
  });
});

describe("certificate type, platform and gender mapping", () => {
  it("normalises certificate types", () => {
    expect(certificateTypeFromText("completion")).toBe("COMPLETION");
    expect(certificateTypeFromText("other")).toBeNull();
    expect(certificateTypeOf({ certificateType: "APPRECIATION" })).toBe("APPRECIATION");
    expect(certificateTypeData(null)).toEqual({ certificateType: null, certificateTypeEnum: null });
  });

  it("trims and lowercases device platforms", () => {
    expect(devicePlatformFromText(" iOS ")).toBe("IOS");
    expect(devicePlatformFromText("windows")).toBeNull();
    expect(devicePlatformData("ANDROID")).toEqual({ platform: "android", platformEnum: "ANDROID" });
  });

  it("maps genders", () => {
    expect(genderFromText("female")).toBe("FEMALE");
    expect(genderFromText("other")).toBeNull();
    expect(genderWrite("MALE")).toEqual({ gender: "MALE", genderEnum: "MALE" });
  });
});

describe("fee labels", () => {
  it("builds labels for each payment type", () => {
    expect(buildMonthlyFeeLabel("03", "2026")).toBe("Monthly fee — March 2026");
    expect(buildMonthlyFeeLabel("11", "2026", "quarterly")).toBe("Quarterly fee — starting November 2026");
    expect(buildMonthlyFeeLabel("01", "2026", "half_yearly")).toBe("Half Yearly fee — starting January 2026");
    expect(buildMonthlyFeeLabel("01", "2026", "yearly")).toBe("Yearly fee — starting January 2026");
    expect(buildMonthlyFeeLabel("01", "2026", "one_time")).toBe("One-Time fee — 2026");
  });

  it("falls back to the raw value for an out-of-range month", () => {
    expect(buildMonthlyFeeLabel("13", "2026")).toBe("Monthly fee — 13 2026");
  });

  it("labels payment types and statuses for the UI", () => {
    expect(incomePaymentTypeLabel("enrollment")).toBe("Enrollment fee");
    expect(incomePaymentTypeLabel(null)).toBe("Unknown");
    expect(incomePaymentTypeLabel("custom")).toBe("custom");
    expect(monthlyPaymentStatusLabel("pending_verification")).toBe("Pending Verification");
    expect(monthlyPaymentStatusLabel("some_status")).toBe("some status");
  });
});
