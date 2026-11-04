import type {
  CertificateType,
  DevicePlatform,
  EnrollmentStatus,
  Gender,
  PaymentMethod,
  PaymentSubmissionStatus,
  PaymentType,
} from "@prisma/client";
import { ENROLLMENT_STATUS } from "@/config/constants/business";
import { PAYMENTS } from "@/config/constants/payments";

/**
 * Compatibility layer for the text -> enum migration of status/type columns
 * (expand step: migration 20261103001300_status_enum_columns).
 *
 * While both columns exist the rules are:
 *  - writes go through the `*Data()` / `*Write()` helpers so the enum column
 *    AND the legacy text column are always set together;
 *  - a row's value is read through `*Of(row)`, which prefers the enum and
 *    falls back to the text for rows the backfill has not reached;
 *  - where-clauses keep filtering on the legacy text column (every write
 *    populates it and the existing indexes cover it). The contract step, in a
 *    later release after scripts/backfill-status-enums.ts has run, switches
 *    the filters to the enum column and drops the text columns.
 */

function invert<E extends string>(map: Record<E, string>): Map<string, E> {
  return new Map(Object.entries(map).map(([enumValue, text]) => [(text as string).toLowerCase(), enumValue as E]));
}

// ---------------------------------------------------------------------------
// Enrollment.status
// ---------------------------------------------------------------------------

export const ENROLLMENT_STATUS_TEXT: Record<EnrollmentStatus, string> = {
  PENDING_APPROVAL: ENROLLMENT_STATUS.PENDING,
  AWAITING_ENROLLMENT_FEE: ENROLLMENT_STATUS.AWAITING_FEE,
  ACTIVE: ENROLLMENT_STATUS.ACTIVE,
  COMPLETED: ENROLLMENT_STATUS.COMPLETED,
  REJECTED: ENROLLMENT_STATUS.REJECTED,
};
const ENROLLMENT_STATUS_FROM_TEXT = invert(ENROLLMENT_STATUS_TEXT);

export function enrollmentStatusFromText(text: string | null | undefined): EnrollmentStatus | null {
  return text ? ENROLLMENT_STATUS_FROM_TEXT.get(text.toLowerCase()) ?? null : null;
}

export function enrollmentStatusOf(row: { status: string; statusEnum?: EnrollmentStatus | null }): EnrollmentStatus | null {
  return row.statusEnum ?? enrollmentStatusFromText(row.status);
}

export function enrollmentStatusData(status: EnrollmentStatus): { status: string; statusEnum: EnrollmentStatus } {
  return { status: ENROLLMENT_STATUS_TEXT[status], statusEnum: status };
}

/** Active or completed: the student has access to course content. */
export function isApprovedEnrollment(row: { status: string; statusEnum?: EnrollmentStatus | null }): boolean {
  const status = enrollmentStatusOf(row);
  return status === "ACTIVE" || status === "COMPLETED";
}

// ---------------------------------------------------------------------------
// CoursePaymentSubmission.status
// ---------------------------------------------------------------------------

export const SUBMISSION_STATUS_TEXT: Record<PaymentSubmissionStatus, string> = {
  PENDING_VERIFICATION: PAYMENTS.SUBMISSION_STATUS.PENDING,
  APPROVED: PAYMENTS.SUBMISSION_STATUS.APPROVED,
  DECLINED: PAYMENTS.SUBMISSION_STATUS.REJECTED,
};
const SUBMISSION_STATUS_FROM_TEXT = invert(SUBMISSION_STATUS_TEXT);

export function submissionStatusFromText(text: string | null | undefined): PaymentSubmissionStatus | null {
  return text ? SUBMISSION_STATUS_FROM_TEXT.get(text.toLowerCase()) ?? null : null;
}

export function submissionStatusOf(row: { status: string; statusEnum?: PaymentSubmissionStatus | null }): PaymentSubmissionStatus | null {
  return row.statusEnum ?? submissionStatusFromText(row.status);
}

export function submissionStatusData(status: PaymentSubmissionStatus): { status: string; statusEnum: PaymentSubmissionStatus } {
  return { status: SUBMISSION_STATUS_TEXT[status], statusEnum: status };
}

// ---------------------------------------------------------------------------
// paymentType (CoursePaymentSubmission, PaymentRecord)
// ---------------------------------------------------------------------------

