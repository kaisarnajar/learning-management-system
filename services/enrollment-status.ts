import { ENROLLMENT_STATUS } from "@/config/constants/business";

/** Student requested enrollment; awaiting admin approval (free courses). */
export const PENDING_ENROLLMENT_APPROVAL = ENROLLMENT_STATUS.PENDING;

/** Paid course: enrollment created; student must pay enrollment fee. */
export const AWAITING_ENROLLMENT_FEE = ENROLLMENT_STATUS.AWAITING_FEE;

/** Admin declined the request. The row is kept for history; the student may apply again. */
export const REJECTED_ENROLLMENT = ENROLLMENT_STATUS.REJECTED;

/** A rejected request does not block a fresh application for the same course. */
export function canReapplyForEnrollment(status: string): boolean {
  return status === REJECTED_ENROLLMENT;
}

export function canApproveEnrollment(status: string): boolean {
  return status === PENDING_ENROLLMENT_APPROVAL;
}

export function canRejectEnrollment(status: string): boolean {
  return status === PENDING_ENROLLMENT_APPROVAL || status === AWAITING_ENROLLMENT_FEE;
}
