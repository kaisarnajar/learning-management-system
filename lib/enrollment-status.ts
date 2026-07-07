import { ENROLLMENT_STATUS } from "@/config/constants/business";

/** Student requested enrollment; awaiting admin approval (free courses). */
export const PENDING_ENROLLMENT_APPROVAL = ENROLLMENT_STATUS.PENDING;

/** Paid course: enrollment created; student must pay enrollment fee. */
export const AWAITING_ENROLLMENT_FEE = ENROLLMENT_STATUS.AWAITING_FEE;

export function canApproveEnrollment(status: string): boolean {
  return status === PENDING_ENROLLMENT_APPROVAL;
}

export function canRejectEnrollment(status: string): boolean {
  return status === PENDING_ENROLLMENT_APPROVAL || status === AWAITING_ENROLLMENT_FEE;
}