export const PAYMENT_TYPE_TEXT: Record<PaymentType, string> = {
  MONTHLY: PAYMENTS.TYPES.MONTHLY_FEE,
  QUARTERLY: PAYMENTS.TYPES.QUARTERLY_FEE,
  HALF_YEARLY: PAYMENTS.TYPES.HALF_YEARLY_FEE,
  YEARLY: PAYMENTS.TYPES.YEARLY_FEE,
  ONE_TIME: PAYMENTS.TYPES.ONE_TIME,
  ENROLLMENT: PAYMENTS.TYPES.ENROLLMENT,
  MANUAL: PAYMENTS.TYPES.MANUAL,
  BOOK_PURCHASE: PAYMENTS.TYPES.BOOK_ORDER,
};
const PAYMENT_TYPE_FROM_TEXT = invert(PAYMENT_TYPE_TEXT);

export function paymentTypeFromText(text: string | null | undefined): PaymentType | null {
  return text ? PAYMENT_TYPE_FROM_TEXT.get(text.toLowerCase()) ?? null : null;
}

export function paymentTypeOf(row: { paymentType: string | null; paymentTypeEnum?: PaymentType | null }): PaymentType | null {
  return row.paymentTypeEnum ?? paymentTypeFromText(row.paymentType);
}

export function paymentTypeData(type: PaymentType): { paymentType: string; paymentTypeEnum: PaymentType } {
  return { paymentType: PAYMENT_TYPE_TEXT[type], paymentTypeEnum: type };
}

/** For callers that still hold the legacy text (kept verbatim; enum null when unmapped). */
export function paymentTypeWrite(text: string): { paymentType: string; paymentTypeEnum: PaymentType | null } {
  return { paymentType: text, paymentTypeEnum: paymentTypeFromText(text) };
}

// ---------------------------------------------------------------------------
// CoursePaymentSubmission.paymentMethod
// ---------------------------------------------------------------------------

export const PAYMENT_METHOD_TEXT: Record<PaymentMethod, string> = {
  UPI: "upi",
  BANK: "bank",
  WAIVER: "waiver",
  CASH: "cash",
};
const PAYMENT_METHOD_FROM_TEXT = invert(PAYMENT_METHOD_TEXT);

export function paymentMethodFromText(text: string | null | undefined): PaymentMethod | null {
  return text ? PAYMENT_METHOD_FROM_TEXT.get(text.toLowerCase()) ?? null : null;
}

export function paymentMethodOf(row: { paymentMethod: string | null; paymentMethodEnum?: PaymentMethod | null }): PaymentMethod | null {
  return row.paymentMethodEnum ?? paymentMethodFromText(row.paymentMethod);
}

export function paymentMethodWrite(text: string | null): { paymentMethod: string | null; paymentMethodEnum: PaymentMethod | null } {
  return { paymentMethod: text, paymentMethodEnum: paymentMethodFromText(text) };
}

// ---------------------------------------------------------------------------
// Enrollment.certificateType
// ---------------------------------------------------------------------------

const CERTIFICATE_TYPES: readonly CertificateType[] = ["APPRECIATION", "COMPLETION"];

export function certificateTypeFromText(text: string | null | undefined): CertificateType | null {
  const upper = text?.toUpperCase();
  return (CERTIFICATE_TYPES as readonly string[]).includes(upper ?? "") ? (upper as CertificateType) : null;
}

export function certificateTypeOf(row: { certificateType: string | null; certificateTypeEnum?: CertificateType | null }): CertificateType | null {
  return row.certificateTypeEnum ?? certificateTypeFromText(row.certificateType);
}

export function certificateTypeData(type: CertificateType | null): { certificateType: string | null; certificateTypeEnum: CertificateType | null } {
  return { certificateType: type, certificateTypeEnum: type };
}

// ---------------------------------------------------------------------------
// DeviceToken.platform
// ---------------------------------------------------------------------------

export const DEVICE_PLATFORM_TEXT: Record<DevicePlatform, string> = { ANDROID: "android", IOS: "ios", WEB: "web" };
const DEVICE_PLATFORM_FROM_TEXT = invert(DEVICE_PLATFORM_TEXT);

export function devicePlatformFromText(text: string | null | undefined): DevicePlatform | null {
  return text ? DEVICE_PLATFORM_FROM_TEXT.get(text.trim().toLowerCase()) ?? null : null;
}

export function devicePlatformData(platform: DevicePlatform): { platform: string; platformEnum: DevicePlatform } {
  return { platform: DEVICE_PLATFORM_TEXT[platform], platformEnum: platform };
}

// ---------------------------------------------------------------------------
// Coupon.gender
// ---------------------------------------------------------------------------

const GENDERS: readonly Gender[] = ["MALE", "FEMALE"];

export function genderFromText(text: string | null | undefined): Gender | null {
  const upper = text?.toUpperCase();
  return (GENDERS as readonly string[]).includes(upper ?? "") ? (upper as Gender) : null;
}

export function genderWrite(text: string | null): { gender: string | null; genderEnum: Gender | null } {
  return { gender: text, genderEnum: genderFromText(text) };
}
